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

## Environment recovery and HQ finale timing (2026-10-30)

The registry is available again. `npm ci` restored all 769 packages at the
existing lockfile versions; package manifests and lockfile were not changed.
After invalidating the stale generated ESLint cache, app lint has zero errors
and warnings and full app/campaign TypeScript passes.

The Phase4C/4D protected-file checks now pin the CCTV hash from commit 6e867ba,
`a9977b5e04efa6d6d25d32678e876543dd529d7198d2e039d8c6e40fc697ed55`,
instead of the earlier `be91462c...`. Only that reviewed baseline changed;
Tilt, guard tuning and save hashes are untouched. The cached/current vision
and worklet/security tests still run. Splash tests now check the actual
platform contract: navy/no image on iOS, an existing 120px contained launch
mark only on Android. The splash config and art did not change.

The guarded synchronous OTA module load has an explicit lint exception because
an unconditional import requires the native module during evaluation. No
runtime warning suppression was added. The OTA paint-deadline timer is now
cancelled after painting, avoiding a leftover 60-second timer in the tests;
both successful-paint cleanup and lost-paint timeout are tested. OTA suite:
22/22 PASS, about 0.23s instead of the previous 60s process lifetime.

After the environment recovery, the entire `npm test` command completed
successfully before applying the following mission change.

**Only 08-05 changes in this pass.** The glass-lab guard's first inspection
waits 5s instead of 4s; all facing, pace, vision, cameras, architecture and
routes remain as before. The other 44 snapshots, including 01-05 and the
previous 08-03 improvement, are unchanged. `HQ_PATROL` is the authoring source.

[`hq-finale-timing.json`](hq-finale-timing.json) compares 28 fixed Run heists
before/after. Clears change 3→2 and spotted runs 15→11: the dynamics are not
uniformly harder, and a lower clear count alone is not a quality metric.
The concrete intended result is that safe-approach departure 8s, formerly an
unspotted clear, is seen by the glass-lab guard; departures 10s (silent clear)
and 12s (spotted by the same later guard but successful escape) still clear.
The test requires these outcomes, including actual visual detection rather
than failure solely from bumping into a guard.

Other 08-02/04/05 timer trials were rejected when they just shifted body
contact or failed to improve meaningful pressure. These replays do not make
decisions or wait between covers. They do not certify overall progression,
human Tilt difficulty, device performance or battery life. No release update
was published. Reproduce: `node --import tsx tools/performance/hqFinaleTiming.ts`.

Final checks after the 08-05 change: `npm test` PASS through every script,
including campaign 616/616 and OTA 22/22. `npm run typecheck`, `npm run lint`,
`typecheck:performance`, changed-tool lint with zero warnings, snapshot 45/45,
and the 45-mission topology/security audit all pass (the audit retains its one
documented historical finding). The older failure descriptions above are
historical; this recovery supersedes them.

## Museum 01-01 static art pilot (2026-10-30)

Only rendering for 01-01 is styled: larger honed blue-grey stone panels with
sparse veins, quieter joints, a lighter wall face over a dark navy wall cap,
and smaller warm-ivory light pools over slightly deeper ambient shade. It uses
the existing floor/wall/darkness/glow pictures. No new animated effect, blur,
reflection, offscreen pass, image asset, or per-frame renderer code was added.

`museumEntranceLook.ts` is gated to that single ID. Floor commands replace the
old small checker/vein pattern: 1,761→1,109 (−37.0%), and the serialized floor
picture shrinks 155,266→93,090 bytes. Static layer count stays 33; darkness and
glow picture sizes stay 3,185 and 4,034 bytes. This limits render work but is
not proof of lower iPhone temperature or battery use.

Local captures live in `Reports/MuseumPolish/` (ignored generated reports).
Before uses the original rendering source from b39a2fa in a temporary copy;
after uses the current renderer. Entrance, central exhibition, objective and
whole-map views share state, camera and scale, verified from capture metadata.
They are actual offline Skia game renders without the native HUD, not device
screenshots or generated artwork. `*-compare.png` boards display their pixels
side by side; `review.json` records the comparison. A control mission 01-02 has
four byte-identical PNGs before/after.

Validation: 15 environment tests + the new art scope/command-budget/gameplay
immutability test PASS; app/campaign TypeScript and app/changed-tool lint PASS;
45/45 gameplay snapshots SAME. The broader environment-tool TypeScript project
still has its existing `phase4eSyncMetadata.ts` `EnvironmentAsset.source` error,
independent of these new files. Device thermal/visual acceptance is pending.

