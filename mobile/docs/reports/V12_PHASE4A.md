# V12 Phase4A — implementation and verification report

**V12 PHASE 4A — MUSEUM/GALLERY SPATIAL REBUILD IMPLEMENTED, PLAYTEST PENDING**

Runtime campaign SHA256: `85436d85f39746351eba3a421832c910f483d4eaf888beab912fdf9b4f024809`.

## Scope and preservation

- Museum/Gallery10 rebuilt. Campaign45; Chapter3–9 remaining35 exactly match frozen Phase4A baseline.
- Protected Tilt, Tilt profiles/movement, Savev5, Guard tuning and CCTV source hashes unchanged. Tilt1.75° /10° /.07sec; max speed unchanged. No legacy-unity edits.
- Baseline: `docs/design/v12/phase4a/SOURCE_STAGES.json`. Authoring `tools/campaign/v124aSpatial.ts` is offline; phone consumes baked JSON only.

## Physical door system

- Four doors/mission; unique IDs, TILE geometry compiled once to world pixels; orientation horizontal/vertical.
- OPEN and CLOSING pass movement/LOS until safe committed CLOSED. Solid CLOSED blocks both; glass CLOSED blocks movement and preserves LOS.
- CLOSING progress0→1 is animated from the same runtime state; full Player/Guard circle plus2px contact pauses closure, without teleport/push.
- Only Confirmed Theft starts28seconds. Search/PlayerSpotted do not restart it. At0 only designated quick-return door closes; no immediate failure. Service door stays open.
- Collision and LOS shared with Player/Guard/CCTV. Navigation base graph filtered and connected components rebuilt only on physical geometry revision; stale guard paths invalidated.
- Retry/new state resets doors to authored initial OPEN and countdown. Existing35 door-free maps keep original path. Invalid geometry/IDs/style are rejected at load.

## Door art and screenshots

- Six reusable native Skia vector assets: museumExhibition, museumRestrictedCollection, museumSecurity; galleryMinimal, galleryGlassSliding, galleryPrivateCollection. Wood/bronze/moulding, reinforced metal and transparent framed glass variants.
- Paints prepared once on JS; geometry/progress drawn in serialized UI worklets. Green OPEN, amber/red CLOSING and red CLOSED indicators.
- Old simple door props removed in these10 maps and replaced by4 physical runtime doors/map. Other chapters unchanged.
- `Reports/V12Phase4A/visual/`:10 DebugOFF OPEN overviews +10 CLOSED art inspections + same-world-scale overview. These are offline production Skia renders, not native captures. CLOSED art inspection sets panel state intentionally and is not live lockdown evidence.
- `Reports/V12Phase4A/native/<mission>/`: actual iPhone17Pro screenshots at gameplay scale, normal HID input. OPEN doors visible. Native CLOSING/CLOSED observation not obtained.

## Maps / dimensions / density

|Mission|Title|Before→After tiles|Floor tiles before→after|Guard/CCTV|Quick→Closed alternate tiles|
|---|---|---|---|---|---|
|01-01|Entrance Hall|21×14 → 21×14|129 → 162 (+25.6%)|2/0|23.0 → 31.3|
|01-02|Main Gallery|24×16 → 24×18|250 → 237 (-5.2%)|2/0|30.4 → 38.8|
|01-03|Archive & Conservation|16×23 → 22×16|209 → 189 (-9.6%)|2/0|27.3 → 34.8|
|01-04|Security Wing|24×17 → 23×17|226 → 207 (-8.4%)|2/1|27.4 → 35.7|
|01-05|Grand Heist|25×18 → 25×18|270 → 245 (-9.3%)|2/0|29.9 → 39.2|
|02-01|Portrait Hall|18×27 → 26×18|286 → 260 (-9.1%)|2/0|32.2 → 40.8|
|02-02|Sculpture Studio|24×20 → 26×19|244 → 272 (+11.5%)|2/0|32.3 → 41.2|
|02-03|Glass Gallery|27×21 → 27×19|331 → 282 (-14.8%)|2/1|34.0 → 42.2|
|02-04|Grand Atrium|28×20 → 28×19|336 → 299 (-11.0%)|2/1|35.0 → 44.3|
|02-05|Masterpiece|28×21 → 27×19|368 → 282 (-23.4%)|2/1|33.2 → 42.2|

Floor area compressed in8missions; 01-01 and02-02 have more functional floor rather than blanket shrink. 02-05 floor−23.4%. Dimensions include void/walls, so rotated size changes are not area claims.

Functional layout: protected public entry → viewing island → controlled collection threshold → secure interior objective; post-theft real opaque shoulder → longer preparation/service return → entry-side Exit. Every map has5named zones. Main/Safe/Risk route arrays are separate authored data;20px comfort validated. No arbitrary prop scatter.

Hall central exhibit plus satellite gives cover/landmark/divider roles. Restricted display controls approach, objective shoulder gives first LOS break, side pedestal/focal caption/lighting gives presentation. Service spine has2actual preparation bays and2workcells with warm pools, keeping central passage open.

### 01-01 — Entrance Hall

