# DON'T MOVE — Level Design Bible V2

Status: design ready for user review; no Production Lock without iPhone Tilt approval.

## Authoring order

Architecture → Zone → Player Route → Guard Role → Gameplay Structure → Cover / Hide Spot → Objective / Exit → Lighting → Decoration.

Architecture establishes the building before any furniture is placed. Keep authored floor plans, room junctions, landmarks and entry/exit identities that already work. Never generate a room by scattering props to hit a density number.

## Zone contract

Each gameplay zone has a semantic role, teaching purpose, landmark, associated guard anchor, LOS blocker, useful cover and route connection. Adjacent rooms may form one coherent gameplay zone; bounds are offline design annotations and do not change collision or guard AI. Tiny entry/transition zones may use a real doorway corner rather than furniture; each exception is recorded in `describeMuseumDesign`.

Museum teaches vision/cover → route selection → corner LOS → patrol timing → heist → investigation → security pressure → theft response → chase → escape. It grows in decisions, not simply floor area.

## Routes and legibility

Every mission has a main entry-to-objective route. Safe and risk routes must have an observable tradeoff: a longer sheltered observation path versus a short timed crossing. “Safe” does not mean guaranteed immunity. Middle and late missions need readable objective-to-exit routes and an alternate return where architecture permits. Keep L, U, loop, cross, vertical and asymmetric forms; do not rotate copies of a room to create variety.

## Guard roles and anchors

Use entrance, gallery, junction, objective, roaming and exit/search roles. Anchors refer to authored doors, exhibits, pillars, desks, objective thresholds and exit junctions. Wait/look directions are explicit. Do not sample random walkable points. Roles are distinct from player location knowledge. Theft shares the empty-case location and assigned search sectors, never a fabricated player LKP. Actual sighting remains the prerequisite for direct player pursuit.

## Structure and hideability

| Class | Meaning | Museum examples |
|---|---|---|
| Full Cover | Tall solid structure provides a sustained occluded side | wall, tall partition, pillar, high shelf |
| LOS Breaker | Substantial object interrupts LOS around a flank | statue, wide display case, equipment, opaque desk |
| Route Divider | Shapes travel without occluding vision | low table, low pedestal, sofa |
| Decoration | Provides theme/readability, never counted as reliable hiding | painting, plant, lamp, bench |

Runtime `PROP_KIT.blocksVision` is authoritative. Glass-looking objectiveCase has no collision or occlusion and cannot be counted as hiding. A plant's `cover` hint is not proof of blocked LOS. Existing glass-looking displayCase remains opaque to gameplay sight; a transparent partition mechanic is not introduced in this pass.

Each gameplay zone should supply at least one full cover or one/two substantial LOS breakers. Count a hide point only when a player-radius-clear position has an actual blocked sightline from an accessible observation point. Do not count props alone as proof. Test several guard directions; a single witness establishes an opportunity, not universal safety.

## Escape pockets and long LOS

An escape pocket is a reachable position behind a corner/structure where the player can cut sight and choose the next route. It is not a safe room. No new invulnerability or detection modifier applies. Measure maximum uninterrupted straight LOS and flag long exposed segments (about twelve tiles is a review trigger, not a universal map size target). A direct chaser is faster than the player; successful escape should involve a corner or occluding structure before search, not racing down an empty straight hall.

## Exhibit clusters and density

Group a display with its flanking sculpture/pillar or a partition with a wall display. Keep a legible center circulation axis; don't turn it into a slalom. Objective rooms need fewer props and a clear focal point. Density, cover per zone and escape-pocket coverage are warning metrics; they never place objects automatically. Every geometry change must preserve a meaningful destination and enough Tilt clearance.

## Difficulty and uniqueness

Difficulty grows through concurrent sightlines, timing, role distribution and route commitment. Preserve player Run 150 and Direct Chase 168. Security Core should be harder than Private Gallery and easier than Grand Heist; validate that ordering with actual play rather than deriving it from guard count. Grand Heist's geometry/tuning stays unchanged because user feedback already accepts it.

## Lighting and objective

Warm objective and exhibit accents guide attention over cool peripheral ambient. Entry, objective and exit must be legible. Don't use darkness to conceal an unreadable route. Pickup sound confirms the actual pickup; stealth BGM continues until guards discover theft or the player. Audio volume and runtime alert rules are owned independently of map art.

## Security Coverage — Chapters 01–03 V1

### Guard Coverage Rule

Guard count follows walkable map area, semantic zone count, junctions, exposed sightlines, objective security, escape length and measured patrol coverage. Mission number is not an input to guard-count selection. Small three-zone maps usually use 2–3 guards; four/five-zone maps 3–5; larger five/six-zone maps 5–7. A final security map may use 6–8 only when coverage and hiding routes justify it. More than eight requires a specific documented reason. Coverage warnings never automatically add guards.

### Security Device Rule

Evaluate Guard coverage, CCTV sweep coverage and choke points together. Adding cameras does not imply adding guards. Report uncovered major zones, objective/junction/exit coverage and maximum uncovered route travel distance. Distinguish potential static visibility from actual time-dependent patrol exposure.

### Threat Compensation Rule

Each pressured zone must provide a reachable LOS break, substantial cover or alternate route. A point jointly watched by a camera and guard needs a timed crossing, blind flank or occluded bypass. Preserve the real player radius and Tilt overshoot allowance. Do not obstruct all bypasses with decorative props.

### Theft Global Search Rule

Discovery of the empty objective case activates authored cross-zone security search, not player knowledge. Guards receive distinct semantic sectors: objective/approach, junctions, exit/adjacent zone, neighboring rooms and roaming connectors. Their deterministic anchor rotations continue while theft remains active. Only an actual guard or camera sighting may establish or update player LKP. Hidden player coordinates must never select search targets or sectors.

