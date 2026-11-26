// Golden Hour Skies — deterministic screenshot scenes.
// One clear job: put the game into a fixed, recognisable state for each
// ?scene= preset so screenshots are real renders of the game's own code at
// the same moment every time. No randomness, no wall-clock dependence.
import { SCREEN } from './hud.js';
import { placePlane } from './plane.js';
import { MISSIONS, startMission } from './missions.js';

const FIXED_T = 120; // fixed mission clock for every scene

function headingTo(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/**
 * Stage a scene on a fresh game object and return { screen, t } to draw.
 * The game object must expose: plane, run, screen, missionIndex.
 */
export function stageShot(name, game) {
  const scene = name || 'cover';
  if (scene === 'rings') {
    game.missionIndex = 0;
    game.run = startMission(MISSIONS[0]);
    game.run.time = FIXED_T;
    game.run.score = 140;
    game.run.ringsPassed = 1;
    game.run.rings[0].passed = true;
    const ring2 = game.run.rings[1];
    const ring1 = game.run.rings[0];
    placePlane(game.plane, {
      x: ring1.x,
      y: ring1.y,
      z: ring1.z,
      heading: headingTo(ring1, ring2),
      speed: 58,
      throttle: 0.7,
      gear: false,
    });
    game.screen = SCREEN.FLY;
    return { screen: SCREEN.FLY, t: FIXED_T };
  }
  if (scene === 'landing') {
    game.missionIndex = 0;
    game.run = startMission(MISSIONS[0]);
    game.run.time = 200;
    game.run.score = 640;
    game.run.rings.forEach((r) => {
      r.passed = true;
    });
    game.run.ringsPassed = game.run.rings.length;
    placePlane(game.plane, {
      x: 6,
      y: 78,
      z: 60,
      heading: 0,
      speed: 33,
      throttle: 0.35,
      gear: true,
      flaps: true,
    });
    game.screen = SCREEN.FLY;
    return { screen: SCREEN.FLY, t: FIXED_T };
  }
  if (scene === 'win') {
    game.missionIndex = 0;
    game.run = startMission(MISSIONS[0]);
    game.run.time = 262;
    game.run.score = 890;
    game.run.rings.forEach((r) => {
      r.passed = true;
    });
    game.run.ringsPassed = game.run.rings.length;
    game.run.status = 'won';
    placePlane(game.plane, {
      x: 0,
      y: 44,
      z: 700,
      heading: 0,
      speed: 0,
      throttle: 0,
      gear: true,
      flaps: true,
    });
    game.plane.onGround = true;
    game.plane.landed = true;
    game.screen = SCREEN.WIN;
    return { screen: SCREEN.WIN, t: FIXED_T };
  }
  // cover (default): mid-flight, first ring ahead, runway behind-left.
  game.missionIndex = 0;
  game.run = startMission(MISSIONS[0]);
  game.run.time = 45;
  const ring1 = game.run.rings[0];
  placePlane(game.plane, {
    x: 0,
    y: 130,
    z: 700,
    heading: headingTo({ x: 0, z: 700 }, ring1),
    speed: 55,
    throttle: 0.7,
    gear: false,
  });
  game.screen = SCREEN.FLY;
  return { screen: SCREEN.FLY, t: FIXED_T };
}
