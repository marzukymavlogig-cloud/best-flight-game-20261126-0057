// Golden Hour Skies — HUD, instruments and screens.
// One clear job: everything drawn on top of the 3D scene — the flight data
// (altitude, speed, heading, throttle, fuel, score, wind), the lit instrument
// cluster, toast messages, and the menu / pause / win / crash screens.
import { COLORS, SCORE } from './config.js';
import { displayUnits } from './plane.js';
import { compassPoint, headingDegrees, windAt } from './world.js';
import { ringsLeft } from './rings.js';

const TAU = Math.PI * 2;

function text(ctx, s, x, y, size, color, align = 'left', weight = '600') {
  ctx.save();
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.save();
  ctx.fillStyle = `rgba(10,18,32,${alpha})`;
  ctx.strokeStyle = 'rgba(255,233,176,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The always-on flight data bar. */
export function drawHUD(ctx, w, h, plane, run, t) {
  const u = displayUnits(plane);
  const hdg = headingDegrees(plane.heading);
  const wind = windAt(run.time, run.mission.wind);
  const windKt = Math.round(wind.speed * 1.94384);
  const barW = Math.min(860, w - 40);
  const bx = (w - barW) / 2;
  panel(ctx, bx, 12, barW, 54);
  const items = [
    ['ALT', `${u.feet.toLocaleString()} ft`],
    ['SPD', `${u.knots} kt`],
    ['HDG', `${String(Math.round(hdg)).padStart(3, '0')}° ${compassPoint(hdg)}`],
    ['THR', `${u.throttlePct}%`],
    ['FUEL', `${u.fuelPct}%`],
    ['SCORE', `${run.score}`],
    ['WIND', `${windKt} kt`],
    ['RINGS', `${run.ringsPassed}/${run.rings.length}`],
  ];
  const cell = barW / items.length;
  items.forEach(([label, value], i) => {
    const cx = bx + cell * i + cell / 2;
    text(ctx, label, cx, 30, 11, COLORS.hudDim, 'center');
    text(ctx, value, cx, 52, 19, COLORS.hud, 'center', '700');
  });

  // Fuel bar under the top bar.
  const fw = Math.min(300, w * 0.3);
  panel(ctx, (w - fw) / 2, 72, fw, 10, 0.4);
  ctx.fillStyle = u.fuelPct > 25 ? '#7fe0a8' : '#ff6b5e';
  ctx.fillRect((w - fw) / 2 + 2, 74, (fw - 4) * (u.fuelPct / 100), 6);

  // Mission + clock line, under the top bar.
  const left = Math.max(0, run.mission.timeLimit - run.time);
  const mm = Math.floor(left / 60);
  const ss = String(Math.floor(left % 60)).padStart(2, '0');
  text(ctx, `${run.mission.name} — ${run.mission.subtitle}`, 18, 100, 14, COLORS.hud, 'left', '600');
  text(ctx, `${mm}:${ss}`, w - 18, 100, 16, left < 60 ? '#ff8a7a' : COLORS.hud, 'right', '700');

  drawInstruments(ctx, w, h, plane, hdg, t);
  drawToasts(ctx, w, h, t);
}

let toasts = [];
/** Show a short message over the scene for ~3 seconds. */
export function toast(msg) {
  toasts.push({ msg, at: performance.now() / 1000 });
  if (toasts.length > 4) toasts.shift();
}
export function clearToasts() {
  toasts = [];
}

function drawToasts(ctx, w, h, t) {
  const now = performance.now() / 1000;
  toasts = toasts.filter((x) => now - x.at < 3);
  toasts.forEach((x, i) => {
    const age = now - x.at;
    const alpha = age > 2.4 ? (3 - age) / 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    text(ctx, x.msg, w / 2, h * 0.3 + i * 26, 20, '#ffffff', 'center', '700');
    ctx.restore();
  });
  void t;
}

/** The lit instrument cluster: attitude, airspeed, altimeter, compass. */
function drawInstruments(ctx, w, h, plane, hdg, t) {
  const cy = h - 78;
  // Attitude indicator (artificial horizon).
  const ax = 92;
  const ar = 46;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, cy, ar, 0, TAU);
  ctx.clip();
  ctx.translate(ax, cy);
  ctx.rotate(-plane.roll);
  const pitchPx = Math.max(-ar, Math.min(ar, plane.pitch * 90));
  ctx.fillStyle = '#3a6ea8';
  ctx.fillRect(-ar, -ar - pitchPx, ar * 2, ar + pitchPx);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-ar, -pitchPx, ar * 2, ar + pitchPx);
  ctx.strokeStyle = '#ffe9b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-ar, -pitchPx);
  ctx.lineTo(ar, -pitchPx);
  ctx.stroke();
  ctx.rotate(plane.roll);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,233,176,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, cy, ar, 0, TAU);
  ctx.stroke();
  text(ctx, 'ATT', ax, cy + ar + 16, 10, COLORS.hudDim, 'center');

  // Airspeed dial.
  const sx = 178;
  gauge(ctx, sx, cy, 34, plane.speed / 118, `${Math.round(plane.speed * 1.94)}`, 'KT', '#6fd3e7');
  text(ctx, 'AIRSPEED', sx, cy + 50, 10, COLORS.hudDim, 'center');

  // Altimeter dial.
  const altx = w - 178;
  gauge(ctx, altx, cy, 34, Math.min(1, plane.y / 600), `${Math.round(plane.y * 3.28)}`, 'FT', '#ffd34d');
  text(ctx, 'ALTITUDE', altx, cy + 50, 10, COLORS.hudDim, 'center');

  // Compass strip.
  const ccx = w - 92;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ccx, cy, 46, 0, TAU);
  ctx.clip();
  ctx.fillStyle = '#101c2e';
  ctx.fillRect(ccx - 46, cy - 46, 92, 92);
  ctx.translate(ccx, cy);
  for (let d = -180; d <= 180; d += 15) {
    const a = (((hdg + d + 540) % 360) - 180) * (Math.PI / 180);
    const x = Math.sin(a) * 40;
    const y = -Math.cos(a) * 40;
    if (Math.abs(d) > 75) continue;
    ctx.strokeStyle = d % 45 === 0 ? '#ffe9b0' : 'rgba(255,233,176,0.4)';
    ctx.lineWidth = d % 45 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x * 0.82, y * 0.82);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (d % 90 === 0) {
      const label = ['N', 'E', 'S', 'W'][Math.round((((hdg + d) % 360) + 360) % 360 / 90) % 4];
      text(ctx, label, x * 0.6, y * 0.6 + 4, 12, '#ffe9b0', 'center', '700');
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,233,176,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ccx, cy, 46, 0, TAU);
  ctx.stroke();
  text(ctx, 'HDG', ccx, cy + 62, 10, COLORS.hudDim, 'center');

  // Stall + damage warnings.
  if (plane.speed < 26 && !plane.onGround) {
    const blink = Math.sin(t * 8) > 0;
    if (blink) text(ctx, 'STALL!', w / 2, 110, 26, '#ff6b5e', 'center', '800');
  }
  if (plane.damage > 0 && plane.damage < 100) {
    text(ctx, `DAMAGE ${Math.round(plane.damage)}%`, w / 2, 136, 16, '#ffb14d', 'center', '700');
  }
  if (plane.fuel <= 0) {
    text(ctx, 'FUEL EMPTY — GLIDING', w / 2, 110, 22, '#ff6b5e', 'center', '800');
  }
  const gearBits = [];
  if (plane.gear) gearBits.push('GEAR DOWN');
  if (plane.flaps) gearBits.push('FLAPS DOWN');
  if (gearBits.length > 0) text(ctx, gearBits.join(' · '), w / 2, h - 18, 13, '#7fe0a8', 'center', '700');
}

