# V13 Phase 2B — Chapter 4 Lab Art Consistency Pass

Status: **PILOT 04-04 DONE, AWAITING APPROVAL.** 04-01, 04-02, 04-03 and 04-05 have not been re-arranged.
Not Production Ready.

Scope kept: no change to Tilt, characters, guard AI, CCTV formula, theft/lockdown, doors, saves, audio,
objective / entry / exit, topology, Chapter 5–9. One Chapter 3 sprite was replaced (see Changed Assets).

## Reference Set

Chosen by measurement, not by name. For every Lab sprite the ground line was measured (height difference of
the lowest solid pixels in the left and right quarters ÷ width; 0 = no camera yaw).

`lab_wall` (0.000), `lab_observation_console` (−0.002), `lab_workstation` (0.000), `lab_large_table` (0.004),
`lab_cryo_unit` (−0.013).

The candidates named in the brief measured as yawed before correction: `lab_server_rack_front` 0.119,
`lab_sample_fridge_front` 0.132, `lab_fume_hood` 0.154, `lab_centrifuge_bench` 0.120, `lab_mobile_screen` 0.208.

## Audit (36 Lab runtime sprites)

- **KEEP: 16** — wall, observation_console, workstation, large_table, cryo_unit, cryo_chamber,
  central_experiment, prototype_machine, observation_room, experiment_machine, sample_case,
  specimen_container, warning_sign, floor_marker, cable, decon_arch (the front redraw, as supplied).
- **TUNE: 9 (done)** — see Changed Assets.
- **REDRAW: 5** — robot_cell (isometric, 14% yellow, 69% dark), stool (0.14, 46% cyan), cart, monitor,
  small_machine. A shear cannot fix these. Still in maps: stool ×3 (04-02), robot_cell ×1 (04-05).
- **REMOVE / REPLACE: 6** — equipment_rack (0.213), sample_storage (0.258), sterile_partition (0.277),
  glass_wall (0.180), glass_corridor (0.205), sliding_door (0.203). Each has a corrected counterpart; none is
  placed in a Chapter 4 map any more. Files are left on disk.

## Changed Assets

Tool: `tools/environment/labTune.cjs` (pixel corrections only; originals kept in `_source/raw/` and
`_pretune/`). Tilt before → after.

| Asset | Change |
|---|---|
| lab_wall_screen | levelled, 0.154 → 0.008 |
| lab_mobile_screen | levelled, 0.208 → −0.027 |
| lab_fume_hood | levelled, 0.154 → 0.037 |
| lab_sample_fridge_front | levelled 0.132 → 0.032; lightened (luminance 0.46 → 0.50) |
| lab_server_rack_front | levelled 0.119 → 0.030; lightened (0.26 → 0.41) |
| lab_centrifuge_bench | levelled 0.120 → 0.030; lightened (0.45 → 0.49) |
| lab_gas_rack | levelled 0.181 → 0.045; lightened (0.29 → 0.36) |
| lab_specimen_tank_low | levelled 0.202 → 0.014 |
| lab_glass_partition_front | replaced by the user's front redraw; the guard and desk painted behind the glass removed; panes 59% opaque, frame opaque |
| lab_decon_arch | replaced by the user's front redraw (2.1 tiles tall instead of 3.5); posts' collision widened to match |
| bank_brass_screen (Chapter 3) | replaced by the user's front redraw; panes 63% opaque. Supplied in the same sheet, so it was installed although the brief excludes Chapter 3. Checked in 03-02. |

"Levelled" is a vertical shear: front edges become horizontal and verticals stay vertical. On flat panels
this is exact. On boxes (fridge, rack, hood, bench) the front face becomes true but a sliver of side face
remains, so they are close to the reference set, not identical.

## Pilot 04-04

Before: `Reports/V13Phase2B/04-04-before.png`. After: `04-04-after.png`.

- Before: wall screens slanted; fume hood, fridge and server rack each at a different angle in one room; the
  fridge taller than the rack beside it; cover from the camera was a fume hood in an arrival room.
- After, by zone — Arrival: decontamination arch at the entry with a mobile screen as its wing (the cover
  from the camera), one cryo chamber as the only landmark, two sample fridges as the intake store.
  Storage: cryo banks (unchanged). Research: centrifuge bench. Vault: observation console.
- Camera moved from x 16 to 17.6 so the partition is not in front of it (sees 88% of its floor).
- Removed from the map: fume hood, server rack. Routes, guards and doors unchanged.
- Simulator (iPhone 17 Pro, normal camera): spawn area and the storage hall checked
  (`sim-04-04-spawn.png`, `sim-04-04-mid.png`). **Objective and exit areas were checked in the offline
  render only** — the whole-map Simulator capture did not take effect.
- Verdict: MINOR. Reads as one kit at device scale; the two fridges still show a side face.

## Chapter 4 Final

| Map | State |
|---|---|
| 04-04 | Pilot applied — MINOR |
| 04-01, 04-02, 04-03, 04-05 | Not re-arranged. They already draw the corrected sprites (shared files); not re-checked in the Simulator. |

## Tests

- TypeScript: PASS. lint: 0 errors, 2 existing warnings.
- `npm test`: 1007 pass, 0 fail (campaign 602 / 602). `test:environment`: 11 / 11.
- Manifest validation (`tools/environment/validate.ts`): missing 0, invalid 0. Its fixed counts were stale
  (expected Gallery 10 / Bank 20 / Lab 26; the catalog has 20 / 30 / 36) and were updated.

## Remaining Issues

- Five sprites need a real redraw (list above); two of them are still in maps.
- The first-sheet pieces are about 200 px wide at source and are drawn slightly enlarged.
- 04-04 is cyan-heavy (eight cryo units); that is the room's identity, above the 8–12% target.
- The thief spawns inside the arch and its mist covers him for the first step.
- Scale classes were set per placement in 04-04 (fridge 0.9, bench 0.92), not in the kit, so other maps keep
  their old sizes until the pass reaches them.
