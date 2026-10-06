# V12 Phase 3 — Runtime rebuild evidence

**V12 PHASE 3 — CHAPTER 1–3 REBUILT, FULL PLAYTEST PENDING**

## Campaign and scope

- Chapter1–3: 30 → 15 missions, five per chapter. Total campaign45.
- Chapter4–9: all30 stage objects exactly equal to pre-phase snapshot, including their ordering.
- No legacy-unity edits. All30 protected Tilt/movement/CCTV/audio/monetization file hashes unchanged.
- Only guardSystem change: new02-05 keeps its predecessor02-10 four-second search exception. Chase algorithm/speed unchanged.
- Source snapshot is the user’s pre-phase working tree, not Git HEAD. Earlier dirty edits are preserved.

## Source dispositions

| Old ID | Decision | Runtime destination |
| --- | --- | --- |
| 01-01 | KEEP | 01-01 |
| 01-02 | MERGE | 01-02 |
| 01-03 | REBUILD | 01-03 |
| 01-04 | REBUILD | 01-04 |
| 01-05 | MERGE | 01-05 |
| 01-06 | MERGE | 01-03 |
| 01-07 | MERGE | 01-02 |
| 01-08 | REMOVE | removed |
| 01-09 | MERGE | 01-05 |
| 01-10 | REBUILD | 01-05 |
| 02-01 | MERGE | 02-01 |
| 02-02 | KEEP | 02-02 |
| 02-03 | MERGE | 02-01 |
| 02-04 | REBUILD | 02-03 |
| 02-05 | REMOVE | removed |
| 02-06 | REBUILD | 02-04 |
| 02-07 | MERGE | 02-03 |
| 02-08 | MERGE | 02-05 |
| 02-09 | REMOVE | removed |
| 02-10 | REBUILD | 02-05 |
| 03-01 | MERGE | 03-01 |
| 03-02 | MERGE | 03-01 |
| 03-03 | MERGE | 03-02 |
| 03-04 | MERGE | 03-02 |
| 03-05 | KEEP | 03-03 |
| 03-06 | REBUILD | 03-04 |
| 03-07 | MERGE | 03-05 |
| 03-08 | MERGE | 03-04 |
| 03-09 | MERGE | 03-05 |
| 03-10 | KEEP | 03-05 |

## Fifteen missions

Safe/risk/escape paths and portals are recorded in [mission-details.json](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/mission-details.json). All route segments have20px clearance, exceeding9px player radius +10.5px estimated Tilt smoothing travel. Actual opaque first LOS breaks remain within4.8tiles (maximum4.791). Waiting pockets contain their whole declared disk plus the player body; they grant no immunity.

| Mission | Title | Source missions | Guards | CCTV | Safe / risk / escape length (tiles) |
| --- | --- | --- | --- | --- | --- |
| 01-01 | Entrance Hall | 01-01 | 2 | 0 | 22.3 / 14.6 / 11.9 |
| 01-02 | Rotunda Collection | 01-02, 01-07 | 2 | 0 | 23.8 / 20.6 / 16.5 |
| 01-03 | Archive & Conservation | 01-03, 01-06 | 2 | 0 | 23.6 / 20.2 / 14.6 |
| 01-04 | Restricted Wing | 01-04 | 2 | 1 | 35.0 / 22.2 / 25.3 |
| 01-05 | Grand Museum Heist | 01-05, 01-09, 01-10 | 2 | 0 | 26.2 / 24.4 / 23.9 |
| 02-01 | Sculpture Court | 02-01, 02-03 | 2 | 0 | 37.3 / 25.6 / 27.3 |
| 02-02 | Portrait Hall | 02-02 | 2 | 0 | 27.0 / 24.7 / 15.0 |
| 02-03 | Modern Wing | 02-04, 02-07 | 2 | 1 | 24.3 / 20.6 / 40.8 |
| 02-04 | Glass Gallery | 02-06 | 2 | 1 | 39.3 / 27.2 / 28.8 |
| 02-05 | Masterpiece Chamber | 02-08, 02-10 | 2 | 1 | 31.3 / 28.1 / 28.4 |
| 03-01 | Teller Access | 03-01, 03-02 | 3 | 1 | 30.1 / 27.2 / 20.2 |
| 03-02 | Staff Records | 03-03, 03-04 | 3 | 1 | 39.1 / 27.9 / 34.4 |
| 03-03 | Deposit Boxes | 03-05 | 3 | 1 | 33.7 / 27.7 / 21.0 |
| 03-04 | Checkpoint Command | 03-06, 03-08 | 3 | 1 | 43.6 / 28.7 / 21.9 |
| 03-05 | Main Vault | 03-07, 03-09, 03-10 | 3 | 1 | 39.4 / 31.3 / 40.1 |