Reproduce captures with
`TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/museumPolishPreview.ts Reports/MuseumPolish/after`,
and the board with `node --import tsx tools/environment/museumPolishBoard.ts`.
`SKIP_REPLAY=1` skips the software timing loop; those timings are not native
GPU/FPS/energy measurements. `npm run test:museum-look` is also in `npm test`.

## Stronger chapter security (2026-10-30)

`chapterDifficulty.ts.security` is now consumed by the actual V13 compiler,
not just an authoring budget. The 25 Chapter5–9 missions are baked with these
scales; Chapter1–4 are byte-identical to the preceding working state.

| Chapter | Guard range | Guard cone angle | CCTV range | CCTV gain |
|---|---:|---:|---:|---:|
| 5 | 1.08 | 1.04 | 1.04 | 1.15 |
| 6 | 1.12 | 1.06 | 1.06 | 1.25 |
| 7 | 1.18 | 1.08 | 1.08 | 1.40 |
| 8 | 1.24 | 1.10 | 1.10 | 1.55 |
| 9 | 1.28 | 1.12 | 1.12 | 1.70 |

Only `visionRange`/`visionHalfAngle` on guards and `range`/`suspicionRate` on
CCTV change. Geometry, assets, routes, population, guard pace/chase, the
perception formula and Easy/Normal/Hard gain settings are untouched. Visible
cones still use exactly the detection geometry. Re-bakes always start from
the original archetypes, so pressure does not compound. Expected snapshots
were updated for exactly these 25 missions after that field-level comparison.

[`chapter-pressure.json`](chapter-pressure.json) records the same 28 fixed-Run
heists per variant on six representative maps. Spotted runs increase on
06-03 (6→8), 07-03 (8→15), 08-03 (8→14), 08-05 (11→20), 09-03 (17→20).
05-03 is mixed: spotted runs fall 5→4 and clears rise 5→6, because guards react
earlier and move. Stronger numbers do not guarantee higher difficulty in every
heist or certify the overall human difficulty curve.

08-03 still has continuous safe-approach clears at departure2/4/6s; its old
instant risk departure is now spotted. 08-05 still clears at10/12s, now both
with a later guard sighting. 09-03 has no clears in the coarse even-second
matrix, but a separately verified risk departure at7s clears under live AI
after being spotted. Those production witnesses replace the former easier
timing expectations; no LOS, capture or geometric validator was relaxed.

Final validation: entire `npm test` PASS; app/campaign TypeScript and lint PASS;
45/45 topology/security audit clean apart from the same one documented known
finding; refreshed gameplay snapshots match45/45. New tests check monotonic
profiles, actual extra-distance perception and the continuous Vault escape.
Human Tilt balance and phone thermal/energy measurements remain pending. No
new dynamic effects, guards, ray count or simulation rate were introduced.
Reproduce: `node --import tsx tools/performance/chapterPressure.ts`.

## Museum 01-01 functional cover pass (2026-10-30)

`v13EntranceStealth.ts` refines only the current Entrance Hall after the frozen
Museum export. The architecture, spawn, objective, entry/exit, two guards,
11 props, speeds, detection settings and existing lighting/art are retained.
Other44 baked mission objects are byte-identical. The frozen plan reused by
Warehouse and its override lineage are explicitly checked separately.

The existing desk, column and long case form the south approach; the existing
partition provides the final hidden waiting place. The lobby hub no longer
routes the player in front of the desk and back down. The safe route actually
passes the column/case/partition waiting positions; the court shortcut skips
that detour (42.0 vs33.6 tiles). South passage clearance stays about1.4–1.6
tiles, rather than squeezing the player between the props and the wall.

The public guard checks the court shortcut, desk gap, column shoulder and case
gap, with actual walking/looking pauses. The objective guard inspects the
partition approach between case inspections. This supplies observation windows
and exposed crossings instead of security that looks away from the playable
space. No new omniscient AI or runtime cover mechanic is used.

All four named hidden/peek pairs are checked through the real three-sample
perception model: hidden0/3, adjacent exposed2–3/3. Removing props while keeping
the walls gives3/3 at the hidden positions, proving that the actual structure
provides cover rather than just distance or an out-of-cone spot. A120s patrol
replay visits and faces every associated inspection post. The service escape
has a continuous Run witness that is genuinely chased, loses LOS, freezes
global LKP while hidden, and clears without capture.

