# V13 Phase 4 — All 45 maps, gameplay structure density pass (2026-10-06)

Not committed. Not a difficulty pass: entry, objective, exit, every route edge, every guard stop and every camera
are the same on all 45 maps before and after (`Reports/V13_PHASE4/security-before.txt` = `security-after.txt`), and
the scripted thief clears the same number of runs on every map (`trace-before.txt` / `trace-after.txt`).

## How each room was judged

Every map was rendered whole (`Reports/V13_PHASE4/before/`), and every zone was measured
(`tools/campaign/v13Density.ts`: floor area, free-standing structures, wall-lined structures, largest open disc).
A structure was added only where all of this held: the room is on a route, it is large enough for an island with
1.5-tile lanes on both sides, the island is off every route line and patrol line, no camera faces it, and it has a
stated job (cover before a watched crossing, or cover on an escape route). Rooms that failed one of these were
left alone and are listed below as LIGHT.

## Chapter summary

| Chapter | Maps changed | No change | Result |
|---|---:|---:|---|
| 1 Museum | 0 | 5 | PASS — cover islands in every hall already |
| 2 Art Gallery | 0 | 5 | PASS, three rooms LIGHT |
| 3 Bank | 0 | 5 | PASS (reworked in Phase 3) |
| 4 Lab | 3 | 2 | PASS / MODIFIED, 04-02 MINOR |
| 5 Casino | 3 (art only) | 2 | PASS — unused tables now in use |
| 6 Mansion | 0 | 5 | structure PASS, art MAJOR: no Mansion kit exists |
| 7 Warehouse | 0 | 5 | PASS |
| 8 Security HQ | 3 | 2 | PASS / MODIFIED, art MINOR: no desk / locker / video-wall art |
| 9 Vault | 0 | 5 | PASS (redesigned earlier the same day) |

## Mission summary

| Map | Verdict | Note |
|---|---|---|
| 01-01 … 01-05 | PASS / NO CHANGE | statues, cases and partitions stand mid-room in every hall |
| 02-01 | PASS / NO CHANGE | |
| 02-02 | MINOR / NO CHANGE | exit strip and the south-east of the south ring are bare; both are filled by the patrol loop and the route lines, no island fits |
| 02-03 | PASS / NO CHANGE | small west rooms hold one wall bench each (small rooms) |
| 02-04 | PASS / NO CHANGE | atrium with four islands |
| 02-05 | MINOR / NO CHANGE | private exhibition room (5×5) has a guard and no cover; his patrol crosses it corner to corner, no island fits |
| 03-01 … 03-05 | PASS / NO CHANGE | |
| 04-01 | PASS / NO CHANGE | analysis is cut into cells by wall stubs; exit lobby is bare (exit room) |
| 04-02 | MINOR / NO CHANGE | the outer ring is 3-wide corridors round wall piers: no island fits, and wall niches do not hide from the guards there |
| 04-03 | PASS / MODIFIED | + Reception Specimen Display (island, west third of the reception): the last cover before the west-bay opening the lobby guard watches. Safe cover graph: Reception Screen → Specimen Display → Lane Mobile Screen → Lane Screen East |
| 04-04 | PASS / MODIFIED | + Passage Gas Rack (coolant passage, north wall): hides a thief from the exit guard's last post on the lockdown escape. Intake west half stays open (LIGHT: nothing watches it) |
| 04-05 | PASS / MODIFIED | + Control Fume Hood (island, east half of the control room, beside the way up from the chamber); the cable decal moved aside |
| 05-01, 05-03 | PASS / NO CHANGE | |
| 05-02 | PASS / MODIFIED (art) | Copy Table is the blackjack table |
| 05-04 | PASS / MODIFIED (art) | Processing Table is the roulette table |
| 05-05 | PASS / MODIFIED (art) | Chip Table is the blackjack table |
| 06-01 … 06-05 | MAJOR (art) / NO CHANGE | layouts are the Gallery's and pass like Chapter 2; the furniture is still Museum statues and cases — there is no Mansion art in the project |
| 07-01 … 07-05 | PASS / NO CHANGE | cargo islands in every hall |
| 08-01, 08-02 | MINOR / NO CHANGE | as 04-01 / 04-02 |
| 08-03 | PASS / MODIFIED | inherits the reception island (as an observation console) |
| 08-04 | PASS / MODIFIED | all eight cryo units became rows of server racks; inherits the passage rack; the storage camera was pinned to its old seat |
| 08-05 | PASS / MODIFIED | the two passage cryo units became server racks; inherits the control-room island (as a server rack) |
| 09-01 … 09-05 | PASS / NO CHANGE | |

