# Gameplay / performance — first measured pass

2026-10-22 · User reached Chapter08 SECURITY HQ quickly. Physical iPhone is unavailable;
the user requested code improvements and automatic measurements for this pass.

## Applied runtime changes

- Reuse a visibility polygon only when observer position/facing/range/angle and
  every blocker coordinate match. Still evaluate current Player sight/suspicion
  each tick. A door mutation, even in the same array, invalidates the polygon.
- Before fan ray casts, exclude rectangles that cannot intersect any ray within
  range. Keep original blocker order, corner rays and the full direct LOS check.
  Do not lower ray count or simulation frequency.
- Reuse observer scratch arrays. Sweeping CCTV skips temporal-cache snapshots
  while moving; it can cache while paused. This avoids bookkeeping outweighing
  the saved work on a constantly changing camera.
- Keep the60Hz simulation. On90/120Hz displays, retain the existing Skia picture
  when zero simulation steps are due. Tilt processing still runs at callback cadence.
- Stop reassignment of already-finished game state under CAUGHT/Complete screens.

The first cache-only version regressed middle/late patrol timings; it was not
accepted. The spatial broad phase and moving-camera fast path were added before
the final measurements below.

## Measured security CPU — desktop, not device energy

[`simulation-benchmark.json`](simulation-benchmark.json): actual Guard/CCTV/security
simulation,120 simulated seconds at60Hz for each case, warmup +5 interleaved A/B
rounds. Private module loaders use the same current source/dependencies/maps with
only the old/new vision kernel substituted. Baseline vision source: `b8e4045`.

| Mission | Patrol CPU | Empty Case / theft CPU | Hidden-LKP alert CPU |
|---|---:|---:|---:|
| 01-02 | 53.59→26.14ms (−51.23%) | 100.30→43.65ms (−56.48%) | 80.66→34.23ms (−57.56%) |
| 05-03 | 203.16→102.48ms (−49.56%) | 339.85→146.48ms (−56.90%) | 371.15→151.81ms (−59.10%) |
| 08-03 | 238.17→128.27ms (−46.14%) | 390.31→171.59ms (−56.04%) | 360.89→150.50ms (−58.30%) |

These are total measured CPU milliseconds for an accelerated120-second security
replay, **not milliseconds per displayed frame**. Excludes native execution,
Player movement, Tilt, rendering and GPU. All9 cases had identical full security
state snapshots every10 simulated seconds, excluding cache storage. Matching
snapshots do not establish device temperature or battery improvement.

[`vision-benchmark.json`](vision-benchmark.json) separately measures12,000 kernel
queries with7 interleaved A/B rounds, on stationary/moving/repeated-pose scenarios.
It also compares consumed fan arrays against the original implementation.

## Representative gameplay baseline and candidates

[`representative-gameplay.json`](representative-gameplay.json) contains raw runs,
separate coverage axes and unapplied candidate definitions. No45-map rewrite or
production difficulty change was made. Guard pace and global Suspicion/Difficulty
constants remain as before.

| Mission | Guard / CCTV | Safe-route exposure | Fixed-route approach clears: Sneak / Walk / Run |
|---|---:|---:|---:|
| 01-02 | 2 /0 | 6.38% | 4/12 ·0/12 ·2/12 |
| 05-03 | 4 /2 | 15.74% | 1/12 ·1/12 ·2/12 |
| 08-03 | 5 /3 | 15.55% | 0/12 ·0/12 ·3/12 |

Exposure is observed occupancy across sampled route points/time, not detection
probability for a moving human. Fixed routes use both approaches, both escapes
and3 start delays for each gait; after pickup they all Run. They have no human
decision-making. A separate24-run cone-aware bot also runs per variant; its
zero-clears on middle/late maps must not be called proof those maps are impossible.

### Concrete finding: Run is not sufficiently costly over a crossing

Walk speed72, gain multiplier0.8; Run speed150, gain multiplier1.6.
For equal travel distance and otherwise identical perception, gain/time × time
gives `(1.6/150)/(0.8/72) = 0.96`: Run accumulates about4% **less** suspicion
than Walk over the same distance. This algebra assumes constant gait, comparable
distance/cone/body visibility, and no saturation/decay. It does not replace the
full detection model. The fixed-route runs also identify Run-only clearing
departures on08-03. This is a strong candidate explanation for a skilled Tilt
player advancing quickly, despite naive bots finding some routes difficult.

### Candidates evaluated, not applied

- 05-03: move g1's patrol0.45 tile off the physical risk lane and extend g3's
  remote wait6→8s. Contact separation improves, but Safe exposure falls to14.34%.
  Does not meet the harder-progression aim. Fixed-gait clear totals rise4→7/36;
  the separate cone-aware bot stays0/24. Keep as rejected diagnostic evidence.
- 08-03: move the inspection post0.5 tile to remove an accidental body pinch,
  have the corridor guard watch the actual upper doorway, and give CCTV distinct
  sweep rhythms with the third camera facing the upper connector. Safe exposure
  rises15.55→16.93%; Run fixed-route clears fall3→2/12 and spotted runs rise2→6/12.
  There are still continuous full-heist witnesses, but the cone-aware bot fails
  all24 attempts. This is an unapproved trial, not an established difficulty fix.

Next balancing pass should compare sustained-Run departures with observation/
waiting choices and tune the real crossing/escape windows. Do not tune against
only the cone-aware bot's win rate or assume more contact deaths means more tension.

## Validation and current project health

- Performance/cache/scheduling tests:8 PASS.
- CCTV and physical-door integration tests:18 PASS.
- Serialized UI-worklet chase/cache tests:9 PASS.
- Campaign suite:614 PASS during this pass; final behavioral equivalence is also
  checked by the9 baseline/current security replay comparisons above.
