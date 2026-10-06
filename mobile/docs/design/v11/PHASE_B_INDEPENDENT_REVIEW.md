# V11 Phase B — independent scope and regression review

Status: **CONDITIONAL INDEPENDENT REVIEW — NO NATIVE OR RELEASE CERTIFICATION**. Post-bake scope, geometry and navigation checks pass. Full-heist Simulator results and chapter difficulty acceptance remain separate gates.

## Frozen scope

Baseline campaign byte SHA: `8cb031c5f82c1f5802157966c12d8c7ef4ed3f83a5342d6d9d7ecbaa20ac6ab0`. This matched Phase A before map edits. Full copy: `Reports/V11B/campaign-before.json`; independent copy: `/tmp/v11-phaseb-frozen-campaign.json`.

`tools/campaign/v11ScopeRegression.test.ts` embeds all 60 entire-definition SHA hashes with recursively sorted object keys and native JSON.stringify encoding. This is a standalone, reproducible scope gate without an ignored report fixture dependency. It asserts:

- Exactly the original 60 unique IDs and counts 10/10/10/5/5/5/5/5/5.
- Exact Phase A classifications: 13 KEEP, 12 TUNE, 5 PARTIAL REBUILD.
- All 13 KEEP and all 30 Chapter 4–9 definitions unchanged.
- Every changed definition belongs to the approved 17 IDs.

Initial baseline run: **4/4 PASS**. Final post-bake scope run: **4/4 PASS**. Exactly 16 approved definitions changed; 01-03 is the only authorized no-op. All 43 protected definitions match the frozen full-definition hashes. This gate does not force all TUNE definitions to change; unchanged decisions need documented evidence and reasons.

## Findings communicated to implementation owners

1. **Effective patrol override:** serialized semantic patrol anchors override patrolRoutes in `compileStage.ts:193`. Initial 01-01/g2 and 02-02/g1 pause edits could therefore be ignored. Resolved by mirrored anchors. Independently compiled frozen baseline and current clone overlays: 01-01/g2 effective route changes; 02-02/g1 effective semantic route and initial facing change, and g3 nonsemantic route changes. No bake was required to confirm this correction.
2. **Timer-dependent regression fixture:** `chaseBalanceQA.ts:40` samples lockdown at 21–25 seconds. Common 28-second timer means that sample is now ordinary theft. Resolved by root: probe now uses `ESCAPE_TIMER_SECONDS+1`; independent rerun of all 8 chase tests passed while retaining the 1.45 patrol assertion and protected direct speeds.
3. **Unchanged 01-03:** selected Museum overlay currently leaves this TUNE mission untouched. Scope permits a no-op; the final report must include its evidence-based retention reason. No forced edit is needed merely to change a hash.

## Meaningful verification contracts

- `v5Geometry.test.ts`: actual compiled geometry and radius-18 authored route clearance; catches blocked objective/exit, reference-route walls and foreign assets. Run after the final bake.
- `navigationRegression.test.ts`: optimized navigation compared with full-blocker oracle at both radii; guards against collision/navigation divergence.
- `cctv.test.ts`: actual gait detection timing, occlusion/LKP freeze, multi-camera source consistency and search/return.
- `highSecurityAlarm.test.ts`: delayed alarm without witness, standard empty-case discovery; protects 02-10/03-10 1.5-second semantics.
- `chaseBalance.test.ts`: continuous displacement, protected speed, LOS break and search/return. The old timer probe was repaired using the shared expiry, and all 8 chase tests passed on rerun.
- `wallSlide.test.ts`, `collisionStability.test.ts`: real continuous wall contact, corners, finite recovery and velocity limits.
- Historical V3/V5/V9 authoring tests validate their original transforms; passing historical candidate tests does not prove a later V11 baked overlay or native full-heist clear.

Independent initial runtime subset: **31/32 PASS**, with the identified old lockdown clock failure. After that fixture correction, all 8 chase tests passed on rerun; the other 24 tests had already passed. TypeScript PASS. Lint PASS with 0 errors and 2 existing `src/ota/applyUpdate.ts` require-import warnings.

## Pressure measurement

Use the existing runner with identical runtime, sample duration, route speed and input schema:

```sh
node --import tsx tools/campaign/v101PressureAudit.ts Reports/V11B/campaign-before.json Reports/V11B/pressure-before.json
node --import tsx tools/campaign/v101PressureAudit.ts src/game/levels/stages/campaignStages.json Reports/V11B/pressure-after.json
```

It measures separate guard/CCTV coverage, safe-route/objective/escape exposure, overlap, approach windows and actual theft/search without giving hidden-player LKP. Area normalization favors larger maps; inspect absolute covered tiles and local objective/escape axes together. Independent point windows are not synchronized moving-route witnesses. No scalar score or human difficulty certification follows from these measurements.

