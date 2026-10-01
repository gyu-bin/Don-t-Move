# DON'T MOVE — Level Design Bible V3

Status: source of truth for authored level composition. V2 remains as historical guidance. An automated test pass never establishes that a map is good or authorizes Production Lock.

## Mandatory authoring order

**Mission Fantasy → Architecture → Entry / Objective / Exit → Zone Purpose → Route Topology → Landmark → Security Coverage → Hide / LOS Break → Gameplay Structures → Soft Structures → Lighting → Decoration.**

Write the fantasy and portal topology before adding props. No empty-tile prop scatter, density-deficit filling, ordinal guard-count generation, or decoration as a substitute for spatial design. Navigation may connect authored waypoints; it must not invent the mission or silently move a landmark.

## A — Fantasy and architecture

- Each mission has one concrete sentence describing the infiltration, target and escape.
- Museum: classical gallery halls, collections and restricted wings. Gallery: movable art walls, sculpture islands and open crossings. Bank: public lobby, teller barrier, staff/security layers and vault depth. Different colours do not establish different architecture.
- Every large landmark must cause an objective, route decision, checkpoint, climax or escape transition. Record the relation and its physical evidence. A Main Vault's target belongs inside or directly adjacent to that vault, not in an unrelated room.
- Every major structure needs a reason tied to the zone, route, cover or landmark. Record major/medium visible structures separately from soft structures and decoration.

## B — Portal and route topology

- Author Entry, Objective and Exit first. Record entrySide, objectiveRegion, exitSide, routeShape and escapeDirection.
- Entry and Exit may not share a doorway or sit 2–3 tiles apart. An intentional return heist still needs a separated service exit or a meaningful alternate escape lane. Any exception requires a specific fantasy and review, not an inherited template.
- Objective pickup must lead to a real escape phase: early missions may be short; middle missions recross a meaningful zone; later missions cross security and a junction/decision; final missions traverse at least two meaningful zones.
- Use different macro shapes within a chapter: cross-building, diagonal, L, U, loop, asymmetric, central objective/opposite exit, deep entry/alternate service escape. Similar adjacent signatures are warnings; three consecutive similar silhouettes require rework.
- Compare zone graph, guard placement and landmark location as well as rotated floorplan hashes. A resized copy is still a composition repeat.
- Safe and Risk must represent different exposure, timing or route decisions. Different waypoint labels alone do not establish different routes. Escape is reviewed separately from approach.

## C — Zone purpose and central gameplay

- Every zone owns at least one purpose: approach, timing, observation, safe-risk choice, narrow stealth, lure, junction, security check, objective, chase break, escape, lockdown or service route.
- Each large zone needs at least two meaningful features: security pressure, route choice, LOS challenge, cover interaction, landmark, objective or meaningful traversal. Delete or merge unused rooms.
- Divide a large room into 2–4 gameplay cells with open islands, exhibits, patrol axes and crossings. Do not produce a wall maze merely to fill space.
- The central 50–60% region cannot be entirely empty unless an authored patrol axis or deliberate open crossing gives it gameplay meaning. Audit centralGameplayCount versus edgeGameplayCount using visible structural footprints and patrol intent.
- Construct a reachable cover chain: each stop has a next decision and a visible destination. Long exposed halls need meaningful break points; avoid numerical prop quotas.
- Measure maximum exposure on the actual route and explain any long section. Static shelter from one observer does not prove safety from every moving guard.

## D — Security and information

- Assign every major zone coveredByGuard, coveredByCCTV and intentionallySafeReason. A large uncovered zone without a safety reason is a dead-zone candidate.
- Intentional safety must serve observation, a decision, a service retreat or chase break. Accidental lack of guards is not a safe-zone design.
- Choose guard count from area, zone roles, junctions, route length, sightlines, CCTV coverage, objective and escape. Indicative budgets: small2–3, medium3–5, large5–7, final6–8; more than8 requires a reason. Never start from the budget or auto-add a guard to repair a metric.
- Before adding guards, consider patrol coverage, roaming responsibilities, camera timing or zone connections. Avoid overlapping pressure without compensating cover/LOS break/alternate routes.
- CCTV attaches to architecture: wall corners, restricted entrances, intersections, checkpoints or vault approach. Its environment remains Museum/Gallery/Bank, not generic Security HQ clutter. Never place an arbitrary security prop underneath the camera.
- Every camera needs demonstrated counterplay: timing, a blind spot, reachable cover or another route. Verify actual body/mount placement and the same VisionFan/LOS used at runtime.
- Theft search sectors collectively revisit all meaningful zones over time, with per-guard responsibilities. Keep existing role-first fairness where approved. No sector may use hidden current Player coordinates. Actual spotting creates LKP; LOS break freezes memory.
- Produce security maps showing real sampled patrol/CCTV exposure, uncovered areas, shelter, objective and escape. Potential coverage over time is not simultaneous pressure, detection difficulty or proof of human fairness.

