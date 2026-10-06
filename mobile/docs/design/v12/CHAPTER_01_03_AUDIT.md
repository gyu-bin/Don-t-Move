# V12 — Chapter 01–03 audit and 15-mission blueprint

Status: **DESIGN PROPOSAL — no runtime changes, no device certification.**

## Method and boundaries

- Read all 30 current Chapter 01–03 stage records from `src/game/levels/stages/campaignStages.json` (full campaign contains 60), SHA-256 `bd7a3a4de9e0cb63f3627a0cd03e5cfbb1fa43561e94f224926fbbd7e9895202`.
- Inspected each layout grid, spawn/objective/exit coordinates, structural props, authored approach/escape routes, safe zones, guard roles/ranges/initial positions and camera placement. Tile route lengths below are polyline lengths, not measured time or proof of navigability.
- Read `StageDefinition.ts`, `campaignCatalog.ts`, `propKit.ts` and `dressingKit.ts` contracts. Glass blocks bodies but passes LOS; low soft furniture can block movement while passing LOS; a visible bench/plinth cannot be assumed to hide a player.
- No new simulator or human playtest was performed for this document. V12 acceptance requires final Tilt mapping first, physical route clearance after baking, screenshots and human Tilt feedback. KEEP is a provisional structural selection, not a claim that every current acceptance criterion has passed.
- User evidence governs the redesign: old 01-08 objective pressure and hitching; old 01-10 exit clustering; old 03-10 feels manageable. Hitching is a runtime investigation item and is not evidence that adding/removing cover fixes performance.
- Each old ID has exactly one disposition. MERGE retains named ingredients in one new mission and retires the old standalone record. REMOVE retires the old challenge; a visual idea does not retain its security layout. New IDs below are V12 IDs, not mutations to old progress/save data. Migration belongs to later implementation.

## Runtime evidence ledger