`v10BoundedReplay.ts` and `cameraExposure.exposureRun` exercise continuous shared runtime input without teleport or AI overrides. Their clears are scripted evidence only. Mandatory Simulator IDs remain 01-05/08/10, 02-06/10, 03-01/08/10; no native clear is claimed in this report.

## Final baked review evidence

Changed IDs: 01-01/04/05/08/10, 02-02/03/06/07/08/09/10, 03-01/05/07/08. Existing 60-ID count is retained. All 13 KEEP definitions, including 03-10, and all Chapters 4–9 remain identical to baseline.

Independent combined scope + actual radius-18 geometry + optimized/full-blocker navigation: **10/10 PASS**. The geometry audit covers all 30 current Chapter 1–3 missions; navigation compares all 60 missions at both player/guard radii. Independent new Museum/Gallery/Bank overlay suites: **13/13 PASS**, including effective semantic patrol changes, approved opaque screen, staff-return articulation, preserved glass collision/vision and continuous shared-runtime witnesses. These are not Simulator clears.

Compared actual before/after definitions, rather than relying only on an overlay applied to already baked data: no changed guard has pace, vision range or cone half-angle drift; no Guard/CCTV count changed. Frozen runtime file hashes differ only for the common timer module, HUD, baked campaign and the two approved timer-contract test files. Existing input, audio, mission-loading, locomotion, chase-controller and CCTV detector sources remain frozen.

The shared rule retains confirmed-theft activation, 28-second duration and pressure-only expiry. Spotted-only countdown, timeout capture and hidden Player-location knowledge were not introduced by the reviewed diff. Search duration increases after common expiry; this is an approved timer consequence and still needs full-heist comparison, not an unchanged-pressure claim.

## Independent before/after pressure interpretation

Reviewed `Reports/V11B/pressure-before.json` and the final `pressure-final.json` after the final overlay refinements. All 30 mission rows are present; runner acceptance is **REVIEW_REQUIRED**, with `humanPlaytestVerified=false`.

| Independent axis (mean) | Museum | Gallery | Bank | Ordering |
|---|---:|---:|---:|---|
| Safe-route exposure | 0.10172 | 0.06009 | 0.07703 | Museum→Gallery reversed |
| Objective pressure | 0.17249 | 0.09333 | 0.09002 | Both adjacent comparisons reversed |
| Guard coverage | 0.09231 | 0.05495 | 0.07675 | Museum→Gallery reversed |
| CCTV coverage | 0.00762 | 0.00518 | 0.01998 | Museum→Gallery reversed |
| Escape pressure | 0.10417 | 0.03250 | 0.08832 | Museum→Gallery reversed |

Museum safe-route/objective means decrease from 0.10690/0.19999. The strongest local evidence addresses 01-08 feedback: objective-approach exposure 0.3217→0.0950, objective point pressure 0.3667→0.1000, search overlap 0.0144→0.0025. 01-10 search overlap decreases 0.0023→0.0018, but its unchanged objective/escape point axes do not demonstrate exit fairness. 03-10 retains identical measured axes, consistent with KEEP.

Remaining outlier flags: 02-07 patrol visits per tile minute, and unchanged 03-10 safe exposure. These are review prompts, not orders to damage a usable route. **Chapter difficulty normalization has not been measured achieved**. Native full-heist results and comparable route timing must precede the stronger VERIFIED declaration.

## Final follow-up review

Reran protected scope after the final refinements: **4/4 PASS**. Reran actual geometry and full-blocker navigation: **6/6 PASS**. The 16 changed IDs and 43 protected definitions remain unchanged in scope. Final targeted CCTV/scope log records **9/9 PASS**.

Reviewed `v10BoundedReplay.ts`: the added `attempts` array element type uses `ReturnType<typeof exposureRun>`. This annotation is erased by TypeScript and does not alter the fixed matrix, gait, delay, route selection, simulation, stop condition or success criteria. It repairs tool typing without forcing a clear.

Reviewed `phase-b/NATIVE_PLAYTEST.json`: the device is explicitly **iPhone 17 Pro Simulator**, with ordinary Device Hub Touch, not a physical iPhone Tilt session. All 8 mandatory mission IDs have bounded actual Simulator attempts recorded. None records current-run objective acquisition, theft, exit or CLEAR. Full-heist and physical Tilt flags remain false. Input/test limitations cannot be converted into native full-heist approval or proof of unavoidable level unfairness.

02-10 also remains open in shared-runtime evidence: **0/16 fixed-plan CLEAR**, with a documented actual pickup→1.5s theft→west-return capture. The revised approach/first cover provides longer undetected escape, but it is not a full-heist success. Existing successful shared-runtime witnesses for other representatives do not close this mission or the native gate.

The final full `npm test` run is owned by root; its exit result must be recorded in the implementation report. This review does not infer a complete suite PASS merely from a partial log. With pending native heists, unresolved02-10 and reversed pressure axes, the supported declaration remains **V11 PHASE B IMPLEMENTED — FULL-HEIST PLAYTEST PENDING**.