### CCTV V1 Rule

Cameras remain fixed, sweep around an authored facing with endpoint pauses and use the same LOS geometry as guards. They accumulate suspicion and emit Camera Alert at confirmation, sharing the last actually visible player position. They cannot chase or update a hidden player's position. Guards react through existing pursuit/LKP/search logic. Guard cones are red; camera cones are amber. Keep camera angles narrower and ranges comparable, with an explicitly verified response opportunity at every placement. No hacking, disable system, EMP or generated placeholder beep is included.

### Bank Authoring Rule

Public → Staff → Security → Vault creates progression through security layers, not simply increasing floor area. Teller counters, offices/records, deposit-box lanes, cash processing, checkpoint gates and vault approach must produce distinct room/route silhouettes. Use the Bank kit rather than substituting Museum/Gallery props. After 03-05 the escape recrosses a meaningful guarded zone; after 03-08 it includes a junction and security sector; 03-10 crosses at least two meaningful zones. Existing Museum/Gallery floor plans and approved structures are retained while testing sparse late-chapter cameras.

Actual device difficulty, sensor comfort and FPS remain user-review gates. Runtime geometry/coverage metrics and scripted completions alone do not authorize Production Lock.

## Verification and lock

1. Validate authored route segments at the real player radius and semantic patrol/theft anchors at guard radius.
2. Verify objective/exit reachability and patrol movement; check chase/search simulation for collision, stuck or orbit regressions.
3. Render same-scale overview and 01-05/01-08 before/after overlays for route/zone/hide-point review.
4. Retain crash worklet regressions and animation bounds tests.
5. Conduct real iPhone Tilt play: narrow corners, 01-08 post-theft options, 01-10 unchanged feel.

Automated witnesses establish geometry and model behavior only. They do not certify artistic naturalness, difficulty fairness, motion comfort or native execution. Latest status and unresolved warnings belong in `Reports/MuseumFinalDesignV2`.

## Central cover redistribution — V1

Large gameplay zones must combine edge refuge with at least one central LOS break or hide transition. A central island must split a route or support a cover-to-cover transition; adding a decorative object alone does not satisfy this rule. Small entrances and connecting corridors may be exceptions documented in zone metadata.

### Visual-passability rule

An opening that reads as a passage must admit the player's collision body plus a Tilt allowance. The current QA width is derived from `BODY.playerRadius * 2 + 2 * GAIT_SPEED.run * DEFAULT_TILT.smoothing`: 18 + 18 = 36 world units, or .9 tile. The additional allowance is a conservative movement-distance proxy, not an experimentally established comfort guarantee. Inspect diagonal paths and rounded approach motion on iPhone.

Smaller openings must be widened or closed by visibly attaching existing structures. Apply visual scale and collision scale together on an individual prop; never enlarge every collider to mask an authored gap. The pairwise automated audit only recognizes opposing physical faces with meaningful overlap. Rendered perspective, sprite transparency and diagonal apparent slits still require screenshot review.

### Central island and edge bias rules

An island needs two demonstrably passable bypasses. The geometric gate tests a two-sided ring with player radius plus the derived per-side margin, rather than merely checking a point path. Nearby shelves and decorative pedestals count as blockers in this test. Retain useful edge refuge, but avoid making the wall perimeter the sole viable path.

The central-density metric uses the inner 55% of each semantic zone rectangle. It counts LOS structures whose centers fall inside that region, not the fraction of the room covered by silhouettes. A zero in a large room is a review warning, never an instruction to scatter additional props.

### Cover chain and exposure rules

Distribute reachable hide positions so central cover connects to another cover or an escape corner. Record nearest hide-to-hide navigation distance and objective/exit access. Long unbroken sightline warnings should prompt inspection of an intermediate break point, while preserving guard observation and the timing challenge.

`maxExposureDistance` is a conservative static route-sampling metric: it includes any authored patrol anchor that could see the sample, regardless of facing or current patrol timing. It is not a measurement of continuous runtime detection. Confirm escape function with Spotted → LOS break → Search simulation and user Tilt play; a Search followed by capture is not evidence of a complete successful escape.

### Authored changes

No structures are added in this pass. Seven existing LOS structures are redistributed:

- 01-02: Rotunda pillar becomes a central crossing pause.
- 01-05: collection display becomes an exhibition island; restricted-gallery pillar links the northern screen to the collection area.
- 01-08: central security console moves from (9, 11.5) to (9, 10.8). The established escape replay still completes in 28.267 seconds after a candidate at (9.2, 10.75) caused capture and was rejected.
- 01-09: west sculpture, middle sculpture and east display form three distinct gameplay cells. The east display and middle sculpture use matching render/collision scale.
- 01-10: no central island relocation. Two local gap corrections only: northern statue shifts .11 tile, southern statue uses matching 1.3 scale instead of 1.4.

Named wall-adjacent gap fixes are authored individually in `museumCentralCover.ts`. They include attached archive shelving, the Security counter, chamber pillar and small exhibition supports. Existing authored player-route polylines, guard route data, guard counts, objective and exit remain unchanged. Geometry can nevertheless affect patrol timing and escape outcomes, so these invariants do not substitute for runtime replay comparison.

Evidence and remaining user review belong in `Reports/MuseumCentralCoverV1`. No Production Lock is granted by this pass.

Final authored geometry audit: all ten missions have zero detected physical fake gaps and zero .45–.9 tile comfort-gap warnings. All seven redistributed islands pass the two-side ring gate with radius 18 world units. These results describe the authored geometry model; visible sprite gaps and real Tilt comfort still require visual/device review. Twenty-two existing gameplay props and six existing dressing solids change; 27 objects change position and one changes only scale. No new structure is added.
