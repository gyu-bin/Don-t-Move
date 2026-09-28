# Museum 01-02–01-05 — implementation preparation only

2026-09-27. Based on the approved [Level Design Bible](LEVEL_DESIGN_BIBLE.md)
and existing Floor Plan images. No new floor plan, coordinate layout, generator
change, StageDefinition, prop placement or runtime integration is delivered here.

## Gates and preservation

- 01-01 current StageDefinition stays unchanged. Physical iPhone Tilt approval is pending.
- Await at least three real play attempts: elapsed time, chosen Safe/Risk route,
  observation stops, cover spacing, Guard pressure and Objective→Side Exit feel.
  Record failures separately; scripted Walk times are not human clear times.
- Only after explicit 01-01 play approval may subsequent implementation be reconsidered;
  this document does not authorize applying 01-02–01-05 or changing all45 missions.
- Exact dimensions remain provisional. Do not grow rooms to meet a target time or
  fill empty space with decorative furniture. Guard speeds remain unchanged.
- Guard sliding remains **ASSET REQUIRED**. Release blocker:
  **Guard locomotion final asset required**. Image generation is closed with
  **ASSET GENERATION LIMIT REACHED**; preserve original LEGACY and failed records.
  Level planning is not a waiver of that blocker or an animation approval.

## One continuous building

Entrance → Main Gallery → Archive → Security Wing → Diamond Hall.

| Mission / approved plan | Entry → Exit | Meaningful route and structure | Guard responsibilities (Bible proposal) |
|---|---|---|---|
| [01-02 Main Gallery](01-02-Floor-Plan.png) | LEFT → BOTTOM | Painting Gallery → architectural Central Rotunda → Sculpture Hall → Artifact Room. Main reaches Rotunda; Safe follows its recessed southern edge behind structural LOS breaks; Risk crosses the central sightline. Rejoin at Sculpture Hall doorway. Escape uses Artifact Room rear staff door, not forced backtracking. | 2: A checks Rotunda entry/crossing/Hall door; B checks Artifact Room entry and Case. |
| [01-03 Archive](01-03-Floor-Plan.png) | TOP → RIGHT | Staff Corridor → Archive Shelves → Storage → Restricted Archive. Safe follows short turns and shelf-end observation pockets; Risk crosses a shorter central aisle. Rejoin at Storage. Escape through rear staff door. Avoid long open halls and tiny shelf mazes. | 2: A covers staff access and Archive/Storage connection; B covers restricted entry and rear staff door. |
| [01-04 Security Wing](01-04-Floor-Plan.png) | LEFT → TOP | CCTV Room → Security Hub → guarded Junction → Security Gate → Restricted Passage. Safe waits/re-observes from bent thresholds; Risk times one shorter junction crossing. No redundant parallel corridor or new keycard mechanic. Objective slot remains at Gate inspection area. | 3: A CCTV/Hub, B junction branches, C Gate/Restricted Passage. Stagger attention rather than increasing speed. |
| [01-05 Diamond Hall](01-05-Floor-Plan.png) | BOTTOM → RIGHT | Grand Exhibition → Final Security Area → Diamond Chamber → Service Escape. Safe uses structural sightline breaks; Risk crosses the shorter security sightline. Both lead to chamber observation threshold. Independent east service escape preserves silent escape opportunity. | 3: A Grand Exhibition, B Final Security Area, C chamber entry/Case inspection. Do not cluster all guards around Diamond. |

Door pairs preserve the Bible topology: 01-01 RIGHT→01-02 LEFT;
01-02 BOTTOM→01-03 TOP; 01-03 RIGHT→01-04 LEFT;
01-04 TOP→01-05 BOTTOM. Match the later implemented door widths/materials at each
pair without retroactively changing 01-01 during preparation.

## Authoring order when implementation is authorized

1. **Architecture:** named rooms, wall boundaries, open door/arch thresholds. Keep
   Central Rotunda architectural, Archive shelf-based, Security Wing timing-based,
   Diamond Chamber the climax. Do not repeat rectangular obstacle rooms.
2. **Player route:** sketch Main/Safe/Risk/Escape through those rooms. Alternate
   observation, short travel and cover; no repeated long empty straightaways.
3. **Guard sightline:** assign only meaningful doorway/intersection/exhibit/Case
   anchors; verify readable turn/wait windows before placing cover.
4. **Cover:** wall/partition/pillar/statue/display case/shelf must change both travel
   or LOS meaningfully. Check player and guard body clearance, not visual width alone.
5. **Objective:** keep the existing pickup→Exit rule. Artifact/Archive valuables use
   existing kinds; final chamber uses Master Diamond. Exact non-final item choice
   remains an authoring decision, not a new mission mechanic.
6. **Lighting:** gallery warmth, quieter archive lighting, cooler security area,
   warm spotlight/glass/pedestal/Cyan Diamond climax. Highlight useful space, not clutter.
7. **Minimal decoration:** wall-supported paintings only where justified; no repeated
   bench/plant/painting pattern or evenly spaced filler. Start with none.

## Existing data mapping — no schema changes needed for preparation

| Design intention | Existing StageDefinition field | Later verification |
|---|---|---|
| Rooms / architectural boundaries | `layout`, structural `props` | connected openings, collision/LOS, no narrow accidental gaps |
| Continuity | `entryEdge`, `entryPosition`, `exitEdge`, `exitPosition`, `exit` | opposite-edge pair, actual trigger agrees with marked doorway |
| Main/Safe/Risk / Escape | `testRoutes`, `escapeRoutes` | authored segment body clearance, not silently repaired by A* |
| Observation pockets | `safeZones` | stand/wait and observe relevant Guard; not merely a free tile |
| Semantic Guard responsibilities | `patrolPlan.zones/anchors/assignments`, `guards`, `patrolRoutes` | assigned zones, walkable anchors, valid paths, no corner orbit |
| Objective / landmark | `objective`, `objectiveZone`, `landmark`, structural `props` | readable approach and pickup, meaningful sightline, empty Case detection |
| Light hierarchy | `lights`, `ambientDarkness` | navigable/readable with Debug OFF |

No placeholder coordinates or generated JSON are added. `landmark` accepts a prop
kind; it does not by itself create Rotunda architecture. Actual physical walls and
openings must be authored in `layout` when permitted.

## Acceptance checklist for later implementation

- Spawn→Objective and Objective→Exit exist with body clearance; authored routes
  and patrol paths respect structure, including all entry/exit edges.
- Compare Safe/Risk at equal movement speed; verify a real timing benefit for Risk
  and observation/cover benefits for Safe. Neither route is permanently vision-blocked.
- Confirm meaningful waits/turns, no patrol orbit, investigation suspends patrol,
  and Facing=Sprite direction=Vision=Detection. Do not tune speed to mask sliding.
- Pickup alone does not reveal Player or trigger theft. Empty Case must be seen
  through actual cone/LOS. Silent escape and escape while alerted remain possible.
- Debug OFF footage and whole-map views accompany later implementation review.
  Physical Tilt observations, not automatic traversal, determine size/spacing approval.

## 01-01 physical play log — awaiting results

| Attempt | Route | Outcome / actual time | Cover / Guard pressure / separate escape |
|---|---|---|---|
| 1 | pending | unmeasured | pending |
| 2 | pending | unmeasured | pending |
| 3 | pending | unmeasured | pending |

No production benchmark approval is inferred. No later mission was applied.
