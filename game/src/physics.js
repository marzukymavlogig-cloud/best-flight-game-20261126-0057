// Golden Hour Skies — the flight model.
// One clear job: advance the plane one timestep from the pilot's inputs,
// the wind and the ground. Landing, crash and bounce decisions live here.
import { DAMAGE, PLANE, WORLD } from './config.js';
import { groundHeight, onRunway, windAt } from './world.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function approach(v, target, rate, dt) {
  const d = target - v;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return v + Math.sign(d) * step;
}

/**
 * Step the plane forward by dt seconds.
 * @param {object} plane the plane state (mutated)
 * @param {object} input { pitch: -1..1 (nose up +), roll: -1..1 (right +), throttleDelta }
 * @param {number} windStrength mission wind 0..1
 * @param {number} t mission clock in seconds
 * @returns {string|null} 'landed' | 'crashed' | 'bounced' | 'stalled' | null
 */
export function stepPhysics(plane, input, windStrength, t, dt) {
  if (plane.crashed || plane.landed) return null;
  const ground = groundHeight(plane.x, plane.z);

  // Throttle follows the lever; dead engine burns nothing and gives nothing.
  plane.throttle = clamp(plane.throttle + input.throttleDelta, 0, 1);
  const hasFuel = plane.fuel > 0;
  const thrust = hasFuel ? plane.throttle : 0;
  if (hasFuel) {
    plane.fuel = Math.max(
      0,
      plane.fuel - (0.1 + plane.throttle * 0.45) * dt,
    );
  }

  // Attitude eases toward the commanded attitude; bank turns the nose.
  const targetPitch = clamp(input.pitch * PLANE.maxPitch, -PLANE.maxPitch, PLANE.maxPitch);
  const targetRoll = clamp(input.roll * PLANE.maxRoll, -PLANE.maxRoll, PLANE.maxRoll);
  plane.pitch = approach(plane.pitch, targetPitch, PLANE.pitchRate, dt);
  plane.roll = approach(plane.roll, targetRoll, PLANE.rollRate, dt);
  plane.heading += -plane.roll * PLANE.turnRate * dt;

  // Speed: thrust minus drag (flaps and gear add drag), gravity on a climb.
  const drag =
    PLANE.drag + (plane.flaps ? PLANE.flapDrag : 0) + (plane.gear ? PLANE.gearDrag : 0);
  const liftFactor = plane.flaps ? PLANE.flapLift : 1;
  const accel =
    thrust * PLANE.thrustAccel - drag * plane.speed * plane.speed - Math.sin(plane.pitch) * 6.5;
  plane.speed = clamp(plane.speed + accel * dt, 0, PLANE.maxSpeed);

  // Vertical speed from pitch and airspeed; below stall speed the wing gives up.
  // Flaps add lift, so they lower the effective stall speed.
  const effStall = PLANE.stallSpeed / liftFactor;
  const stalling = plane.speed < effStall && !plane.onGround;
  let vy = plane.speed * Math.sin(plane.pitch);
  if (stalling) vy -= (effStall - plane.speed) * 0.55;
  plane.verticalSpeed = vy;

  // Wind pushes the airframe sideways, gusts and all.
  const wind = windAt(t, windStrength);

  const cosP = Math.cos(plane.pitch);
  const nx = Math.sin(plane.heading) * cosP;
  const nz = Math.cos(plane.heading) * cosP;
  plane.x += (plane.speed * nx + wind.wx) * dt;
  plane.z += (plane.speed * nz + wind.wz) * dt;
  plane.y += vy * dt;

  // Keep the flight inside the charted archipelago.
  const edge = WORLD.size - 120;
  if (Math.abs(plane.x) > edge) plane.x = Math.sign(plane.x) * edge;
  if (Math.abs(plane.z) > edge) plane.z = Math.sign(plane.z) * edge;
  if (plane.y > 1500) plane.y = 1500;

  plane.airTime += plane.onGround ? 0 : dt;

  // Ground contact.
  if (plane.y <= ground + 2) {
    plane.y = ground + 2;
    plane.airborne = false;
    // Rolling along the runway before takeoff, or after a landing: no impact.
    if (plane.onGround && plane.verticalSpeed >= -0.5) {
      plane.verticalSpeed = 0;
      plane.speed = Math.max(0, plane.speed - 10 * dt); // rolling friction
      return null;
    }
    const overRunway = onRunway(plane.x, plane.z);
    const gentle = plane.verticalSpeed > DAMAGE.hardVerticalSpeed && plane.speed < DAMAGE.hardSpeed;
    if (overRunway && plane.gear && plane.flaps && plane.speed < 38 && gentle) {
      // A proper landing. The game decides whether it wins the sortie;
      // the plane stays flyable so an early touchdown can take off again.
      plane.onGround = true;
      plane.speed = Math.max(0, plane.speed - 30 * dt);
      return 'landed';
    }
    if (overRunway && plane.gear && gentle) {
      // Touchdown without flaps: a hard, survivable bounce.
      plane.damage = Math.min(100, plane.damage + DAMAGE.bounceDamage);
      plane.verticalSpeed = 0;
      plane.pitch = 0;
      plane.y = ground + 2;
      if (plane.damage >= 100) {
        plane.crashed = true;
        return 'crashed';
      }
      return 'bounced';
    }
    if (!gentle) {
      plane.crashed = true;
      plane.damage = 100;
      return 'crashed';
    }
    // Slow, gentle contact off-runway: rough field landing, damage accrues.
    plane.damage = Math.min(100, plane.damage + DAMAGE.bounceDamage);
    plane.onGround = true;
    plane.verticalSpeed = 0;
    if (plane.damage >= 100) {
      plane.crashed = true;
      return 'crashed';
    }
    return 'bounced';
  }
  plane.onGround = false;
  plane.airborne = true;
  if (stalling && plane.y < ground + 60) return 'stalled';
  return null;
}