| Old ID | Title | Grid | Floor cells | Guards / CCTV | Approach safe / risk tiles | Escape tiles | Objective → Exit |
|---|---|---|---:|---|---|---|---|
| 01-01 | Entrance Hall | 21×14 | 129 | 2 / 0 | 21.8 / 14.6 | 6.0 | (15,6.5) → (18.65,8.15) |
| 01-02 | Main Gallery | 28×18 | 232 | 3 / 0 | 27.7 / 21.2 | 18.7, 32.3 | (15.5,2.6) → (24.80,12.40) |
| 01-03 | Archive | 18×14 | 84 | 2 / 0 | 22.8 / 22.2 | 8.8 | (12.5,8) → (15.90,10.90) |
| 01-04 | Security Wing | 21×14 | 106 | 3 / 0 | 21.2 / 17.3 | 14.3, 5.8 | (13.7,7.3) → (13.40,0.90) |
| 01-05 | Restricted Collection | 33×22 | 366 | 4 / 1 | 41.3 / 36.8 | 29.1, 33.6 | (28.2,5) → (2.00,2.00) |
| 01-06 | Conservation Lab | 34×21 | 360 | 3 / 0 | 39.0 / 31.2 | 26.0, 55.9 | (29.5,12) → (16.40,1.00) |
| 01-07 | Private Gallery | 17×20 | 170 | 3 / 0 | 26.0 / 18.0 | 20.0, 20.0 | (12.5,16.5) → (0.90,6.90) |
| 01-08 | Security Core | 31×27 | 403 | 5 / 2 | 46.1 / 20.6 | 46.5, 37.8 | (16.5,2.3) → (4.40,23.80) |
| 01-09 | Master Exhibition | 36×26 | 361 | 4 / 0 | 55.9 / 39.9 | 20.9, 18.8 | (31.5,13.5) → (27.90,1.00) |
| 01-10 | Grand Heist | 38×31 | 686 | 6 / 2 | 57.8 / 25.3 | 39.6, 44.9 | (23,4.5) → (1.00,24.40) |
| 02-01 | Front Exhibition | 24×18 | 206 | 2 / 0 | 23.8 / 21.8 | 14.0, 17.9 | (22.05,5.6) → (11.90,14.80) |
| 02-02 | Portrait Hall | 24×20 | 244 | 3 / 0 | 26.6 / 24.4 | 14.5, 15.3 | (22.05,3.6) → (7.00,3.90) |
| 02-03 | Sculpture Studio | 34×20 | 353 | 4 / 0 | 52.1 / 23.6 | 28.9, 52.1 | (17,3.5) → (30.80,13.40) |
| 02-04 | Modern Wing | 34×30 | 427 | 4 / 0 | 40.4 / 23.5 | 38.9, 60.3 | (3.5,15) → (30.80,24.40) |
| 02-05 | Collector's Room | 32×24 | 397 | 4 / 0 | 51.9 / 33.8 | 19.8, 25.3 | (4.5,5) → (1.90,20.80) |
| 02-06 | Glass Gallery | 35×29 | 521 | 5 / 1 | 38.5 / 41.4 | 34.4, 49.4 | (19,3.8) → (31.80,19.40) |
| 02-07 | Curator's Floor | 35×30 | 479 | 5 / 1 | 46.0 / 31.4 | 22.4, 51.0 | (4.5,11) → (15.40,1.00) |
| 02-08 | Grand Atrium | 39×30 | 500 | 5 / 0 | 50.1 / 29.7 | 43.0, 46.4 | (4.5,15) → (35.80,24.40) |
| 02-09 | Private Collection | 34×33 | 521 | 4 / 0 | 110.1 / 26.8 | 78.7, 51.0 | (18.5,27) → (29.90,9.00) |
| 02-10 | Masterpiece | 38×34 | 750 | 7 / 2 | 66.7 / 35.8 | 54.3, 66.2 | (23,4.5) → (1.00,28.40) |
| 03-01 | Public Lobby | 23×17 | 178 | 2 / 0 | 16.0 / 18.4 | 13.4 | (17.5,7) → (19.90,14.60) |
| 03-02 | Teller Hall | 23×22 | 250 | 3 / 1 | 30.5 / 28.9 | 25.2 | (15,8) → (2.00,15.50) |
| 03-03 | Staff Offices | 33×28 | 375 | 4 / 1 | 38.0 / 40.8 | 35.0 | (27,14) → (26.50,25.00) |
| 03-04 | Records Room | 27×23 | 281 | 4 / 0 | 28.8 / 30.4 | 18.7 | (6.5,7) → (16.50,2.00) |
| 03-05 | Deposit Boxes | 34×29 | 401 | 4 / 1 | 39.8 / 42.7 | 33.2 | (27,8) → (15.50,26.00) |
| 03-06 | Security Checkpoint | 34×30 | 381 | 4 / 2 | 48.0 / 28.3 | 16.4 | (17,26) → (31.00,23.50) |
| 03-07 | Cash Processing | 27×32 | 368 | 4 / 1 | 24.9 / 24.9 | 30.9 | (4.5,18) → (17.50,2.00) |
| 03-08 | Inner Security | 37×28 | 595 | 5 / 2 | 39.8 / 44.5 | 18.2, 46.0 | (30,8.8) → (33.80,19.40) |
| 03-09 | Vault Antechamber | 34×25 | 350 | 5 / 2 | 44.9 / 30.1 | 14.7 | (7,9) → (6.50,22.00) |
| 03-10 | Main Vault | 40×42 | 774 | 7 / 3 | 106.2 / 58.8 | 56.8, 69.6 | (32,7.2) → (11.00,36.40) |

## All 30 old missions: disposition