function gauge(ctx, x, y, r, frac, value, unit, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = 'rgba(10,18,32,0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,233,176,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.strokeStyle = 'rgba(255,233,176,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r - 7, a0, a1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r - 7, a0, a0 + (a1 - a0) * Math.max(0, Math.min(1, frac)));
  ctx.stroke();
  text(ctx, value, x, y + 2, 16, '#ffffff', 'center', '700');
  text(ctx, unit, x, y + 18, 9, COLORS.hudDim, 'center');
  ctx.restore();
}

/** Shared dim + card for full screens. */
function screenCard(ctx, w, h, title, lines, accent = '#ffe9b0') {
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,26,0.62)';
  ctx.fillRect(0, 0, w, h);
  const cw = Math.min(620, w - 60);
  const ch = 150 + lines.length * 30;
  const cx = (w - cw) / 2;
  const cy = (h - ch) / 2;
  panel(ctx, cx, cy, cw, ch, 0.85);
  text(ctx, title, w / 2, cy + 52, 34, accent, 'center', '800');
  lines.forEach((line, i) => {
    text(ctx, line, w / 2, cy + 96 + i * 30, 16, '#f2e9c9', 'center', '500');
  });
  ctx.restore();
  return { x: cx, y: cy, w: cw, h: ch };
}