[`entrance-cover.json`](entrance-cover.json) records full-heist proxies before
and after. Fixed-route clears27→21/96; cone-aware observing clears9→11/24.
These mixed results are not human difficulty or time evidence. Safe Walk,
timed risk Sneak, both escapes and an observe/wait heist all retain continuous
live-AI clears. The production-benchmark approval remains pending human Tilt
play; no automatic timing is called a real play time.

Generated review images are in `Reports/MuseumCover/`: `*-compare.png` uses
the same camera/state at t0 (guard facing changes intentionally); `cover-routes.png`
marks the real routes, four waiting points and patrol posts on an actual
offline game-renderer capture. These are not device screenshots or game UI.
No new images/effects/guards were added to the game.

Validation: entire `npm test` PASS; the final5 entrance-specific tests and
override integrity tests PASS; app/campaign/performance TypeScript and changed
source lint PASS. Campaign audit45/45 clean with its same known historical
finding. Snapshot baseline changed only01-01, then matches45/45. No iPhone
play or thermal approval, no release publication or Git push in this pass.

Reproduce evidence:
`git show e9073b3:mobile/src/game/levels/stages/campaignStages.json > /tmp/entrance-before.json`,
then `node --import tsx tools/performance/entranceCover.ts /tmp/entrance-before.json`.

## Remaining44 missions — functional cover inspections

The subsequent user request expands the Entrance-only pass to the remaining44
missions. The completed01-01 object is unchanged from the Entrance pass. All44
keep their architecture, prop positions/art, lights, entry/prize/exit, doors,
CCTV, guard counts, speeds, roles and chapter vision pressure. Most already
had opaque geometry; the missing relationship was between playable cover and
the guard's inspection direction. This pass updates those authored patrol
posts/look targets, including their generated navigation legs and corresponding
theft-search anchors. It does not replace the AI, scatter furniture or add
render effects.

`v13CoverCheckpoints.json` names123 individual inspection/hidden/peek triples,
2–3 per mission. Museum uses columns/statues/cases, Gallery and Mansion use
art walls/sculptures, Bank/Casino use counters/screens, Lab/HQ use equipment
and real wall corners (glass remains transparent), Warehouse uses crates,
and Vault uses armoured screens/cargo. Each guard checks an exposed shoulder
beside actual cover, then walks on and leaves a timing window. Probe positions
are offline QA data; they are never baked into player tracking.

All123 probes pass full-body hiding0/3 and adjacent exposure>=2/3. Removing
opaque props while keeping walls restores3/3 visibility in the prop probes;
the four glass-gallery corner probes use architecture and remain hidden by
the actual walls. All inspection posts are visited/faced during180s of the
real patrol. Every hidden position has a window of at least2.2s unwatched
by *all* guards and actual sweeping CCTV during that observation period.
A180s result is capped by the test length, not a claim of permanent safety.

[`campaign-cover.json`](campaign-cover.json) records the identical comparison
matrix on all44:32 fixed-route +8 observing runs before and after,3520 heists
in total. Fixed clears262→272/1408; observing clears149→146/352. These mixed
numbers do not certify improved difficulty, fun, or human success rates.
There is a separate continuous live-AI full-heist witness for every mission
(44/44): guards, CCTV, pickup, theft, lockdown and contact capture stay active.
08-05,09-03 and09-05 need departures outside the coarse matrix; their extra
witnesses are explicit and excluded from the comparison counts. The HQ03/05
regression tests use the new patrol timing windows and still check careless
departures being spotted and timed complete escapes.

Validation: whole `npm test` PASS (campaign668/668), expanded cover/window/
heist checks45/45 PASS, app/campaign/performance typecheck PASS, source lint
0 errors/0 warnings. Environment tool typecheck and contract6/6 also PASS:
the manifest contract now declares its existing optional provenance field,
fixing a stale metadata-sync type error without changing pixels or validation
thresholds. Campaign audit45/45 clean apart from the same historical
05-02 cashier-corner tangent finding. The reviewed44 hashes were refreshed;
the Entrance hash stayed unchanged, then snapshot45/45 SAME. Nine chapter
examples were inspected through the actual Skia renderer, debug OFF, with
the review overlay separate from the captures. These are offline renders,
not Simulator or iPhone screenshots. No device Tilt/thermal/battery result
is claimed. Guard locomotion remains **ASSET REQUIRED**, unchanged.

Reproduce the comparison from `mobile/`:

```sh
git show e9073b3:mobile/src/game/levels/stages/campaignStages.json > /tmp/cover-before.json
node --import tsx tools/performance/campaignCover.ts /tmp/cover-before.json
node --import tsx --test tools/campaign/v13CoverCheckpoints.test.ts
```

