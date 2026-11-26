// Golden Hour Skies — ring gates.
// One clear job: the ring course for a mission, and the test for flying through
// the next ring. A ring is a hoop in the sky; crossing its plane inside its
// radius scores.
import { groundHeight } from './world.js';

/** Build rings from a list of {x, z, r, y} waypoints (y in metres above sea). */
export function createRings(waypoints) {
  return waypoints.map((w, i) => ({
    index: i,
    x: w.x,
    z: w.z,
    y: w.y ?? Math.max(groundHeight(w.x, w.z) + 55, 70),
    r: w.r ?? 26,
    passed: false,
  }));
}

/** The next ring still to fly through, or null when the course is done. */
export function nextRing(rings) {
  for (const ring of rings) if (!ring.passed) return ring;
  return null;
}

/**
 * Check whether the plane flew through the next ring this step. The ring is
 * a horizontal hoop: passing counts when the plane crosses the ring's plane
 * inside its radius, or when it flies level through the hoop's mouth
 * (close in height and inside the radius), so a steady approach is rewarded.
 * Returns the ring when passed, else null.
 */
export function checkRingPass(rings, prev, plane) {
  const ring = nextRing(rings);
  if (!ring) return null;
  // Did the segment prev->plane cross the ring's horizontal plane (y = ring.y)?
  const crossed =
    (prev.y - ring.y) * (plane.y - ring.y) <= 0 && prev.y !== plane.y;
  if (crossed) {
    const t = (ring.y - prev.y) / (plane.y - prev.y);
    const cx = prev.x + (plane.x - prev.x) * t;
    const cz = prev.z + (plane.z - prev.z) * t;
    if (Math.hypot(cx - ring.x, cz - ring.z) <= ring.r) {
      ring.passed = true;
      return ring;
    }
  }
  // Level flight straight through the hoop's mouth.
  const horizontal = Math.hypot(plane.x - ring.x, plane.z - ring.z);
  if (horizontal <= ring.r * 0.8 && Math.abs(plane.y - ring.y) <= 8) {
    ring.passed = true;
    return ring;
  }
  return null;
}

/** How many rings are still to fly. */
export function ringsLeft(rings) {
  let n = 0;
  for (const ring of rings) if (!ring.passed) n += 1;
  return n;
}
