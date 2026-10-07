# Gravebound Pinball 3D

A dark-fantasy RPG pinball table for the browser. One connected table on four terraces: the Black Keep, the
Wilds, Grave Hollow and the Grave beneath it. The ball is the hero. The only controls are the left flippers,
the right flippers and a nudge.

## Play

- `dist/gravebound-3d-standalone.html` opens straight from disk, with the 3D library built in.
- `dist/gravebound-3d.html` is the page body that gets published; it loads Three.js r128 from a CDN.

Z and / (or the arrow keys) flip. Hold Space and release to launch; Space nudges in play. C changes the
view, Q the detail level, F is full screen, P pauses.

Dev keys: press the backquote key to turn them on. 1 to 4 drop the ball on a level, G opens the Grave, B adds
a ball, N finishes the current main-quest step or kills the boss. A run that used them saves its score with
a star.

## How it is put together

The 2D game (`src/gravebound-dev-2d.html`) is still the source of the table layout, physics, rules, quests,
audio and menus. `build.js` takes that script whole, cuts out its canvas renderer and puts the 3D renderer in
its place. Every change it makes to the 2D script is a checked find-and-replace, so the build stops if the 2D
source changes shape.

| File | What it holds |
| --- | --- |
| `src/gravebound-dev-2d.html` | The 2D game: table, physics, classes, foes, bosses, quests, audio, UI |
| `src/art3d.js` | Playfield art painted to textures; procedural stone, wood, sky |
| `src/render3d.js` | Scene: terraces, walls, ramps, bumpers, targets, scenery, camera, lighting, post |
| `src/actors3d.js` | Foes, bosses, pickups and spell effects in 3D |
| `src/game3d.js` | Overlay gauges and text, settings, dev keys, resize, loop, boot |
| `src/page3d.css` | Layout changes on top of the 2D page's own styles |

Physics runs on the table plane at 120 steps a second, as in the 2D game. Height is visual: each level is a
terrace, the chutes between levels are slopes, and ramps lift the ball along the rail it is riding.

## Build and test

```
npm install
npm run build        # writes dist/
npm run soak         # a bot plays every class in headless Chromium; fails on any error or stuck ball
npm run shots        # screenshots into test/out/
npm run standalone   # checks the one-file copy loads with no network
```

The tests serve the CDN scripts from `node_modules`, so they run offline. They use software rendering, so
they check that everything runs and renders, not frame rate.
