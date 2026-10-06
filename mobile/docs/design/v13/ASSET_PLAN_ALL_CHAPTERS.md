# Asset plan — all nine chapters

Goal: no chapter should read as the same few pieces repeated. This lists, per chapter, what repeats today,
what can be used right now without new art, and what new art to make. It replaces
`ASSET_REQUEST_CH3_CH4.md` and `ASSET_REQUEST_CH6_CH9.md` (both already partly delivered or folded in here).

Numbers are from the baked campaign on 2026-10-06: solid placements across the chapter's five maps, and how
many different pieces those placements use.

| Chapter | Solid placements | Different pieces | Most repeated |
|---|---|---|---|
| 1 Museum | 50 | 7 | partition ×12, large display case ×9, low display ×7 |
| 2 Gallery | 53 | 7 (+5 wall pieces) | art wall ×14, plinth ×11, sculpture ×11, bench ×9 |
| 3 Bank | 90 | 22 | deposit box wall ×11, marble column ×9, filing cabinet ×7 |
| 4 Lab | 68 | 19 | cryo unit ×10, glass ×15, console ×5 |
| 5 Casino | 83 | 12 | slot machine ×18, wall ×11, cashier cage ×11, security station ×9 |
| 6 Mansion | 53 | 7, all borrowed | partition ×14, low display ×11, statue ×11, sofa ×9 |
| 7 Warehouse | 50 | 5, all drawn shapes | crate ×21, partition ×12 |
| 8 Security HQ | 68 | 13, all Lab art | cryo unit ×10, console ×9, monitor station ×8 |
| 9 Vault | 50 | 6, all drawn shapes | counter, partition, equipment, pillar ×10 each |

## How to deliver

- One sheet = 4–5 pieces, transparent background, a name label under each piece. At that size each piece is
  350+ px wide (the first 20-piece sheet gave 200 px, which is drawn slightly soft in game).
- Camera for every piece: elevated 3/4 top-down, **zero yaw** — front edges exactly horizontal, vertical edges
  vertical, top surface visible. No isometric diagonals, no cast shadow, no floor, no text on the object.
- Give the generator two or three existing sprites of the same chapter as reference images.
- Glass: paint only the frame and a flat tint; nothing behind the pane (the game makes panes translucent).
- Footprints below are in tiles (1 tile = 40 world units; the thief is about 0.45 tile wide).

Common prompt to prepend:

> Independent single runtime PNG sprite for DON'T MOVE. Match the supplied reference sprites exactly in camera,
> perspective, scale, painterly rendering, outline weight and lighting. Elevated orthographic 3/4 top-down,
> zero yaw, front horizontal edges exactly horizontal, vertical sides vertical, clear visible top surface.
> Whole object isolated and centred, genuine transparent background, no floor, no shadow beyond a faint
> contact shadow, no text, no UI, no characters.

## Usable now (already in the project, placed in no map)

These need no new art, only placement:

| Chapter | Pieces |
|---|---|
| 1 Museum | wall painting, rope barrier |
| 2 Gallery | white wall, track light, 3 portrait frames, 5 abstract frames |
| 3 Bank | queue barrier, paperwork, staff door |
| 4 Lab | fume hood, gas rack, cart, small machine |
| 5 Casino | roulette table, roulette centrepiece, high-roller table, velvet partition, cocktail table, chair, chandelier, VIP room arch, chip stack, drink tray |

The Casino is the big one: ten finished pieces are unused while the slot machine appears 18 times.

## New art, by priority

### Priority 1 — chapters with no art of their own

**7 Warehouse** (grey steel, yellow safety paint, raw wood, tarpaulin) — 10 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| warehouse_pallet_rack | Two-bay pallet racking with boxed loads | 3 × 0.8 | tall | Long cover wall (replaces drawn partition ×12) |
| warehouse_container | 10-ft shipping container, doors closed | 3.2 × 1.4 | tall | Landmark block |
| warehouse_crate_stack | Three wooden crates stacked unevenly | 1.4 × 1.2 | mid | Cover island |
| warehouse_crate_single | One large wooden crate with stencil marks | 1 × 0.9 | low | Small cover |
| warehouse_drum_cluster | Four steel drums on a pallet | 1.3 × 1.1 | mid | Cover island |
| warehouse_forklift | Parked forklift, forks down | 1.4 × 2 | mid | Landmark, one per map |
| warehouse_conveyor | Roller conveyor section with parcels | 3 × 0.8 | low | Divider you can see over |
| warehouse_workbench | Steel workbench with vice and tool board | 2 × 0.8 | mid | Guard post / cover |
| warehouse_tarp_load | Tarpaulin-covered load, roped | 2 × 1.4 | mid | Cover island |
| warehouse_chainlink_panel | Chain-link fence panel on steel feet (see-through) | 3 × 0.25 | tall | Blocks movement, not sight |

