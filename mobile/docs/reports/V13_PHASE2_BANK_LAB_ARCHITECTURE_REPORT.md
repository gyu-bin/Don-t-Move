# V13 Phase 2 — Chapter 3–4 Level Architecture (Bank, Lab)

Status: **V13 PHASE 2 — CHAPTER 3–4 LEVEL ARCHITECTURE IMPLEMENTED, GAMEPLAY TUNING PENDING**

No mission was cleared by a person or in the Simulator. Difficulty is not verified by play; the numbers
below come from a scripted thief and rank pressure only. Not Production Ready.

## What changed

- Chapter 3 (03-01…03-05) and Chapter 4 (04-01…04-05) are rebuilt architecture-first, the same way as
  Chapter 1–2: one drawn floor plan per mission, then entry / objective / exit, cover graph, structures,
  guards, cameras. Sources: `tools/campaign/v13Bank.ts`, `tools/campaign/v13Lab.ts`.
- The bake (`tools/campaign/v13Build.ts`) now composes 20 missions; Chapter 5–9 pass through unchanged from
  the Phase 5 build. `v13Scope.test.ts` and `v125Scope.test.ts` enforce both halves.
- Every exit room has a door that closes at lockdown. Four of the ten maps (03-02, 03-05, 04-03, 04-05) have a
  second lockdown door on the way in, so the way out after lockdown cannot simply retrace it.
- Patrols of all 20 V13 missions are now stored as closed circuits (same walk there and back). The Bank
  validation requires it; Chapter 1–2 scripted numbers moved by a few runs as a result (table below).
- `v12Phase5Bot.ts` gained an opt-in `BOT_KEEP_DISTANCE`; `v13Trace.ts` gained `DENSE_SPAN` and `PATIENCE`.
  Defaults are unchanged.

Not changed: guard perception and speed, CCTV detection, Tilt, timer (10 s), saves, art files, Chapter 5–9.

## Art finding (the "does not belong" look)

- **Bank**: the kit is consistent (all front-facing). The old maps mixed it with generic props and oversized
  landmark sprites. The new maps use Bank sprites only; the Main Vault door is drawn at 0.8.
- **Lab**: nine sprites are drawn at a skewed three-quarter angle while the walls, consoles, benches and cryo
  units are front-facing: `lab_glass_wall`, `lab_glass_corridor`, `lab_sterile_partition`,
  `lab_sliding_door`, `lab_equipment_rack`, `lab_sample_storage`, `lab_monitor`, `lab_cart`,
  `lab_experiment_machine`. Glass is drawn with the procedural glass panel (blocks movement, not sight).
  After the first playtest two of the nine came back as tall free-standing cabinets (`lab_sample_storage`,
  `lab_equipment_rack`), where their angle reads least. **The other seven are unused and need redrawing
  front-facing**; no new art was generated in this phase.
- Asset sheets: `Reports/V13Phase2/sheets/`.

## Per mission

Sizes in tiles. Lengths are route lengths in tiles. "Lock" = doors that close at lockdown.

### Chapter 3 — Bank (3 guards, 1 camera each)

| Map | Shape | Entry → Prize → Exit | Lock | Safe / Risk | Quick / After lock |
|---|---|---|---|---|---|
| 03-01 Lobby / Teller, 26×21 | Counter line: one wall, two ways through | bottom-centre → top-left → right-centre | Teller floor → staff exit | 29.3 / 37.7 | 28.8 / 30.0 |
| 03-02 Staff Offices, 24×22 | Zigzag through cubicles | top-left → bottom-right → bottom-left | Files → stairs; pool → supervisor | 42.1 / 40.4 | 26.4 / 45.6 |
| 03-03 Cash Processing, 25×19 | Ring round a walled cage | left-centre → centre → top-right | North ring → exit lobby | 39.9 / 43.6 | 25.4 / 44.3 |
| 03-04 Security Corridor, 25×20 | Checkpoint chain | bottom-left → top-right → top-left | Passage → exit lobby | 46.0 / 46.4 | 24.5 / 44.0 |
| 03-05 Main Vault, 27×22 | Deep in, loop out | bottom-centre → top-centre → bottom-right | Lobby → hall; east stair → exit lobby | 39.5 / 38.5 | 23.7 / 57.9 |

