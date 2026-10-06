# V13 Phase 1 — Chapter 1–2 Level Architecture Rebuild

Status: **V13 PHASE 1 — CHAPTER 1–2 LEVEL ARCHITECTURE IMPLEMENTED. GAMEPLAY TUNING PENDING.**

All ten maps were opened in the iPhone 17 Pro Simulator (iOS 27.0, real app runtime) in their final baked
state. No mission was played to a clear by a person or in the Simulator, so difficulty and full-heist flow
are not verified. Not Production Ready.

## What changed

The ten Chapter 1–2 missions were redrawn from the floor plan up. Each mission is one ASCII plan
(walls, zones, door openings), then structures, then guards, then cameras, in that order
(`tools/campaign/v13Museum.ts`, `tools/campaign/v13Gallery.ts`, compiled by `v13Builder.ts`, baked by
`v13Build.ts`). The old maps were separate rectangular rooms joined by 3-tile corridors; the new ones are
single buildings whose rooms share walls, with wall piers and large structures shaping the lanes.

Chapter 3–9 pass through from the Phase 5 build unchanged.

Not changed: Character, Locomotion, Tilt (Dead Zone 1.75°, Max Tilt 10°, Smoothing 0.07 s), player speed,
chase, theft logic, lockdown system, save migration, audio, ads/IAP, CCTV detection formula and speed,
guard perception and pace, `legacy-unity/`.

## Per mission

### 01-01 Entrance Hall

- **Architecture:** 22x20 tiles, 8 zones: Side Wall Gallery, North Foyer, Collection Room, West Gallery, Collection Wall Gallery, Central Court, Entrance Hall, Entrance Lobby.
- **Entry:** bottom-left — Entrance Lobby.
- **Objective:** top-right — Collection Room (Diamond bay behind a wall pier; the pier hides the thief from the returning guard).
- **Exit:** top-centre — North Foyer.
- **Topology:** L-shape.
- **Cover graph:** safe Lobby Security Desk → Hall Column → Long Display Case → Collection Wall → Collection Pier; risk Lobby Security Desk → Court Statue → Collection Wall; escape Court Statue → Side Wall → Side Wall Cases.
- **Safe route:** Entrance Lobby → Entrance Hall → Collection Wall Gallery → Collection Room (40 tiles).
- **Risk route:** Entrance Lobby → Entrance Hall → Central Court → Collection Wall Gallery → Collection Room (39.1 tiles).
- **Escape:** quick Collection Room → North Foyer (11.2); after lockdown Collection Room → Collection Wall Gallery → Central Court → West Gallery → Side Wall Gallery → North Foyer (44.1).
- **Major structures:** Lobby Security Desk (hiding, divider); Hall Column (losBreak, hiding); Long Display Case (hiding, sightline); Court Statue (losBreak, divider, hiding); Collection Wall (losBreak, hiding, divider); Side Wall (losBreak, hiding, divider); Side Wall Cases (hiding); Court Pier — wall (losBreak); Collection Pier — wall (losBreak, hiding, divider).
- **Guard roles:** lobby in Central Court — The two public lanes in turn: the Collection Wall opening from the court post, the length of the hall from the hall post / objective in Collection Room — The diamond; between inspections steps out to the west end of the Collection Wall and watches the court opening.
- **CCTV:** none.
- **Simulator verdict:** Checked (whole-map view). Reads as one building: lobby and hall along the bottom, court statue against its pier, Collection Room top right with the pier and diamond bay, exit sign top centre. Structures are to scale; guards face the court opening and the diamond.
- Scripted thief (supporting only): 8/24 clears, safe 6/12, risk 2/12. Largest open disc 1.94 tiles.

### 01-02 Main Gallery