**9 Vault** (dark steel, gold, red laser light) — 10 pieces, plus five floor plans (not art)

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| vault_bullion_stack | Pyramid of gold bars on a steel pallet | 1.5 × 1.2 | low | Cover island |
| vault_safe_bank | Row of three floor safes | 3 × 0.6 | mid | Long cover |
| vault_pillar | Square armoured pillar with gold band | 1 × 1 | tall | Full cover |
| vault_cash_cage | Wire cage of banknote bricks | 2 × 1.2 | tall | Cover island |
| vault_display_plinth | Armoured glass plinth, empty | 1 × 0.8 | mid | Decoy / low cover |
| vault_control_pedestal | Keypad pedestal with red light | 0.8 × 0.6 | mid | Small cover, security prop |
| vault_laser_emitter | Wall-mounted laser emitter (wall piece) | — | — | Room identity |
| vault_inner_gate | Barred gate frame, walk-through | 2.4 × 0.5 | tall | Threshold |
| vault_trolley | Steel bullion trolley | 1.1 × 0.75 | mid | Small cover |
| vault_blast_screen | Free-standing armoured screen | 3 × 0.35 | mid | Partition |

### Priority 2 — chapters running on borrowed art

**6 Mansion** (dark wood, brass, deep green and burgundy fabric) — 10 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| mansion_bookcase | Tall double bookcase with carved cornice | 3 × 0.4 | tall | Partition (replaces museum partition ×14) |
| mansion_folding_screen | Three-leaf painted folding screen | 2.2 × 0.3 | mid | Second partition look |
| mansion_sofa | Chesterfield sofa, low back | 2.4 × 0.7 | low | Low cover (replaces drawn sofa ×9) |
| mansion_dining_table | Long dining table with candelabra | 2.6 × 1.2 | low | Island (replaces low display ×11) |
| mansion_writing_desk | Writing desk with lamp and papers | 1.8 × 0.9 | mid | Cover island |
| mansion_grand_piano | Grand piano, lid closed | 2.2 × 1.6 | mid | Landmark, one per map |
| mansion_armor | Suit of armour on a plinth | 0.9 × 0.7 | tall | Full cover (replaces statue ×11) |
| mansion_curio_cabinet | Glazed curio cabinet | 1.4 × 0.6 | tall | Cover |
| mansion_grandfather_clock | Tall case clock | 0.8 × 0.5 | tall | Narrow cover |
| mansion_fireplace | Stone fireplace with mantel (wall piece) | 2.5 × 0.5 | mid | Room identity |

**8 Security HQ** (charcoal, blue screens, red status lights) — 10 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| hq_weapons_locker | Bank of steel lockers | 2 × 0.6 | tall | Replaces cryo unit ×10 (the piece that most says "lab") |
| hq_video_wall | Free-standing video wall, 3 × 2 screens | 3 × 0.4 | tall | Partition |
| hq_operator_console | Curved operator console, three screens | 2.8 × 0.9 | mid | Replaces observation console ×9 |
| hq_duty_desk | Duty desk with radio and logbook | 1.9 × 0.85 | mid | Replaces monitor station ×8 |
| hq_server_row | Row of three server cabinets, red lights | 2.7 × 0.7 | tall | Long cover |
| hq_briefing_table | Briefing table with city map | 2.6 × 1.2 | low | Island |
| hq_riot_rack | Rack of shields and helmets | 1.8 × 0.6 | mid | Cover |
| hq_turnstile | Full-height turnstile, walk-through | 2.4 × 0.5 | tall | Threshold |
| hq_glass_partition | Framed glass partition (see-through) | 3 × 0.25 | mid | Blocks movement, not sight |
| hq_holding_cell | Barred holding cell front | 3 × 0.5 | tall | Landmark wall piece |

### Priority 3 — chapters with their own art but too few pieces

**1 Museum** (ivory, navy, brass) — 6 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| museum_vase_plinth | Large ceramic vase on a square plinth | 0.9 × 0.9 | tall | Full cover, alternative to the column |
| museum_bust_plinth | Marble bust on a tall plinth | 0.8 × 0.6 | tall | Narrow cover |
| museum_dinosaur_skull | Fossil skull on a low base | 2.2 × 1.4 | mid | Landmark island |
| museum_artifact_table | Glass-topped table of small artefacts | 2 × 1 | low | Second low display look |
| museum_info_stand | Lectern-style information stand | 0.8 × 0.5 | mid | Small cover |
| museum_velvet_bench | Backless velvet visitor bench | 2.2 × 0.7 | low | Low cover |

**2 Gallery** (white, pale stone, steel, one accent colour per piece) — 5 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| gallery_sculpture_b | Abstract bronze figure on a white base | 1 × 0.8 | tall | Second sculpture (today ×11 of one) |
| gallery_sculpture_c | Stacked-stone sculpture on a white base | 1.2 × 1 | mid | Third sculpture |
| gallery_glass_vitrine | Glass vitrine with one small object | 1.2 × 0.9 | mid | Alternative to the plinth ×11 |
| gallery_light_box | Free-standing backlit colour panel | 2.2 × 0.35 | tall | Second art-wall look (today ×14) |
| gallery_reception_desk | White reception desk with one screen | 2.4 × 0.9 | mid | Entry rooms |