The full raw matrix stays in ignored `Reports/CampaignCover/matrix.json`;
only the40KB summary and small authored inspection/witness tables are tracked.
`museumPolishPreview.ts` now loads only a mission's referenced environment
images and renders the correct CCTV/valuable slots for these offline captures.
This tool change does not affect the app's asset loading or rendering.

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


## 2026-10-30 continuation — static materials, placement and current-state audit

The 45-mission cover/patrol pass above is retained. This continuation does not
change map data, difficulty coefficients, movement speed, missions, sensors or
character textures. Static art now uses theme-specific floor/wall finishes and
more restrained existing warm lights. No extra light, layer, full-screen pass,
shader, texture, realtime shadow or animated decoration was introduced.

`venueMaterials.test.ts` compares all remaining44 floor command budgets with
same-map historical formulas; every one decreases. Museum01-01 retains its
previous pilot floor/light treatment. [`venue-art.json`](venue-art.json) records
those counts and9 representative before/after static-picture sizes. The before
renderer is loaded from `e9073b3`, while **both** sides use today's map, assets,
initial game state and camera. State digests and layer counts match. These are
actual offline Skia game renders, debug OFF, not Simulator/iPhone captures.
The decrease is in recorded floor commands/bytes, not a battery or FPS promise.
Local comparison boards: `Reports/VenuePolish/comparison-{1,2,3}.png` (ignored).

[`placement-audit.json`](placement-audit.json) checks593 solid props across45
missions. Previously55 placements had collision envelopes outside the artwork
projection. `propRenderWidth` increases only necessary draw widths, preserving
aspect ratio, pivot and existing footprint. All593 now fit their bitmap bounds;
transparent glass stays on its technical renderer. **This is a bounds test, not
an alpha-silhouette or wall-height occlusion certification.** Nine representative
maps were visually inspected; closer full-footprint art review remains useful.
Nothing changes collision, LOS, props' world positions or player paths.

Door navigation now returns the immutable static graph when there are no closed
door blockers. The existing closed-door/alternate-route test also verifies that
reopening restores the direct route without mutating that graph. This saves
work on graph refresh, not on every simulation tick.

The security CPU comparison now includes09-05 (6 guards +3 CCTV), with120s each
of patrol/theft/alert. All12 cases retain matching sampled simulation-state
hashes. Vault CPU times are187.94/249.67/231.81ms per7200 ticks, versus
343.48/580.25/589.72ms with the old vision code:45.28/56.97/60.69% lower.
These gains belong to the **already implemented vision cache/broad phase**;
this run expands its coverage, and does not attribute them to today's door or
art changes. Desktop CPU only; GPU, heat and battery remain unmeasured.

### Difficulty findings — not a blanket approval

[`difficulty-current.json`](difficulty-current.json) samples actual patrol/CCTV
for60s over all45 missions. Chapter means, rounded to percent:

| Chapter | Guard coverage | Safe-route exposure | Exit pressure |
|---|---:|---:|---:|
| 1 Museum | 4.1 | 5.9 | 1.0 |
| 2 Gallery | 3.3 | 5.7 | 0.0 |
| 3 Bank | 8.3 | 11.1 | 7.5 |
| 4 Lab | 6.9 | 9.0 | 5.5 |
| 5 Casino | 9.2 | 13.0 | 18.3 |
| 6 Mansion | 10.9 | 10.9 | 10.3 |
| 7 Warehouse | 13.4 | 15.0 | 16.8 |
| 8 HQ | 13.7 | 16.5 | 26.5 |
| 9 Vault | 17.2 | 18.0 | 14.3 |

The exact report is authoritative. These axes measure different exposures, not
player win rates. Late guard coverage increases, but Mansion safe-route pressure
and Vault exit pressure dip versus their preceding chapters. The report's
`orderingAcceptance` gate still covers chapters1–3 only and remains
`REVIEW_REQUIRED`; it must not be presented as an all-nine difficulty PASS.
The separate44-mission full-heist witnesses still clear with live AI and CCTV.

A06-01 guard1 first-wait trial (3→4→5 seconds) was rejected: the same32 fixed
runs cleared12→13→13 times, while8 observing runs cleared0 in all three. Longer
waiting alone provided no demonstrated improvement. It was never written to
StageDefinition. Mixed route matrix outcomes above remain disclosed, with no
claim that every cover change improved difficulty or fun. Further balance
changes need a specific route/timing problem and preserved complete-escape
witness, rather than forcing every exposure axis to rise monotonically.

