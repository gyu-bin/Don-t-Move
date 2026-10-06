# V13 Phase 2C — Chapter 4 Lab Finalization

Status: **CHAPTER 4 ART PASS APPLIED TO ALL FIVE MAPS, SIMULATOR-CHECKED, NOT COMMITTED.** Not Production Ready.

## 04-04 Pilot Final — PASS

- CCTV is back at its original position (16, 1.4); formula, sweep, range and angle untouched. It sees 90% of
  the floor in its cone (84% before Phase 2B, when a fume hood stood there).
- Decontamination arch moved 0.5 tile into the room (base y 3.9 → 4.4). The thief now starts above it and is
  fully visible; he walks through it on the first steps. Entry and spawn coordinates unchanged.
- The mobile screen stands flush against the arch's east post as one entry line and ends 0.55 tile west of the
  camera's axis, so nothing is in front of the camera.
- To clear the arch posts, the intake room's authored route node and its two bend points moved 0.5 tile south
  (y 4.6 → 5.1). These are the guide points of the test routes, not walls, doors or guards.
- Simulator, whole map: entry, receiving corner, research (prep lab), objective and exit all in one capture
  (`Reports/V13Phase2C/sim-04-04-whole.png`).

## REDRAW 5

Cut from the third sheet (transparent background, labels dropped), packaged to the runtime canvas, pivot
bottom-centre. Ground-line tilt after correction in brackets.

| Asset | Old → new | Used in |
|---|---|---|
| lab_robot_cell | isometric rail cell → front-facing glazed cell; footprint 2×1.6 → 2×1.2 (0.000) | 04-05 chamber |
| lab_stool | cyan stool at an angle → dark stool, lightened (−0.012) | 04-02 ×3 |
| lab_cart | levelled 0.119 → 0.003 | not placed |
| lab_small_machine (the brief's `lab_small_equipment`) | levelled −0.050 → −0.010 | not placed |
| lab_monitor → **lab_monitor_station** | the new art is a floor console, the old one a wall-mounted screen, so it is a new solid piece (1.9×0.85, blocks sight); levelled 0.073 → 0.002. Old `lab_monitor` is retired. | 04-01 analysis lab (the console the sample guard reads), 04-02 monitoring room |

Cart and small machine were not placed: no room had a job for them.

## Mission Results

Judged on whole-map Simulator captures (iPhone 17 Pro, `Reports/V13Phase2C/sim-<id>-whole.png`), which show
spawn, mid-map, objective and exit together. Close-up device-scale views were taken only at the 04-04 spawn.

| Mission | Result | Notes |
|---|---|---|
| 04-01 | PASS | Glass front is now the front-facing glass partition; analysis console → monitor station |
| 04-02 | PASS | New stools; arrival gas rack → specimen display; monitoring rack → monitor station; one hazard sign removed (that removal was not re-captured) |
| 04-03 | PASS | Glass line is five front-facing panels in a straight line; fridges at the 04-04 size |
| 04-04 | PASS | See above |
| 04-05 | PASS | New robot cell; three landmarks, one per room (prototype rig, robot cell, coolant rig) |

Routes, guards, cameras and doors of 04-01, 04-02, 04-03 and 04-05 are unchanged.

## Asset Audit Final (37 Lab runtime sprites)

- KEEP 16.
- TUNE 9. The glass partition's frame was the same colour as its panes and became translucent with them; it
  is now drawn back as plain opaque rails, posts and two mullions over 59%-opaque panes.
- REDRAW completed 5 (above).
- REMOVED from Chapter 4 maps 7: equipment_rack, sample_storage, sterile_partition, glass_wall,
  glass_corridor, sliding_door, monitor (old). Files remain on disk.

## Tests

- TypeScript PASS. lint 0 errors, 2 existing warnings.
- `npm test` 1007 / 1007. Campaign 602 / 602. Environment 11 / 11.
- Manifest validation: missing 0, invalid 0. The validator no longer holds per-chapter numbers; it requires
  the manifest to list exactly the ids of the runtime kit (`src/assets/environmentKit.ts`), once each.
- Chapter 5–9 byte-equal to the Phase 5 build (scope test). Chapter 1–3 map sources not edited in this
  phase. Tilt and guard / CCTV code not edited in this phase.

## Remaining Issues

- The fridges, server racks and fume hood were levelled, not redrawn: a thin side face is still visible.
- Vertical glass (04-02 core, 04-05 lab) is still the drawn panel; the new glass sprite is horizontal only.
- `tools/environment/bankKit.test.ts` and `labCasinoKit.test.ts` still assert old catalog sizes; they are not
  part of any test script, so they were left.
- The scripted-thief numbers were not re-measured.
