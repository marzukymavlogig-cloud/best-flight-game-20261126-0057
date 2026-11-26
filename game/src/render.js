// Golden Hour Skies — the chase-view renderer.
// One clear job: turn the world, the plane and the rings into canvas pixels.
// Golden-hour sky, sea, projected island mesh, runway, rings, clouds, sun and
// the aircraft sprite, all drawn from code. No images, no external assets.
import { COLORS, WORLD } from './config.js';
import { groundHeight, onRunway } from './world.js';

const TAU = Math.PI * 2;

/** Camera basis from the plane: position behind it, looking ahead. */
export function makeCamera(plane) {
  const cp = Math.cos(plane.pitch);
  const fwd = {
    x: Math.sin(plane.heading) * cp,
    y: Math.sin(plane.pitch),
    z: Math.cos(plane.heading) * cp,
  };
  const cam = {
    x: plane.x - fwd.x * 26,
    y: plane.y - fwd.y * 26 + 7,
    z: plane.z - fwd.z * 26,
  };
  // Look slightly ahead of the plane so the runway/ring sits in frame.
  const look = {
    x: plane.x + fwd.x * 55,
    y: plane.y + fwd.y * 55 - 4,
    z: plane.z + fwd.z * 55,
  };
  const f = norm({
    x: look.x - cam.x,
    y: look.y - cam.y,
    z: look.z - cam.z,
  });
  const r = norm(cross(f, { x: 0, y: 1, z: 0 }));
  const u = cross(r, f);
  return { pos: cam, fwd: f, right: r, up: u };
}