**Zones:** Visitor Entrance → Main Exhibit Hall → Side Collection → Objective Display → Service Exit.
**Objective:** (11.00, 2.50) inside secure collection. **First opaque break:** (10.00, 1.75).
**Routes:** Safe 19.0 tiles along exhibit shoulder; Risk 15.0 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 01-01-quick-return closes; persistent service escape remains 31.3tiles.
**Structures:** museum_diamond_case, museum_display_case_large, museum_display_low, museum_partition, museum_pedestal, museum_statue_large.

### 01-02 — Main Gallery

**Zones:** Gallery Entry → Main Rotunda → Sculpture Wing → Restricted Exhibit → Exit Loggia.
**Objective:** (13.50, 2.50) inside secure collection. **First opaque break:** (12.50, 1.75).
**Routes:** Safe 26.0 tiles along exhibit shoulder; Risk 20.7 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 01-02-quick-return closes; persistent service escape remains 38.8tiles.
**Structures:** museum_diamond_case, museum_display_case_large, museum_display_low, museum_partition, museum_pedestal, museum_statue_large.

### 01-03 — Archive & Conservation

**Zones:** Public Archive → Storage → Conservation Workspace → Restricted Archive / Objective Room → Loading Return.
**Objective:** (11.50, 2.50) inside secure collection. **First opaque break:** (10.50, 1.75).
**Routes:** Safe 23.0 tiles along exhibit shoulder; Risk 16.4 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 01-03-quick-return closes; persistent service escape remains 34.8tiles.
**Structures:** museum_diamond_case, museum_display_case_large, museum_display_low, museum_partition, museum_pedestal.

### 01-04 — Security Wing

**Zones:** Museum Corridor → Security Desk → Monitoring Room → Restricted Collection / Objective → Dispatch Return.
**Objective:** (10.50, 3.00) inside secure collection. **First opaque break:** (11.50, 2.25).
**Routes:** Safe 23.0 tiles along exhibit shoulder; Risk 17.9 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 01-04-quick-return closes; persistent service escape remains 35.7tiles.
**Structures:** museum_column, museum_diamond_case, museum_display_case_large, museum_display_low, museum_partition, museum_pedestal, museum_security_desk.

### 01-05 — Grand Heist

**Zones:** Grand Lobby → Master Exhibition → Security Threshold → Private Collection / Grand Objective Chamber → Service Cloister.
**Objective:** (14.00, 3.00) inside secure collection. **First opaque break:** (13.00, 2.25).
**Routes:** Safe 25.5 tiles along exhibit shoulder; Risk 20.3 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 01-05-quick-return closes; persistent service escape remains 39.2tiles.
**Structures:** museum_diamond_case, museum_display_case_large, museum_display_low, museum_partition, museum_pedestal, museum_statue_large.

### 02-01 — Portrait Hall

**Zones:** Reception → Portrait Corridor / Main Viewing → Collection Threshold → Private Portrait Collection → Conservation Exit.
**Objective:** (15.50, 2.50) inside secure collection. **First opaque break:** (14.50, 1.75).
**Routes:** Safe 27.8 tiles along exhibit shoulder; Risk 22.7 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 02-01-quick-return closes; persistent service escape remains 40.8tiles.
**Structures:** gallery_central_plinth, gallery_low_pedestal, gallery_movable_art_wall, gallery_white_wall.

### 02-02 — Sculpture Studio

**Zones:** Public Sculpture Hall → Work Studio / Central Sculpture Field → Workshop Threshold → Restricted Workshop / Objective → Preparation Return.
**Objective:** (15.00, 3.00) inside secure collection. **First opaque break:** (14.00, 2.25).
**Routes:** Safe 28.2 tiles along exhibit shoulder; Risk 22.6 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 02-02-quick-return closes; persistent service escape remains 41.2tiles.
**Structures:** gallery_central_plinth, gallery_low_pedestal, gallery_movable_art_wall, gallery_sculpture_large, gallery_white_wall.

### 02-03 — Glass Gallery

**Zones:** Reception → Glass Exhibit → Installation Corridor → Private Glass Room / Objective → Opaque Service Spine.
**Objective:** (11.00, 3.00) inside secure collection. **First opaque break:** (12.00, 2.25).
**Routes:** Safe 29.6 tiles along exhibit shoulder; Risk 23.6 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 02-03-quick-return closes; persistent service escape remains 42.2tiles.
**Structures:** galleryGlassPanelVertical, gallery_central_plinth, gallery_installation_art, gallery_low_pedestal, gallery_movable_art_wall, gallery_white_wall.

### 02-04 — Grand Atrium

**Zones:** Arrival Gallery → Grand Atrium → Art Wall Threshold → Private Installation Collection → Side Exhibition Return.
**Objective:** (17.00, 2.50) inside secure collection. **First opaque break:** (16.00, 1.75).
**Routes:** Safe 30.6 tiles along exhibit shoulder; Risk 25.6 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 02-04-quick-return closes; persistent service escape remains 44.3tiles.
**Structures:** gallery_central_plinth, gallery_installation_art, gallery_low_pedestal, gallery_movable_art_wall, gallery_white_wall.

### 02-05 — Masterpiece

