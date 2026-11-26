// Golden Hour Skies — the three sorties.
// One clear job: each mission's name, briefing, ring course, wind, fuel and
// what counts as a win. All coordinates are world metres; the home runway is
// at (0, 320..900) heading north.
import { createRings } from './rings.js';

export const MISSIONS = [
  {
    id: 1,
    name: 'Ring Run',
    subtitle: 'Golden Archipelago',
    brief:
      'Thread all six golden rings over the islands, then bring her home to the runway. ' +
      'Each ring pays 100 points plus a speed bonus. Watch the fuel gauge.',
    wind: 0.25,
    fuel: 100,
    timeLimit: 360,
    rings: [
      { x: 0, z: 1150, r: 30, y: 110 },
      { x: -700, z: 1450, r: 28, y: 150 },
      { x: -1400, z: 1100, r: 26, y: 170 },
      { x: -900, z: 250, r: 28, y: 120 },
      { x: 900, z: 450, r: 26, y: 130 },
      { x: 500, z: 1150, r: 30, y: 110 },
    ],
    needsLanding: true,
    winText: 'Ring Run complete — every ring threaded and a clean landing.',
  },
  {
    id: 2,
    name: 'Island Mail',
    subtitle: 'Three drops, one sunset',
    brief:
      'The outer islands are waiting on the mail. Fly low through each blue ' +
      'delivery hoop, then land back on the home strip. Low and steady pays.',
    wind: 0.45,
    fuel: 100,
    timeLimit: 420,
    rings: [
      { x: -1900, z: 300, r: 30, y: 120 },
      { x: 1900, z: -300, r: 30, y: 130 },
      { x: -700, z: -1400, r: 28, y: 150 },
    ],
    needsLanding: true,
    delivery: true,
    winText: 'Mail delivered to all three islands — and home for supper.',
  },
  {
    id: 3,
    name: 'Storm Landing',
    subtitle: 'Gusting crosswind, half a tank',
    brief:
      'A front is rolling in over the archipelago. Take off, ride out the gusts ' +
      'around the tall peak, and put her down on the runway with gear and flaps. ' +
      'Half a tank — make every litre count.',
    wind: 1.0,
    fuel: 55,
    timeLimit: 300,
    rings: [
      { x: -1150, z: 1500, r: 34, y: 190 },
      { x: 0, z: 1900, r: 30, y: 150 },
    ],
    needsLanding: true,
    winText: 'Storm beaten — a textbook landing in a gusting crosswind.',
  },
];

/** A fresh mission run: rings built, clock zeroed, score zeroed. */
export function startMission(mission) {
  return {
    mission,
    rings: createRings(mission.rings),
    score: 0,
    time: 0,
    ringsPassed: 0,
    deliveries: 0,
    status: 'flying', // flying | won | crashed | out-of-time
    endReason: '',
  };
}

/** True when every ring of the run is passed. */
export function courseComplete(run) {
  return run.rings.every((ring) => ring.passed);
}

/** True when the run's win condition is met (course done + landed home). */
export function missionWon(run, plane) {
  if (!run.mission.needsLanding) return courseComplete(run);
  return courseComplete(run) && plane.landed;
}
