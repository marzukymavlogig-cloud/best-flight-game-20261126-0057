// Golden Hour Skies — bootstrap, loop and state machine.
// One clear job: own the canvas, the frame loop and the screen flow
// (menu -> briefing -> flying -> pause / win / crash), wiring input, physics,
// rings, missions, audio and the renderers together.
import { MISSIONS, courseComplete, startMission } from './missions.js';
import { createPlane, resetPlane } from './plane.js';
import { stepPhysics } from './physics.js';
import { checkRingPass, nextRing } from './rings.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderScene } from './render.js';
import {
  SCREEN,
  clearToasts,
  drawBrief,
  drawCrash,
  drawHUD,
  drawMenu,
  drawPause,
  drawTimeUp,
  drawWin,
  toast,
} from './hud.js';
import { SCORE } from './config.js';
import { stageShot } from './shots.js';

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput();
  const audio = createAudio();
  const game = {
    canvas,
    ctx,
    plane: createPlane(),
    run: startMission(MISSIONS[0]),
    missionIndex: 0,
    screen: SCREEN.MENU,
    menuRects: [],
    crashReason: '',
    pointerHeld: false,
    last: 0,
    raf: 0,
  };

  function resize() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.w = w;
    game.h = h;
  }
  resize();
  window.addEventListener('resize', resize);

  function startRun(index) {
    game.missionIndex = index;
    game.run = startMission(MISSIONS[index]);
    game.run.score = 0;
    resetPlane(game.plane);
    game.plane.fuel = MISSIONS[index].fuel;
    clearToasts();
    game.screen = SCREEN.BRIEF;
  }

  function beginFlight() {
    game.screen = SCREEN.FLY;
    audio.unlock();
    audio.click();
    toast(`${game.run.mission.name}: throttle up with W, lift off with ↑`);
  }

  function endRun(status, reason) {
    game.run.status = status;
    game.run.endReason = reason || '';
    if (status === 'won') {
      game.screen = SCREEN.WIN;
      audio.winFanfare();
    } else if (status === 'crashed') {
      game.crashReason = reason;
      game.screen = SCREEN.CRASH;
      audio.crash();
    } else {
      game.screen = SCREEN.TIME;
    }
  }

  function onAction(action) {
    audio.unlock();
    if (action === 'mute') {
      const muted = audio.toggleMute();
      toast(muted ? 'Sound muted (M)' : 'Sound on (M)');
      return;
    }
    if (action === 'restart') {
      if (game.screen !== SCREEN.MENU) startRun(game.missionIndex);
      return;
    }
    if (action === 'pause') {
      if (game.screen === SCREEN.FLY) game.screen = SCREEN.PAUSE;
      else if (game.screen === SCREEN.PAUSE) game.screen = SCREEN.FLY;
      return;
    }
    if (action === 'flaps' && game.screen === SCREEN.FLY) {
      game.plane.flaps = !game.plane.flaps;
      toast(game.plane.flaps ? 'Flaps down — slower, more lift' : 'Flaps up');
      return;
    }
    if (action === 'gear' && game.screen === SCREEN.FLY) {
      game.plane.gear = !game.plane.gear;
      toast(game.plane.gear ? 'Gear down' : 'Gear up');
      return;
    }
    if (action === 'confirm') {
      if (game.screen === SCREEN.BRIEF) beginFlight();
      else if (game.screen === SCREEN.MENU) startRun(0);
      return;
    }
    if (action === 'back') {
      if (game.screen === SCREEN.BRIEF || game.screen === SCREEN.PAUSE) {
        game.screen = SCREEN.MENU;
      }
      return;
    }
    if (action.startsWith('mission')) {
      const index = Number(action.slice(-1)) - 1;
      if (index >= 0 && index < MISSIONS.length) {
        startRun(index);
      }
    }
  }
  input.setActionHandler(onAction);

  input.setMenuClickHandler((x, y) => {
    audio.unlock();
    if (game.screen === SCREEN.MENU) {
      for (const rect of game.menuRects) {
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          audio.click();
          startRun(rect.mission);
          return;
        }
      }
      return;
    }
    if (game.screen === SCREEN.BRIEF) {
      beginFlight();
      return;
    }
    if (game.screen === SCREEN.FLY) {
      game.pointerHeld = true;
      input.steerFromPointer(x, game.w, y, game.h);
    }
  });
  window.addEventListener('pointerup', () => {
    game.pointerHeld = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (game.pointerHeld && game.screen === SCREEN.FLY) {
      input.steerFromPointer(e.clientX, game.w, e.clientY, game.h);
    }
  });

  function update(dt) {
    if (game.screen !== SCREEN.FLY) return;
    const plane = game.plane;
    const run = game.run;
    input.poll(dt);
    const prev = { x: plane.x, y: plane.y, z: plane.z };
    const wasAirborne = plane.airborne;
    const event = stepPhysics(
      plane,
      { pitch: input.state.pitch, roll: input.state.roll, throttleDelta: input.state.throttleDelta },
      run.mission.wind,
      run.time,
      dt,
    );
    run.time += dt;
    if (plane.airborne && !wasAirborne) toast('Airborne!');

    // Ring passes.
    const passed = checkRingPass(run.rings, prev, plane);
    if (passed) {
      const bonus = Math.max(0, Math.round(SCORE.ringTimeBonus * (1 - run.time / run.mission.timeLimit)));
      const pts = SCORE.ring + bonus + (run.mission.delivery ? SCORE.delivery - SCORE.ring : 0);
      run.score += pts;
      run.ringsPassed += 1;
      if (run.mission.delivery) run.deliveries += 1;
      audio.ringChime();
      const left = run.rings.length - run.ringsPassed;
      toast(
        left > 0
          ? `${run.mission.delivery ? 'Mail delivered' : 'Ring'} ${run.ringsPassed}/${run.rings.length} +${pts} — ${left} to go`
          : `${run.mission.delivery ? 'Last delivery' : 'Last ring'} +${pts} — now land home!`,
      );
    }

    // Stall warning beep.
    if (plane.speed < 26 && !plane.onGround && Math.floor(run.time * 2) !== Math.floor((run.time - dt) * 2)) {
      audio.stallWarning();
    }

    if (event === 'landed') {
      audio.touchdown();
      if (courseComplete(run)) {
        const perfect = plane.speed < 28 && plane.damage === 0;
        run.score += SCORE.landing + (perfect ? SCORE.perfectLandingBonus : 0);
        plane.landed = true;
        endRun('won');
      } else {
        run.score += 100;
        toast('Touched down — but the course is not finished. Take off again!');
      }
    } else if (event === 'crashed') {
      const reason =
        plane.damage >= 100 && plane.verticalSpeed <= -9
          ? 'Hard impact with the terrain.'
          : 'The airframe gave out on a rough touchdown.';
      endRun('crashed', reason);
    } else if (event === 'bounced') {
      audio.touchdown();
      toast(`Rough touchdown — damage ${Math.round(plane.damage)}%`);
    }

    if (run.time >= run.mission.timeLimit && game.screen === SCREEN.FLY) {
      endRun('time');
    }
    if (plane.fuel <= 0 && plane.onGround && plane.speed < 1 && game.screen === SCREEN.FLY) {
      endRun('crashed', 'Out of fuel on the ground, far from the runway.');
    }
    audio.setEngine(plane.throttle, plane.airborne, plane.speed);
  }

  function draw(t) {
    const w = game.w;
    const h = game.h;
    if (game.screen === SCREEN.MENU) {
      game.menuRects = drawMenu(ctx, w, h, MISSIONS);
      return;
    }
    renderScene(ctx, w, h, game.plane, game.run.rings, t);
    if (game.screen === SCREEN.FLY || game.screen === SCREEN.PAUSE) {
      drawHUD(ctx, w, h, game.plane, game.run, t);
    }
    if (game.screen === SCREEN.BRIEF) drawBrief(ctx, w, h, game.run.mission);
    else if (game.screen === SCREEN.PAUSE) drawPause(ctx, w, h);
    else if (game.screen === SCREEN.WIN) drawWin(ctx, w, h, game.run, game.plane);
    else if (game.screen === SCREEN.CRASH) drawCrash(ctx, w, h, game.crashReason);
    else if (game.screen === SCREEN.TIME) drawTimeUp(ctx, w, h);
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - game.last) / 1000 || 0.016));
    game.last = now;
    update(dt);
    draw(now / 1000);
    game.raf = requestAnimationFrame(frame);
  }

  game.start = () => {
    const scene = new URLSearchParams(window.location.search).get('scene');
    if (scene) {
      // Screenshot mode: stage one fixed frame and hold it.
      const staged = stageShot(scene, game);
      draw(staged.t);
      game.stagedScene = scene;
      return;
    }
    game.last = performance.now();
    game.raf = requestAnimationFrame(frame);
  };

  // Test hooks for the headless play-test (not part of the game UI).
  window.__flight = {
    game,
    screen: () => game.screen,
    state: () => ({
      screen: game.screen,
      x: game.plane.x,
      y: game.plane.y,
      z: game.plane.z,
      speed: game.plane.speed,
      throttle: game.plane.throttle,
      fuel: game.plane.fuel,
      damage: game.plane.damage,
      score: game.run.score,
      ringsPassed: game.run.ringsPassed,
      time: game.run.time,
      landed: game.plane.landed,
      crashed: game.plane.crashed,
      onGround: game.plane.onGround,
      gear: game.plane.gear,
      flaps: game.plane.flaps,
    }),
    startMission: (i) => {
      startRun(i);
      beginFlight();
    },
    setPlane: (p) => Object.assign(game.plane, p),
    nextRing: () => nextRing(game.run.rings),
  };

  return game;
}

const canvas = document.getElementById('game');
const game = createGame(canvas);
game.start();
