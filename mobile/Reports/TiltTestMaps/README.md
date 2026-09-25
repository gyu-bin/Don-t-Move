# iPhone Tilt Test Maps — 2026-09-24

Development build opens map 01. Selector 01–05 plus previous/next and Restart reset each map independently. Stage changes create a fresh game/sensor session using the existing Tilt hook, including its existing calibration. Release retains the original museum playground.

| Map | Structure | Check |
|---|---|---|
| 01 OPEN MUSEUM | Broad cross-shaped hall, 2 Guards, sparse edge exhibits | Direction, Sneak/Walk/Run, vision avoidance |
| 02 TIGHT CORRIDOR | L-entry feeding a 2-tile S corridor, offset obstacles, 1 Guard upstairs | Precision, dead zone, collision/sliding |
| 03 LOOP GALLERY | Ring around a central exhibit island, east-side spur, 1 loop-patrol Guard | Diagonals, turns, horizontal/vertical camera follow |
| 04 SECURITY ZONE | Four offset connected galleries, 4 Guards, multiple vision-blocking covers | Suspicion, whistle/global response, pursuit, hiding/search |
| 05 HEIST TEST | Largest irregular multi-wing museum, foyer, west/north bypass and central exposed shortcut, 4 Guards | Combined play-like traversal and camera/collision stress |

Heist Safe Route: foyer → west corridor → north gallery → northeast goal. Risk Route: foyer → central hall → east/vault wing → goal. Safe means lower patrol exposure, not invulnerability. Both authored paths are body-clear and end at the same goal; the safe path is longer.

All maps are ordinary StageDefinition data (`src/game/levels/stages/tiltTestMaps.ts`). A small authoring helper converts authored room rectangles/islands into floor/wall/void rows; there is no runtime procedural generation. Museum props and lighting are reused. Covers use the existing prop footprints and vision-blocking rules.

Temporary goals are green-lit floor circles, not diamonds/exits. Arrival within the authored radius and unobstructed line to the goal triggers TEST COMPLETE, stops that test simulation, and offers Restart/Next. CAUGHT wins over completion. No mission inventory or exit unlock was added.

The debug HUD shows stage, Pitch/Roll (N/A on Touch), movement state, actual speed, FPS, all Guard states, and goal bearing/distance. Map viewport excludes the large instrumentation panels so the player is not hidden at map edges.

## Automated verification

- New map suite: 27 passing cases.
- Whole suite: 88 passing (61 existing + 27 map cases). Existing pending markers for Mission and physical iPhone Tilt remain.
- Typecheck passes; lint has 0 errors and 6 unchanged warnings.
- Per map: floor/body-valid player, goal and Guard spawn; no initial player/Guard overlap; exact goal reachability (not nearest A* fallback); every patrol leg including loop closure and spawn connector; sealed floor/void perimeter; authored reference paths; actual existing Touch locomotion follows a collision-clear path to the goal; bounded camera; completion/caught/reset checks.
- Additional checks: five different geometries, Heist largest and longer Safe Route, no goal activation through a wall.
- Collision/camera traversal fixtures omit Guards to isolate geometry. They do not prove a live stealth route is always safe; unchanged Guard tests run separately.

## Simulator verification

iPhone 17 Pro / iOS 27, existing development native build + Metro:

- 01: Touch RUN traversal, camera follow, actual goal arrival → TEST COMPLETE, Next Stage.
- 02: correct S/L geometry, Touch Sneak (38) and Walk (72), narrow-corridor traversal/camera movement.
- 03: ring/exhibit geometry, diagonal Touch Walk and horizontal camera follow.
- 04: four Guards, covers, Touch movement and individual `?` response.
- 05: rendered with four Guards and Safe/Risk briefing. Final manual Touch movement is **not verified**: Device Hub initially had duplicate-window control errors, then the Mac became locked. The computer-use tool explicitly requires manual unlock before continuing. All 05 automatic geometry and real Touch-locomotion path fixtures pass, but those do not replace this missing Simulator interaction.
- Restart verified on 01; Next on 01→02 and numbered selections 03→04→05.

No physical iPhone Tilt evaluation was performed. Simulator results do not establish sensor direction, drift, dead-zone feel, or real-device FPS.

Guard AI and Tilt input/controller/native sensor files were not modified. No new final assets, Diamond/Exit/Mission logic, audio, or legacy-unity changes.