- 03-01: the teller wall splits public hall and staff floor; staff gate (safe) or counter flap under the hall camera.
- 03-02: north lane behind cubicle partitions, south lane walked by the office guard; short way through the staff pool under its camera.
- 03-03: prize in the central cage; guard on the sorting aisle, camera on the north strip.
- 03-04: hall scanner, camera corridor, anteroom scanner, then the vault; both hall lanes are the same length (north lane is the guard's).
- 03-05: scanner hall, corridor walls, vault with the gem behind a pier; pickup trips the alarm after 1.5 s (unchanged V8 rule for this mission).

### Chapter 4 — Lab (3 guards, 1 camera each)

| Map | Shape | Entry → Prize → Exit | Lock | Safe / Risk | Quick / After lock |
|---|---|---|---|---|---|
| 04-01 Research Reception, 26×20 | Glass front: through the lab or round it | bottom-right → top-left → top-right | Analysis lab → exit lobby | 40.3 / 35.6 | 33.9 / 43.5 |
| 04-02 Observation Wing, 25×21 | Round the glass core | top-left → centre → top-right | Monitoring → exit lobby | 31.9 / 33.9 | 30.9 / 46.5 |
| 04-03 Glass Research, 26×22 | Two lanes and a glass line | bottom-centre → top-right → top-left | North lab → exit lobby; west bay → north lane | 38.4 / 28.4 | 26.1 / 40.7 |
| 04-04 Cryo Research, 24×22 | S through three halls | top-centre → bottom-left → bottom-right | Prep lab → exit lobby | 40.7 / 32.3 | 26.1 / 27.7 |
| 04-05 Prototype Heist, 28×23 | Deep in, loop out | left-centre → right-centre → bottom-left | Lobby → test lab; loading passage → exit lobby | 36.0 / 34.0 | 33.9 / 51.5 |

- 04-01: the open lab sees the reception through its glass front. Through the gap in the glass and across the lab (short), or along the reception to the west corridor. Camera on the after-lockdown hall.
- 04-02: the core is glass on its west and east faces. A guard circles the lane wall of the west gallery, the camera covers the glass-side lane; in by a south door, out by the north door.
- 04-03: one hall cut lengthwise by glass; the lane guard on the north side sees the south side through it. West lock and north lane behind screens (safe), or the gap in the glass (short). Camera on the escape run through the north lab.
- 04-04: cryo banks stand on wall masses with a waiting pocket between them; the storage guard walks the one lane. The near opening under the intake camera cuts the first bend.
- 04-05: lobby, test lab (pillar with two glass panes), security lock, chamber. Out by the south service loop; after lockdown, north through the control room and archive.

Structure roles, cover graph and what each guard and camera watches are in the two source files, one line each.

## VISUAL

1. Offline whole-map renders with the game renderer: `Reports/V13Phase2/render/<id>-OPEN-DebugOFF.png` (and `-CLOSED-`). Reviewed for all ten.
2. Simulator (iPhone 17 Pro, iOS 27.0, whole-map camera): `Reports/V13Phase2/sim/<id>.png`. All ten load and draw; guards, cones and cameras are in the authored places.
3. Tall sprites: Lab cryo units (≈3 tiles) stand only in front of a wall mass (04-04) or against an outer wall. Wall screens (`labWall`, `bankWall`) are ≈1.7 tiles tall and cover the lower body of a thief in the lane behind them; that reads as cover but lowers visibility. **Needs a human look.**
4. Decoration pass not done: wall screens and signs only.

## TRAVERSAL

- Topology audit: 0 errors on all ten (`Reports/V13Phase1/mission-qa.json`).
- Sealed pockets / squeezes against the game nav grid: none. Largest open clearance 1.88–2.44 tiles.
- Player-only traversal (guards removed), safe → quick and risk → quick: CLEAR on all ten.
- Patrol legs: no collision (`tools/campaign/v13PatrolProbe.ts`).

## DIFFICULTY (scripted thief only)

30 runs per map (start at every second 0–14, each lane). The thief sneaks at about 1 tile/s, looks 2 tiles
ahead and walks into standing guards, so guard phase and long guard-paced lanes decide its result.

| Map | Safe / Risk (of 15) | Total (of 30) |
|---|---|---|
| 03-01 | 13 / 7 | 20 |
| 03-02 | 15 / 5 | 20 |
| 03-03 | 12 / 2 | 14 |
| 03-04 | 13 / 0 | 13 |
| 03-05 | 4 / 4 | 8 |
| 04-01 | 5 / 12 | 17 |
| 04-02 | 14 / 0 | 14 |
| 04-03 | 6 / 8 | 14 |
| 04-04 | 6 / 11 | 17 |
| 04-05 | 5 / 0 | 5 |

- Chapter averages (of 30): Museum 22.0, Gallery 18.0, Bank 15.0, Lab 13.4. The order Ch1 > Ch2 > Ch3 > Ch4 holds for this measure.
- Chapter 1–2 after the closed-circuit patrol storage: 01-01 20, 01-02 22, 01-03 29, 01-04 18, 01-05 21, 02-01 13, 02-02 26, 02-03 14, 02-04 18, 02-05 19 (before: 19, 21, 29, 21, 20, 15, 21, 14, 18, 19).
- One start delay (04-04 vault guard, 18 s) was set to move the guard's phase. Without it 04-04 had 0 scripted clears; with a patient thief over a 30 s window it had 12 of 30 on the risk lane. This is phase fitting to the script, not a design change.

## Changes after the first playtest (2026-10-05)

Feedback: the maps look too big, the same props repeat, and the two chapters do not feel like Chapter 1–2.

- **Cause**: Chapter 1–2 structures are placed at 1.6–3.0× their base size; the first Bank and Lab pass placed
  everything at 1.0×, so the furniture was small against the rooms (a desk under 2 tiles). Floor area itself
  is close to Chapter 1–2 (Ch1–2 288–423 tiles, Ch3–4 300–478).
- **Bank**: desks and cabinets 1.5×, safes, tables and carts 1.4×, teller counters and box walls 1.3×,
  checkpoints 1.2×, re-fitted to the lanes. Added wall clocks, wall monitors and floor markers.
- **Lab**: consoles and benches 1.25×, workstations 1.35×. Added tall free-standing pieces as landmarks:
  sample-storage cabinets (04-01 exit lobby, 04-03 north lab, 04-04 intake, 04-05 archive stacks), an
  equipment rack and a cryo chamber (04-04 intake), the central experiment rig (04-05 coolant plant), plus
  floor hazard markers at lockdown doors and cables.
- Tall Lab sprites (3–3.7 tiles) stand at least their own height below the top of the room, so they no
  longer rise above the outer wall; the strip behind them is a dead-end nook, not a lane.
- No route, guard or camera changed except: 04-03 camera moved from x 12 to x 9 (the new cabinets would
  block it), 04-05 archive / control-room route nodes moved 0.25 tile south.
- Not done: room sizes are unchanged. If the rooms still read too big on the device, the next step is to cut
  the largest ones (03-01 hall 24×7, 04-01 reception 24×5, 04-04 intake 22×5).

## Changes after the second playtest (2026-10-05)

Feedback: the furniture just sits against the walls and the maps do not feel like infiltration; Chapter 1–2 do.

- Wall-hugging furniture was moved into the middle of the rooms as cover islands, and the authored routes now
  go round them instead of running straight down an empty room:
  - 04-05: control room (one console island, route in the south lane, the chamber guard looks down that
    lane), loading passage (cryo pair and console, the escape run weaves south then north of them), coolant
    plant console.
  - 04-02 monitoring room, 04-01 reception desk, 04-03 north lab bench: off the north wall.
  - 03-01 manager office (desk island, route south of it) and deposit records (box-wall island);
    03-04 north passage (box-wall island, the quick escape bends round it) and monitor room (desk island).
- Removed outright: several benches and workstations that only lined a north wall.
- 04-05 chamber guard dwell 6 → 7.5 s (his walk got shorter; keeps the same phase).
- Limit: most Bank and Lab rooms are 5 tiles deep, which fits one row of islands with a lane each side.
  Staggered cover like the Chapter 1–2 halls needs rooms 7 or more deep, i.e. new floor plans.

## Changes after the third playtest (2026-10-05, normal camera, Chapter 3)

Feedback: a table does not hide the thief from a guard; the 03-03 camera looks at a partition; desks repeat;
03-04 has structures only at its ends and few guards; the rooms are routes without guards to sneak past;
03-05 alarms with no guard looking; no guard on the exit side.

- **Cover**: desks, tables and carts now block sight (`propKit.ts`: `bankOfficeDesk`,
  `bankCashProcessingTable`, `bankCashCart`, `labLargeTable`, `labWorkstation`). Anything solid in the middle
  of a room is cover; only glass is see-through.
- **Exit-side guard on all ten maps** (Bank and Lab now have 4 guards and 1 camera each). Each walks between
  the exit room's lockdown door and the room the after-lockdown route arrives from, so the exit is open
  while he is away. 03-01 and 03-04: 2 s at the door, 6 s away.
- **03-03 camera** moved to the west end of the sorting aisle, looking along its north strip; the partition
  is now two segments with a gap. It used to face the partition.
- **03-05**: the timed alarm is off. No Chapter 1–4 mission alarms without a guard or camera seeing the empty
  stand (`highSecurityAlarm.test.ts` keeps the engine rule under test on a copy).
- **Fewer repeated desks**: 03-01 hall desks → a service counter and a queue line; 03-02 one cubicle desk →
  cabinets, file table → cabinet row; 03-03 second table → safe pallet, dock table → cart; 03-05 east stair
  gets a cabinet, a safe and a cart as islands with the guard in the west lane and the route in the east lane.
- **03-04**: entrance cabinets, a security gate at the anteroom opening, box-wall and desk islands in the
  passage and monitor room; the anteroom guard stands east of the vault door. A fifth guard in the camera
  corridor was tried and removed: with it the scripted thief cleared 1–3 of 30.
- 03-02 pool carts and the 04-03 north-lab bench were removed again: now opaque, they blocked their cameras.
- Builder: a V13 mission's guard count is carried in its plan (`guardCount`), so Lab is no longer fixed at 3.

Scripted thief after this pass (of 30): 03-04 10; see `Reports/V13Phase2/dense-trace-ch3-4.log` and
`dense-bank-rest.log` for the rest. Lab was last measured before the 03-04 changes: 17, 13, 13, 17, 5.

## Changes after the fourth playtest (2026-10-05)

Feedback: in 03-03 the desk and the "yellow thing" beside the prize mean nothing; moving at wall and
structure corners still sticks; every structure must be there for a reason; Chapter 3 is otherwise playable.

- The "yellow thing" was the cage's vault door standing open. The open leaf is redrawn as a steel face with
  a hand wheel and locking bolts (`doorArt.ts`, side-facing `bankVault4c` only).
- Removed props with no job: 03-03 counting table, cage safe, lobby cabinet (the cage keeps one storage wall,
  which the Bank validation requires); 03-01 two filler cabinets; 03-04 second entrance cabinet; 03-05 hall cabinet.
- **Tap-to-move** (the touch fallback used in the Simulator) steered straight at the tapped point and pressed
  into whatever stood between; its speed was also fed back from the distance actually covered, so each slide
  along a wall got slower. It now walks a path round obstacles when the straight line is blocked and keeps
  its intended speed (`playgroundState.ts`, tests in `tapToMove.test.ts`). Tilt movement is unchanged.
- The scripted thief uses tap-to-move, so its numbers are stale after this change and were not re-measured.

## Changes after the fifth playtest (2026-10-05)

Feedback: what are those desks for; Chapter 4 repeats the same props, and Chapter 3 too; more varied art is wanted.

- Removed Lab furniture with no job (19 pieces): reception and exit workstations, benches along north walls,
  wall-side cryo units, the 04-04 intake console, the 04-05 second lab workstation. Kept where the Lab
  validation needs one piece per zone (04-02 arrival and 04-05 lobby reception desks, core stools).
- Used the pieces that were still unused: experiment machine as the cover island of the 04-01 east hall and
  04-02 east lab, prototype machine as the 04-05 control-room island, round vault door in the 03-04 vault.
- 04-05 loading-passage guard no longer starts behind the cryo tanks' sprites.
- **Variety is limited by the art, not the maps**: Bank has 15 solid pieces, Lab 12 front-facing ones, and
  every one is now in use. `docs/design/v13/ASSET_REQUEST_CH3_CH4.md` lists 10 new pieces per venue with
  prompts in the house style. No art was generated in this session.

## Whole-map verification (2026-10-05)

All ten maps were rendered whole with the game renderer (`Reports/V13Phase2/whole/<id>.png`) and checked by
`tools/campaign/v13Audit.ts` (camera coverage, guard presence per route zone, sprites hiding a guard post or
rising above the map; output in `whole/audit.txt`).

- Fixed: the 03-05 hall camera saw 33% of its floor (the scanner stood 1.8 tiles in front of it); it now
  faces the west side of the hall and sees 94%. The round vault door in 03-04 rose above the top wall and
  was replaced by the deposit box wall again. The 04-01 after-lockdown route now passes south of the test
  machine, out of the hall camera's view; before, the machine stood beside the route and hid nothing.
- Cameras now see 67–100% of the floor in their cone. 03-03 (67%) and 04-01 (74%) are partly blocked on
  purpose: the partition and the test machine are the cover.
- Every approach zone has a guard stop, a camera, or is in a guard's view from the next zone. Zones on
  escape legs with neither: 03-02 file corridor, 03-04 north passage, 03-05 west stair and exit lobby,
  04-02 monitoring room and east lab, 04-05 coolant plant, archive and exit lobby.
- The audit's sprite heights are estimates; its "rises above the map" lines for deposit box walls and
  cabinets are not visible in the renders and were not acted on.

## New art from the user's contact sheet (2026-10-05)

The user supplied one sheet with the 20 requested pieces (10 Bank, 10 Lab). Its background was transparent,
so each piece was cut out as it is, packaged to the runtime canvas and registered
(`tools/environment/addV13Art.ts`, sources in `assets/environment/<venue>/_source/`, 20 new kinds in
`propKit.ts`). Catalog: 122 assets.

- In the maps (19 of 20; the decontamination arch is registered but not placed — it is 3.5 tiles tall):
  03-01 security desk, marble column, ATMs; 03-02 deposit island; 03-03 cash pallet, counting machine, cage
  trolleys; 03-04 guard booth, security desk, deposit island; 03-05 cage trolley, cash pallet; 04-01 mobile
  screen, specimen tank, centrifuge bench; 04-02 server rack; 04-03 mobile screen, sample fridges; 04-04
  sample fridge, server rack, centrifuge bench; 04-05 server racks, robot cell.
  Not yet placed besides the arch: waiting bench, brass screen, glass partition, fume hood, gas rack.
- Limits of this intake: each piece is about 200 px on the sheet (existing sprites are 230–480 px), so they
  are drawn slightly enlarged; several are turned a little to the side, unlike the older front-facing kit.
  Both are visible side by side in `Reports/V13Phase2/art-trial/compare-bank.png` and `compare-lab.png`.

## Second placement of the new art (2026-10-05)

- Placed: brass screen as the middle cubicle partition of 03-02 (see-through, so the north lane has one
  exposed stretch); waiting bench in the 03-05 vault lobby; fume hood in the 04-04 intake as cover from the
  camera on the way to the near opening (camera coverage 100% → 84%); gas rack in the 04-02 arrival room.
- Glass sprites (`labGlassPartition`, `bankBrassScreen`) are drawn at 60% opacity so a guard behind them
  stays visible.
- **Tried and reverted**: the glass partition as the glass lines of 04-01 and 04-03. The sprite is drawn at
  an angle, so panels set end to end make a saw-tooth line; the drawn glass panels are back.
- **Not placed**: glass partition (above) and decontamination arch. The arch is 3.5 tiles tall with posts
  1.4 tiles apart; at the 04-04 entrance its posts sat inside the spawn pocket, and anywhere under an
  interior wall it covers the floor of the room above. Both need a front-facing, lower redraw to be used.
- 18 of the 20 new pieces are in the maps.

## Open issues

- **No scripted clear on the risk lane** of 03-04, 04-02, 04-05 (03-03: 2 of 15). In each the lane is walked or watched head-on by a guard the script cannot wait out. Whether a person can is unverified.
- **04-05** is the hardest map by a wide margin (5 of 30). The security lock is 3 tiles wide with a guard pacing it and no cover; entry needs the lab guard and the lock guard both at their north posts.
- **04-04 exit is close**: 26.1 tiles quick, 27.7 after lockdown. The lock barely costs anything there.
- **04-02 lockdown detour is 1.6 tiles** on the shortest path (26.7 open, 28.3 closed).
- **03-04 risk route** is not shorter than the safe one (46.4 vs 46.0); it is the guard's lane.
- The objective guards of 04-01, 04-04 and 04-05 stand on or beside the after-lockdown route between inspections.
- Lockdown still rarely matters to a thief who runs: quick escapes are 24–34 tiles (6–9 s at run speed) against a 10 s timer that starts at the theft alert.
- The reverse-approach "back door" of 04-05 (lobby → archive → control room → chamber) is open before lockdown and watched only by the chamber guard's away post.

## REGRESSION

On the final bake (2026-10-05):

- `npm test`: exit 0, 1007 checks pass, 0 fail (campaign suite 602 / 602).
- TypeScript (`tsc --noEmit`): PASS.
- lint: 0 errors, 2 existing warnings (`src/ota/applyUpdate.ts`).
- Bake equals the runtime file; Chapter 5–9 byte-equal to the Phase 5 build (scope tests).
- Tilt, guard AI, CCTV and save files untouched in this phase (protected-hash test passes).

Physical iPhone: **DEVICE REVIEW PENDING**.

## Evidence

`Reports/V13Phase2/`: `render/` (offline renders), `sim/` (Simulator captures), `sheets/` (asset sheets),
`dense-trace-all.log` (30-run trace, all 20 V13 maps), `mission-qa.log`, `campaign-tests.log`, `all-tests.log`,
`typecheck.log`, `lint.log`. `Reports/V13Phase1/mission-qa.json` (per-mission audit, all 20).