- **Architecture:** 24x21 tiles, 9 zones: Private Exhibit, North Gallery, Exit Hall, Exhibit Anteroom, East Wing, North Ambulatory, West Arcade, Rotunda Floor, South Vestibule.
- **Entry:** bottom-centre — South Vestibule.
- **Objective:** top-left — Private Exhibit (Diamond in the bay behind the wall pier).
- **Exit:** top-right — Exit Hall.
- **Topology:** Branching.
- **Cover graph:** safe Arcade Column South → Arcade Column North → Anteroom Sculpture; risk Rotunda Statue → Anteroom Sculpture; escape Exhibit Pier → Ambulatory Case → East Wing Wall.
- **Safe route:** South Vestibule → Rotunda Floor → West Arcade → Exhibit Anteroom → Private Exhibit (35.5 tiles).
- **Risk route:** South Vestibule → Rotunda Floor → Exhibit Anteroom → Private Exhibit (31.2 tiles).
- **Escape:** quick Private Exhibit → North Gallery → Exit Hall (23.2); after lockdown Private Exhibit → Exhibit Anteroom → North Ambulatory → East Wing → Exit Hall (37.2).
- **Major structures:** Rotunda Statue (losBreak, divider); Arcade Column South (losBreak, hiding); Arcade Column North (losBreak, hiding); Anteroom Sculpture (hiding, losBreak); Ambulatory Case (hiding, losBreak); East Wing Wall (losBreak, hiding); East Wing Case (hiding); East Wing Low Display (divider); North Gallery Low Display (divider); Rotunda Core — wall (losBreak, divider); Exhibit Pier — wall (losBreak, hiding, divider); East Wing Wall Stub — wall (divider, losBreak).
- **Guard roles:** crossing in Rotunda Floor — The rotunda floor: the arcade from the west post, the anteroom opening from the north post, the east wing from the east post / objective in Private Exhibit — The diamond; between inspections stands in the anteroom watching the arcade.
- **CCTV:** none.
- **Simulator verdict:** Checked. Rotunda core with the statue in front, colonnade on the west, vestibule projecting at the bottom, exit hall top right. Open floor remains on the crossing by intent.
- Scripted thief (supporting only): 16/24 clears, safe 12/12, risk 4/12. Largest open disc 2.38 tiles.

### 01-03 Archive

- **Architecture:** 23x19 tiles, 7 zones: Exit Lobby, Reading Room, Secure Archive, Records Passage, Storage, Conservation Workspace, Archive Stacks.
- **Entry:** bottom-right — Archive Stacks.
- **Objective:** centre — Secure Archive (Documents in the east bay behind the wall pier).
- **Exit:** top-left — Exit Lobby.
- **Topology:** S-shape.
- **Cover graph:** safe Stack Case East → Stack Case West → Storage Rack South → Storage Rack North → Workspace Cabinet → Archive Pier; risk Stack Case East → Stack Case West → Stacks Column; escape Records Cabinet → Card Catalogue.
- **Safe route:** Archive Stacks → Storage → Conservation Workspace → Secure Archive (50.5 tiles).
- **Risk route:** Archive Stacks → Conservation Workspace → Secure Archive (34.7 tiles).
- **Escape:** quick Secure Archive → Reading Room → Exit Lobby (23.2); after lockdown Secure Archive → Records Passage → Reading Room → Exit Lobby (41.8).
- **Major structures:** Stack Case East (losBreak, hiding); Stack Case West (losBreak, hiding); Stacks Column (losBreak, hiding); Storage Rack South (losBreak, divider); Storage Rack North (losBreak, divider); Conservation Workbench (divider); Workspace Cabinet (hiding, losBreak); Records Cabinet (hiding); Card Catalogue (hiding, losBreak); Reading Table East (divider); Reading Table West (divider); Archive Pier — wall (losBreak, hiding, divider).
- **Guard roles:** restricted in Conservation Workspace — The two ways into the workspace: the Storage opening from the north post, the stacks door from the south post / objective in Secure Archive — The documents; between inspections stands in the Records Passage.
- **CCTV:** none.
- **Simulator verdict:** Checked. Small rooms read clearly: stacks along the bottom, storage racks, workbench room, Secure Archive in the centre with pier, reading room on top. Storage uses cabinet and case art because Museum has no shelf asset.
- Scripted thief (supporting only): 16/24 clears, safe 6/12, risk 10/12. Largest open disc 1.88 tiles.

### 01-04 Security Wing

