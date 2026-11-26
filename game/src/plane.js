// Golden Hour Skies — the aircraft's state.
// One clear job: create, reset and describe the plane; the flight model lives
// in physics.js and only mutates a plane through these fields.
import { FUEL, WORLD } from './config.js';

/** A fresh plane sitting at the home runway threshold, ready to roll. */
export function createPlane() {
  return {
    x: WORLD.runway.x,
    y: WORLD.runwayHeight + 2,
    z: WORLD.runway.z0 + 60,
    heading: 0, // 0 = north, down the runway (+z)
    pitch: 0, // nose up positive, radians
    roll: 0, // right wing down positive, radians
    speed: 0, // m/s along the nose
    verticalSpeed: 0,
    throttle: 0, // 0..1
    flaps: false,
    gear: true,
    fuel: FUEL.start,
    damage: 0, // 0..100; 100 is a wreck
    onGround: true,
    airborne: false,
    landed: false,
    crashed: false,
    airTime: 0,
  };
}

/** Put the plane back on the runway threshold for a fresh attempt. */
export function resetPlane(plane) {
  const fresh = createPlane();
  Object.assign(plane, fresh);
}

/** Place the plane mid-air for a scene or a test (heading in radians). */
export function placePlane(plane, { x, y, z, heading, speed, throttle, gear, flaps }) {
  plane.x = x;
  plane.y = y;
  plane.z = z;
  plane.heading = heading;
  plane.speed = speed;
  plane.throttle = throttle ?? 0.55;
  plane.gear = gear ?? false;
  plane.flaps = flaps ?? false;
  plane.pitch = 0;
  plane.roll = 0;
  plane.onGround = false;
  plane.airborne = true;
  plane.verticalSpeed = 0;
}

/** Knots, feet and the HUD's other display units. */
export function displayUnits(plane) {
  return {
    knots: Math.round(plane.speed * 1.94384),
    feet: Math.round(plane.y * 3.28084),
    throttlePct: Math.round(plane.throttle * 100),
    fuelPct: Math.max(0, Math.round(plane.fuel)),
  };
}