**5 Casino** — 4 pieces (after the ten unused ones are placed)

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| casino_poker_table | Oval poker table with chips | 2.6 × 1.5 | low | Island |
| casino_craps_table | Craps table with rail | 3 × 1.4 | low | Island |
| casino_cash_counter | Cashier window counter with brass grille | 2.8 × 0.8 | tall | Replaces cashier cage ×11 in part |
| casino_statue_fountain | Small gilded fountain | 1.6 × 1.4 | mid | Landmark, one per map |

**3 Bank** — 4 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| bank_cash_pallet (redraw) | Same pallet, front-facing | 1.5 × 1.1 | low | Current one is drawn corner-on |
| bank_guard_booth (redraw) | Same booth, front-facing | 1.9 × 1.3 | tall | Current one is drawn corner-on |
| bank_deposit_table | Standing-height table with pens and slips | 1.6 × 0.8 | mid | Public halls |
| bank_coin_machine | Coin-sorting machine with hopper | 1.4 × 0.8 | mid | Cash rooms, relieves the column ×9 |

**4 Lab** — 3 pieces

| Id | Subject | Footprint | Height | Job |
|---|---|---|---|---|
| lab_glass_partition_vertical | The glass partition seen end-on (runs up-down) | 0.25 × 3 | mid | Replaces the drawn vertical glass ×8 |
| lab_microscope_bench | Bench with two microscopes and a lamp | 2.2 × 0.9 | mid | Research rooms |
| lab_chemical_cabinet | Yellow safety cabinet, closed | 1.2 × 0.6 | tall | Storage rooms, relieves cryo unit ×10 |

## Delivered so far

- **Casino sheet, 2026-10-06** (20 pieces on one sheet). Fourteen repeat pieces the project already had at
  higher resolution (roulette table, roulette centrepiece, high-roller table, slot machine, slot bank, velvet
  partition, cocktail table, chair, chandelier, VIP arch, chip pile, drink tray, cashier cage, blackjack table)
  and were not used. Five are new and in the game: `casino_column`, `casino_planter`, `casino_sofa`,
  `casino_card_table`, `casino_rope_stanchion`. `casino_entrance` was left out: it is drawn as a doorway and
  would read as a way through.
- Casino maps now cycle through several pieces per slot instead of one: slot machine 18 → 8 placements,
  20 different pieces in use (12 before). Casino tables and the chip cart now block sight, like Bank and Lab
  furniture.
- Still wanted for the Casino from the list below: poker / craps table (the new card table covers one),
  cashier counter, fountain.

- **Warehouse sheets, 2026-10-06** (seven different sheets, several pasted twice). One sheet was used for the
  whole kit so every piece comes from the same batch: the 24-piece "NEW ASSETS (20)" sheet, which is the most
  front-facing. 19 pieces are in the game (`assets/environment/warehouse/`): rack, container, forklift, crate
  stack, tarp cargo, drum stack, liquid tank, storage cage, pallet stack, conveyor, plank stack, pipe stack,
  workbench, tool cart, hand trolley, cones, barrier, fence, control panel. Left out: stairs and mezzanine
  (read as walkable), loading door (reads as a way through), pallet jack (strong yaw), floodlight (cannot
  stand in for cover).
  Chapter 7 now uses 17 painted pieces and no drawn shapes (5 drawn kinds before).
- **Not usable as supplied:**
  - the dark all-chapters sheet (Mansion, Security HQ, Vault and extras): opaque background, pieces about
    100 px wide;
  - the Vault rows of the four-row sheet: transparent, but about 120 px a piece (the game draws them at
    200–350 px), and Chapter 9 has no floor plans to put them in yet.
  Mansion, Security HQ and Vault need sheets like the warehouse one: transparent, 20–24 pieces at most.

- **Vault sheet, 2026-10-06** (24 front-view pieces, no labels). 16 are in the game under
  `assets/environment/vault/` and dress the Chapter 9 maps: vault door, deposit wall, blast screen, lockers,
  cash table, inspection table, cash desk, gold pallet, cash cage, case stack, armoured crate, strapped gold,
  black cases, camera pillar, gold rack, cash trolley. Chapter 9 still has its old floor plans, so the kit is
  chosen at draw time for the generic pieces those maps place (`environmentAssetForProp`), several per kind
  picked by position; the campaign data is unchanged.
  Not used yet: metal detector, x-ray scanner, turnstile, barred gate, teller booth, rope sign, mesh fence,
  pallet jack. They suit the Bank (Chapter 3) as wall-side, front-view pieces.

## Totals

| | New pieces |
|---|---|
| Priority 1 (Warehouse, Vault) | 20 |
| Priority 2 (Mansion, Security HQ) | 20 |
| Priority 3 (Museum 6, Gallery 5, Casino 4, Bank 4, Lab 3) | 22 |
| **All** | **62** (about 13–15 sheets of 4–5) |

## After the art arrives

Each piece needs a name, a footprint and a sight rule in `src/game/world/propKit.ts`, a line in
`src/assets/environmentKit.ts`, and packaging through `tools/environment/addV13Art.ts`. Chapters 6–8 swap
piece for piece in `tools/campaign/v13Late.ts`. Chapter 9 needs floor plans before any of its art can be placed.
