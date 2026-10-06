# V12 — Phase 1: 45 Mission Campaign Blueprint

## Scope and status

The active RN runtime currently contains **60 missions: 10/10/10/5/5/5/5/5/5**. V12 targets **9 × 5 = 45**. This phase audits the existing 60 and proposes 45; it does not yet replace runtime maps or confirm physical difficulty. Legacy Unity is preserved.

Documents:

- [Runtime source inventory](SOURCE_INVENTORY.md), with [per-mission hashes and protected source snapshot](SOURCE_INVENTORY.json).
- [Chapter 1–3 audit and proposed 15 missions](CHAPTER_01_03_AUDIT.md).
- [Chapter 4–9 audit and proposed 30 missions](CHAPTER_04_09_AUDIT.md).
- [Actual Tilt implementation, candidate A/B/C and physical comparison protocol](TILT_PLAN.md).
- [Verification and independent review](VERIFICATION.md).

Old IDs in the audits refer to the current 60-map campaign. Proposed IDs refer to the future 45-map campaign. MERGE removes the standalone old mission while carrying selected elements into a destination; it does not combine all guards/rooms into a bigger, harder map. KEEP retains a structural seed, not automatic human difficulty certification. REBUILD preserves useful fantasy while changing its route/security composition. REMOVE discards an unselected standalone concept.

## Difficulty axis

| Chapter | Tier | Difficulty source | Within-chapter rule |
|---|---|---|---|
| 01 Museum | VERY EASY / EASY | Readable guard timing, short crossings, obvious cover and escape | No double objective pressure, triple overlap or clustered exit blockade |
| 02 Art Gallery | EASY+ | Longer sightlines, open crossings, sculpture/partition/glass choices | More careful timing than Museum, not a guard-count ramp |
| 03 Bank | MEDIUM | Public → staff → security → vault depth, checkpoints and surveillance | Existing 03-10 human “manageable” feedback is the upper calibration anchor |
| 04 Lab | MEDIUM+ | Glass visibility versus movement, equipment routes | Glass mechanic must exist in runtime, not just in title |
| 05 Casino | MEDIUM-HIGH | Table/slot islands and multidirectional windows | Distinct situations within one tier |
| 06 Mansion | MEDIUM-HIGH+ | Doors, rooms, corners and service routes | Route reading, not mission-number multipliers |
| 07 Warehouse | HARD | Long aisles, roaming security and search sectors | Still readable cover-to-cover choices |
| 08 Security HQ | VERY HARD | Actual guard/CCTV network | Decorative camera props do not count as surveillance |
| 09 High Security Vault | FINAL | Combined systems with strict, observable windows | No blind trial-and-error solution |

Mission roles are identity / route choice / mechanic variation / combination / grand heist. They describe situations, **not** five increasing difficulty ranks. A grand heist may have more spectacle and modestly greater size, but must stay within the chapter pressure budget and remain compatible with the shared escape timer.

## Evidence and limitations

This is a source-based design audit of layouts, semantic structures, patrol/security definitions and authored routes. It is not a 60-mission physical playtest or a screenshot gate. Declared safe routes require collision/LOS checks and live visual review after rebuild; route metadata alone is insufficient. Camera counts are from actual `cameras` definitions, not CCTV props. Guard counts, floor area and route length are descriptive inputs rather than difficulty proxies.

Existing physical evidence is carried forward without conflating CLEAR with comfort: 01-08 was cleared with excessive objective pressure and reported hitching; 01-10 and 02-10 also have actual Tilt clears. The V12 request supplies the 03-10 subjective benchmark; it is not a new V12 playtest. Callback stalls on 01-08 remain an unresolved performance concern.

## Next implementation order

1. Review this audit/blueprint; implement an isolated development A/B/C Tilt selector and log actual active values.
2. Compare A/B/C on the physical iPhone 14 Pro. Preserve player maximum speed, fixed neutral, sensor fusion, wall slide and locomotion. Record the preferred curve and fatigue/stability findings. Do not select sensitivity from simulator or completion time alone.
3. Rebuild Chapter 1–3 to the selected input feel. Give Museum unambiguous easy timing, Gallery longer readable crossings, Bank security depth. Validate each objective refuge and escape pocket with live rendering and physical Tilt.
4. Rebuild Chapter 4–9's existing five missions per chapter to their semantic and security identities. Do not expand to ten again.
5. Run regression gates and at least one actual mission per chapter; Chapters 1–3 require physical iPhone Tilt evidence.

### Campaign migration needed in runtime phase

The current flat mission indexing uses variable chapter lengths. Shrinking Chapter 1–3 changes every downstream flat index. Before shipping 45 missions, migrate saved progress using **old mission ID → approved new ID**, never reinterpret an old flat index under the new counts. Current `campaignProgress.ts` version 4 drops IDs rejected by `missionIndex()` and stores `highestUnlocked` as a flat index; merely changing counts would discard old 06–10 records and reinterpret unlocks. Reused IDs can also name different spaces. Add a versioned migration before normalization: archive old records, map unlock/completion to the approved new destination, and keep old best times/alert records marked legacy rather than treating them as comparable to rebuilt maps. Define merged/removed completion policy explicitly, preserve settings/purchases, and test stale Continue targets and chapter unlocks. Update catalog names/localization, observer/QA mission selection, tools and tests to the same 45-map source. Archived design documents may retain old IDs; runtime must not expose 01-06…10 after migration.

### Protected runtime rules

Confirmed Theft → 28-second shared timer; Theft does not reveal current Player position; real Spotted only updates knowledge via vision; existing CCTV V9 detection timing and shared chase speeds remain. Preserve startup/home, calibration/recenter, Android input, navigation, collision/wall slide, LKP/search, audio, locomotion, Ads/IAP. No runtime change is made in this document phase.

## Difficulty QA contract for the runtime phase

- Replace any mission-order monotonicity assertion with chapter grouping. Five missions per chapter exactly; all within-chapter mission multipliers equal.
- Chapter averages must rise Ch1 < … < Ch9 using measured exposures, concurrent objective/exit coverage, timing windows, first reachable LOS-break latency and escape pressure. Document individual components and blockers; no opaque score or extra guards solely to satisfy a metric.
- Flag large within-tier variation. Initial provisional authoring review [PLACEHOLDER — threshold not physically validated] flags a component exceeding 25% deviation from its chapter median; this is a review trigger, not an excuse to inflate easy missions or flatten distinct spaces. Human difficulty and readability can override a misleading metric with recorded reasons.
- Validate safe/risk connectivity including body radius, glass BLOCK/LOS PASS, fake-gap closure, spawn/objective/exit validity, timing opportunities and first refuge. A metadata polyline is not proof of a walkable route.
- Run TypeScript/lint/campaign/collision/wall-slide/CCTV/Theft/Search/timer regression, then actual rendering and physical playtests. Do not declare Production Ready from automated or simulated results.
