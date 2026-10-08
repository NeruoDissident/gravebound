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
| `src/spells.js` | The spellbook: sixteen abilities, their goals, upgrades, the Rally and the Tavern |
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

A run is one campaign: its omens, its wing, its two bosses. Winning ends the expedition with a summary; losing the
last ball ends it the old way. Tilt forfeits the end-of-ball bonus and nothing else: an open Grave always takes the ball. Endless mode (Options) raises a new campaign after each win, with threat rising.

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

A companion guards the bottom drain on the Hollow, between the flippers, before the Grave. You pick one with your
hero (Tank, Healer or Striker) or ride alone. A draining ball bounces off them at a cost to their health; a ball off the
post fires their perk; skeleton swarms go for them; at zero they are wounded and the drain stands open until you
complete a bank. The full rules we settled on are in `DESIGN.md`.

Every class has four abilities, one per purpose (Breaker, Guard, Striker, Pressure), unlocked and levelled on
level-up and cast by the table: complete a bank, roll three lanes then a scoop, make two ramps, or two orbits or
twenty spins. Casts last a duration and ride the ball; unlocked abilities all have their goals live at once, so they
stack, and recasting extends to twice the base. The level-up screen shows the same four cards every time: Unlock, or
Level Up into three upgrade rows with concrete numbers. The pool is `SPELLS` in `src/spells.js`.

The Tavern scoop hires recruits: three strangers a visit, each a class with one of its four abilities and a price
(40 gold, 15 more for each recruit already in the band, up to six). It opens only when you can pay and have a seat.
Recruits ride with you for the run and come out in every Rally as balls of their class with that ability running.

A full meter cradled for 1.5 s is the Rally: the party comes out as balls for 20 seconds. The camera stays on your
own ball and losing it ends the Rally and the ball. Table boons, stats and the rare keystones (`PERKS` in
`src/game.js`) are drawn one at a time after each boss kill.

## Build and test

```
npm install
npm run build        # writes dist/
npm run soak         # a bot plays every class in headless Chromium, then each wing's route, each foe's job, the waves and boss moves, every boon, the spellbook, the Rally and the party are walked end to end
npm run shots        # screenshots into test/out/
npm run standalone   # checks the one-file copy loads with no network
```

To host it, serve `dist/`: the build writes `dist/index.html` (the one-file copy), and `vercel.json` points
Vercel at that folder.

The tests serve the CDN scripts from `node_modules`, so they run offline. They use software rendering, so
they check that everything runs and renders, not frame rate.

## Help and tutorial (0.13)

- **How to play** (title screen and pause menu): the rules in nine short sections, then *Every named shot*: a glossary generated from the table itself (what each shot is, where it sits on its level, and what counts), so it stays correct when the table changes.
- **Pause** now explains the current step of every quest in plain words under the quest line: "Mill is a spinner at the middle right of the Wilds. Every turn counts, so hit it hard."
- **Tutorial**: nine pages, on the title menu, and launched automatically on the first run of a fresh browser. Skip or close it any time; Options has "Show the tutorial when a new run starts" to turn it back on.