No structure was moved. Guards and cameras: none added, moved or retimed. Safe / risk routes: unchanged.

## Checks

- Compose: 0 topology errors, 0 sealed pockets, 0 squeezes on every changed map; thief-only traversal clear.
- Cameras on changed maps: positions unchanged; clear ahead and coverage unchanged.
- Simulator, whole map: 04-03, 04-04, 04-05, 05-02, 05-04, 05-05, 08-03, 08-04, 08-05 (`Reports/V13_PHASE4/sim/`).
- Simulator, normal camera, standing beside the new pieces: 04-03, 04-04, 04-05, 08-04, 05-04, 05-05
  (`Reports/V13_PHASE4/zoom/`). For these shots the thief was spawned next to the piece in a temporary copy of the
  campaign file; the real file was restored and its hash checked.
- `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (2 existing warnings), `test:environment` 11 / 11,
  manifest 0 missing / 0 invalid.

## Not done

- Whole-map Simulator captures were taken for the changed maps only; the 36 unchanged maps were judged on the
  offline render of the same renderer.
- Nobody played the changed maps by hand.
- Casino pieces still unused: velvet partition, cocktail table, chair, divider, VIP arch, chip stack, drink tray,
  roulette centrepiece. None has a slot of its size on a route; placing them would be scatter.
- Mansion needs its own art (bookshelf, sofa, dining table, piano, fireplace); Security HQ needs a security desk,
  lockers and a video wall to stop borrowing Lab consoles.

# V13 Phase 5 — Chapter 6 Mansion and Chapter 8 Security HQ identity art (2026-10-06)

Not committed. Art only: with picture ids removed, the baked campaign is byte-identical to the Phase 4 bake on all
45 missions (`tools/campaign/v13ArtOnlyDiff.ts Reports/V13_PHASE5/campaign-before.json`). No kind, scale, position,
wall, door, guard, camera or route changed.

- 17 pieces registered as two kits, `mansion_*` (8) and `hq_*` (9); catalog 163 → 180. Each is the picture for a
  kind those chapters already placed (`partition`, `statue`, `table`, `sofa`, `shelf`; the Lab kinds in Chapter 8),
  so collision and sight are the old kinds'. Mapping: `mansionArt` and `HQ_PICTURE` in `tools/campaign/v13Late.ts`.
- Chapter 6: 48 pieces repainted. Museum partitions → bookshelf (8) / folding screen (6); statues → armour niche (4)
  / china cabinet (7, always for the large slots); display cases → writing desk (9) / dining table (3); drawn sofas
  → sofa (9); drawn shelves → grand piano (2). Left: portraits, the masterpiece wall, the glass panels of 06-03, and
  the diamond case every late chapter uses as its prize.
- Chapter 8: 71 pieces repainted. Consoles → command console (10); monitor stations → security desk (8); server
  racks → server row (19); wall screens → video wall (12); lab walls and mobile screens → lockers (7);
  workstations → duty desk (4); scanner and decontamination arches → checkpoint (3); biohazard signs →
  restricted-area sign (6); large tables → response table (2). Left: glass partitions, floor chevrons, cables,
  stools, the diamond case.
- Order followed: 06-01 pilot (render, Simulator normal camera) → 06-02…06-05 → 08-01 pilot → 08-02…08-05.
  Simulator whole-map captures of all ten were taken together at the end, not before each next map.
- Evidence: `Reports/V13_PHASE5/render/` (offline), `sim/` (Simulator whole map, ten maps), `zoom/` (Simulator,
  normal camera, one or two spots per map; the thief was spawned at the spot in a temporary copy of the campaign).
- Tests: `npm test` 1007 / 1007, TypeScript PASS, lint 0 errors (2 existing warnings), `test:environment` 11 / 11,
  manifest 0 / 0.
- Open: dark HQ furniture on the dark HQ floor is low in contrast on the whole-map view (reads at the normal
  camera); the server-row sprite is 131 px wide and is drawn about 1.8× up; in 06-03 an armour niche, a bookshelf
  and a glass panel overlap on screen (the overlap was there before with the statue).
