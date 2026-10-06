# V13 Phase 3 — Chapter 3 Bank Rework, and the overnight pass (Chapters 4–9)

Status: **WORK IN PROGRESS LOG, NOTHING COMMITTED.** Not Production Ready. Difficulty is not verified by play.

## Chapter 3 — Mission Results

Judged on whole-map Simulator captures (iPhone 17 Pro), `Reports/V13_CH3_REWORK/sim-<id>-whole.png`.

| Mission | Before | Final | Notes |
|---|---|---|---|
| 03-01 | MINOR | PASS | Gate moved off the spawn into the counter line; teller-floor island; exit-room column |
| 03-02 | MINOR | PASS | Camera sees 95% again (island moved out of its axis); north lane widened; exit-room column |
| 03-03 | MAJOR | PASS | West-aisle column, cage island, sorting-aisle column, flush gates, staggered trolleys, clean bay walls |
| 03-04 | MINOR | PASS | Entrance column, anteroom column, stair and exit-lobby cover |
| 03-05 | MAJOR | MINOR | Two vault islands, east-stair chicane, exit column, west-stair cover. Islands sit side by side, not staggered (see below) |

Common to all five:
- **Vault door**: the gold-framed vault door is replaced by the wall-integrated security door style on every objective room (`style:'bankSecurity4c'` on the approach door). Collision and behaviour unchanged.
- **Perspective**: ATM, bench, deposit island, cage trolley, security desk and counting machine were levelled (ground-line tilt ≤ 0.03). **Cash pallet and guard booth are drawn corner-on and cannot be levelled: REDRAW candidates.** They stay only where the brief keeps them (03-03 pallet, 03-04 booth).
- **Shadows**: levelling puts the contact shadow back under the bench and the island.

### Per map

- **03-03** — Added: marble column in the west aisle (first cover 2.5 tiles from the entry), deposit island in the cage (the cage wall was opened by one cell so there is a 1.5-tile lane on each side), marble column in the sorting aisle between the gate and the exit door. Moved: both trolleys off the east wall (staggered), gates widened to the aisle (no side gap). Walls: the bay's two corner stubs removed. Cover graph: entry → column → partitions → north gate → island → prize → pier → island → gate → column → exit. Guards / CCTV: unchanged. Route nodes moved 0.5 tile to clear the columns.
- **03-05** — Added: two deposit islands in the vault flanking the door, corridor-wall chicane in the east stair (west / east / west, so no straight line), counting machine and trolley as the middle piece, column in the exit lobby, trolley and counting machine in the west stair. Moved: wall clock away from the camera. Guards: the stair guard now holds the foot of the stair on the west side (he stood on the escape lane); vault guard's away time 4 → 6 s. CCTV unchanged. **Not done as specified:** the islands are level with each other; the 5-tile vault with the door landmark on its north wall leaves no room to stagger them with a full lane on both sides.
- **03-01** — Gate at the east opening between the counters; counting machine as an island at the end of the east partition; column in the staff exit on the door-to-exit line. Guards / CCTV unchanged.
- **03-02** — Pool island smaller and south-east of the camera's axis; cubicle desks shallower and partitions 0.4 tile lower so the north lane is visible; column in the stair room. Guards / CCTV unchanged.
- **03-04** — Column in the service entrance (cover 1.3 tiles from the spawn, breaks the hall guard's view through the door); anteroom scanner flush to the east wall with a column at its west end (removes the 1.4-tile gap); trolley in the west stair; column in the exit lobby. North / south lane difference in the hall is unchanged: the guard's lane is the short one. Guards / CCTV unchanged.

Scripted thief, 30 runs per map (ranking aid only): 03-01 18, 03-02 19, 03-03 17, 03-04 11, 03-05 13.

## Chapter 5 — Casino (new)

The five casino floors were old-style carved layouts with 8–9 props each. They are rebuilt as V13 missions
(`tools/campaign/v13Casino.ts`): **the floor plans, routes and patrols of the reworked Bank missions, mirrored
left to right, furnished with the Casino kit**, plus a second camera per floor. Every Bank structure is
replaced by a Casino piece that fits inside the same footprint.

| Casino | From | Scripted (30) |
|---|---|---|
| 05-01 Cashier Floor | 03-01 | 12 |
| 05-02 High Roller Rooms | 03-02 | not measured |
| 05-03 Surveillance Suite | 03-04 | 6 |
| 05-04 Roulette Exchange | 03-03 | not measured |
| 05-05 Casino Heist | 03-05 | not measured |

This is a stand-in for individually drawn casino plans. To go back to the old casino maps, remove
`...V13_CASINO` from `V13_MISSIONS` in `tools/campaign/v13Build.ts` and re-bake.

## Chapter 4 — Lab

No change tonight (Phase 2C stands). The whole-map audit was re-run: cameras see 74–94% of their floor
(04-01 at 74% is partly blocked by the test machine on purpose, as before).

## Chapter 6–8 — Mansion, Warehouse, Security HQ (new)

Same method as the Casino (`tools/campaign/v13Late.ts`, helpers in `v13Reuse.ts`): a proven plan mirrored
left to right and re-furnished inside the same footprints.

| Chapter | Plans from | Furniture | Guards / cameras |
|---|---|---|---|
| 6 Mansion | Gallery (mirrored) | wood partitions, classical statues, low tables, sofas; portraits kept | 4 / 2 |
| 7 Warehouse | Museum (mirrored) | crates, machinery, shelving, plain partitions; wall art removed | 4 / 2 |
| 8 Security HQ | Lab (mirrored) | consoles, monitor stations, server racks in place of wet-lab pieces | 4–5 / 3 |

- Extra guards and cameras are placed by rule: guards in route rooms nobody watched (escape legs first),
  walking the room end to end; cameras on the north wall of unwatched route rooms with a clear view ahead.
- The old chapters had 5 guards (Warehouse, HQ); the borrowed plans are smaller, and the rule found room for
  4 (5 on three HQ maps). Guard perception and speed still come from each chapter's own archetype
  (vision 4.4 / 4.6 / 4.8 tiles), so later chapters remain stricter than the plans they borrow.
- All 15 compose with 0 topology errors, 0 sealed pockets, 0 squeezes; patrol legs clear. Captured in the
  Simulator (`Reports/V13_CH5_9/sim-<id>-whole.png`); three were opened and looked at (06-01, 07-01 offline,
  08-01), the rest were not individually inspected.
- Neither chapter has art of its own: `docs/design/v13/ASSET_REQUEST_CH6_CH9.md` lists ten pieces each.

## Chapter 9 — Vault: not rebuilt

A Vault set made from the Bank floors failed the campaign's no-duplicate-floor test (a mirrored Bank floor is
already the Casino, and the test also rejects rotations). Chapter 9 keeps its old maps. It needs five floor
plans of its own.