- Focused performance-tool TypeScript and changed-source ESLint: PASS.
- Full `npm test` stops at an existing branding assertion: native splash is
  expected to omit `splash-mark`, but current `app.json` includes that image.
  Neither file was changed by this pass. It is not a new vision failure.
- Full app TypeScript/lint remain blocked by absent installed dependencies
  (`@supabase/supabase-js`, `expo-iap`, `expo-updates`, ads) and an existing
  `applyUpdate.ts` require warning. Restoring dependencies was attempted without
  changing manifests/lockfile; the registry returned ETARGET for the existing
  `babel-preset-expo@^57.0.12`. Package versions were not substituted.
- No physical-iPhone CPU/GPU/FPS/energy/thermal measurements and no device-play
  difficulty approval. No release update was published.

## Next physical measurement protocol

Use the same Release binary configuration and missions before/after, without
Metro/dev telemetry. Begin both runs from a comparably cool device with the same
brightness, audio, network and case. Disconnect charging for battery comparisons.
Repeat a10–15 minute session spanning stealth, theft/search, chase and pause/result
screens; log actual play/idle durations and restarts so the workloads are comparable.

Collect native CPU/GPU/frame timing, thermal transitions and energy diagnostics;
record battery percentage separately as a coarse, longer-session observation.
Compare60/120Hz devices where available. Neither a smooth Simulator nor the Node
CPU reduction certifies lower energy use. GPU work and sensor cost remain unmeasured.

## Art / feedback scope

No graphics or sound changes are claimed in this pass. Current runtime already
uses Locomotion V2 Player/Guard sheets; older notes about LEGACY-only gameplay are
not the current manifest. Visual acceptance remains listed in
`src/assets/manifest.ts` (`LOCOMOTION_VISUAL_REVIEW`). Further polish should start
with actual gait readability and pre-baked lighting/materials before adding costly
live effects. No image generation was performed.

## Follow-up: sprint exposure experiment (2026-10-30)

The Run movement factor of 1.95 was evaluated against the existing 1.6, with
all other gait factors, movement speeds, difficulty multipliers and maps held
constant. For the constant-visibility, equal-distance comparison above, the
candidate accumulates 1.17 times Walk's suspicion instead of 0.96 times.
**The candidate was not applied:** the existing 01-05 full-heist witness is
caught at 22.6s instead of clearing. All production tuning remains unchanged.

Re-running the same fixed-route Run approach matrix (12 runs per mission) gave
01-02: 2→1 clears and 0→1 spotted; 05-03: 2→1 clears and 2→3 spotted;
08-03: 3→2 clears and 2→6 spotted. Escape is always Run in these simulations,
including when the approach uses another gait. These fixed routes do not model
human observation and waiting, so the numbers neither establish fairness nor
prove Chapter 8 is hard enough. No candidate mission layouts were applied.

A 2.2 trial failed the existing close-range Global Alert replay; 2.0 failed
the close-range detection-time requirement. At 1.95 those two tests passed, but
the campaign suite had 611 passes and 3 failures: the 01-05 witness above and
two historical checks which pin the unchanged guard tuning file. Values from
1.75 to 1.90 also failed that witness; 1.70 passed. A global change cannot be
accepted solely on the representative route bots. Future work should examine
01-05 and late-chapter observation/waiting choices and require real play.

With production tuning restored, the campaign suite passed 612/614. The two
remaining historical scope checks pin `src/game/security/cctv.ts` to its older
hash and also fail on the previously committed performance optimization;
the 01-05 witness passes again. These hash checks were not modified.

Reproduce the offline candidate without changing game tuning or overwriting the
baseline report: `npm run perf:gameplay -- /tmp/run-risk-195.json 1.95`.

## Applied follow-up: 08-03 connector patrol (2026-10-30)

Only 08-03 changes. The North Lane guard now inspects the actual upper
connector at (15.25, 8.8) from its existing post and waits 4s instead of 3s.
The authored target determines initial facing, sprite direction and the visible
cone through the existing runtime. Guard pace, perception, CCTV, geometry,
objective, escape routes and all other 44 mission snapshots are unchanged.
The source is `HQ_PATROL` in `tools/campaign/v13Late.ts`, recorded in the
mission override index; the game data is rebuilt from that source.

[`hq-patrol-trial.json`](hq-patrol-trial.json) records 28 full-heist runs per
variant: both approaches, both escapes and seven departure delays. Fixed Run
departures produced 5→4 clears and 6→8 spotted runs. On the safe approach with
the quick escape, departure delays 2/4/6s still clear. On the risk approach,
delay 8s formerly cleared blindly and now attracts attention; delay 0s still
clears. This is a small timing-window adjustment, not certification of overall
Chapter 8 difficulty. All clears use the actual objective/exit/AI runtime.

`v13Integrity.test.ts` now retains these safe witnesses and the risk-window
comparison. Topology/security audit: 45/45 clean with its one existing known
finding. Original/current snapshots differ only for 08-03, and its expected
snapshot was refreshed after that comparison. Human Tilt difficulty, phone
temperature and battery testing are pending. No release was published.

Final campaign result: 613/615 PASS, with only the two pre-existing CCTV hash
checks described above failing. Focused V13 tests: 16/16 PASS. Campaign and
performance TypeScript and changed-tool lint pass. `npm test` reaches the
existing native-splash assertion and stops; full app lint/typecheck still
report the previously listed missing dependencies and require warning.

## Reproduce

From `mobile/`:

```sh
npm run test:performance
npm run typecheck:performance
npm run perf:vision -- b8e4045
npm run perf:security -- b8e4045
npm run perf:gameplay
npm run campaign:snapshot
```

Benchmark commands overwrite only their own reports; gameplay candidates never
write StageDefinitions into the game. The baseline commit must be available in Git.