- **Architecture:** 24x21 tiles, 7 zones: Public Gallery, Central Gallery, Restricted Collection, Staff Corridor, Security Desk, Exit Lobby, Staff Passage.
- **Entry:** top-left — Public Gallery.
- **Objective:** right-centre — Restricted Collection (Artifact in the east bay behind the free-standing pier).
- **Exit:** bottom-right — Exit Lobby.
- **Topology:** U-shape loop.
- **Cover graph:** safe Gallery Statue → Staff Lockers → Security Desk; risk Gallery Statue → Gallery Partition; escape Collection Pier → Lobby Screen → Passage Lockers.
- **Safe route:** Public Gallery → Staff Corridor → Security Desk → Restricted Collection (36.6 tiles).
- **Risk route:** Public Gallery → Central Gallery → Restricted Collection (29.3 tiles).
- **Escape:** quick Restricted Collection → Exit Lobby (11.4); after lockdown Restricted Collection → Security Desk → Staff Passage → Exit Lobby (29.7).
- **Major structures:** Gallery Statue (divider, losBreak); Gallery Case (hiding); Gallery Partition (losBreak, hiding); Staff Lockers (hiding, sightline); Security Desk (losBreak, divider, hiding); Passage Lockers (hiding); Lobby Screen (losBreak, hiding); Gallery Pier — wall (losBreak); Collection Pier — wall (losBreak, hiding, divider).
- **Guard roles:** restricted in Security Desk — The Security Desk room: the staff corridor opening from the north-west post, the staff passage door from the south-east post / objective in Restricted Collection — The artifact; between inspections stands in the exit lobby watching the staff passage.
- **CCTV:** 1 in Central Gallery — The Central Gallery short cut north of the partition and the gap to the Restricted Collection opening.
- **Simulator verdict:** Checked. Stepped outline, U along the west and bottom, Central Gallery short cut with the camera above the partition, pier in front of the artifact bay, exit bottom right.
- Scripted thief (supporting only): 14/24 clears, safe 2/12, risk 12/12. Largest open disc 1.88 tiles.

### 01-05 Grand Heist

- **Architecture:** 25x21 tiles, 9 zones: Security Threshold, Main Exhibition, Grand Lobby, Collection Vestibule, Private Collection, Side Exhibition, Diamond Chamber, Side Exit, Service Corridor.
- **Entry:** top-right — Grand Lobby.
- **Objective:** left-centre — Diamond Chamber (Diamond in the far corner of the chamber).
- **Exit:** bottom-left — Side Exit.
- **Topology:** Asymmetric loop: deep in, alternate out.
- **Cover graph:** safe Lobby Desk → Exhibition Column East → Grand Statue → Exhibition Column West → Threshold Desk → Display Wall; risk Exhibition Column East → Grand Statue → Exhibition Column West → Display Wall; escape Display Wall → Side Exhibition Wall → Service Cabinet.
- **Safe route:** Grand Lobby → Main Exhibition → Security Threshold → Collection Vestibule → Private Collection → Diamond Chamber (45.7 tiles).
- **Risk route:** Grand Lobby → Main Exhibition → Private Collection → Diamond Chamber (36.1 tiles).
- **Escape:** quick Diamond Chamber → Side Exit (6); after lockdown Diamond Chamber → Private Collection → Side Exhibition → Service Corridor → Side Exit (38.8).
- **Major structures:** Lobby Desk (hiding, divider); Grand Statue (losBreak, hiding); Exhibition Column East (losBreak, hiding); Exhibition Column West (losBreak, hiding); Threshold Desk (threshold, hiding); Side Exhibition Statue (losBreak, hiding); Side Exhibition Wall (losBreak, hiding); Service Cabinet (hiding); Display Wall — wall (losBreak, divider, hiding); Statue Pier — wall (losBreak).
- **Guard roles:** crossing in Main Exhibition — The Main Exhibition: the lobby opening from the east post, the Security Threshold opening and the collection door from the west post / escape in Service Corridor — The way out: the chamber door from the side exit post, the Side Exhibition door from the corridor post / objective in Diamond Chamber — The diamond; between inspections walks the south passage to check the Side Exhibition.
- **CCTV:** none.
- **Simulator verdict:** Checked. Long hall with Grand Statue and two columns on top, Display Wall room and Diamond Chamber on the left, service rooms along the bottom, three guards each in a different room.
- Scripted thief (supporting only): 12/24 clears, safe 12/12, risk 0/12. Largest open disc 1.88 tiles.

### 02-01 Portrait Hall