| Old ID | Decision | V12 destination | Structure-grounded reason |
|---|---|---|---|
| 01-01 | KEEP | 01-01 | Compact entrance teaches a statue bypass and has only 2 guards, no camera, 6.0-tile authored escape. Preserve its read-before-crossing skeleton; physical Tier 1 acceptance remains required. |
| 01-02 | MERGE | 01-02 | 232-floor-tile rotunda and west-in/east-out loggia offer a real two-sided route choice; combine its central exhibit identity with the private salon rather than retain both missions. |
| 01-03 | REBUILD | 01-03 | Bent 18×14 archive is distinct, but safe/risk lengths 22.8/22.2 almost coincide and only the spawn is authored safe. Replace precision aisle dependency with wide shelf-end observation pockets. |
| 01-04 | REBUILD | 01-04 | Keep office/hub/gate/inspection-bay story; 3 guards in 106 floor tiles need spatially separated crossings for an easy chapter. |
| 01-05 | MERGE | 01-05 | Keep the east jewel chamber and separate north service return as finale material; do not carry over 4-guard/1-camera coverage or 29.1-tile escape wholesale. |
| 01-06 | MERGE | 01-03 | Paired restoration tables and specimen store enrich archive/conservation fantasy; remove this 360-floor-tile separate mission and its 55.9-tile alternate escape. |
| 01-07 | MERGE | 01-02 | Private foyer, west portrait rooms and south salon supply an intimate collection wing to the rotunda; its separate 3-guard bridge challenge is redundant for Tier 1. |
| 01-08 | REMOVE | 01-04 | Remove the old Security Core mission and its compound pressure. Its cross-hub visual landmark may inform Security Wing only; 5 guards/2 cameras, 46.1-tile safe approach and 46.5-tile escape contradict easy museum. Real user reported excessive objective pressure and hitching. |
| 01-09 | MERGE | 01-05 | Use stepped sculpture promenade and north portrait balcony as finale landmarks; do not retain an additional 55.9-tile safe approach with 4 guards. |
| 01-10 | REBUILD | 01-05 | Keep sanctuary spectacle and a separate cloister escape; replace 686 floor tiles, 6 guards/2 cameras and exit-cluster pressure with the same easy encounter budget as the chapter. |
| 02-01 | MERGE | 02-01 | Compact clean arrival/sculpture-court/art-wall reveal supplies the introduction to the combined sculpture mission; 2-guard/0-camera baseline is useful. |
| 02-02 | KEEP | 02-02 | Portrait spine, paired opaque art screens, east artwork and short northwest escape form a distinct long-LOS mission. Preserve corrected portrait identity; roaming overlap needs Tier 2 acceptance, not automatic certification. |
| 02-03 | MERGE | 02-01 | Carving bays/commission court/installation annex distinguish sculpture from portrait. Compress the 52.1-tile safe approach and merge with 02-01 rather than add another 4-guard mission. |
| 02-04 | REBUILD | 02-03 | Staggered movable-screen wing with west collection and southeast court is useful; 38.9/60.3-tile escape and multiple junctions need compact, readable Easy+ circulation. |
| 02-05 | REMOVE | — | Private reception/portrait salon/service return repeats the private-collection role already supplied by portrait and finale; no unique glass or movable-wall mechanic to preserve as a sixth mission. |
| 02-06 | REBUILD | 02-04 | Preserve glazed installation court and separate east sculpture escape. 521 floor tiles, 5 guards/1 camera and 34.4/49.4-tile escapes exceed a concise Easy+ glass lesson; explicitly preserve BLOCK bodies/PASS LOS. |
| 02-07 | MERGE | 02-03 | Curator workroom and north public return add a clear service choice to Modern Wing; avoid importing its additional 5-guard/1-camera crossing network. |
| 02-08 | MERGE | 02-05 | Paired monumental atrium supplies finale approach and reveal, not a separate 43.0-tile guarded return. |
| 02-09 | REMOVE | — | Southern private masterpiece and northeast portrait balcony repeat collection/portrait roles; 110.1-tile authored safe approach and 78.7-tile escape inflate travel without a necessary new mechanism. |
| 02-10 | REBUILD | 02-05 | Keep masterpiece chamber, opaque first-break screen and delayed alarm; replace 750 floor tiles and 7 guards/2 cameras with compact Easy+ finale. Human Tilt CLEAR demonstrates playability, not equal chapter difficulty. |
| 03-01 | MERGE | 03-01 | Public/teller/staff verification/dispatch sequence is already bank-specific. Add Teller Hall route choice without simply stacking its security population. |
| 03-02 | MERGE | 03-01 | Long teller spine, west staff bypass and U-return provide two meaningful access modes to the same financial target; retain counter line as cover, not generic walls. |
| 03-03 | MERGE | 03-02 | Six-room staggered office network offers room transitions; combine with Records audit target, avoiding 42.2-tile traversal solely to increase duration. |
| 03-04 | MERGE | 03-02 | Narrow intake/ledger spine/audit alcove/upper verification return provides the actual restricted-records heist in the combined office mission. |
| 03-05 | KEEP | 03-03 | Deposit-wall landmark, two access lanes and independent service return distinguish it from checkpoints/vault; 4 guards/1 camera are evidence only, not a fixed numeric difficulty requirement. |
| 03-06 | REBUILD | 03-04 | Keep staffed main gate and genuine west bypass; restructure excessive 48.0-tile safe detour into readable sequential credential/command crossings. |
| 03-07 | MERGE | 03-05 | Cash-processing tables and carts are operational bank escape material. Their low tables do not block LOS; include as the vault return, not a detached repetitive cash-floor mission. |
| 03-08 | MERGE | 03-04 | Monitoring command objective plus independent east audit exit make Checkpoint a complete heist. Do not append its entire 5-guard/2-camera map to 03-06. |
| 03-09 | MERGE | 03-05 | Visible vault door and protected observation antechamber supply the final pre-vault read, rather than another stand-alone vaultGem pickup. |
| 03-10 | KEEP | 03-05 | Keep PUBLIC→STAFF→SECURITY→VAULT progression and distinct east cash/records escape as the medium benchmark. User said manageable; 60.1-tile main/106.2-tile safe/56.8-tile escape are not mandatory retention targets or evidence of Tier 3 fairness. |

