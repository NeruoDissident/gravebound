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
| `src/foes3d.js` | The foes as jointed figures: one builder per type, posed from the game's state every frame |
| `src/actors3d.js` | Bosses, pickups, hit rings and spell effects in 3D |
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

Every foe has a job on the table, a visible wind-up before it strikes, and a shot that answers it:

| Foe | Job | Answer |
| --- | --- | --- |
| Skeleton | Rises at the top in threes and shambles down to the slingshot line | Hit it on the way down |
| Goblin | Hops after loose pickups or your purse and runs for an outlane with the loot | Kill it before it gets there; the loot comes back |
| Dire Wolf | Prowls a lane and lunges at the ball, batting it toward the outlanes | Kill it, or keep the ball out of its lane |
| Spirit | Sits on a bumper and deadens it | Shoot the bumper; the ball passes through the spirit |
| Cultist | Chants at a ramp mouth; the curse lands when the fuse ends | Shoot that ramp |
| Armored Dead | Holds an orbit entrance; soft hits clang off | A full-speed hit, Charge, or Bone Breaker |
| Corrupted Knight | Guards the statue; parries soft hits and ripostes | Hit it hard |
| Grave Troll | Holds a scoop and punts the ball | A hard hit staggers it |

A hit during the wind-up staggers the foe and the strike never lands. Hallowed ground wards the ball from strikes.

Foes come in waves drawn from the campaign's foes on a budget that grows with level and threat, with a lull after
each. The table drives them: the Keep bell calls the next wave early, every fourth gravestone hit raises a skeleton,
leaving the Catacombs brings an Armored Dead out after you, and lighting all the lanes holds the next wave off.
Clearing a wave pays a bounty.

Bosses use the table too: the Warden's Portcullis Slam bars the Wolf Run for the phase, Moonfang's Blood Howl sends
the wolves into a frenzy, and Ashmaw is warded by three cultists rather than by the bumpers and scorches the floor
in front of the Sanctum with Gravefire.

## Build and test

```
npm install
npm run build        # writes dist/
npm run soak         # a bot plays every class in headless Chromium, then each wing's route, each foe's job and the waves and boss moves are walked end to end
npm run shots        # screenshots into test/out/
npm run standalone   # checks the one-file copy loads with no network
```

To host it, serve `dist/`: the build writes `dist/index.html` (the one-file copy), and `vercel.json` points
Vercel at that folder.

The tests serve the CDN scripts from `node_modules`, so they run offline. They use software rendering, so
they check that everything runs and renders, not frame rate.
