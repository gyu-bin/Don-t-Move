# Art request — Chapter 3 (Bank) and Chapter 4 (Lab)

Why: each venue has about a dozen usable solid pieces, so five maps of eight rooms repeat them. The maps
already use every front-facing piece that exists. More variety needs more art; nothing below exists yet.

The existing environment art was produced with the Codex image generator
(`assets/environment/generation-provenance.json`). The prompts below follow the same house style so new
pieces sit next to the old ones.

## Common prompt (prepend to every subject)

> Independent single runtime PNG sprite for DON'T MOVE. Match the existing painted game art of this venue:
> elevated orthographic 3/4 top-down, zero yaw, front horizontal edges exactly horizontal, vertical sides
> vertical, clear visible top surface, NOT isometric diagonals and NOT a straight side view. Stylized painted
> bevels, restrained dark outlines, neutral soft lighting, very subtle contact shadow. Whole object isolated,
> centred, transparent padding, genuine transparent background. No floor, room, text, label, UI, grid,
> checkerboard or characters. Readable beside a 30-pixel player.

Venue palette — Bank: charcoal stone, dark green marble, brushed steel, brass trim. Lab: white and pale grey
panels, cyan glass and screens, dark rubber feet, small yellow hazard accents.

Canvas: 512×512 (major / architecture), 384×384 (soft), 768×768 (landmark). Pivot bottom-centre.

## Bank

| Id | Subject | Footprint (tiles) | Height | Job in a map |
|---|---|---|---|---|
| `bank_marble_column` | Round dark-green marble column, brass band at base and capital, broad visible circular top | 1 × 1 | tall | Full cover in halls; pairs make a colonnade |
| `bank_atm_bank` | Two ATM machines side by side in one steel housing, lit screens, card slots | 2 × 0.8 | 2 tiles | Cover island in public halls |
| `bank_waiting_bench` | Low leather bench on brass legs, no back | 2.5 × 0.8 | low | Low cover in lobbies and corridors |
| `bank_security_desk` | Curved guard desk, two monitors, phone, brass rail | 3 × 1 | 1.5 tiles | Guard post to sneak round; checkpoint and monitor rooms |
| `bank_guard_booth` | Free-standing security booth, steel lower half, glazed upper half, flat roof | 2 × 1.5 | 2.5 tiles | Landmark cover in corridors |
| `bank_cash_pallet` | Shrink-wrapped pallet of banknote bricks on a wooden pallet | 1.5 × 1.2 | low | Cover in cash processing and the dock |
| `bank_cage_trolley` | Tall wheeled steel cage trolley with canvas money bags | 1.2 × 0.8 | 2 tiles | Cover in the dock and bay; replaces repeated carts |
| `bank_counting_machine` | Banknote counting machine on a steel stand with a hopper and small display | 1.5 × 0.8 | 1.5 tiles | Cover in cash processing |
| `bank_deposit_island` | Free-standing double-sided block of safe-deposit boxes with a viewing shelf | 2.5 × 1.2 | 2 tiles | Island cover inside vault rooms |
| `bank_brass_screen` | Standing teller screen: brass frame, frosted glass, marble foot | 3 × 0.35 | 1.7 tiles | Second partition look beside `bank_wall` |

## Lab

The first four replace sprites that are drawn at a skewed angle and are therefore used sparingly or not at
all (`lab_equipment_rack`, `lab_sample_storage`, `lab_sterile_partition`, `lab_glass_wall`).

| Id | Subject | Footprint (tiles) | Height | Job in a map |
|---|---|---|---|---|
| `lab_server_rack_front` | Two server racks side by side seen from the front, blue status lights, vented doors | 1.8 × 0.65 | 2.4 tiles | Tall cover; replaces the skewed rack |
| `lab_sample_fridge_front` | Glass-door sample refrigerator seen from the front, shelves of vials | 1.9 × 0.65 | 2.3 tiles | Tall cover; replaces the skewed storage cabinet |
| `lab_mobile_screen` | Rolling opaque partition screen, white panels on castors | 2.2 × 0.35 | 1.7 tiles | Partition; replaces the skewed sterile partition |
| `lab_glass_partition_front` | Framed glass partition panel seen from the front, cyan tint, steel feet | 3 × 0.25 | 1.7 tiles | See-through barrier; replaces the skewed glass wall |
| `lab_fume_hood` | Fume hood cabinet, glass sash half open, glassware inside, base cupboard | 2.2 × 0.9 | 2.2 tiles | Cover against a wall or as an island |
| `lab_centrifuge_bench` | Bench with a centrifuge, an analyser and a small monitor | 2.5 × 1 | 1.5 tiles | Low cover; second bench look |
| `lab_robot_cell` | Small robotic arm on a pedestal inside a low safety rail | 2 × 2 | 2 tiles | Landmark island |
| `lab_gas_rack` | Rack of four gas cylinders chained upright, yellow caps | 1.6 × 0.7 | 1.8 tiles | Cover in corridors and plant rooms |
| `lab_specimen_tank_low` | Long horizontal specimen tank on a plinth, cyan liquid, steel end caps | 2.5 × 1 | low | Low cover; exhibit in lobbies |
| `lab_decon_arch` | Walk-through decontamination arch with nozzles and a status light | 2.4 × 0.5 | 2.5 tiles | Threshold between zones; second arch look |

## Wiring

Drop the PNG in `assets/environment/<venue>/<major|soft|architecture|landmark>/` and run
`node --import tsx tools/environment/buildManifest.ts`. Each new id then needs one line in
`src/game/world/propKit.ts` (footprint, whether it blocks sight) before the maps can place it.