## Selection totals

- Chapter 1: 10 accounted → 5 proposed; KEEP 1, MERGE 5, REBUILD 3, REMOVE 1.
- Chapter 2: 10 accounted → 5 proposed; KEEP 1, MERGE 4, REBUILD 3, REMOVE 2.
- Chapter 3: 10 accounted → 5 proposed; KEEP 2, MERGE 7, REBUILD 1, REMOVE 0.

## Chapter-wide difficulty contracts

- **Museum Tier 1:** All five should feel easy. One understandable active crossing at a time; no double objective pressure, CCTV/guard triple overlap, exit cluster or long exposed escape. A protected wait and a near objective-side opaque break are mandatory. Finale adds spectacle, not pressure. Prefer no CCTV; any retained camera cannot watch pickup or share its crossing with the pickup guard.
- **Gallery Tier 2:** Longer visible crossings and glass interpretation provide the extra demand. All five use the same Easy+ exposure/window envelope; sculpture/portrait/modern/glass/masterpiece change the situation, not difficulty rank. Screens supply true breaks; glass does not.
- **Bank Tier 3:** Public/staff/security/vault depth and sequential staffed/CCTV reads provide medium pressure. Keep old 03-10 human-manageable benchmark as the ceiling reference, not an order to copy its population or route length. Other four must not become tutorial-easy just because they are earlier IDs.
- Proposed budget acceptance is spatial: measure simultaneous exposure at pickup/first break/exit, safe-route wait windows, and physical correction room under selected Tilt. Guard count alone and composite metric matching cannot establish difficulty. Do not change player/chase speed, CCTV timing or 28-second confirmed-Theft rule.
- Every plan below includes ENTRY → APPROACH → SECURITY CROSSING → OBJECTIVE → THEFT → FIRST LOS BREAK → ESCAPE → EXIT. First-break claims are authoring intentions until compile/LOS/runtime tests pass.

## Exactly 15 proposed missions

### 01-01 — Entrance Hall

- **ID:** 01-01
- **Title:** Entrance Hall
- **Fantasy:** Read the first guard, circle a grand statue, take the display diamond and leave confidently.
- **Architecture:** Compact bent lobby / statue exhibition / recessed case room / east side door.
- **Main Route:** Lobby → statue shoulder → single exhibition crossing → case.
- **Safe Route:** North viewing recess with a protected wait before the case.
- **Risk Route:** Direct south-side statue crossing while the guard faces away.
- **Objective:** Diamond on a lit recessed display with one clear observation position.
- **Exit / First LOS Break:** East side door, visible after pickup; first opaque break at the case-room return corner.
- **Security identity:** One crossing at a time; no CCTV; no simultaneous objective/exit pressure.
- **Difficulty Tier:** Tier 1 — VERY EASY / EASY

### 01-02 — Rotunda Collection

- **ID:** 01-02
- **Title:** Rotunda Collection
- **Fantasy:** Choose a quiet portrait loggia or cross the central rotunda to reach a private collection.
- **Architecture:** West vestibule / round-looking two-sided exhibit island / north salon / east loggia.
- **Main Route:** Vestibule → exhibit shoulder → north salon → east loggia escape.
- **Safe Route:** Outer portrait arc with protected sightline reads at both ends.
- **Risk Route:** Short central rotunda crossing, visible guard turn providing a clear window.
- **Objective:** Artifact in the north salon beside an opaque statue shoulder.
- **Exit / First LOS Break:** Independent east loggia; one return corner gives immediate post-theft separation.
- **Security identity:** Patrol watches the central floor; collection watch is sequential, never a double pickup cone.
- **Difficulty Tier:** Tier 1 — VERY EASY / EASY