- **Architecture:** 27x20 tiles, 9 zones: Portrait Hall, Viewing Island, Curator Aisle, Private Gallery, Reception, East Gallery, South Gallery, Side Exit, Loading Passage.
- **Entry:** left-centre — Reception.
- **Objective:** top-right — Private Gallery (Painting in the bay behind the wall pier).
- **Exit:** bottom-right — Side Exit.
- **Topology:** Diagonal.
- **Cover graph:** safe West Portrait Wall → Curator Sculpture → Gallery Pier; risk Hall Art Wall → Island Sculpture; escape Island Sculpture → South Art Wall → East Gallery Art Wall.
- **Safe route:** Reception → Portrait Hall → Viewing Island → Curator Aisle → Private Gallery (35.4 tiles).
- **Risk route:** Reception → Portrait Hall → Viewing Island → Curator Aisle → Private Gallery (35.3 tiles).
- **Escape:** quick Private Gallery → East Gallery → Side Exit (16.6); after lockdown Private Gallery → Curator Aisle → Viewing Island → South Gallery → Loading Passage → Side Exit (68).
- **Major structures:** Hall Art Wall (losBreak, hiding); Curator Plinth (divider); Island Sculpture (losBreak, divider, hiding); Island Bench North (divider); Island Bench South (divider); Curator Sculpture (losBreak, hiding); East Gallery Art Wall (losBreak, hiding); South Art Wall (losBreak, hiding); Loading Plinth (divider); West Portrait Wall — wall (losBreak, divider, hiding); East Portrait Wall — wall (losBreak, divider, hiding); Gallery Pier — wall (losBreak, hiding, divider).
- **Guard roles:** crossing in Viewing Island — The Viewing Island crossing on a long north-south walk: the island benches from the north post, the south gap from the south post / objective in Private Gallery — The painting; between inspections stands in the East Gallery.
- **CCTV:** none.
- **Simulator verdict:** Checked. Two staggered portrait walls give the diagonal; sculpture and benches form the Viewing Island; Private Gallery top right. The hall is the most open of the ten.
- Scripted thief (supporting only): 10/24 clears, safe 4/12, risk 6/12. Largest open disc 2.38 tiles.

### 02-02 Sculpture Studio

- **Architecture:** 25x20 tiles, 9 zones: Studio, North Passage, Studio Forecourt, Exit Hall, West Ring, East Ring, South Annex, Loading Dock, South Ring.
- **Entry:** bottom-left — Loading Dock.
- **Objective:** top-centre — Studio (Painting in the east bay behind the wall pier).
- **Exit:** right-centre — Exit Hall.
- **Topology:** Central island.
- **Cover graph:** safe Dock Art Wall → Studio Colossus → Island Sculpture East → Studio Screen; risk Dock Art Wall → Island Sculpture West → Studio Screen; escape Studio Pier → Studio Screen → Island Sculpture East → Annex Plinth.
- **Safe route:** Loading Dock → South Ring → East Ring → Studio Forecourt → Studio (43.7 tiles).
- **Risk route:** Loading Dock → South Ring → West Ring → Studio Forecourt → Studio (45.8 tiles).
- **Escape:** quick Studio → North Passage → Exit Hall (14.1); after lockdown Studio → Studio Forecourt → East Ring → South Ring → South Annex → Exit Hall (49.4).
- **Major structures:** Studio Colossus (losBreak, divider, hiding); Island Sculpture West (losBreak, hiding); Island Sculpture East (losBreak, hiding); Dock Art Wall (losBreak, hiding); Studio Screen (losBreak, hiding); Forecourt Plinth (divider); Annex Plinth (divider, hiding); Island Core — wall (losBreak, divider); Studio Pier — wall (losBreak, hiding, divider).
- **Guard roles:** crossing in West Ring — The ring around the island, walked clockwise: each side in turn, always looking ahead along the next side / objective in Studio — The painting; between inspections walks out to the west end of the forecourt and looks down the West Ring.
- **CCTV:** none.
- **Simulator verdict:** Checked. Central island (core, colossus and two sculptures) is the focus; the guard circles it; studio on top with the pier and bay; exit hall on the right.
- Scripted thief (supporting only): 22/24 clears, safe 10/12, risk 12/12. Largest open disc 2.38 tiles.

### 02-03 Glass Gallery