### Character status correction

Code inspection found the earlier LEGACY-static description was stale. Current
`ASSET_MANIFEST.characters` uses the existing V2 cutout atlases: Player Walk14
frames, Guard Walk/Run12 frames, distance-driven playback. `locomotion:validate`
passes, but `finalApproved=false` is retained. Guard Whistle/Search are idle
stand-ins. No new generation, frame repair, rebake or speed change was done.
**Guard locomotion final asset required** remains the final-art blocker; the
current cutout animation is not being declared a final approved solution.
Historical production records are retained and labelled in `ASSET_TODO.md`.

Validation: `npm test` PASS (campaign668 tests); app/campaign, performance and
all environment-tool TypeScript checks PASS; app lint0 errors/0 warnings and
changed environment-tool lint PASS. Campaign snapshot45/45 SAME. Campaign audit
has no new findings; the pre-existing05-02 guard4 cashier-corner tangent remains
explicitly recorded. No iPhone, Simulator playthrough, thermal/battery or human
animation approval is claimed for this continuation.

Reproduce the visual comparison without modifying working app code:

```sh
BASELINE_ART_REF=e9073b3 SKIP_REPLAY=1 MAP_ONLY=1 TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/museumPolishPreview.ts Reports/VenuePolish/06-04/before 06-04
SKIP_REPLAY=1 MAP_ONLY=1 TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/museumPolishPreview.ts Reports/VenuePolish/06-04/after 06-04
node --import tsx tools/environment/placementAudit.ts
npm run test:museum-look
```

## Next patrol pass — Casino clearance / Mansion crossings

Only05-02 and06-01 StageDefinitions change, through the explicit
`v13PatrolPolish.ts` layer after cover authoring. All other43 hashes remain
identical to26c5024. Architecture, props, lighting, entry/objective/exit, doors,
CCTV, guard counts, roles, speed, range and suspicion tuning are unchanged.
The affected guards' patrol legs, facing, and derived theft/search anchors change.
The override index names this final layer so future bakes retain the repair.

- **05-02:** the objective guard passes east of the cashier cage at(4.25,16.5)
  before turning toward the jewel. This removes the old tangent exception;
  `KNOWN` is now empty, with the same collision threshold. Regression checks
  simulate300s each at30/60/120Hz, check every guard step's full body clearance,
  and require the guard to reach all waiting inspection points. Clearances are
  not obtained by stopping the patrol, removing the collider or slowing guards.
- **06-01:** guard1 adds a2s inspection at the north corridor(11.75,2.5), facing
  the east approach. Guard3 looks west toward the service exit from its existing
  loading post, then resumes its original walk. The original cover inspections
  and usable waiting windows remain. Immediate safe-route Run now contacts
  guard1 at5.7s (no whistle, no suspicion-triggered game over). Walking from0s,
  or running after4s, still completes a continuous heist.
- **09-05 is unchanged:** a lower-stair inspection increased sampled exit
  coverage0→15%, but also opened a previously unavailable immediate sprint
  clear. Trying longer upper inspections still admitted extra quick-route
  clears. Those candidates were rejected, not baked. A higher coverage number
  alone is not evidence of better level design.

[`patrol-polish.json`](patrol-polish.json) compares the same32 fixed and8
cone-aware full-heist inputs before/after, using actual simulation and including
contact-capture attribution. Fixed clears: Casino6→7, Mansion12→12, Vault0→0.
Observing clears: Casino6→2, Mansion0→0, Vault0→0. These are deliberately disclosed
mixed proxy outcomes, **not human win rates or a universal difficulty gain**.
Casino timing changes as the return leg changes; its existing full-heist witness
still clears. In Mansion, immediate Run no longer clears, while the additional
8s-departure Walk does; the change creates a crossing/timing choice rather than
raising a global detection coefficient. Vault's extra risk/Sneak departure9s
witness still clears and is excluded from the32/8 comparison counts.

Mansion sampled safe-route exposure6.90→8.23%; exit pressure0.83→21.67%.
The report now evaluates all9 chapters by default (formerly only1–3), rejecting
missing late-chapter evidence. Explicit subset checks remain available to tests.
`difficulty-current.json` still says `REVIEW_REQUIRED`: improving these two
missions does not certify a monotonic human difficulty curve. Museum01-01 and
all character/graphics/runtime AI code are untouched in this pass.