### 01-03 — Archive & Conservation

- **ID:** 01-03
- **Title:** Archive & Conservation
- **Fantasy:** Slip through readable shelf ends and restoration benches to recover a catalogued artifact.
- **Architecture:** Bent staff entry / two broad shelf bays / conservation workroom / east staff return.
- **Main Route:** Staff elbow → shelf-end cover → restoration bay → restricted cabinet.
- **Safe Route:** Connected outer shelf shoulders with room to correct Tilt overshoot.
- **Risk Route:** Central shelf aisle shortcut with one timed perpendicular sightline.
- **Objective:** Artifact in a conservation specimen cabinet, not an isolated corridor end.
- **Exit / First LOS Break:** East staff door via a short storage elbow; cabinet-side opaque shelf is first break.
- **Security identity:** Low-speed observation lesson through spatial windows, not narrower gaps; no CCTV.
- **Difficulty Tier:** Tier 1 — VERY EASY / EASY

### 01-04 — Restricted Wing

- **ID:** 01-04
- **Title:** Restricted Wing
- **Fantasy:** Read a small security office and take a restricted museum record through a quiet outbound bay.
- **Architecture:** Office / control hub / restricted case / east inspection bay / north staff door.
- **Main Route:** Office → hub planning pocket → one guarded access → restricted case.
- **Safe Route:** Outer office-to-inspection circuit with one protected turn before pickup.
- **Risk Route:** Short hub crossing avoids the inspection detour but exposes the player briefly.
- **Objective:** Restricted archive case adjacent to the control-room landmark and an opaque shoulder.
- **Exit / First LOS Break:** North staff door through inspection return; no stationary exit cluster.
- **Security identity:** At most one active sightline at the objective; optional single CCTV only on approach, spatially separated from pickup.
- **Difficulty Tier:** Tier 1 — VERY EASY / EASY

### 01-05 — Grand Museum Heist

- **ID:** 01-05
- **Title:** Grand Museum Heist
- **Fantasy:** Steal the museum centerpiece, then disappear into its service cloister.
- **Architecture:** Compact arrival gallery / sculpture promenade / sanctuary / separate cloister return.
- **Main Route:** Arrival → sculpture landmark → sanctuary approach → centerpiece.
- **Safe Route:** Outer viewing shoulder and sanctuary alcove with clear stop-and-go opportunities.
- **Risk Route:** Direct exhibition axis offers a shorter, briefly exposed approach.
- **Objective:** Master diamond in a warm-lit sanctuary with a nearby genuine opaque escape shoulder.
- **Exit / First LOS Break:** West service door after the cloister; no grouped guard posts near the door.
- **Security identity:** Same easy pressure as 01-01–04; grander landmark/space, not additional simultaneous watchers.
- **Difficulty Tier:** Tier 1 — VERY EASY / EASY

### 02-01 — Sculpture Court

- **ID:** 02-01
- **Title:** Sculpture Court
- **Fantasy:** Cross an open modern gallery using commissioned sculptures as timing landmarks.
- **Architecture:** Clean arrival / two-sided sculpture island / north commission recess / east installation annex.
- **Main Route:** Arrival → central sculpture shoulder → north commissioned work → east annex.
- **Safe Route:** Outer island viewing edge with two explicit protected stops.
- **Risk Route:** Direct open-floor crossing when the patrol has passed.
- **Objective:** Featured commissioned artwork integrated with the sculpture display.
- **Exit / First LOS Break:** East annex via an opaque art-screen corner immediately after the target.
- **Security identity:** Longer crossing than Museum, but a single interpretable patrol lane; no camera overlap at pickup.
- **Difficulty Tier:** Tier 2 — EASY+

### 02-02 — Portrait Hall

- **ID:** 02-02
- **Title:** Portrait Hall
- **Fantasy:** Read a long portrait sightline and use paired art screens to reach a featured painting.
- **Architecture:** Reception / long portrait spine / opaque screen shoulders / east portrait recess / northwest return.
- **Main Route:** Reception → spine screen → portrait recess → upper collection return.
- **Safe Route:** Outer portrait wall and screen-back viewing shoulders.
- **Risk Route:** Direct spine crossing trades time for greater exposure.
- **Objective:** Vertical portrait grouping with featured painting in the eastern recess.
- **Exit / First LOS Break:** Northwest public door via a short upper-wall return and first opaque screen break.
- **Security identity:** Long LOS/turn timing, not extra guard count; wandering watcher must not seal the safe option.
- **Difficulty Tier:** Tier 2 — EASY+