**Zones:** Main Gallery → Curator Wing → Private Exhibition → Masterpiece Chamber → Service Escape / Preparation Corridor.
**Objective:** (16.00, 3.00) inside secure collection. **First opaque break:** (15.00, 2.25).
**Routes:** Safe 28.8 tiles along exhibit shoulder; Risk 23.6 tiles via central crossing; Main public→transition→restricted→secure. Exact points in runtime JSON.
**Lockdown:** 02-05-quick-return closes; persistent service escape remains 42.2tiles.
**Structures:** gallery_central_plinth, gallery_low_pedestal, gallery_movable_art_wall, gallery_white_wall.

## Difficulty

Targets Museum VERY EASY/EASY; Gallery EASY+. Guard count2 in both; Gallery changes through larger viewing spans, transparent glass, installations and selected CCTV rather than+1guard/blanket stat buffs.

Offline fixed Walk-approach/Run-escape pressure20 trials all ended CAUGHT. Safe-route observed guard exposure averages Museum.956s /Gallery1.486s, CCTV0s /.862s. Unequal time-to-capture and fixed-input timing bias make these diagnostic values, not difficulty proof. Museum<Gallery feel and chapter outliers remain human Tilt validation pending. No game changes were made just to get automated CLEAR.

## QA results

- Full `npm test`:668 Node runner PASS /0 FAIL plus custom-script gates; exit0. `Reports/V12Phase4A/full-test-final.log`.
- Independent strict campaign105/105 includes21 CLOSED-route/nav-oracle contracts; current45 validator, V3/V5 geometry, CCTV A/B/C/D and optimized navigation regression. `core-review-campaign-final.log`.
- Door core/integration16, serialized gameplay2, serialized art2 PASS. Serialized VM uses Expo closures; not native phone execution evidence.
- Current10-map actual shared Guard patrol120sec: anchors reachable, movement, collision-resolved facing, bounded paths, zero recoveries. Historical Museum full-tour tests preserved on baseline fixture.
- V5 geometry:10missions issues0. OPEN Main/Safe/Risk and CLOSED alternate legs20px clear, exact Objective→Exit endpoints. No Fake Gap identified by these audits.
- Stability suite PASS. `Reports/V12Phase4A/stability.log`. TypeScript PASS. Lint0errors,2existing require-style warnings in unchanged `src/ota/applyUpdate.ts` lines23/75. Changed files targeted lint0warnings/errors.
- Legacy motion tests with artificial per-frame changing blockers explicitly use door-free synthetic fixtures; assertions unchanged. New actual door/collision integration covers the dynamic door case.

## Actual iPhone17Pro Full-Heist attempts

Normal native menus/calibration/touch responder. DEV observer read-only; no teleport/forced pickup/AI suppression. Current Objective coordinates match compiled JSON on all6. At most2attempts/map,45sec per standard heist attempt. Separate01-01 second attempt waited for theft/door but was caught before pickup;85sec cap did not run to completion.

|Mission|Walk attempt|Second attempt|Objective|Theft/Lockdown|Alternate/Exit|Result|
|---|---|---|---|---|---|---|
|01-01|CAUGHT at 16.75s|CAUGHT at 8.73s|NO|Not reached|Not reached|PLAYTEST PENDING|
|01-03|CAUGHT at 15.58s|CAUGHT at 14.25s|NO|Not reached|Not reached|PLAYTEST PENDING|
|01-05|CAUGHT at 24.70s|CAUGHT at 21.18s|NO|Not reached|Not reached|PLAYTEST PENDING|
|02-01|CAUGHT at 25.15s|CAUGHT at 12.48s|NO|Not reached|Not reached|PLAYTEST PENDING|
|02-03|CAUGHT at 15.80s|CAUGHT at 16.35s|NO|Not reached|Not reached|PLAYTEST PENDING|
|02-05|CAUGHT at 17.53s|CAUGHT at 14.62s|NO|Not reached|Not reached|PLAYTEST PENDING|

All final-data attempts rendered patrol/vision, moved Player and displayed normal CAUGHT UI. No runtime Red Screen or app exit observed. Bot timing/capture is a TEST LIMITATION; it is not evidence that missions are impossible. Full-Heist CLEAR, actual confirmed-theft28s door animation and post-lockdown native escape are unverified. Earlier intermediate map01-01 clear is archived evidence only, not claimed for final bake.

## Real iPhone14Pro

Device connected. RN app launch against Tilt Metro8086 rejected by iOS because device is locked (`FBSOpenApplicationErrorDomain7 Locked`). No new physical Tilt/frame/FPS claim. Unlock required when user returns; test01-05 and02-05 then. Metro preparation is not physical app-run proof.

## Remaining gate

1. Human iPhone14Pro Tilt01-05/02-05: difficulty/readability/overshoot and first cover.
2. Confirmed Theft→28s→visible CLOSING/CLOSED→alternate service escape→CLEAR on actual native app.
3. Representative6 actual Full-Heist witnesses; current fixed-input attempts were caught.
4. Visual approval of new spatial language/door assets; offline images are available but no final premium-art approval is asserted.

**No VERIFIED / Production Ready declaration.**