- **Architecture:** 25x20 tiles, 11 zones: Private Glass Room, Glass Threshold, Glass Hall North Lane, Glass Hall West Column, Glass Hall East Turn, West Stair, Conservation Lab, Glass Hall South Lane, Exit Lobby, Art Store, Entrance Gallery.
- **Entry:** bottom-right — Entrance Gallery.
- **Objective:** top-left — Private Glass Room (Painting behind a glass screen: seen from the door, reached round the screen).
- **Exit:** bottom-left — Exit Lobby.
- **Topology:** Zigzag.
- **Cover graph:** safe Entrance Sculpture → South Lane Art Wall → Bay Sculpture → Threshold Jamb; risk South Lane Art Wall → Middle Lane Sculpture; escape Lab Plinth North → Stored Art Wall.
- **Safe route:** Entrance Gallery → Glass Hall South Lane → Glass Hall East Turn → Glass Hall North Lane → Glass Threshold → Private Glass Room (51.3 tiles).
- **Risk route:** Entrance Gallery → Glass Hall South Lane → Glass Hall West Column → Glass Hall North Lane → Glass Threshold → Private Glass Room (34.3 tiles).
- **Escape:** quick Private Glass Room → West Stair → Exit Lobby (17); after lockdown Private Glass Room → Glass Threshold → Conservation Lab → Art Store → Exit Lobby (31.9).
- **Major structures:** Lower Glass West (divider, sightline); Lower Glass East (divider, sightline); Upper Glass West (divider, sightline); Upper Glass East (divider, sightline); South Lane Art Wall (losBreak, hiding); Middle Lane Sculpture (losBreak, sightline); Bay Sculpture (hiding, losBreak); Entrance Sculpture (losBreak, hiding); Private Glass Screen (divider, sightline); Threshold Plinth (hiding, divider); Lab Plinth North (divider); Stored Art Wall (losBreak, hiding); Threshold Jamb — wall (hiding, losBreak).
- **Guard roles:** crossing in Glass Hall West Column — The west column: through the glass gap the hall entrance from the south post, the north lane toward the bay from the north post / objective in Private Glass Room — The painting; between inspections steps into the threshold and watches the Conservation Lab door.
- **CCTV:** 1 in Glass Hall East Turn — The east turn of the zigzag between the two glass gaps.
- **Simulator verdict:** Checked. Both glass lines render as glass and leave the two gaps; camera cone covers the east turn; glass screen stands in front of the painting. The south-lane art wall partly overlaps the glass line and the middle-lane sculpture on screen.
- Scripted thief (supporting only): 18/24 clears, safe 10/12, risk 8/12. Largest open disc 2.38 tiles.

### 02-04 Grand Atrium

- **Architecture:** 27x22 tiles, 10 zones: North Foyer, Exit Gallery, East Service Corridor, Central Aisle, Movable Wall Cell, Sculpture Island Cell, Art Wall Cell, Private Forecourt, East Sculpture Cell, Private Atrium.
- **Entry:** top-centre — North Foyer.
- **Objective:** bottom-centre — Private Atrium (Painting in the east bay behind the wall pier).
- **Exit:** top-right — Exit Gallery.
- **Topology:** Outer ring with inner crossing.
- **Cover graph:** safe Island Sculpture → West Art Wall → Central Installation; risk Central Installation; escape Atrium Pier → East Sculpture → Movable Wall South → Movable Wall North → Service Pedestal.
- **Safe route:** North Foyer → Central Aisle → Sculpture Island Cell → Art Wall Cell → Private Forecourt → Private Atrium (45.8 tiles).
- **Risk route:** North Foyer → Central Aisle → Private Forecourt → Private Atrium (27 tiles).
- **Escape:** quick Private Atrium → Private Forecourt → East Sculpture Cell → Movable Wall Cell → Exit Gallery (31.5); after lockdown Private Atrium → Private Forecourt → East Sculpture Cell → East Service Corridor → Exit Gallery (40.8).
- **Major structures:** Central Installation (losBreak, divider, hiding); Island Sculpture (losBreak, divider, hiding); Movable Wall North (losBreak, hiding); Movable Wall South (losBreak, divider, hiding); West Art Wall (losBreak, hiding); East Sculpture (losBreak, hiding); Service Pedestal (hiding); Island Core — wall (losBreak); Atrium Pier — wall (losBreak, hiding, divider).
- **Guard roles:** crossing in Private Forecourt — The whole width of the atrium on one long walk below the installation: the west ring from the west post, the east ring from the east post / objective in Private Atrium — The painting; between inspections walks to the west end of the Private Atrium to check the plinth display.
- **CCTV:** 1 in Central Aisle — The two lanes either side of the installation on the inner crossing.
- **Simulator verdict:** Checked. Four cells around the installation are distinct (sculpture island, two movable walls, art wall, sculpture); camera above the crossing; Private Atrium at the bottom; service corridor on the right.
- Scripted thief (supporting only): 18/24 clears, safe 8/12, risk 10/12. Largest open disc 2.19 tiles.

