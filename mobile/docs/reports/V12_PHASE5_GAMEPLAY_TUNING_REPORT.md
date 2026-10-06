# V12 Phase 5 — Chapter 1–5 Gameplay Difficulty + Full-Heist Tuning

Status: **V12 PHASE 5 — CH1–5 GAMEPLAY TUNING IMPLEMENTED, FULL PLAYTEST PENDING**

No full heist was completed in the Simulator and no physical-iPhone Tilt run was made, so difficulty is
not verified by play. The chapter ordering below rests on a scripted thief in the production simulation.
Not Production Ready.

## What changed

Level security data only, as a layer on top of the Phase 4D composition
(`tools/campaign/v125Tuning.ts`, baked by `tools/campaign/v125Build.ts`). 24 of the 25 missions are tuned;
01-05 is unchanged.

- Patrol dwell times (objective guard and room guards), guard start delays.
- Patrol stops re-authored inside the guard's own room on four missions (02-05, 03-02, 04-05, and a reach
  extension on 01-02).
- Post-theft search sectors: 1 guard sweeps the secondary escape in Gallery and Bank, 2 guards (secondary
  and quick routes) in Lab and Casino, none in Museum.
- CCTV: one camera moved (01-04). No camera added or removed.

Not changed: geometry, structures, doors, entry/exit/objective, art, guard count, guard perception and
speed, chase, CCTV detection constants, Tilt, Chapter 6–9. `v125Scope.test.ts` enforces this against the
Phase 4D build.

## DEVICEHUB

1. Simulator: iPhone 17 Pro, iOS 27.0, real app runtime, native HID taps, DEV telemetry read-only.
2. Missions played: 5 (01-05, 02-05, 03-05, 04-05, 05-05).
3. Full-heist attempts: 25 (10 with the cone-aware thief before tuning, 15 replays of offline clearing runs; the last 5 on the final maps).
4. CLEAR: **0**. Pickups: **0**.

Two harnesses were used (`tools/native/v12Phase5QA.py`): a cone-aware scripted thief, and a replay of a
run that clears in the offline production simulation. Both lose the timing: each telemetry poll plus tap
costs 0.4–0.8 s of game time, and the thief arrives at the first patrol late.

| Mission | Attempts | Pickup | Theft | First LOS break | Lockdown | Secondary escape | CLEAR | Failure reason |
|---|---|---|---|---|---|---|---|---|
| 01-05 | 11 | 0 | – | – | – | – | 0 | 6 caught by g1/g2 before pickup, 5 timeouts. INPUT LIMITATION (same plan clears offline); level cause not excluded: UNKNOWN |
| 02-05 | 3 | 0 | – | – | – | – | 0 | 2 caught by g1, 1 timeout. INPUT LIMITATION |
| 03-05 | 4 | 0 | – | – | – | – | 0 | 4 caught by g1 at 18–19 s. INPUT LIMITATION; repeated same-spot failure, so LEVEL candidate until a human plays it |
| 04-05 | 3 | 0 | – | – | – | – | 0 | 2 caught by g1, 1 timeout. INPUT LIMITATION |
| 05-05 | 4 | 0 | – | – | – | – | 0 | 1 caught by g2, 3 timeouts. SIMULATOR LIMITATION (replay wedged) |

Straight-line chase, LOS escape and wall slide were not exercised in the Simulator in this phase.

## Scripted full-heist comparison (supporting metric)

`tools/campaign/v12Phase5Bot.ts`: 24 runs per mission (2 approaches × 6 start delays × 2 patience values)
on the production simulation with theft, the 28 s timer and lockdown doors. The thief waits outside
vision cones, runs when seen, and path-finds to the exit on current door geometry. It is a ranking aid,
not a human-difficulty claim.

| Chapter | Clear rate before | Clear rate after | Spread after (min–max) |
|---|---|---|---|
| 1 Museum | 45% | **68%** | 46–83% |
| 2 Gallery | 75% | **55%** | 42–58% |
| 3 Bank | 12% | **37%** | 21–46% |
| 4 Lab | 8% | **32%** | 25–33% |
| 5 Casino | 0% | **16%** | 8–29% |

Before, Gallery was easier than Museum and three chapters had missions with no scripted clear at all.
After, the order is Ch1 > Ch2 > Ch3 > Ch4 > Ch5 with no zero-clear mission. Bank and Lab are close (37%
vs 32%).

Per mission (clears of 24, before → after): 01-01 4→16, 01-02 12→11, 01-03 20→16, 01-04 0→20, 01-05 18→18,
02-01 24→14, 02-02 8→14, 02-03 14→14, 02-04 24→14, 02-05 20→10, 03-01 0→11, 03-02 0→5, 03-03 0→10,
03-04 4→8, 03-05 10→10, 04-01 0→8, 04-02 8→8, 04-03 0→6, 04-04 0→8, 04-05 2→8, 05-01 0→4, 05-02 0→2,
05-03 0→2, 05-04 0→4, 05-05 0→7.

## CHAPTER 1 — Museum (EASY)