## What this pass is and is not

- It makes Chapters 5–8 structurally equal to Chapters 1–4 (rooms, cover islands, exit-side security, lockdown
  doors, cameras that see their floor) and removes the near-empty carved layouts.
- It does not give those chapters their own level design: a player will recognise the Bank in the Casino and
  the Lab in the HQ. Mission titles of Chapters 5–8 no longer describe their floors.
- No art was created: this session has no image tool. New art arrived only as sheets pasted by the user.
- Scripted-thief numbers for Chapters 5–8 were measured on two Casino maps only.
- To undo any chapter: remove its list from `V13_MISSIONS` in `tools/campaign/v13Build.ts` and re-bake.

## Tests (final bake)

`npm test` 1007 / 1007. TypeScript PASS. lint 0 errors, 2 existing warnings. Environment tests 11 / 11.
Manifest validation: missing 0, invalid 0. Runtime: 40 of 45 missions are V13 plans; Chapter 9 is unchanged.
Metro is back on the normal camera and the app was relaunched (checked on 03-05).

## Full check (2026-10-06)

All 45 missions were captured in the Simulator with the whole-map camera and looked at as one sheet per
chapter (`Reports/V13_FULL_CHECK/chapter-<n>.png`, single captures `sim-<id>-whole.png`), and the camera /
guard-post audit was run on the 40 V13 maps (`audit.txt`).

- Fixed: Mansion statues were about 3 tiles tall and one rose above the top wall (now three quarters of the
  size); generated cameras in Chapter 7–8 sat on guard posts (now at least 2.5 tiles apart; 07-04 has one
  camera because no second position qualified).
- Found, not changed: 02-01 / 06-01 portraits rise above the top wall; 02-03 / 06-03 have a statue, a
  partition and a glass case overlapping on screen; cameras under 70% of their floor: 02-04 (63%), 03-03 and
  05-04 (67%, partition on purpose), 07-04 (65%, a crate 2.3 tiles in front), 08-01 (63%).
- Chapter 9 maps are up to 48×38 tiles and do not fit the 30-tile capture; their captures are cropped. They are
  still the old layouts: corridors of small rooms, each with one guard and one camera on the same spot.
