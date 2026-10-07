# Gravebound Pinball 3D

A dark-fantasy RPG pinball table for the browser. One connected table on four terraces: the Black Keep, the
Wilds, Grave Hollow and the Grave beneath it. The ball is the hero. The only controls are the left flippers,
the right flippers and a nudge.

## Play

- `dist/gravebound-3d-standalone.html` opens straight from disk, with the 3D library built in.
- `dist/gravebound-3d.html` is the page body that gets published; it loads Three.js r128 from a CDN.

Z and / (or the arrow keys) flip. Hold Space and release to launch; Space nudges in play. C changes the
view, Q the detail level, F is full screen, P pauses.

Dev keys: press the backquote key to turn them on. 1 to 4 drop the ball on a level, 5, 6 and 7 send it into
the Crypt, the Den and the Hoard, G opens the Grave, B adds a ball, N finishes the current main-quest step or kills the boss. A run that used them saves its score with
a star.

## How it is put together

| File | What it holds |
| --- | --- |
| `src/game.js` | The game: table layout, physics, classes, foes, bosses, quests, wings, audio, menus |
| `src/art3d.js` | Playfield art painted to textures; procedural stone, wood, sky |
| `src/render3d.js` | Scene: terraces, walls, ramps, bumpers, targets, scenery, camera, lighting, post |
| `src/wing3d.js` | The campaign wings as places in the world (the Crypt, the Den, the Hoard) |
| `src/actors3d.js` | Foes, bosses, pickups and spell effects in 3D |
| `src/game3d.js` | Overlay gauges and text, settings, dev keys, resize, loop, boot |
| `src/page.css`, `src/page-body.html` | Styles and markup |
| `reference/` | The 2D dev build 1.1 this grew out of, kept for reference only |

Physics runs on the table plane at 120 steps a second. Height is visual: each level is a terrace, the chutes
between levels are slopes, and ramps lift the ball along the rail it is riding.

A wing is a small room with its own flippers. In table space each sits past the Grave, so the physics treats it
as one more level; in the world each is a sunken court beside the main table. The ball travels between the two
through a scoop and a short tunnel. Each campaign has one, and it opens once the Warden is beaten:

| Wing | Campaign | Way in | Task before the goal opens |
| --- | --- | --- | --- |
| The Crypt | Necromancer | Catacombs | Light the four sigils on the walls |
| The Den | Beast lord | Witch's Hut | Slay three of the pack |
| The Hoard | Grave dragon | Secret Passage, behind the Sealed Door | Roll over six dragon coins |

Every wing runs on a clock. The wing's own task and its bumpers buy time; when it runs out the flippers go dead
and the ball is carried back out. Draining from a wing costs nothing, and the way in stays open.

## Build and test

```
npm install
npm run build        # writes dist/
npm run soak         # a bot plays every class in headless Chromium, then each wing's route is walked end to end
npm run shots        # screenshots into test/out/
npm run standalone   # checks the one-file copy loads with no network
```

The tests serve the CDN scripts from `node_modules`, so they run offline. They use software rendering, so
they check that everything runs and renders, not frame rate.