export const SCREEN = {
  MENU: 'menu',
  BRIEF: 'brief',
  FLY: 'fly',
  PAUSE: 'pause',
  WIN: 'win',
  CRASH: 'crash',
  TIME: 'time',
};

/** Title menu with the three mission cards. Returns the clickable card rects. */
export function drawMenu(ctx, w, h, missions) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1d2c50');
  grad.addColorStop(0.55, '#c97a45');
  grad.addColorStop(1, '#f7c873');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Sun + sea bands for the menu backdrop.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.3, 46, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#14486b';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  text(ctx, 'GOLDEN HOUR SKIES', w / 2, h * 0.2, 46, '#fff3d0', 'center', '800');
  text(ctx, 'Island Hopper — a sunset flight over the archipelago', w / 2, h * 0.2 + 36, 18, '#ffe9b0', 'center', '500');
  const cardW = Math.min(300, (w - 120) / 3);
  const cardH = 190;
  const y = h * 0.42;
  const rects = [];
  missions.forEach((m, i) => {
    const x = (w - cardW * 3 - 40 * 2) / 2 + i * (cardW + 40);
    panel(ctx, x, y, cardW, cardH, 0.8);
    text(ctx, `${i + 1} · ${m.name}`, x + 18, y + 36, 20, '#ffe9b0', 'left', '700');
    text(ctx, m.subtitle, x + 18, y + 62, 14, '#c9b98a', 'left', '500');
    const words = wrap(m.brief, 34);
    words.slice(0, 4).forEach((ln, j) => text(ctx, ln, x + 18, y + 90 + j * 20, 13, '#f2e9c9', 'left', '400'));
    text(ctx, `Wind ${Math.round(m.wind * 100)}% · Fuel ${m.fuel}%`, x + 18, y + cardH - 18, 12, '#7fe0a8', 'left', '600');
    rects.push({ x, y, w: cardW, h: cardH, mission: i });
  });
  text(ctx, 'Click a mission or press 1 / 2 / 3 — then throttle up with W and lift off with ↑', w / 2, y + cardH + 44, 15, '#fff3d0', 'center', '500');
  text(ctx, 'Arrows / WASD fly · F flaps · G gear · P pause · R restart · M mute', w / 2, y + cardH + 70, 14, '#ffe9b0', 'center', '500');
  ctx.restore();
  return rects;
}

function wrap(s, n) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > n) {
      lines.push(cur.trim());
      cur = word;
    } else cur += ' ' + word;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

export function drawBrief(ctx, w, h, mission) {
  screenCard(ctx, w, h, `${mission.name} — ${mission.subtitle}`, [
    ...wrap(mission.brief, 58),
    '',
    'Press ENTER or click to take off',
  ]);
}

export function drawPause(ctx, w, h) {
  screenCard(ctx, w, h, 'PAUSED', [
    'The sunset waits. Press P to keep flying, R to restart.',
  ], '#6fd3e7');
}

export function drawWin(ctx, w, h, run, plane) {
  const u = displayUnits(plane);
  screenCard(ctx, w, h, 'MISSION COMPLETE', [
    run.mission.winText,
    `Score ${run.score} · Rings ${run.ringsPassed}/${run.rings.length} · Time ${Math.round(run.time)}s`,
    `Landed at ${u.knots} kt with ${u.fuelPct}% fuel left`,
    '',
    'Press R to fly again, or 1 / 2 / 3 for another sortie',
  ], '#7fe0a8');
}

export function drawCrash(ctx, w, h, reason) {
  screenCard(ctx, w, h, 'CRASHED', [
    reason,
    'The islands are patient. Press R to try again.',
  ], '#ff6b5e');
}

export function drawTimeUp(ctx, w, h) {
  screenCard(ctx, w, h, 'OUT OF TIME', [
    'The sun set on this sortie. Press R to try again.',
  ], '#ffb14d');
}

export { SCORE };