5. Scripted clears 11–20 of 24. 01-04 was a spike (0) and is now the easiest (20); 01-02 is the lowest (11).
6. Guards: longer objective-guard away dwell on 01-01, 01-03, 01-04; hall guard reaches the next room on 01-02.
7. CCTV: the 01-04 camera sat in the desk room on top of the desk guard (camera + guard on one doorway). It
   now watches the unguarded records room. Museum still has exactly one camera mission.
8. Safe/Risk: both routes clear on all five. Risk is faster on 01-02, 01-03, 01-05; equal on 01-01, 01-04.
9. Lockdown: never reached in scripted runs (see Open issues).

## CHAPTER 2 — Gallery (EASY+)

10. Scripted clears 10–14 of 24. Guards: longer hall dwell on 02-01, 02-02; objective dwell on 02-02, 02-04;
    hall patrol re-authored across the open floor on 02-05. CCTV unchanged. One escape sweep on all five.
11. Harder than Museum by the scripted metric (55% vs 68%); before it was easier (75% vs 45%).

## CHAPTER 3 — Bank (MEDIUM)

12. Scripted clears 5–11 of 24. Dwell and start-delay changes on 03-01, 03-03, 03-04, 03-05; office patrol
    re-authored on 03-02. CCTV unchanged. One escape sweep on all five.
13. 03-05 Objective→Exit: the corridor guard's theft sector now covers the service passage. In scripted runs
    the thief is still never caught after pickup: it runs the quick route in about 9 s, before the sweep
    arrives. **Vault→Exit is still close to free for a thief who simply runs.** See Open issues.
14. Security depth: public, staff and vault patrols no longer start in phase (staggered delays), so the
    layers are crossed one at a time.

## CHAPTER 4 — Lab (MEDIUM+)

15. Scripted clears 6–8 of 24. Objective dwell on 04-01, 04-03, 04-04; lab patrol timing on 04-01, 04-04;
    lane patrol re-authored on 04-05. Two escape sweeps on all five.
16. Glass gameplay: not changed and not evaluated in play. No data change touches glass.

## CHAPTER 5 — Casino (MEDIUM-HIGH)

17. Scripted clears 2–7 of 24. Floor guards keep moving (short stops) on 05-01, 05-02, 05-03; staggered
    floor patrols on 05-04, 05-05. Two escape sweeps (one on 05-03). CCTV unchanged.
18. Multi-direction security: hardest chapter by the scripted metric; the safe approach clears on 05-05
    only, the risk approach on all five.

## DIFFICULTY

24–28. Per-chapter feel is **not established**: no human or Simulator clear exists.
29. Ch1 < Ch2 < Ch3 < Ch4 < Ch5: holds for the scripted metric only. Bank vs Lab is a narrow margin.

## OUTLIERS

30. Too easy: none by the scripted metric after tuning (01-04 at 20/24 is the top of Museum).
31. Too hard: 05-02 and 05-03 (2/24), 03-02 (5/24).
32. Unfair overlap: the 01-04 camera + guard doorway was removed. Not re-checked by play elsewhere.

## Open issues

- **Lockdown never triggers in scripted runs.** Quick escapes are 19–39 tiles, about 5–10 s at run speed,
  and the 28 s timer starts only at confirmed theft. Lockdown and the secondary route therefore never
  matter to a thief who runs. Patrol/sweep data cannot change this; it needs a decision on door position,
  route length or timer, all of which are locked in this phase.
- **Escape pressure.** The coverage audit's escape axis is 0 for all 25 missions (no patrol ever sees the
  exit). Post-theft sweeps were added, but a sweep guard needs 10+ s to reach the route. An extra
  escape-side guard on 03-05 was tried and had no effect on scripted runs (a running thief is in the cone
  for under a second), so it was not kept.
- **Safe vs Risk.** On 12 missions only one of the two approaches clears in scripted runs (e.g. 03-05 safe
  0/12, 04-02 safe 0/12). Whether the safe route is humanly playable is unverified.
- **Simulator input.** A human-in-the-loop Simulator or iPhone pass is needed; the tap harness cannot hold
  patrol timing.

## REGRESSION

33. TypeScript: PASS.
34. lint: 0 errors, 2 existing warnings.
35. npm test: exit 0, 999 checks pass, 0 fail.
36. campaign: 594 / 594 (588 + 6 new Phase 5 scope checks).
37. topology: 45 / 45 (`Reports/V12Phase5/topology-audit.json`).
38. collision / wall slide: suites pass; no code change.
39. CCTV: suites pass; detection constants unchanged.
40. Theft/Search/LKP: suites pass; no code change.
41. Timer: 28 s, unchanged.
42. Door/Lockdown: suites pass; no door data change.
43. Tilt hash: unchanged (protected-hash test passes).
44. Ch6–9: byte-equal to Phase 4D (scope test passes).

Physical iPhone: **DEVICE REVIEW PENDING**.

## Evidence

`Reports/V12Phase5/`: `heist-matrix-before.json`, `heist-matrix-after.json`, `audit-before.json`,
`coverage-after.json`, `search*.json|log`, `patrol-*.log`, `native/<mission>/*.json` (Simulator attempts),
`witness/`, `topology-audit.json`, `all-tests.log`, `typecheck.log`, `lint.log`.
