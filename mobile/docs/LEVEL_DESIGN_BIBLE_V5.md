# DON'T MOVE — Level Design Bible V5

## Source of truth

V5 supersedes V2/V3/V4 for future level composition decisions. Earlier documents and evidence remain preserved. Scope here is Chapter01 Museum, Chapter02 Gallery, Chapter03 Bank, thirty existing missions. No Production Lock follows automated acceptance.

## Authoring order

1. Mission fantasy: one sentence the actual space must express.
2. Architecture: chapter-specific real spatial grammar, not a generic room template.
3. Entry / Objective / Exit: choose their regions and meaningful separation first.
4. Zone graph: purpose, connections, and what the player decides in each zone.
5. Route topology: vary orientation, silhouette, loops and alternate escape.
6. Landmark: directly governs route decisions or objective storytelling.
7. Security coverage: guard roles + CCTV as one threat budget.
8. Cover / Hide chain: connected usable stops with escape compensation.
9. Gameplay structures: functional medium/major objects.
10. Soft structures: circulation and spatial rhythm.
11. Lighting: objective emphasis, path legibility, warm/cool chapter context.
12. Decoration: only after the spatial gameplay works.

Every modified mission records entrySide, objectiveRegion, exitSide, routeShape, zone purpose, guard roles, camera mount rationale, objective context, structure roles and search circuits.

## Spatial rules

- Same-room or adjacent Entry/Exit fails without a specific fantasy justification. Avoid immediate Entry→Exit visibility.
- Escape after objective: early may be short, middle crosses a meaningful zone, late crosses security plus a junction/decision, final crosses at least two meaningful zones.
- No repeated topology/portal pattern in a three-mission sequence. Compare equal-world-scale overviews and20% silhouette views.
- Large rooms have2–4 meaningful cells without becoming narrow zigzag obstacle courses.
- Central navigable space must contain a major/medium structure, LOS break, security anchor or landmark unless exposure itself is an explicitly authored mechanic.
- A large area without structures/security/route choice/hide/landmark/objective is a dead-space candidate. Redesign its purpose/graph; do not scatter three extra props to fill a quota.
- Every major/medium object has a named role: landmark, cover, LOS break, route divider, security, objective support or environmental story.
- Cover is a usable chain, not isolated dots around the perimeter. Maintain comfortable Tilt margins and at least two ways around central islands where appropriate.

## Chapter identity

Museum: classical exhibition, statues, cases, marble/trim, restricted collection and service circulation.
Gallery: modern open exhibition, movable art walls, sculpture/plinth islands, installation and masterpiece contexts; sightline choices rather than a Museum clone.
Bank: gradually deeper PUBLIC→STAFF→SECURITY→VAULT. Teller halls, office network, records, deposit boxes, checkpoints, cash processing and vault antechamber must read as different places.

Use only the correct chapter environment family for architecture/major structures. Lab/Casino structures cannot be used as generic security support in the first three chapters. Existing Lab/Casino asset kits and later maps are protected.

## Objective storytelling

Objective = landmark + display/case/pedestal + local light + security context. A target sprite alone is insufficient.

- Museum: exhibition glass/pedestal, spotlight and cyan accent.
- Gallery: masterpiece/premium plinth/sculpture centerpiece/private collection.
- Bank: secure deposit/cash/vault asset tied to that mission's function.
-03-10 target must be inside Main Vault or its directly connected secured chamber. Alternate-out crosses a genuine second gameplay phase, not a short reverse of entry.

All thirty targets require separate DebugOFF objective crops. Review whether the target is immediately identifiable; numerical distance/brightness alone is not approval.

## Security and search

