# Museum Chapter 01 — Bible V2 implementation mapping

Status: READY FOR USER REVIEW candidate. User iPhone approval required before Production Lock.

Authoring source: `tools/campaign/museumFinalDesign.ts` → `applyMuseumFinalDesign` called only for Museum by `buildCampaign.ts`. Offline `describeMuseumDesign` maps `missionId → blueprintId → zones → routePlan → guardRoles`; it does not add runtime region rules. Optional `regions` are the union of actual room rectangles used when a semantic zone has disconnected wings; `bounds` is its label envelope. Collision walls remain authoritative.

## Mission identity and flow

| ID | Zones | Architecture / emotional beat | Main / safe route | Risk route | Escape | Guards |
|---|---:|---|---|---|---|---|
| 01-01 | 3 | Entry relief → statue observation → first commitment | North gallery recess around Grand Statue | Short exhibition crossing | East side exit | 2: exhibition / objective |
| 01-02 | 3 | Rotunda offers a readable decision | Southern pillar recess | Central rotunda crossing | South staff return | 2: rotunda / artifact |
| 01-03 | 4 | Bent archive compresses LOS, then opens into storage | Shelf-end observation | Central aisle diagonal | Storage corner to east staff door | 2: archive / restricted exit |
| 01-04 | 4 | Office waiting pocket → timed controlled junction | West hub edge | Hub crossing | North restricted passage | 3: office / junction / objective |
| 01-05 | 5 | Arrival read → exhibit choice → restricted pressure → diamond → release | West side of grouped collection / north observation | Short diagonal chamber approach | Southern cornered service leg; upper threshold alternative | 3: entrance / restricted / objective |
| 01-06 | 5 | Restoration cross alternates equipment refuge and sightline exposure | West restoration / north storage | East equipment aisle | South equipment return or center service crossing | 3: restoration / equipment roaming / objective |
| 01-07 | 5 | U-shaped private rooms permit invitation and retreat | West portrait rooms | East private collection, with VIP bridge escape | South salon to west side gallery or bridge | 3: portrait / objective / foyer collection |
| 01-08 | 5 | Four security spokes require a choice under pressure | East desk bypass into restricted core | Center junction crossing | West maintenance bypass or center timed crossing | 4: access / junction / exit / objective |
| 01-09 | 6 | Vertical exhibition pockets create layered commitments | West sculpture / south collection | Middle gallery shortcut | East portrait connector or middle return | 5: vestibule / south / roaming middle / exit / objective |
| 01-10 | 6 | Asymmetric ring culminates in theft and distributed escape | Western gallery circuit | Inner security shortcut | West service circulation or east maintenance ring | 6: arrival / exit / west / security / roaming / objective |

“Safe” is an authored observation route, not a guaranteed no-alert path. Main follows the original main route where present; otherwise it follows the preserved safe traversal. Actual path points and semantic guard stops are exported by `describeMuseumDesign` and overlaid in `Reports/MuseumFinalDesignV2`.

## Focused edits

### 01-05 Restricted Collection

Preserved complete floor bitmap, start/objective/exit and all four authored approach/escape polylines. Replaced the isolated south divider with an exhibition case aligned to the existing central pillar. Moved the north partition off the perimeter so there is player-body space behind it; flanking pillar gives a second independently measured restricted-gallery hide point. Chamber pillar sits off the diamond approach. Service divider gives an occlusion opportunity beside the already existing service corner and two threshold choices.

The entrance retains its arrival statue and side case. Main circulation remains clear; this is a small-room heist, not an expanded obstacle arena. Exhibit grouping and perceived naturalness require in-game user inspection. Geometry counts alone do not certify the artistic result.

### 01-08 Security Core

Preserved floor bitmap and all player routes. Added authored access desk partition, west monitor shelf, junction pillar/screen, north corridor pillar plus restricted partition, south service divider and bypass pillar. The north partition specifically provides a withdrawal position after pickup; the west maintenance corner remains an escape choice. Added structure is intentionally offset from the central axis.

| Guard | Patrol identity retained | Theft role | Theft semantic posts (tiles) |
|---|---|---|---|
| 01-08-g1 | East access checkpoint | Own zone search | (16,8), (18,10.5) |
| 01-08-g2 | Junction / maintenance door | Junction | (8,8), (11,11.5) |
| 01-08-g3 | Evacuation / service desk | Exit route | (9,15), (14.5,16) |
| 01-08-g4 | Restricted archive | Objective confirmation | (9,2.5), (11.7,3.5) |

These are geographic assignments, not transmitted live player positions. Theft reaction hold is implemented separately in `theftAlert.ts`; player sight overrides the hold. Relative fairness (harder than 07, easier than 10) remains an iPhone-play acceptance criterion.

### Other missions

01-03 and 01-04 receive one targeted pillar each in their objective/exit wing; routes unchanged. In 01-02 the existing west rotunda pillar moves to (6.4,7.65), creating a body-occlusion witness. In 01-04 the existing office desk moves toward the doorway at (5.95,11.6), allowing waiting behind it within guard observation distance. In 01-06 the service screen moves to (14.3,17.2), giving an actual occluded return pocket; it previously hugged a wall without body space behind it. 01-07 previously had only two guards despite the three-guard blueprint. A third foyer/private collection guard now has two explicit anchors; no random roaming or speed changes. 01-01,09,10 runtime geometry remains unchanged. 01-10's full definition should compare equal to its pre-pass serialized definition.

## QA interpretation

`applyMuseumFinalDesign` refuses blocked player-radius route segments and unreachable/non-finite guard patrol/theft anchors. The final report additionally measures body-edge occlusion witnesses, actual corner refuges, maximum straight LOS and per-zone structure roles. A full-cover object is not automatically a verified hide point. Architectural refuge counts are distinct from prop full-cover counts.

Some preserved long halls still produce long-LOS warnings; the report must retain them for review. In particular the unchanged 01-10 is a deliberate audit-only baseline, not grounds for a global difficulty edit. Passing one fixed-observer occlusion witness is an opportunity to break sight, not immunity against other guards or proof of a successful pursuit escape.

Before/after data and overview: `Reports/MuseumFinalDesignV2`. TypeScript/lint/runtime scenario verification is reported by the coordinating task. Cable availability and Simulator UI access may prevent physical/native validation; no automatic QA result replaces that testing.