KEEP preserves entrance/portrait floors, artwork and portals. Thirteen authored rebuild/merge maps use connected semantic rooms, islands, safe/risk observation routes and independent service returns. Museum has one objective custodian and no CCTV overlap at the objective; Gallery preserves transparent glass LOS with blocking collision; Bank retains PUBLIC→STAFF→SECURITY→VAULT identity. Natural empty-case inspection and blind objective timing windows are tested for every mission.

## Save migration

Campaign save version5. Original records/settings are archived; merged/rebuilt best times are not advertised as comparable times. Unchanged later-chapter records retain their times. Completed mission entitlement, highest unlock, Continue and hasStarted migrate. Invalid IDs fall back to mapped reachable progress. Future versions do not run old-ID compression again. Migration19/19 tests pass; actual save/load functions have a memory AsyncStorage JSON round-trip test. Native storage is not independently certified.

| Old ID | Progress destination |
| --- | --- |
| 01-01 | 01-01 |
| 01-02 | 01-02 |
| 01-03 | 01-03 |
| 01-04 | 01-04 |
| 01-05 | 01-05 |
| 01-06 | 01-03 |
| 01-07 | 01-02 |
| 01-08 | 01-04 |
| 01-09 | 01-05 |
| 01-10 | 01-05 |
| 02-01 | 02-01 |
| 02-02 | 02-02 |
| 02-03 | 02-01 |
| 02-04 | 02-03 |
| 02-05 | 02-02 |
| 02-06 | 02-04 |
| 02-07 | 02-03 |
| 02-08 | 02-05 |
| 02-09 | 02-05 |
| 02-10 | 02-05 |
| 03-01 | 03-01 |
| 03-02 | 03-01 |
| 03-03 | 03-02 |
| 03-04 | 03-02 |
| 03-05 | 03-03 |
| 03-06 | 03-04 |
| 03-07 | 03-05 |
| 03-08 | 03-04 |
| 03-09 | 03-05 |
| 03-10 | 03-05 |
| 04-01 | 04-01 |
| 04-02 | 04-02 |
| 04-03 | 04-03 |
| 04-04 | 04-04 |
| 04-05 | 04-05 |
| 05-01 | 05-01 |
| 05-02 | 05-02 |
| 05-03 | 05-03 |
| 05-04 | 05-04 |
| 05-05 | 05-05 |
| 06-01 | 06-01 |
| 06-02 | 06-02 |
| 06-03 | 06-03 |
| 06-04 | 06-04 |
| 06-05 | 06-05 |
| 07-01 | 07-01 |
| 07-02 | 07-02 |
| 07-03 | 07-03 |
| 07-04 | 07-04 |
| 07-05 | 07-05 |
| 08-01 | 08-01 |
| 08-02 | 08-02 |
| 08-03 | 08-03 |
| 08-04 | 08-04 |
| 08-05 | 08-05 |
| 09-01 | 09-01 |
| 09-02 | 09-02 |
| 09-03 | 09-03 |
| 09-04 | 09-04 |
| 09-05 | 09-05 |

## Difficulty — REVIEW REQUIRED

Pressure sampling is60s of hidden-player, pre-theft patrol/LOS at60Hz, sampled2Hz. It is diagnostic, not a complete moving heist. `escapePressure` measures exit-centre visibility before theft, not post-theft chase exposure.

| Chapter | Guard coverage | CCTV coverage | Safe-route exposure | Objective pressure | Exit-centre pressure |
| --- | --- | --- | --- | --- | --- |
| 1 | 5.36% | 0.52% | 8.40% | 23.67% | 2.50% |
| 2 | 3.60% | 1.21% | 5.29% | 22.17% | 0.00% |
| 3 | 7.46% | 1.70% | 14.59% | 29.17% | 1.17% |

**Museum < Gallery < Bank is not verified.** Gallery guard coverage/safe exposure/objective pressure are below Museum; this also holds for the guard/safe medians. Larger Gallery floors and two guards partly explain the area dilution, but do not prove a gameplay tier. CCTV coverage increases. Bank is higher than Gallery on most measured axes. No stats were forced to make proxy scores ordered.

Outliers requiring review:01-01 guard coverage;01-04 CCTV (other Museum missions have zero cameras);02-03 objective pressure;03-01 safe exposure;03-02 exit-centre visibility. Intra-chapter flatness and actual post-theft pressure remain human-playtest pending.