### 02-05 Masterpiece

- **Architecture:** 26x22 tiles, 9 zones: Public Gallery, Main Installation, Curator Wing, Private Exhibition, Masterpiece Chamber, Loading Exit, Service Gallery, Preparation Room, Loading Corridor.
- **Entry:** top-left — Public Gallery.
- **Objective:** bottom-right — Masterpiece Chamber (Masterpiece in the south bay behind the wall stub).
- **Exit:** bottom-left — Loading Exit.
- **Topology:** Deep in, alternate out.
- **Cover graph:** safe Gallery Art Wall → Main Installation; risk Main Installation → Hall Art Wall; escape Chamber Stub → Preparation Table → Service Art Wall.
- **Safe route:** Public Gallery → Main Installation → Curator Wing → Private Exhibition → Masterpiece Chamber (39.3 tiles).
- **Risk route:** Public Gallery → Main Installation → Private Exhibition → Masterpiece Chamber (39.3 tiles).
- **Escape:** quick Masterpiece Chamber → Loading Corridor → Loading Exit (24.6); after lockdown Masterpiece Chamber → Preparation Room → Service Gallery → Loading Exit (26.2).
- **Major structures:** Main Installation (losBreak, divider, hiding); Hall Art Wall (losBreak, hiding); Gallery Sculpture (divider, sightline); Gallery Art Wall (losBreak, hiding); Preparation Table (divider, hiding); Service Art Wall (losBreak, hiding); Loading Art Wall (hiding); Hall Divider — wall (divider, losBreak); Chamber Stub — wall (losBreak, hiding, divider).
- **Guard roles:** crossing in Main Installation — The west side of the Main Installation: the north lane from the north post, the south lane from the south post / restricted in Private Exhibition — The Private Exhibition: the hall opening from the west post, the chamber door from the east post / objective in Masterpiece Chamber — The masterpiece; between inspections walks into the Preparation Room.
- **CCTV:** 1 in Main Installation — The east lane of the hall down to the Private Exhibition opening.
- **Simulator verdict:** Checked. Clockwise route reads from the Public Gallery to the chamber bottom right; installation with art wall in the hall; camera on the east lane; loading corridor and service rooms along the bottom.
- Scripted thief (supporting only): 22/24 clears, safe 12/12, risk 10/12. Largest open disc 2.38 tiles.

## VISUAL

- Architecture: all ten read as one building with rooms, not corridors between boxes. Five have a stepped
  or notched outline (01-02, 01-04, 01-05, 02-02, 02-04).
- Scale: major pieces are 2–3.4 tiles wide next to a ~1.3-tile character. Museum statues are about 5 tiles
  tall on screen and hide the floor directly north of their base, so every statue stands against a wall
  pier and no lane runs behind one.
- Empty space: largest open disc is 1.9–2.4 tiles on every map. 02-01 is the most open; the rotunda
  crossing in 01-02 and the forecourt in 02-04 are open on purpose.
- Known visual issues: 02-03 south-lane art wall overlaps the glass line and the middle-lane sculpture on
  screen; art walls placed against a north wall overlap that wall's face (02-05 service rooms).
- Decoration: only three portraits (02-01) and the masterpiece panel (02-05) were added. The spec's
  decoration pass is otherwise not done.
- Assets: only current Museum and Gallery production art. Museum has no shelf or storage asset, so 01-03
  uses the cabinet-style partition and display cases for racks. No new asset was generated.
- Review was done with the whole-map QA camera. The normal play camera was not reviewed.

## TRAVERSAL

- Player-only walk (guards and cameras removed, production simulation): both approach lanes then the quick
  escape clear on all ten.
- Fake gap: 0 sealed floor pockets and 0 sub-tile squeezes on all ten, measured against the game's own
  navigation grid. Lanes are 1.5 tiles or wider.
- Topology audit: 0 errors on all ten (entry–exit separation, three distinct zones, restricted zone on the
  shortest approach, lockdown door interrupts the quick route, independent route after lockdown, first
  cover within 6 tiles of the pickup).
- Entry / objective / exit sit in the building third the blueprint names, on all ten.

## DIFFICULTY INTENT

- Museum: two guards (three on 01-05), one camera in the chapter (01-04). One guard gates the lanes, the
  objective guard gates the prize; they never watch the same spot except on the 01-01 risk lane.