function norm(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Project a world point to screen space; null when behind the camera. */
export function project(cam, p, w, h) {
  const d = { x: p.x - cam.pos.x, y: p.y - cam.pos.y, z: p.z - cam.pos.z };
  const cz = dot(d, cam.fwd);
  if (cz < 2) return null;
  const focal = h * 1.05;
  return {
    x: w / 2 + (dot(d, cam.right) / cz) * focal,
    y: h * 0.52 - (dot(d, cam.up) / cz) * focal,
    depth: cz,
  };
}

function parseColor(c) {
  if (c.startsWith('#')) {
    const p = parseInt(c.slice(1), 16);
    return [(p >> 16) & 255, (p >> 8) & 255, p & 255];
  }
  const m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
}

function lerpColor(a, b, t) {
  const pa = parseColor(a);
  const pb = parseColor(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function terrainColor(h, x, z) {
  if (h <= 0.5) return h < -6 ? COLORS.seaDeep : COLORS.seaShallow;
  let c;
  if (h < 5) c = COLORS.sand;
  else if (h < 55) c = COLORS.grass;
  else if (h < 95) c = COLORS.forest;
  else if (h < 135) c = COLORS.rock;
  else c = COLORS.snow;
  // Gentle, smooth variation so neighbouring quads blend instead of quilting.
  const shade = 0.96 + 0.04 * Math.sin(x * 0.003 + z * 0.004);
  const p = parseInt(c.slice(1), 16);
  const r = Math.round(((p >> 16) & 255) * shade);
  const g = Math.round(((p >> 8) & 255) * shade);
  const b = Math.round((p & 255) * shade);
  return `rgb(${r},${g},${b})`;
}

function drawSky(ctx, w, h, cam, t) {
  const horizonY = h * 0.52 - (cam.fwd.y / Math.max(0.05, Math.abs(cam.fwd.y) + 0.4)) * 0;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.45, COLORS.skyMid);
  grad.addColorStop(0.62, COLORS.skyLow);
  grad.addColorStop(0.63, COLORS.seaDeep);
  grad.addColorStop(1, '#0d2f4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  void horizonY;
  // Low golden sun, ahead-left of the flight path.
  const sunDir = norm({ x: -0.55, y: 0.16, z: 0.8 });
  const sunFar = {
    x: cam.pos.x + sunDir.x * 3000,
    y: cam.pos.y + sunDir.y * 3000,
    z: cam.pos.z + sunDir.z * 3000,
  };
  const s = project(cam, sunFar, w, h);
  if (s) {
    const glow = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 150);
    glow.addColorStop(0, 'rgba(255,233,168,0.95)');
    glow.addColorStop(0.25, 'rgba(255,190,110,0.55)');
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 150, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 26, 0, TAU);
    ctx.fill();
  }
  void t;
}

const CLOUDS = [
  { x: -900, z: 2400, y: 420, r: 260 },
  { x: 700, z: 2900, y: 460, r: 320 },
  { x: 1800, z: 900, y: 400, r: 220 },
  { x: -2000, z: 800, y: 440, r: 280 },
  { x: 300, z: -600, y: 430, r: 300 },
  { x: -1400, z: -1800, y: 470, r: 260 },
  { x: 2200, z: -1400, y: 410, r: 240 },
  { x: 0, z: 3400, y: 480, r: 340 },
];

function drawClouds(ctx, cam, w, h) {
  ctx.save();
  for (const c of CLOUDS) {
    const p = project(cam, { x: c.x, y: c.y, z: c.z }, w, h);
    if (!p || p.depth > 5200) continue;
    const scale = (900 / p.depth) * (c.r / 260);
    const alpha = Math.max(0.12, Math.min(0.75, 500 / p.depth));
    ctx.fillStyle = `rgba(255,214,170,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 120 * scale, 26 * scale, 0, 0, TAU);
    ctx.ellipse(p.x - 70 * scale, p.y + 8 * scale, 70 * scale, 18 * scale, 0, 0, TAU);
    ctx.ellipse(p.x + 75 * scale, p.y + 6 * scale, 80 * scale, 20 * scale, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The island mesh: a grid ahead of the plane, projected, far-to-near. */
function drawTerrain(ctx, cam, plane, w, h, t) {
  const step = 75;
  const x0 = Math.floor((plane.x - 950) / step) * step;
  const z0 = Math.floor((plane.z - 250) / step) * step;
  const cols = 26;
  const rows = 24;
  const quads = [];
  for (let zi = 0; zi < rows; zi += 1) {
    for (let xi = 0; xi < cols; xi += 1) {
      const x = x0 + xi * step;
      const z = z0 + zi * step;
      const h00 = groundHeight(x, z);
      const h10 = groundHeight(x + step, z);
      const h01 = groundHeight(x, z + step);
      const h11 = groundHeight(x + step, z + step);
      const cx = x + step / 2;
      const cz = z + step / 2;
      const dx = cx - cam.pos.x;
      const dz = cz - cam.pos.z;
      const dist = dx * dx + dz * dz;
      quads.push({ x, z, h00, h10, h01, h11, dist });
    }
  }
  quads.sort((a, b) => b.dist - a.dist);
  for (const q of quads) {
    const p00 = project(cam, { x: q.x, y: q.h00, z: q.z }, w, h);
    const p10 = project(cam, { x: q.x + step, y: q.h10, z: q.z }, w, h);
    const p11 = project(cam, { x: q.x + step, y: q.h11, z: q.z + step }, w, h);
    const p01 = project(cam, { x: q.x, y: q.h01, z: q.z + step }, w, h);
    if (!p00 || !p10 || !p11 || !p01) continue;
    const hm = (q.h00 + q.h10 + q.h01 + q.h11) / 4;
    let col = terrainColor(hm, q.x + step / 2, q.z + step / 2);
    // Sea shimmer: gentle moving bands on the water.
    if (hm <= 0.5) {
      const wave = 0.5 + 0.5 * Math.sin(q.x * 0.004 + q.z * 0.003 + t * 0.8);
      col = lerpColor(COLORS.seaDeep, COLORS.seaShallow, wave * 0.85);
    }
    // Distance haze toward the golden sky.
    const fog = Math.min(0.28, Math.sqrt(q.dist) / 3400);
    if (fog > 0.02) col = lerpColor(col, '#c98d5f', fog);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
  }
  void t;
}

function drawRunway(ctx, cam, w, h) {
  const r = WORLD.runway;
  const y = WORLD.runwayHeight + 0.5;
  const corners = [
    { x: r.x - r.halfWidth, y, z: r.z0 },
    { x: r.x + r.halfWidth, y, z: r.z0 },
    { x: r.x + r.halfWidth, y, z: r.z1 },
    { x: r.x - r.halfWidth, y, z: r.z1 },
  ].map((p) => project(cam, p, w, h));
  if (corners.some((p) => !p)) return;
  ctx.fillStyle = COLORS.runway;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.fillStyle = COLORS.runwayLine;
  for (let z = r.z0 + 20; z < r.z1 - 10; z += 60) {
    const a = project(cam, { x: r.x - 1.2, y: y + 0.2, z }, w, h);
    const b = project(cam, { x: r.x + 1.2, y: y + 0.2, z }, w, h);
    const c = project(cam, { x: r.x + 1.2, y: y + 0.2, z: z + 28 }, w, h);
    const d = project(cam, { x: r.x - 1.2, y: y + 0.2, z: z + 28 }, w, h);
    if (!a || !b || !c || !d) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  // Threshold bars at both ends.
  for (const zt of [r.z0 + 6, r.z1 - 6]) {
    const a = project(cam, { x: r.x - 12, y: y + 0.2, z: zt }, w, h);
    const b = project(cam, { x: r.x + 12, y: y + 0.2, z: zt }, w, h);
    if (a && b) {
      ctx.strokeStyle = COLORS.runwayLine;
      ctx.lineWidth = Math.max(1, 300 / a.depth);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function drawRings(ctx, cam, rings, w, h, t) {
  for (const ring of rings) {
    const col = ring.passed ? COLORS.ringDone : ring === nextUnpassed(rings) ? COLORS.ringNext : COLORS.ringTodo;
    const alpha = ring.passed ? 0.35 : 0.95;
    const pts = [];
    const N = 28;
    for (let i = 0; i <= N; i += 1) {
      const a = (i / N) * TAU;
      const p = project(
        cam,
        { x: ring.x + Math.cos(a) * ring.r, y: ring.y, z: ring.z + Math.sin(a) * ring.r },
        w,
        h,
      );
      if (p) pts.push(p);
    }
    if (pts.length < 3) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.lineWidth = ring === nextUnpassed(rings) ? 5 : 3;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    // Centre beacon for the next ring.
    if (ring === nextUnpassed(rings)) {
      const c = project(cam, { x: ring.x, y: ring.y, z: ring.z }, w, h);
      if (c) {
        const pulse = 1 + 0.15 * Math.sin(t * 4);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5 * pulse, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function nextUnpassed(rings) {
  for (const ring of rings) if (!ring.passed) return ring;
  return null;
}

/** The aircraft, seen from behind in chase view, banking with its roll. */
function drawPlane(ctx, cam, plane, w, h, t) {
  const p = project(cam, { x: plane.x, y: plane.y, z: plane.z }, w, h);
  if (!p) return;
  const scale = Math.max(0.4, Math.min(1.6, 260 / p.depth));
  const S = 62 * scale; // half wingspan in px
  ctx.save();
  ctx.translate(p.x, p.y + 6 * scale);
  ctx.rotate(-plane.roll * 0.9);
  // Propeller blur (the engine is running whenever the throttle is up).
  if (plane.throttle > 0.05) {
    ctx.fillStyle = 'rgba(220,225,235,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, -S * 0.62, S * 0.34, S * 0.5, 0, 0, TAU);
    ctx.fill();
  }
  // Main wings.
  ctx.fillStyle = '#1f7a6d';
  roundRect(ctx, -S, -S * 0.08, S * 2, S * 0.22, S * 0.08);
  ctx.fill();
  ctx.fillStyle = '#2fa08c';
  roundRect(ctx, -S, -S * 0.08, S * 2, S * 0.1, S * 0.05);
  ctx.fill();
  // Fuselage (seen from behind, tapering up to the tail).
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath();
  ctx.moveTo(-S * 0.16, S * 0.1);
  ctx.lineTo(-S * 0.13, -S * 0.55);
  ctx.lineTo(S * 0.13, -S * 0.55);
  ctx.lineTo(S * 0.16, S * 0.1);
  ctx.closePath();
  ctx.fill();
  // Teal cheatline stripe.
  ctx.fillStyle = '#1f7a6d';
  ctx.fillRect(-S * 0.15, -S * 0.28, S * 0.3, S * 0.07);
  // Tail fin and stabiliser.
  ctx.fillStyle = '#e0703a';
  ctx.beginPath();
  ctx.moveTo(-S * 0.05, -S * 0.5);
  ctx.lineTo(0, -S * 0.95);
  ctx.lineTo(S * 0.05, -S * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f7a6d';
  roundRect(ctx, -S * 0.42, -S * 0.62, S * 0.84, S * 0.12, S * 0.04);
  ctx.fill();
  // Navigation lights: red left, green right, white tail strobe.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(-S, 0, 3.5 * scale + 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4dff88';
  ctx.beginPath();
  ctx.arc(S, 0, 3.5 * scale + 1, 0, TAU);
  ctx.fill();
  if (Math.sin(t * 6) > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -S * 0.9, 3 * scale + 1, 0, TAU);
    ctx.fill();
  }
  // Flaps and gear hints.
  if (plane.flaps) {
    ctx.fillStyle = 'rgba(31,122,109,0.9)';
    ctx.fillRect(-S * 0.55, S * 0.14, S * 0.35, S * 0.06);
    ctx.fillRect(S * 0.2, S * 0.14, S * 0.35, S * 0.06);
  }
  if (plane.gear) {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(-S * 0.1, S * 0.1);
    ctx.lineTo(-S * 0.1, S * 0.3);
    ctx.moveTo(S * 0.1, S * 0.1);
    ctx.lineTo(S * 0.1, S * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-S * 0.1, S * 0.32, 3.5 * scale, 0, TAU);
    ctx.arc(S * 0.1, S * 0.32, 3.5 * scale, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  void onRunway;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** One full frame of the 3D scene (no HUD, no menus). */
export function renderScene(ctx, w, h, plane, rings, t) {
  const cam = makeCamera(plane);
  drawSky(ctx, w, h, cam, t);
  drawClouds(ctx, cam, w, h);
  drawTerrain(ctx, cam, plane, w, h, t);
  drawRunway(ctx, cam, w, h);
  drawRings(ctx, cam, rings, w, h, t);
  drawPlane(ctx, cam, plane, w, h, t);
  return cam;
}
