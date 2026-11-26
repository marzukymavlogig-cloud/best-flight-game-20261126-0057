# Golden Hour Skies — Island Hopper

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/marzukymavlogig-cloud/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/marzukymavlogig-cloud/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A chase-view flight game for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Fly a little teal-and-cream bush plane over a golden-hour archipelago — islands, sea, mountains and one home runway — with lit instruments, wind gusts, fuel and damage to manage. Three sorties: thread the golden rings, deliver the island mail, or land in a storm.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: plain static files under `game/`, all art drawn in canvas code, all sound synthesized with WebAudio.

## Controls

| Key | Action |
| --- | --- |
| W / S or Shift / Ctrl | Throttle up / down |
| ↑ / ↓ | Pitch (climb / descend) |
| ← / → or A / D | Roll and turn |
| F | Flaps down / up |
| G | Gear down / up |
| Mouse drag | Click-to-steer |
| 1 / 2 / 3 | Pick a sortie |
| Enter | Start flying |
| P | Pause · M mute · R restart |

## Landing

A landing counts when you are slow, with gear down and flaps down, over the home runway. Too fast, gear up, or a hard hit on terrain is a crash. Rough touchdowns cost damage.

## Structure

- `game/index.html` — canvas + module entry
- `game/src/main.js` — bootstrap, loop, state machine (menu/briefing/flying/pause/win/crash)
- `game/src/config.js` — shared tuning constants
- `game/src/world.js` — archipelago terrain, runway, wind
- `game/src/plane.js` — aircraft state
- `game/src/physics.js` — flight model, landing / crash decisions
- `game/src/rings.js` — ring gates and pass detection
- `game/src/missions.js` — the three sorties
- `game/src/render.js` — chase-view 3D scene: sky, sea, islands, runway, rings, plane
- `game/src/hud.js` — HUD, lit instruments, menus and end screens
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — WebAudio synth engine, chimes, thuds
- `game/src/shots.js` — deterministic scene presets for screenshots (`?scene=`)
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