## E — Traversal and visual passability

- A visibly open passage must support Player diameter plus Tilt clearance. Current production body radius9 and safety margin9 require a radius18 swept route (36 world-unit corridor width).
- If blocked, join the geometry or show a convincing physical barrier. An ambiguous small slot is a failure even if a collider-pair test labels it acceptable.
- Inspect Debug OFF at actual gameplay distance. Compare sprite projection/occlusion with the physical footprint; collider-only Fake Gap0 is necessary but insufficient.
- Validate Spawn → Objective → Exit, all authored route segments, safe waiting points, guard patrol and theft anchors. Reject unreachable targets; don't silently relocate them during export.
- Preserve glass semantics: visible glass blocks bodies but passes sight where the existing gameplay contract says so.

## F — Visual density and screenshot review

After gameplay composition is approved, add soft exhibits, lighting and decoration with local architectural reasons. Plants, plaques and lights do not count as cover or meaningful central structures.

For each of30 Chapter01–03 missions, capture Debug OFF and answer:

1. Is the place recognizable?
2. Are entry and the forward direction readable?
3. Does the landmark have a mission reason?
4. Is there an unexplained empty central area?
5. Is there a large uncovered dead zone?
6. Does the arrangement look like grid/random scatter?

Also review visual gaps and repeat silhouettes in chapter-wide10-map boards at the **same world scale**. Keep baseline/final captures and source SHA. Failed screenshots require refinement, even when automated tests pass.

## G — Bank spatial depth and final heist

- 03-01 Public Lobby: compact public queue/teller crossing, target and another side exit.
- 03-02 Teller Hall: a long teller boundary drives bypass/staff observation; distinct from01.
- 03-03 Staff Offices: branching office/record network, desks and local junctions.
- 03-04 Records Room: bank cabinets/records, short LOS and corners; not a Museum archive recolour.
- 03-05 Deposit Boxes: deposit wall is a meaningful target-space landmark, multiple lanes.
- 03-06 Security Checkpoint: main route actually crosses the gate, alternatives have security consequences.
- 03-07 Cash Processing: cash tables/carts divide the central floor; adjacent or local escape shelter.
- 03-08 Inner Security: security desk, junction and CCTV are coordinated spatially.
- 03-09 Vault Antechamber: vault preview and approach are connected to the target/fantasy.
- 03-10 Main Vault: Entry → public/security transition → inner security → antechamber → vault/target → theft → alternate escape → junction/search → separated exit. Target is physically in/adjacent to Main Vault; the second phase is not merely reverse approach.

## Authoring schema and audit evidence

Authoring metadata is separate from runtime state. `tools/campaign/v3DesignSchema.ts` defines fantasy, architecture, portal signature, zones/purpose, routes, landmark relation, guard assignments, camera mount/counterplay, search-sector responsibilities, cover chain, safety reasons and structure reasons. Metadata claims must be checked against actual compiled geometry and screenshots.

Patrol verification must inspect compiled Guard state: semantic `patrolPlan` anchors can override `patrolRoutes`. Updating a route array alone does not prove the running Guard follows it. Record actual visited anchors, body collisions and time-sampled VisionFan coverage. Report room/central-area coverage fractions, rather than marking a large room covered after one sighting.

Gates: **A Fantasy / B Topology / C Identity / D Security / E Stealth / F Traversal / G Escape.** A failed gate blocks READY. Unverified human Tilt/FPS is stated explicitly; it cannot be replaced by an offline renderer.

Required representative continuous play:01-05/08/10,02-03/06/10,03-01/05/08/10.03-10 must include ordered pickup → theft → global search → actual Guard/CCTV sighting → LOS break → alternate escape, with capture active. Preserve failed attempts and exact successful inputs. No teleport, forced alert state or disabled AI may be described as a full-heist witness.

## Scope and approval

This pass audits30 missions and changes only violated Chapter01–03 level data. Player/Guard locomotion, iOS/Android Tilt, Audio, Alert core, Pursue hotfix, Ads/IAP, UI and campaign progression are frozen. Chapter04–09 are design-only notes; their runtime maps remain unchanged. `legacy-unity/` is untouched.

Allowed status after all gates and evidence: **CHAPTER 01~03 LEVEL DESIGN V3 READY FOR USER REVIEW**. Production Lock requires the user's actual play approval and natural composition, regardless of automatic results.