- Tests after the fixes: `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors.

## Art pass (2026-10-06, later)

- Chapter 7 Warehouse furnished with the painted warehouse kit (19 pieces, `v13Late.ts` `WAREHOUSE`): each
  Museum slot cycles through several pieces; routes, guards and cameras unchanged; 0 topology errors, 0 gaps.
- Chapter 5 Casino: five new pieces placed, pieces cycled per slot (slot machine 18 → 8), six yawed sprites
  levelled, casino tables and the chip cart now block sight.
- Yaw audit of every sprite in use, all chapters. Levelled: Museum partition (−0.096 → level; 26 placements in
  Chapters 1 and 6). Museum and Gallery are otherwise at 0. Left: Bank plant, Lab cable and floor marker
  (organic or floor decals).
- Simulator whole-map captures after the pass: Chapters 1, 5, 6, 7 (`Reports/V13_ART_PASS/`); Chapters 5, 7
  and 1 were looked at. Tests: `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors, manifest 0 / 0.

## Shadows off, vault kit (2026-10-06, evening)

- No shadow is drawn under structures any more (`buildStageArt.ts`; ovals and contact strips removed, all
  chapters). Characters keep theirs.
- Soft shadows painted into the sprites were cleared as well (`labTune.cjs` `dropShadow`): 61 sheet-sourced
  pieces and 50 older ones; originals are in each venue's `_pretune/`. Seven of the largest changes were
  compared before / after: only the shadow went. Floor decals and see-through pieces were skipped.
- Chapter 9 is dressed with the 16-piece vault kit at draw time; its floor plans, guards and cameras are the
  old ones.
- Tests: `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (2 existing warnings), manifest 0 / 0.
  Simulator (normal camera): 07-01 and the start of 09-01.

## Chapter 9 redesign (2026-10-06, night)

Five floor plans of its own (`tools/campaign/v13Vault.ts`); the old maps (eight 5×5 rooms on corridors, 3 props in
the vault) are gone. No new art: only the 16 registered vault pieces are used. Not committed.

| Map | Size | Way in → prize → way out | Quick / after lockdown |
|---|---|---|---|
| 09-01 Inner Core Ring | 27×23 | south hall → east ring → core vault (east door), prize in the NW bay | north door → north ring → exit lobby / back out east, round the south and west of the ring |
| 09-02 Split Perimeter | 26×22 | SW arrival → west hall → north hall → vault (north door), prize in the NE bay | south door straight into the exit lobby / west door → sorting room → south passage |
| 09-03 Layered Vault Spine | 28×23 | lobby → checkpoint hall → lock → vault, right to left | control run → archive → exit lobby / bullion run → loading bay → lobby → exit lobby |
| 09-04 Counterclockwise Shell | 26×22 | SE arrival → east gallery → north gallery → core (north door) | west door → west gallery → exit lobby / south door → south gallery → pump room |
| 09-05 Final Vault Core | 29×27 | lobby → checkpoint → antechamber → vault, prize at the far end of the vault | east stair → exit lobby / back across the vault → west stair → west wing → lobby |

- Every map: 6 guards and 3 cameras placed by hand, no camera within 2.5 tiles of a guard post, no camera
  facing a prop (clear ahead ≥ 3.8 of 5 tiles; coverage 63–100%). 7–9 rooms of 20–90 tiles instead of eight
  rooms of 25–30.
- Inside each vault: a wall pier closing the prize bay, a blast screen and gold / cash islands that split the
  room into lanes (one walked by the vault guard, one under a camera in 09-01 / 02 / 05). 13–17 structures per
  map, each named in the cover graph or stated as backdrop.
- 09-05 carries the vault door landmark on the north wall (a second wall row was added behind it).
- Checks: 0 topology errors, 0 sealed pockets, 0 squeezes, thief-only traversal clear on both lanes.
  `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (2 existing warnings), `test:environment` 11 / 11,
  manifest 0 / 0.
- Scripted thief (30 runs, a ranking aid, it does not wait for patrols or duck into cover): safe lane 13 / 15,
  7 / 15, 4 / 15, 11 / 15, 0 / 15 for 09-01 … 09-05. 09-05 has no scripted clear: it is caught by the vault
  guard returning to the bay, or on the east stair where the player is meant to wait behind a screen. Not
  played by hand yet.
- Evidence: `Reports/V13_CH9/` — `09-0X_before.png`, `before-analysis.txt`, `render/` (offline), `sim/`
  (Simulator whole-map), `zoom/` (Simulator, normal camera).
- Shadow check at the normal camera (09-01, 09-03, 07-01, 03-03): with no shadow the pieces do not read as
  floating; nothing was added.
- Chapter 9 mission sub-titles renamed to match the floors (`chapterArt.ts`).
- Things found on the way: a tall piece flush to a south wall is cut by the wall cap (moved in 09-02 / 09-03);
  an exit guard posted within two tiles of the quick-escape door catches every run (09-02, moved).