Reproduce from `mobile/`:

```sh
git show 26c5024:mobile/src/game/levels/stages/campaignStages.json > /tmp/patrol-before.json
node --import tsx tools/performance/patrolPolish.ts /tmp/patrol-before.json
node --import tsx --test tools/campaign/v13PatrolPolish.test.ts tools/campaign/chapterDifficulty.test.ts
npm run campaign:audit
npm run campaign:snapshot
```

No physical Tilt, thermal measurement or new sprite approval is implied. The
existing temporary Guard animation / Whistle/Search asset limitations remain.

Validation for this pass: whole `npm test` PASS, including674 campaign tests;
focused patrol/difficulty13/13 PASS; app/campaign/performance typechecks PASS;
source and changed-tool lint0 errors/0 warnings; snapshot45/45 SAME after review
of exactly two changed hashes; full campaign audit45/45 clean, **zero exceptions**.

## Vault exit watch — subsequent pass

The rejected guard-route experiment above remains rejected. This pass changes
only09-05 camera2's authored centre direction, from east to the existing
east-stair doorway at(25.5,21.5), about46.3°. All six guards, their routes/speeds,
the other cameras, sensor ranges/gains, geometry, and the final exit are kept.
`v13ExitWatch.ts` is the final explicit authoring layer, also recorded in the
override index. The only additional StageDefinition diff after the Casino/Mansion
pass is this camera direction and its matching topology metadata. No runtime
simulation work, light, shader or drawing pass is added.

[`vault-escape.json`](vault-escape.json) compares identical inputs against09-05
at26c5024. Stationary camera-only samples over60s show:

| Probe | Visible before → after | Longest unwatched after |
|---|---:|---:|
| East-stair doorway(25.5,21.5) | 13.14% →49.33% | 1.90s |
| Exposed approach(25,22.5) | 0% →52.00% | 3.60s |
| Behind lobby wall(24,22.5) | 0% →0% | 60s |
| Final exit centre(26.8,24) | 0% →0% | 60s |

These are **not guaranteed safe crossing times**: other guards may see a player.
The cover/peek points fit the real player body and connect without collision.
Removing blockers exposes the hidden point, proving actual wall occlusion;
closing the solid stair door blocks the exposed point too. A hidden stationary
player does not create a CCTV alert or player LKP. Existing three cover waiting
windows, sampled with all guards/CCTV over180s, remain20.3/18.3/26.3s.

Complete heist checks disclose unchanged proxy outcomes: fixed0/32 and
cone-aware0/8 before/after. The two extra risk/Sneak/alternate-escape witnesses
at8.5s and9s departure still clear in74.9s and75.4s; these are **bot simulation
times, not human clear times**. This fixes a blind approach, not a demonstrated
increase in human difficulty or a universal reduction in scripted clear rate.

The difficulty audit now retains exit-centre pressure **and** samples every
authored escape route with the same real patrol/CCTV/LOS. Route exposure is
weighted by sample count, with each route also reported separately. Missing or
zero-length escape routes are incomplete evidence. Vault total escape exposure
is18.30%→19.03%; quick return33.28%→32.50%, service escape12.23%→13.58%.
The unchanged0% exit-centre reading no longer hides watched approaches.
These open-door patrol diagnostics do not model theft/lockdown; the separate
continuous heists and door regressions cover those systems.

Reproduce from `mobile/`:

```sh
git show 26c5024:mobile/src/game/levels/stages/campaignStages.json > /tmp/vault-before.json
node --import tsx tools/performance/vaultEscape.ts /tmp/vault-before.json
node --import tsx --test tools/campaign/v13ExitWatch.test.ts tools/campaign/chapterDifficulty.test.ts
node --import tsx tools/campaign/chapterDifficultyAudit.ts src/game/levels/stages/campaignStages.json docs/reports/performance/difficulty-current.json
npm run campaign:audit
npm run campaign:snapshot
```

All-nine-chapter difficulty acceptance remains `REVIEW_REQUIRED`; device Tilt,
thermal measurements and final character animation approval remain outstanding.

Validation: whole `npm test` PASS including679 campaign tests; focused
exit-watch/difficulty13/13 PASS; app/campaign/performance typechecks PASS;
source and changed-tool lint0 errors/0 warnings; campaign audit45/45 clean,
zero exceptions; snapshot45/45 SAME after review of the single09-05 update.
Relative to26c5024, only05-02/06-01 from the prior pass and09-05 from this pass
have changed StageDefinitions. No Simulator or physical-device run was performed.
