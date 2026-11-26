// Golden Hour Skies: Island Hopper — shared tuning constants.
// One clear job: every number the flight model, world and HUD agree on lives here.
export const WORLD = {
  size: 4000, // world spans -4000..4000 m on x and z
  seaLevel: 0,
  runwayHeight: 42, // flat plateau height of the home island
  runway: { x: 0, z0: 320, z1: 900, halfWidth: 16 }, // home strip, heading north (+z)
  gravity: 9.81,
};

export const PLANE = {
  maxSpeed: 118, // m/s
  cruiseSpeed: 62,
  stallSpeed: 24,
  thrustAccel: 26, // m/s^2 at full throttle
  drag: 0.0032, // quadratic drag coefficient
  pitchRate: 0.9, // rad/s toward commanded pitch
  rollRate: 2.2, // rad/s toward commanded roll
  maxPitch: 0.45,
  maxRoll: 1.1,
  turnRate: 0.55, // heading change per rad of bank per second
  flapDrag: 0.0045,
  flapLift: 1.25,
  gearDrag: 0.0012,
};

export const FUEL = {
  start: 100,
  burnIdle: 0.10, // per second
  burnFull: 0.55, // per second at full throttle
};

export const DAMAGE = {
  hardVerticalSpeed: -9, // m/s downward speed that means a crash on terrain
  hardSpeed: 46, // m/s impact speed that means a crash
  bounceDamage: 18, // damage from a survivable rough touchdown
};

export const SCORE = {
  ring: 100,
  ringTimeBonus: 40,
  landing: 250,
  delivery: 150,
  perfectLandingBonus: 100,
};

export const COLORS = {
  skyTop: '#2b3f6e',
  skyMid: '#e8955a',
  skyLow: '#f7c873',
  sun: '#ffe9a8',
  seaDeep: '#1d5f7a',
  seaShallow: '#4a9aa0',
  sand: '#ecd9a8',
  grass: '#6f9e57',
  forest: '#4a7d40',
  rock: '#7a6a5c',
  snow: '#e8e4da',
  runway: '#3a3f46',
  runwayLine: '#f2e9c9',
  ringNext: '#ffd34d',
  ringDone: '#7fe0a8',
  ringTodo: '#6fd3e7',
  hud: '#ffe9b0',
  hudDim: '#c9b98a',
};