## Verification

- Final full `npm test`: PASS, exit0. Node test-runner groups report618 passes /0 failures, with additional custom-script assertion gates.
- TypeScript: PASS. lint:0 errors,2 pre-existing `applyUpdate.ts` require-import warnings.
- Independent current45/CCTV/difficulty/V12 review:91/91 PASS.
- V12 route/geometry/coverage tests:15/15 PASS. Migration19/19 PASS. Timer + migration combined22/22 PASS. Theft→Spotted regression12/12 PASS.
- Full Tilt suite54 PASS and collision/stability23 PASS; fixed1.75°/10°/.07s profile and150 max speed preserved.
- Historical V3/V5/V9/V11 suites use their explicit old fixtures and old margin; they do not substitute for current45-map verification.
- Final logs: /Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/full-test-final.log; scope proof: /Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/scope-final.json.

## Actual simulator and physical evidence

Simulator: iPhone17Pro, iOS27. Native RN app, normal HID/AX menu/touch input. Observer only reads player/guard/camera/events. No teleport, guard disable or mission-state writes. Each representative mission has at most two attempts. Later9 attempts capped45s; initial01-03 attempt took62.55s, exceeding that earlier limit and is disclosed.

Fifteen missions loaded and moved in the actual renderer. Loading/movement success does not establish objective/exit success. CAUGHT is a normal gameplay terminal state, not a crash. Incomplete touch automation is TEST LIMITATION, not evidence to change game rules. Native objective/exit/collision/full-heist result table is appended below.

Final first-break/20px route refinements change only route/pocket/coverage metadata; map geometry, props, portals, Guards and CCTV match first native capture version. Final45 JSON is used for remaining9 and second representative attempts.

Physical iPhone14Pro connected; launched com.dontmove.prototype successfully against dedicated8086 server with real sensor input enabled. Startup/home logs confirmed. Requested human Tilt01-05→02-05→03-05 review; no final physical results yet. This is not a Production Ready declaration.

## Actual native mission results

| Mission | Attempts | Moved | Objective | Theft | Authored first-break reached hidden | CLEAR | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01-01 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 01-02 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 01-03 | 2 | yes | yes | yes | yes | no | INCOMPLETE / CAUGHT |
| 01-04 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 01-05 | 2 | yes | yes | yes | not verified | no | CAUGHT / CAUGHT |
| 02-01 | 1 | yes | yes | yes | not verified | no | CAUGHT |
| 02-02 | 1 | yes | yes | yes | not verified | no | CAUGHT |
| 02-03 | 2 | yes | not reached | yes | not verified | no | CAUGHT / CAUGHT |
| 02-04 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 02-05 | 2 | yes | yes | yes | not verified | no | TEST LIMITATION / CAUGHT |
| 03-01 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 03-02 | 1 | yes | not reached | not verified | not verified | no | CAUGHT |
| 03-03 | 2 | yes | yes | yes | not verified | no | INCOMPLETE / CAUGHT |
| 03-04 | 1 | yes | yes | not verified | not verified | no | CAUGHT |
| 03-05 | 2 | yes | not reached | yes | not verified | no | TEST LIMITATION / CAUGHT |

Every row has a native spawn capture. No representative CLEAR is verified. Successful load/move15/15; objective pickup and CAUGHT are observed in a subset. Not reaching a particular gameplay event is NOT equivalent to that feature failing. Wall/corner collision outcomes and all15 objective→exit successes are not fully verified on native; route/body navigation tests remain separate. Native UI and transition screenshots show no observed app crash/Red Screen, but do not guarantee stability or physical FPS.

Observer cadence values are UI callback samples, not a certified GPU FPS measurement. First-break marking only means a captured player position near the authored opaque pocket after pickup with no guard currently seeing the player; it does not certify the entire escape.

Screenshots: [01-03 Objective](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/native/01-03/objective.png) · [02-05 CAUGHT](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/native/02-05/caught.png) · [03-03 Spawn](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/native/03-03/spawn.png). All attempts: [native-all-attempts.json](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase3/native-all-attempts.json).

## Remaining work

1. Human Tilt/full-heist review01-05/02-05/03-05 and representative6 CLEAR evidence.
2. Validate chapter ordering and outliers using actual heist experiences, especially Gallery vs Museum.
3. Long-session fatigue/drift and physical performance remain pending.
4. Native save persistence/migration and all15 wall/objective/exit checks require additional real-app verification.

No Production Ready or RUNTIME REBUILD VERIFIED claim.