### 02-03 — Modern Wing

- **ID:** 02-03
- **Title:** Modern Wing
- **Fantasy:** Pick a public art-screen route or a curator service route through a staggered wing.
- **Architecture:** North arrival / movable-screen exhibition / west curator recess / south installation / southeast court.
- **Main Route:** Arrival → screen junction → west collection → installation return.
- **Safe Route:** Curator workroom shoulders behind opaque exhibition screens.
- **Risk Route:** Cross the open movable-screen axis in one observed timing window.
- **Objective:** Modern artwork in the curator-side collection, anchored to a named screen ensemble.
- **Exit / First LOS Break:** Southeast court on a readable service return with a nearby opaque objective-side screen.
- **Security identity:** Two successive open-space reads; avoid simultaneous junction cones and long backtracking.
- **Difficulty Tier:** Tier 2 — EASY+

### 02-04 — Glass Gallery

- **ID:** 02-04
- **Title:** Glass Gallery
- **Fantasy:** See the treasure through glass and deliberately choose a physical route around it.
- **Architecture:** West studies / glazed central installation / north study / independent east sculpture gallery.
- **Main Route:** Approach → glass-side viewing shoulder → north study → east art-cell return.
- **Safe Route:** Opaque art-screen perimeter; glass itself is never described as concealment.
- **Risk Route:** Short glazed-court crossing when the distant guard is facing away.
- **Objective:** Featured study visible through glazing, with an accessible opaque return shoulder.
- **Exit / First LOS Break:** East sculpture door after art cells interrupt pursuit.
- **Security identity:** Glass BLOCK movement/PASS LOS; limited sweep watches one exposed crossing, not objective plus escape simultaneously.
- **Difficulty Tier:** Tier 2 — EASY+

### 02-05 — Masterpiece Chamber

- **ID:** 02-05
- **Title:** Masterpiece Chamber
- **Fantasy:** Take a major masterpiece and escape through an alternate public collection.
- **Architecture:** Atrium introduction / masterpiece recess / opaque first-break screen / portrait inspection / separate exit collection.
- **Main Route:** Atrium shoulder → masterpiece reveal → pickup → screened return.
- **Safe Route:** Outer installation arc with a protected wait before the masterpiece.
- **Risk Route:** Open atrium axis is shorter and has one clear observation window.
- **Objective:** Masterpiece in a lit chamber; delayed alarm retained, no instant hidden-player knowledge.
- **Exit / First LOS Break:** Separate west collection door with an escape pocket before its final observed crossing.
- **Security identity:** Same Easy+ simultaneous-pressure ceiling as the other Gallery missions; no 7-guard finale escalation.
- **Difficulty Tier:** Tier 2 — EASY+

### 03-01 — Teller Access

- **ID:** 03-01
- **Title:** Teller Access
- **Fantasy:** Move from the public queue through staffed access to a teller-held valuable.
- **Architecture:** Public lobby / teller spine / west staff bypass / verification elbow / dispatch bay.
- **Main Route:** Public planning pocket → teller access crossing → staff verification → teller target.
- **Safe Route:** West staff-office bypass behind counters, then one observed verification gate.
- **Risk Route:** Direct teller-spine crossing is shorter but watched from the public side.
- **Objective:** Teller-held gem with counter landmark and staff threshold beyond it.
- **Exit / First LOS Break:** Independent dispatch door through the verification elbow; counter return offers first break.
- **Security identity:** Distinct public/staff security roles and a limited CCTV crossing, separated in time; medium budget shared across Bank.
- **Difficulty Tier:** Tier 3 — MEDIUM

### 03-02 — Staff Records

- **ID:** 03-02
- **Title:** Staff Records
- **Fantasy:** Navigate real staff rooms to steal an audited record without retracing the intake.
- **Architecture:** Staggered offices / ledger spine / secure audit alcove / upper verification return.
- **Main Route:** Staff intake → office corner → records crossing → audit alcove.
- **Safe Route:** Filing-cabinet edge and an alternative office sequence with protected door reads.
- **Risk Route:** Shared records-bank crossing cuts a room but exposes the player.
- **Objective:** Sealed valuable in the audit alcove with a visible record-bank landmark.
- **Exit / First LOS Break:** Upper verification dispatch; opaque cabinet corner immediately separates the pickup from search.
- **Security identity:** Door timing and room/corridor roles; CCTV belongs to one records crossing, not every doorway.
- **Difficulty Tier:** Tier 3 — MEDIUM

