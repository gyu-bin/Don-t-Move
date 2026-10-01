# Museum Environment Dressing V1

Status: candidate for user visual review. No Production Lock.

## Authored layer

`tools/campaign/museumDressing.ts` adds only `StageDefinition.dressing` after the existing final-design pass. Each vignette has a semantic zone ID and exhibit identity. The shared `src/game/world/dressingKit.ts` defines actual footprint, movement collision, projected draw dimensions, mount height and low-height role. All dressing has `blocksVision: false`.

The layer reuses Museum visual forms; it does not add guards, change an existing prop, reshape floor, move objective/exit or alter any player/guard route. 01-03, 01-04 and 01-08 deliberately use wall/panel/label/tray/light dressing without new collision. Narrow timing and hiding spaces take precedence over a numerical soft-prop budget. 01-09 has the largest number of curated exhibit groups. Diamond chambers remain sparse.

| Mission | Clusters | Soft structures | Decorations | Identity emphasis |
|---|---:|---:|---:|---|
| 01-01 | 4 | 4 | 12 | Visitor welcome / sculpture guide / upper painting recess |
| 01-02 | 3 | 3 | 9 | Rotunda antiquities / northern showcase |
| 01-03 | 4 | 0 | 13 | Archive labels / sealed records / document dispatch |
| 01-04 | 4 | 0 | 13 | Visitor security / control equipment / access signage |
| 01-05 | 6 | 3 | 18 | Collection miniatures / restricted antiquities / utility dispatch |
| 01-06 | 5 | 2 | 18 | Receiving trolley / work trays / equipment inspection |
| 01-07 | 6 | 5 | 19 | Private patron foyer / portrait conversation alcove / salon |
| 01-08 | 5 | 0 | 20 | Access console / monitor records / central control / evacuation |
| 01-09 | 10 | 11 | 33 | Provenance groups / paired antiquities / collection recesses |
| 01-10 | 9 | 4 | 32 | Rich arrival / security station / minimal diamond / maintenance |

## Visual-density analysis

Run `node --import tsx tools/campaign/museumDressingDensity.ts` from `mobile/`.

Outputs: `Reports/MuseumDressingV1/visual-density.json` and `visual-density.md`.

The tool separates protected route floor from other sampled body-clear floor. It compares the fraction of off-route samples close to a visual anchor before/after dressing. It also estimates the intersection of dressing sprite bounding rectangles with sampled floor. Neither metric is physical occupancy or exact painted pixels. Transparent sprite pixels, wall projection, lighting and player perception are not measured. Protected routes are a 0.75-tile buffer around authored route/patrol segments, not every possible chase/search path.

Large off-route zones still distant from visual anchors are warnings, not automatic placement instructions. Initial warnings identified 01-07 Objective Salon / Side Exit and 01-09 East Exhibition. A second authored salon seating/portrait group and an east-gallery provenance sequence now address those margins. 01-10 also receives wall chronology and maintenance records in its long corridors. Latest sampled warnings: zero. This does not prove visual completeness; central travel space is intentionally preserved and native-size review remains required.

## Direct visual inspection of runtime-renderer captures

Initial inspection before the second margin refinement covered `after/01-05-Debug-OFF.png`, `01-08-Debug-OFF.png`, `01-09-Debug-OFF.png`, `01-10-Debug-OFF.png` under `Reports/MuseumDressingV1`.

These are offline captures using the actual game drawing code, with full-map framing and report labels outside the map. They are not native Simulator/iPhone screenshots and do not prove on-device performance.

Observed improvements:

- 01-05 now reads as labeled collection groups, with framed wall art and small companions around existing exhibits. The service end uses utility detail, while the diamond remains the strongest bright accent.
- 01-08 wall monitors and panels give a recognizable security identity without inserting new obstacles into the junction.
- 01-09 has the clearest increase in exhibit density: paired small plinths, a low display, wall art and differentiated clusters occupy the room edges.
- 01-10 distinguishes the exhibit entrance, central security desk and east utility return. The diamond chamber remains visually dominant.

Remaining artistic gaps for user review:

- Floor and wall tile repetition remains strong, especially along the long east gallery in 01-09 and the connecting corridors in 01-10. Dressing has improved room edges more than the large central floor surfaces.
- Most details are intentionally small and may be difficult to identify on a phone at gameplay zoom. Plaques and trays need native-size review before counting them as a meaningful perceived-density increase.
- Repeated painting imagery and small-plinth silhouettes reveal asset reuse. Current reuse is coherent but not a final premium art differentiation pass.
- Several highlights are broad circular light pools; their appearance should be reviewed against the desired focused warm exhibition lighting. No claim of reference-level lighting fidelity is made.
- Full-map views exaggerate travel-floor emptiness and hide local detail. Actual gameplay-distance images and iPhone play remain the acceptance basis.

## Gameplay evidence

`museumDressingQA.ts` owns collision, LOS, route margin, preserved hide-witness, patrol and same-input replay checks. These are separate from this visual report. Passing them establishes regression evidence only; it does not prove identical subjective difficulty or visual acceptance. Keep the current 01-08 reaction timing, audio mix, pickup sound and crash fixes intact.