- Choose Guard count from map area, meaningful zones/junctions, LOS exposure, objective and escape importance, and CCTV contribution. Never derive it only from mission ordinal.
- Larger5–6zone missions may use5–7guards; finals6–8 only if cover/LOS/alternate escape compensates for total threat.
- Guards have explicit Entry/Patrol/Junction/Objective/Roaming/Exit/Security/Search roles.
- Cameras mount on chapter architecture: wall/column/corner/junction/gate/vault approach. No generic floor prop automatically beneath a camera.
- Intentional safe regions have authored reason AND actual bounds: breathing/observation/route-choice/recovery pockets. Absence of a waypoint never creates an exemption automatically.
- Theft search uses distinct adjacent zones, junctions, exits and security circuits. Guards never receive hidden current Player position.
- Validate normal, theft, spotted, search and return behavior/coverage separately. Test actual30–60second theft circulation, not sector metadata only.
- Camera QA includes sweep avoidance, brief suspicion, full detection, snapshot LKP sharing and actual LOS break.

## Visual passability

DebugOFF pixels and physical collision must agree. A visible inviting passage must be traversable by the actual player body. If not, join objects or visibly close the slit. Sprite-height projection and floor footprint must both be reviewed. A nav PASS is not a screenshot PASS.

## Evidence gates

Before edits, render every mission at equal world scale with DebugOFF. Each screenshot receives A–M answers:

A place identity; B name/fantasy match; C natural entry; D target legibility; E meaningful exit; F entry/goal/exit separation; G central composition; H placement reasons; I guard distribution; J camera architecture; K interior hide chain; L visual/collision agreement; M neighbor diversity.

A clear FAIL selects a mission for rework. Good maps may remain unchanged.

For each rebuild, at least two visible differences must be shown: silhouette, zone connections, Entry/Exit, target location, central composition, security placement, landmark relation. A prop move alone is polish, not topology redesign.

Maximum three DESIGN→RENDER→REVIEW→REWORK rounds. Repeating the same inadequate move is not a new design.

Required outputs: before/after boards, all30equal-scale overviews,20% silhouette views, objective crops/board, empty-area heatmaps with intentional route clearance distinguished, guard/camera/uncovered/hide overlays, individual A–M screenshot decisions, SHA-bound continuous play evidence.

For modified missions test Main/Safe/Risk as applicable, Theft Escape, Spotted→LOS break, actual camera behavior, long theft search, guard navigation, actual body/comfortable margin. Mandatory representatives01-05/08/10,02-03/06/10,03-03/05/08/10.03-10 includes actual vault pickup→theft→global search→camera/guard detection→LOS break→alternate escape.

TypeScript/lint/test results are mandatory technical gates, never quality approval. Native simulator/device evidence is explicitly separated from offline production-renderer/shared-engine evidence. Native Tilt comfort, subjective balance and device FPS cannot be inferred.

Only when all thirty screenshot gates and required evidence pass may status be **CHAPTER 01~03 LEVEL DESIGN V5 READY FOR USER REVIEW**. Production Lock is forbidden.

## Protected systems

Do not alter legacy-unity, characters, locomotion, Tilt/Android Tilt, audio, alert/pursue cores, ads/IAP, UI/progression or later chapter maps/assets. Changes belong to level geometry/placement/routes/search data and authoring/verification tools. Any necessary presentation change outside that scope must be reported before implementation, not silently included.

## Failure references

Six failure classes registered: false narrow passage; foreign chapter prop; broad unguarded area; repeated Entry/Exit; isolated target; meaningless large room. The six exact user screenshot files referenced by the request were not attached with V5; do not pretend to have inspected them. Register them when supplied.

## 최종 후보 검증 기록

RN runtime에 Chapter01–03 V5 후보를 반영했다. 19 topology rebuild / 11 polish. 최종 offline Debug OFF 화면 27 PASS / 3 FAIL: 01-08 북쪽 외벽, 02-02 Portrait Hall artwork mismatch, 02-06 북쪽 외벽. 전체 READY / Production Lock을 선언하지 않는다.

Reports/LevelDesignV5/REVIEW_REPORT.md에 요구한42개 항목과 실제 증거/미검증 사항을 기록했다. Native Simulator/iPhone/Android Tilt/FPS는 이번 V5에서 검증하지 않았다. 03-10 strict Theft→CCTV Spotted→LOS break→최종탈출도 미검증이다.
