# Chapter 6 Mansion / Chapter 8 Security HQ — art needed (V13 Phase 5 audit, 2026-10-06)

Audit result: the project has no `mansion_*` and no `hq_*` art. `assets/environment/` holds museum, gallery, bank,
lab, casino, warehouse and vault only; `environmentKit.ts` and `environment-assets.json` name neither chapter.
All ten suggested Mansion ids and all ten suggested HQ ids are MISSING. Nothing was replaced.

Footprint = floor area the piece blocks, in tiles (width × depth), taken from the slots the borrowed pieces fill
today. A new piece drawn to the same footprint swaps in without touching routes, patrols or camera views.

## Chapter 6 — placed today (all borrowed or drawn shapes)

| Piece | Count | Maps (01–05) | Footprint | Sight |
|---|---:|---|---|---|
| museum_partition | 14 | 3 / 2 / 2 / 3 / 4 | 2.8–3.4 × 0.7–0.8 | opaque |
| museum_display_low | 11 | 2 / 3 / 2 / 2 / 2 | 1.8–2.4 × 1.0–1.4 | see-through |
| museum_statue_large | 11 | 2 / 3 / 3 / 2 / 1 | 1.4–2.0 × 1.0–1.6 | opaque |
| sofa (grey drawn shape) | 9 | 3 / 2 / 2 / 1 / 1 | 1.6 × 0.7 | see-through |
| shelf (drawn shape) | 2 | 0 / 0 / 0 / 1 / 1 | 3.0–3.4 × 1.6–1.8 | opaque |
| museum_pedestal | 1 | 06-04 | 1.3 × 1.0 | see-through |
| glass panels (drawn), portraits, masterpiece wall | 10 | | | kept: they read as a house |

## Chapter 6 — needed, in priority order

| Chapter | Needed ID | Description | Footprint | Role | Replace |
|---|---|---|---|---|---|
| 6 | `mansion_bookshelf` | tall dark-wood bookcase, full of books, front view | 3.0 × 0.75, tall | full cover, divider | museum_partition (half of the 14) |
| 6 | `mansion_armor_display` | suit of armour on a low wooden plinth | 1.5 × 1.2, tall | LOS break, landmark | museum_statue_large (small slots) |
| 6 | `mansion_dining_table` | long table with cloth and candlesticks, low | 2.2 × 1.2, low | divider, low cover | museum_display_low |
| 6 | `mansion_sofa` | burgundy or green sofa, brass studs | 1.6 × 0.7, low | divider | the grey drawn sofa |
| 6 | `mansion_room_divider` | folding wooden screen with carved panels | 3.0 × 0.75, tall | full cover, divider | museum_partition (other half) |
| 6 | `mansion_cabinet` | tall china cabinet, dark wood and glass doors | 2.0 × 1.4, tall | LOS break | museum_statue_large (large slots) |
| 6 | `mansion_grand_piano` | black grand piano, lid up | 3.2 × 1.7, mid | full cover island | the drawn shelf (2) |
| 6 | `mansion_writing_desk` | writing desk with lamp, or a console table | 1.8 × 1.0, low | divider | museum_display_low (small slots), museum_pedestal |

Not requested: fireplace and grandfather clock. No slot on any Chapter 6 map takes them (a fireplace would be
new wall decoration, a clock is half the width of the smallest slot), so they would not replace anything.

## Chapter 8 — placed today (all Lab art)

| Piece | Count | Maps (01–05) | Footprint | Sight |
|---|---:|---|---|---|
| lab_server_rack_front | 19 | 0 / 0 / 2 / 11 / 6 | 1.3–2.2 × 0.5–0.8 | opaque |
| lab_wall_screen | 12 | 3 / 2 / 2 / 2 / 3 | wall-mounted | — |
| lab_observation_console | 10 | 3 / 1 / 1 / 1 / 4 | 2.5–3.4 × 0.8–1.1 | opaque |
| lab_monitor_station | 8 | 3 / 2 / 0 / 2 / 1 | 2.0–2.9 × 0.9–1.3 | opaque |
| lab_glass_partition_front | 7 | 2 / 0 / 5 / 0 / 0 | 2.0–2.7 × 0.2 | see-through |
| lab_wall + lab_mobile_screen | 7 | 1 / 0 / 5 / 1 / 0 | 2.2–3.0 × 0.3–0.4 | opaque |
| lab_warning_sign (biohazard) | 6 | 1 / 2 / 1 / 1 / 1 | wall-mounted | — |
| lab_workstation | 4 | 0 / 1 / 1 / 0 / 2 | 1.8–2.4 × 0.8–1.1 | opaque |
| lab_observation_room + lab_decon_arch | 3 | 0 / 0 / 1 / 1 / 1 | 2.4–4.0 × 0.4–0.5 | see-through |
| lab_large_table | 2 | 08-01, 08-03 | 3.0 × 1.2 | opaque |
| floor markers, cables, stools, drawn glass | 25 | | | kept: not lab-specific |

## Chapter 8 — needed, in priority order

| Chapter | Needed ID | Description | Footprint | Role | Replace |
|---|---|---|---|---|---|
| 8 | `hq_command_console` | curved graphite console, blue screens | 2.7 × 0.9, mid | full cover | lab_observation_console |
| 8 | `hq_security_desk` | front desk with monitors and a duty lamp | 2.0 × 0.9, mid | full cover | lab_monitor_station |
| 8 | `hq_server_row` | black server rack, blue status lights, front view | 1.8 × 0.65, tall | full cover | lab_server_rack_front |
| 8 | `hq_video_wall` | wall-mounted bank of CCTV screens | wall, 1.4 wide | backdrop | lab_wall_screen |
| 8 | `hq_security_locker` | row of dark steel lockers, front view | 3.0 × 0.4, tall | full cover, divider | lab_wall, lab_mobile_screen |
| 8 | `hq_duty_desk` | plain steel desk with one terminal | 1.8 × 0.85, mid | cover | lab_workstation |
| 8 | `hq_checkpoint` | walk-through security gate | 3.0 × 0.5, see-through | threshold | lab_observation_room, lab_decon_arch |
| 8 | `hq_wall_sign` | "restricted area" wall plate, red and yellow | wall, 0.6 wide | backdrop | lab_warning_sign (biohazard) |
| 8 | `hq_response_table` | briefing table with radios and a map | 3.0 × 1.2, low but opaque | full cover | lab_large_table |

Not requested: access station and equipment rack (no slot of their own; the server row covers the rack slots),
and a glass partition (the present one is plain steel and glass).

## Drawing rules (same as the kits already in the game)

- One piece per cut-out, transparent background, no label, no checkerboard, 4–5 pieces per sheet so each is
  about 400 px wide or more.
- Zero yaw: the front bottom edge is horizontal. Same top-down three-quarter view as the Vault and Warehouse kits.
- No shadow under the piece and no empty margin under its feet.
- Width-to-depth as in the footprint column; "tall" pieces may rise about two tiles, "low" about one.

## Delivered and placed (2026-10-06)

All 17 pieces arrived on two sheets (transparent, zero yaw). Taken per piece from whichever sheet fitted its slot:
sheet 1 — bookshelf, armour display, dining table, sofa, writing desk, checkpoint, wall sign, response table;
sheet 2 — room divider, cabinet, grand piano, command console, security desk, server row (two of its four racks),
video wall, locker, duty desk. Sources: `assets/environment/mansion/_source/`, `assets/environment/hq/_source/`.
