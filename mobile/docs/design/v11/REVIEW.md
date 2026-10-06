# V11 Phase A — Independent design review

Status: **CONDITIONAL REVIEW — NOT RELEASE APPROVAL**. Review covers design documents and current source evidence. It does not certify chapter pressure ordering, native full-heist clears, Tilt feel, or production readiness. No runtime files were changed by this review.

## Source consistency

Reviewed `SYSTEM_CONSISTENCY.md` against the source:

| Claim | Independent source evidence | Finding |
|---|---|---|
| Persistent phase HUD is Chapter 1 only | `src/ui/VisualPlaygroundScreen.tsx:531` checks `definition.chapter===1`, non-STEALTH and `!completed` | Correct; the HUD gate and timer generation are separate problems |
| Lockdown exists for only four Museum missions | `src/game/guards/guardPhase.ts:6`: 01-07/08/09 = 28s; 01-10 = 20s; other IDs default to 0 | Correct; 56 of 60 current missions have no countdown duration |
| Timer begins after confirmed theft, not merely Spotted | `guardPhase.ts:13` uses `theftActivatedAt`; capture and exit remain independent | Correct; changing its label to a death deadline would misrepresent current behavior |
| Current chase speeds differ | `guardChaseSpeed.ts:6`: 02-* = 178; `guardTuning.ts:71` uses runSpeed = gait speed × 1.12 = 168 elsewhere | Correct; current difference must be preserved during Phase A |
| Search has a 02-10 exception | `guardSystem.ts:114`: authored roles use Museum/lockdown durations except 02-10; `guardTuning.ts` supplies 9s/12s/4s | Correct; future normalization is a proposal with gameplay consequences |
| Common 28s timer is future design | Document labels it approval pending, distinguishes 01-10's 20s change and Chapter 2/3 pressure addition | Correctly separates planned behavior from implemented behavior |

`RUNTIME_BASELINE.json` contains 60 unique mission IDs with chapter counts 10/10/10/5/5/5/5/5/5. Independently recomputed all **540 runtime file SHA-256 hashes: zero mismatches**. Mission titles, chapter IDs, guard/camera counts and safe-pocket counts match current serialized data. Reproduced all **60 per-definition hashes** using Python `json.dumps(definition, sort_keys=True, ensure_ascii=True, separators=(',', ':'))`, encoded as UTF-8 before SHA-256. The whole campaign file hash also matches. The baseline now records this exact convention in `hashMethod`; the campaign file-byte SHA remains the authoritative full-file comparison.

## Master budget review

Reviewed `README.md`: nine chapter identities and budgets are specified as future design targets; mission 10 remains in its chapter tier; player speed, chase controller, CCTV detector and collision body remain frozen. The README preserves the existing `tools/campaign/v5Geometry.ts` radius-18 clearance gate: `2 × 18 / TILE40 = 0.90tile`. Physical player radius remains 9; the extra 9 world units are the existing clearance margin. This is correctly distinguished from comfortable Tilt certification. Glass proposals agree with existing glass props: movement blocked, vision passes, cover=false. The master explicitly excludes new hacking, interactive doors and multi-floor movement, which keeps architecture proposals within supported static gameplay. Proposed 28s timer normalization is separated from the current runtime and requires map/escape regression before Phase B completion. No blocking master-budget contradiction found.

## Blueprint review

Chapter 1–3 review complete: **30 unique IDs, all 19 requested fields per mission**. Audit assignments are 13 KEEP, 12 TUNE and 5 PARTIAL REBUILD; no FULL REBUILD claims are fabricated. Retained architecture has mission-specific approach/escape descriptions and a current route-coordinate appendix. KEEP explicitly means structural retention pending runtime/device evidence, not an EASY certification.

User feedback is reflected directly: 01-08 separates checkpoint and objective observation; 01-10 separates exit/cloister search responsibilities and adds a proposed service refuge; 03-10 preserves its existing manageable alternate escape rather than escalating security for its ordinal number. Finale rows remain in the same chapter tier.

### Concrete corrections raised and resolved

1. **03-10 current safe route misidentified.** Initial draft called the route a Cash Processing approach bypass despite labeling it current safe index 1. Source index 1 actually passes through Vault Antechamber shoulders and no Inner Security→Cash Processing connector exists. Author corrected the route to the current north/west antechamber coordinates and removed the implied new connector. The KEEP decision is now consistent with the described topology.
2. **03-10 KEEP escape wording.** “Strengthened records bank” implied an unapproved geometry change. Corrected to the existing opaque records bank.
3. **01-10 first refuge clarity.** Author separated the immediate sanctuary-screen shoulder candidate from the later cloister statue refuge, so first LOS-break planning no longer reads as an uninterrupted journey through both areas.
4. **Clearance convention.** Documents now preserve the existing radius-18 / 0.90-tile check instead of introducing a 17-unit replacement. This remains a geometry prerequisite, not a human Tilt pass.

First LOS-break candidates are consistently labeled proposals requiring normal/theft/spotted LOS checks. Low plinths, glass, benches, tables and desks are not certified as opaque cover. Exact corners and opaque props still require Phase B footprint and simultaneous-source checks.

Chapter 4–9 review complete: **60 unique IDs, all 19 required fields and a mission-specific Main mechanic field**. The complete package contains exactly **90 unique IDs (01-01 through 09-10), no missing or extra IDs**, and all 90 have the 19 required fields plus Main mechanic. Separate Safe/Risk route descriptions vary by corridor, room, glass, island, lane or surveillance network rather than repeating a template verbatim. Balcony/stair/hidden-panel designs explicitly remain static and on one floor. Opaque walls, housings and rack ends supply proposed LOS breaks; low tables, plinths, glass and sofas are not treated as full cover.

Chapter 9 uses ten different arrangements: outer seal loop, staggered chambers, mechanism spine and decoy loop, security cross, paired antechambers, parallel transit, Y-fork, monitoring rectangle, dual seals, and the final checkpoint/ring/vault sequence. Objective→first opaque break→another escape crossing is described in each. Exact blocking footprints and the distance from pickup to first break remain Phase B work. These descriptions establish authored intent, not reachable or fair runtime results.

Finales 04-10 through 09-10 explicitly retain their chapter budgets. Larger layouts use sector separation, independent return paths and observation/recovery areas; finale status is not used to justify a spike.

**Additional correction raised and resolved:** removed the later draft’s numeric relative-pressure centers (1.65–3.40) and single-index phrasing. Those unmeasured scalar values conflicted with the master’s independent-axis approach. The replacement retains proposed guard/camera counts, crossing-window ratios and search-space burden as independent hypotheses. Chapter-relative 0.95–1.05 is a desired feel band, not a computed pressure score or measured result.

**Remaining implementation risks:** fixed heavy-door portals must remain traversable without a new interaction; object-case placements must sit in accessible bays rather than inside collision bodies; all first LOS-break candidates must occlude every active observer in both ordinary and alert states. Future independent kits for Chapters 6–9 are documented dependencies. None of these has been grey-box or device verified in Phase A.

## Review limits and Phase B gate

Blueprint completeness can support review and approval of intended architecture. It cannot establish Fake Gap 0, fair patrol timing, actual chapter pressure ordering or human-readable route guidance. Those require grey-box geometry, actual runtime routes, fresh Simulator play and real-device Tilt checks during Phase B.

Phase B begins only after the user approves the complete blueprint and difficulty budgets. This document provides no release approval and does not authorize runtime rebuild by itself.