### 03-03 — Deposit Boxes

- **ID:** 03-03
- **Title:** Deposit Boxes
- **Fantasy:** Choose a monitored deposit lane or service approach to a bank deposit target.
- **Architecture:** Public deposit reception / twin access lanes / deposit-wall landmark / security seam / service return.
- **Main Route:** Reception → selected lane → restricted box wall → service return.
- **Safe Route:** Staff-office shoulder gives a longer but genuinely less exposed approach.
- **Risk Route:** Deposit-front lane offers a brief direct crossing during a sweep pause.
- **Objective:** Valuable within the deposit-wall collection, accompanied by a staffed security seam.
- **Exit / First LOS Break:** Separate service door after a protected deposit-bank break and an observed dispatch crossing.
- **Security identity:** One CCTV with staffed roles, spatially separate watches; low desks/cash carts are not full LOS cover.
- **Difficulty Tier:** Tier 3 — MEDIUM

### 03-04 — Checkpoint Command

- **ID:** 03-04
- **Title:** Checkpoint Command
- **Fantasy:** Cross credential security or an analyst bypass to steal the monitoring command asset.
- **Architecture:** Public read bay / staffed gate / west analyst bypass / controlled junction / command room / east audit exit.
- **Main Route:** Planning bay → credential gate → controlled junction → monitoring command.
- **Safe Route:** West analyst circuit through protected room corners; comparable task count, reduced exposure.
- **Risk Route:** Short gate-and-junction route requires observing two sequential security phases.
- **Objective:** Command asset among monitoring desks and record cabinets inside a restricted room.
- **Exit / First LOS Break:** Independent east audit door after an opaque command-room return corner.
- **Security identity:** CCTV plus guard timing with separated checkpoints; never make both options permanently covered.
- **Difficulty Tier:** Tier 3 — MEDIUM

### 03-05 — Main Vault

- **ID:** 03-05
- **Title:** Main Vault
- **Fantasy:** Penetrate the actual bank vault and escape through cash operations and records dispatch.
- **Architecture:** Staff access / credential checkpoint / inner security / visible antechamber / Main Vault / cash-processing return / records evacuation.
- **Main Route:** Staff approach → checkpoint → antechamber read → vault pickup → cash circuit.
- **Safe Route:** Protected records shoulders and a side antechamber viewing route.
- **Risk Route:** Direct security crossings shorten the approach, never remove all waiting positions.
- **Objective:** Delayed-alarm vault gem within the actual reinforced Main Vault landmark.
- **Exit / First LOS Break:** Lateral records evacuation separate from staff entry; vault-side opaque break before cash-floor exposure.
- **Security identity:** Retain old 03-10 manageable-feel benchmark; cash tables PASS LOS, opaque cabinets establish genuine cover. Do not raise speed or detection timing for finale.
- **Difficulty Tier:** Tier 3 — MEDIUM

## Phase 1 verification and remaining work

- Accounting check: old Chapter 01–03 IDs are unique and total 30; blueprint IDs are unique and total 15, exactly five per chapter. Other chapters are outside this document.
- Evidence is current runtime data, not a title-only selection. Authored route labels can be misleading: old 03-01 safe length 16.0 versus main 16.4 does not demonstrate safer LOS; old 02-06 risk 41.4 versus safe 38.5 does not demonstrate a faster risk route. Later rebuilding must prove a real exposure/time tradeoff.
- Baseline layout/props/guards/cameras/audio/input were not edited. No new KEEP decision is a production-ready declaration.
- Before runtime rebuild: resolve candidate Tilt mapping on physical iPhone; agree blueprint; then bake collision-safe maps, inspect real rendering/fake gaps, check first-break and 28-second escape feasibility with waits, compare chapter averages and intra-chapter variance, and run human full-heist tests.
- Do not dress unvalidated new geometry as final art. Reuse approved kit and keep gameplay cover contracts explicit; no random prop fill or opaque-glass shortcuts.
