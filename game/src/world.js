// Golden Hour Skies — the archipelago.
// One clear job: pure functions that answer "how high is the ground here?" and
// "how strong is the wind here, now?", plus the fixed island/runway layout.
// Everything is deterministic: no Math.random anywhere in the world.
import { WORLD } from './config.js';

// Fixed island bumps: centre x, centre z, radius, peak height above sea.
const ISLANDS = [
  { x: 0, z: 620, r: 520, h: 46 }, // home island (flattened for the runway)
  { x: -1150, z: 1500, r: 420, h: 130 }, // Mount Kora, the tall peak
  { x: 1250, z: 1350, r: 380, h: 95 }, // Twin Peaks island
  { x: 1450, z: 1250, r: 150, h: 60 },
  { x: -1900, z: 300, r: 360, h: 70 }, // western isle
  { x: 1900, z: -300, r: 340, h: 85 }, // eastern isle
  { x: -700, z: -1400, r: 430, h: 110 }, // southern ridge
  { x: 900, z: -1700, r: 380, h: 75 },
  { x: -2400, z: -1500, r: 300, h: 55 },
  { x: 2400, z: 1800, r: 300, h: 65 },
  { x: 300, z: 2600, r: 260, h: 48 },
  { x: -2600, z: 2200, r: 280, h: 58 },
];

// Gentle deterministic rolling noise from sines (no random seed needed).
function rolling(x, z) {
  return (
    14 * Math.sin(x * 0.0016 + 1.7) * Math.cos(z * 0.0013 - 0.6) +
    7 * Math.sin(x * 0.0041 - z * 0.0029 + 0.4) +
    4 * Math.sin((x + z) * 0.009 + 2.2)
  );
}

function smoothstep(a, b, t) {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** Ground height in metres at world (x, z). Below 0 is open sea. */
export function groundHeight(x, z) {
  let h = -22; // sea floor baseline, so open water reads as water
  for (const isl of ISLANDS) {
    const dx = (x - isl.x) / isl.r;
    const dz = (z - isl.z) / isl.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < 4) h += isl.h * Math.exp(-d2 * 1.4);
  }
  h += rolling(x, z) * smoothstep(-10, 30, h);
  // Flatten a plateau for the home runway so landings are fair.
  const r = WORLD.runway;
  const dx = Math.max(0, Math.abs(x - r.x) - (r.halfWidth + 26));
  const dz = Math.max(0, Math.max(r.z0 - 40 - z, z - (r.z1 + 40)));
  const d = Math.hypot(dx, dz);
  const flat = 1 - smoothstep(0, 130, d);
  return h + (WORLD.runwayHeight - h) * flat;
}

/** True when (x, z) is over the home runway strip. */
export function onRunway(x, z) {
  const r = WORLD.runway;
  return Math.abs(x - r.x) <= r.halfWidth && z >= r.z0 && z <= r.z1;
}

/** Distance in metres from (x, z) to the runway centreline, 0 when over it. */
export function runwayOffset(x, z) {
  const r = WORLD.runway;
  const dz = z < r.z0 ? r.z0 - z : z > r.z1 ? z - r.z1 : 0;
  return Math.hypot(x - r.x, dz);
}

/**
 * Wind at time t (seconds) for a mission strength 0..1.
 * Returns { wx, wz } in m/s: a steady sea breeze plus slow gusts.
 */
export function windAt(t, strength) {
  const gust = Math.sin(t * 0.11) * 0.6 + Math.sin(t * 0.031 + 1.3) * 0.4;
  const base = 3 + strength * 7;
  const dir = 0.6 + 0.35 * Math.sin(t * 0.017); // slowly veering breeze
  const speed = base * (1 + 0.55 * gust * strength + 0.25 * strength);
  return { wx: Math.sin(dir) * speed, wz: Math.cos(dir) * speed, speed, dir };
}

/** Compass heading in degrees from a heading angle (0 = north/+z, clockwise). */
export function headingDegrees(heading) {
  const deg = ((heading * 180) / Math.PI) % 360;
  return deg < 0 ? deg + 360 : deg;
}

/** Short compass point name for a heading in degrees. */
export function compassPoint(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}