- Gallery: same guard counts, longer walks and sightlines, cameras on 02-03, 02-04, 02-05.
- Scripted thief clears out of 24 (ranking aid only, not human difficulty): 01-01 8, 01-02 16, 01-03 16, 01-04 14, 01-05 12, 02-01 10, 02-02 22, 02-03 18, 02-04 18, 02-05 22.
  By this metric Gallery is easier than Museum and 01-01 is the hardest Museum map — the opposite of the
  intended order. This needs a tuning pass and a human playtest.
- On 01-04 the scripted thief clears the safe lane 2 of 12 times and the risk lane 12 of 12; on 01-03 and
  02-01 the risk lane also scores higher than the safe lane.

## REGRESSION

- TypeScript: PASS (`tsc --noEmit` exit 0).
- lint: 0 errors, 2 existing warnings.
- npm test: exit 0, 1007 checks pass, 0 fail. Stability suite: 33 pass.
- collision / fake gap: 0 on the ten rebuilt maps; patrols walked 120 s on the real guard code without
  touching collision.
- topology: 45 / 45.
- Tilt hash and the other protected files: unchanged (protected-hash test passes).
- Ch3–9: 35 / 35 missions byte-equal to the Phase 5 build.
- New test: `tools/campaign/v13Scope.test.ts` (8 checks). `v125Scope.test.ts` now compares the live
  campaign for Chapter 3–9 only, since Chapter 1–2 no longer come from the Phase 5 layer.
- Shared builder: three optional plan fields were added (`objectiveStops`, room `hub`, `drawnFloor`).
  Existing plans do not set them; the Phase 4D and Phase 5 builds are unchanged by the tests above.
- `missionBriefs.ts` regenerated.

## Changes after the first playtest (2026-10-04)

- 01-05: the Private Collection guard became an exit guard. It walks the Service Corridor and stands at the
  Side Exit facing the chamber door, so the quick way out has to be timed. The approach now has two gates
  (hall guard, chamber guard) like the other Museum maps.
- 02-05: the instant alarm (1.5 s after pickup, no witness needed) is off. Like every other Chapter 1–2
  mission, the alarm now needs a guard to see the empty stand. 03-05 keeps the instant alarm.
- Corner slow-down: a body that clipped a structure corner, even by under a pixel, was stopped by the whole
  face and crawled along it at about 39 px/s. `src/game/world/collision.ts` now carries a body round a
  corner it overlaps by less than its radius. Tilt constants and `tiltMovement.ts` are unchanged
  (protected hashes pass). Six tests were added to `wallSlide.test.ts`. Checked in the offline simulation
  only, not on a device.

## Changes after the second playtest (2026-10-04)

- Corner slow-down, second pass: while a body was being carried round a corner the movement code still
  counted it as pressing on a wall, cut the held-back axis to the 40 px/s probe and then re-accelerated.
  `moveWithCollision` now reports a corner assist and `tiltMovement.ts` keeps the velocity through it.
  An 8 px clip that used to drop to about 35 px/s now stays above 100 px/s in the offline simulation.
  `tiltMovement.ts` is a hash-pinned file; its pin in `docs/design/v12/phase4c/PROTECTED_HASHES.json`
  was updated for this change. Tilt constants (dead zone, max tilt, smoothing) are untouched.
  Hitting the middle of a face, or pushing almost square into one, still slows as before by design.
- Entry and exit doors are redrawn (`drawPortal` in `venueArt.ts`): a double door standing in the wall
  with a sign lamp above it (red locked, green open, grey for the entry) on north and south walls, a
  doorway seen from above on side walls, and a runner on the floor to the spot the thief has to reach.
  Applies to every chapter that uses entry/exit edges. Checked in the Simulator on 01-01, 01-02, 01-04
  and 02-02 in the locked state; the open (green) state was not seen in the Simulator.

## Not done

- No human or Simulator clear; no physical-iPhone run.
- Difficulty order Ch1 < Ch2 and equal difficulty inside each chapter are not established.
- Lockdown, alternate escape under pursuit, chase and wall slide were not exercised on the new maps.
- Decoration pass.

## Evidence

`Reports/V13Phase1/`: `sim/<mission>-v13.png` (final Simulator captures), `mission-qa.json`,
`topology-audit.json`, `all-tests.log`, `typecheck.log`, `lint.log`.
