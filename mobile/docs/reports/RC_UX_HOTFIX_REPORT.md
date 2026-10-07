# RC UX hotfix — tilt stop, control mode, guard detection, result screen (2026-10-07)

Not committed. No OTA published. Four items only; campaign data, maps, patrols, cameras, CCTV formula, save
migration, ads, IAP and audio are untouched (campaign snapshot 45 / 45 SAME).

## 1. Tilt: a phone held still is a complete stop

**Cause.** One threshold (1.75°) both started and stopped the thief, and the speed curve starts at zero exactly
there. A hand resting at 1.8–2.3° therefore crept at 0–7 px/s, and tremor across 1.75° switched movement on and
off. After that, the body coasted on a 1400 px/s² deceleration.

**Change** (`tilt.ts`, `tiltProfiles.ts`, `tiltMovement.ts`):

| | Before | After |
|---|---|---|
| Start moving (from rest) | 1.75° | **2.25°** |
| Stop (while moving) | 1.75° | **1.75°** — unchanged, and it is a hard zero |
| Max tilt / smoothing | 10° / 0.07 s | same |
| Speed curve | anchored at 1.75° | same curve, same anchor: 3.625° = 38, 6.25° = 72, 10° = 150 px/s |
| Held between 1.75° and 2.25° while moving | crept indefinitely | comes to rest after 0.25 s, needs 2.25° again |
| Stop | filter cleared, body decelerates ~0.1 s | filter cleared **and** body velocity, speed, gait zero in the same frame |

- Not a bigger dead zone: the curve was not moved, so 3° is still 21 px/s and 4° still 41 px/s. The first speed
  after starting is about 6 px/s at 2.25°.
- The 0.25 s rule is an addition to the two thresholds asked for. Without it a thief who had been moving and was
  then held at 2.0° would keep creeping at 2–3 px/s, which is the reported symptom. Passing through the band while
  steering is not affected.
- Neutral, relative quaternion, Recenter and the calibration are unchanged. Nothing re-learns the neutral.
  Recenter and a lost sensor also end the "moving" state.
- Wall slide and collision are unchanged; a zero input clears the wall contact flags.

Device feel: **PENDING — IPHONE TILT.**

## 2. Guard detection: standing still in view is not safe

`suspicion gain = base × movement × distance × cone × visibility`. Only the movement table changed
(`guardTuning.ts`): `[0.08, 0.35, 0.8, 1.6]` → `[0.28, 0.35, 0.8, 1.6]` (Still, Sneak, Walk, Run).

Seconds to a full alert, guard looking straight at a fully visible thief:

| Distance | Still (was) | Sneak | Walk | Run |
|---|---|---|---|---|
| 1.2 tiles | 1.7 (1.7) | 1.7 | 1.4 | 0.7 |
| 2 tiles | **5.1** (17.9) | 4.1 | 1.8 | 0.9 |
| 3 tiles | **7.3** (25.6) | 5.8 | 2.6 | 1.3 |
| 4.1 tiles | **13.8** (48.3) | 11.0 | 4.8 | 2.4 |

- Sneak, Walk and Run are exactly as before. Relative to Still they are 1.25× / 2.9× / 5.7×: Sneak matches the
  1.2–1.3× asked for; Walk and Run are above the 1.5× / 1.8–2.0× of the brief because I left them where they were
  instead of slowing them down. Bringing them to the brief's ratios would make walking and running past a guard
  much safer than today in all 45 missions. Say so if you want that instead.
- Inside 1.5 tiles Still and Sneak are equal (existing close-range floor, unchanged).
- Distance, cone edge and partial cover work as before. Out of sight: no rise, then the existing decay.
- CCTV is a different formula and file; not touched. Freeze / phone-motion code not touched.
- The guard is given the thief's gait from the collision-resolved speed. It has no input for control mode.

## 3. Settings: control mode

Settings → **조작 방식**: `기울이기 (추천)` / `터치`. Default Tilt. Also reachable from the pause menu.

- Saved as `controlMode: 'tilt' | 'touch'` inside the existing settings/progress record
  (`dont-move.playable-v1.progress`), next to language and sound. An older save without the field reads as Tilt.
  No new storage key; the OTA and purchase keys are separate records.
- **Touch** is a drag stick: the ring appears where the thumb lands, direction and speed follow the drag
  (short = sneak, half = walk, full radius = run), letting go stops in that frame. It feeds the same movement step
  as Tilt. A tap alone moves nothing. The old tap-to-move (walks to a point by itself) remains a development
  harness only and cannot be reached in a release build.
- With Touch chosen the motion sensor is not started and motion permission is not asked for.
- **Sensor unusable** (no Core Motion, or motion access refused): the mission is played with the stick and shows
  "기울기 센서를 사용할 수 없어 터치로 조작합니다." (with "센서 다시 연결" when a retry can help). Before, a release
  build stopped on the sensor error. Settings shows the same note under the choice when the device has no sensor.
  A sensor error that is not one of those two still shows the existing retry dialog.

## 4. Mission-clear screen

| Mission | Main button | Others |
|---|---|---|
| inside a chapter | 다음 스테이지 → next mission | 챕터 선택 · 다시 하기 · 홈 |
| last of chapters 1–8 | 다음 챕터 → first mission of the next chapter | 챕터 선택 · 다시 하기 · 홈 |
| 09-05 | 챕터 선택 | 다시 하기 · 홈 |

- "다음 챕터" is shown only if the next mission can really be played; otherwise the main button is 챕터 선택.
  (The clear itself unlocks it, so this is a guard, not a normal case.)
- 09-05 used to show "다시 플레이" and start 01-01. It no longer wraps, and 01-01 is no longer prepared behind it.
- The clear is recorded and queued to storage when the mission completes, about a second before the screen
  appears; the buttons do nothing until then. 챕터 선택 and 홈 leave to the finished Home / chapter list — the
  Home intro is not replayed.
- Caught screen: 다시 도전 · 챕터 선택 (new) · 홈.

## Simulator

Dev client (iPhone 17 Pro simulator) unless noted. The simulator has no tilt sensor.

| Check | Result |
|---|---|
| Settings shows 조작 방식, Tilt selected by default, sensor note | PASS |
| Choose 터치 → stored (`controlMode: touch`, progress fields unchanged) → quit, relaunch → still 터치 | PASS |
| Touch: tap alone | thief does not move, no target (01-02) |
| Touch: drag up 30 pt for 1.9 s | moved 114 px north; released: speed 0, position fixed |
| Standing still in view (01-02, 139 → 88 px from guard 1) | suspicion 0 → 0.09 in 1.6 s while seen; back to 0 after he turns away |
| 01-02 result | 미션 완료 · 다음 스테이지 → 01-03 |
| 다시 하기 (01-03) | same mission restarts, clock at 0 |
| 챕터 선택 (01-03) | chapter list, no intro |
| 05-05 result | 챕터 완료 · 다음 챕터 → 06-01 |
| 09-05 result | 챕터 완료 · 챕터 선택 / 다시 하기 / 홈; no next mission, no "다음 챕터" |
| 홈 from the 09-05 result | finished Home at the first sample, no intro |
| **Release build**, fresh install: Settings | Tilt selected, "Tilt sensor unavailable. Playing with touch." |
| **Release build**: 01-01 | no sensor dialog; fallback note; tap does nothing; drag moves the thief |

The result screens were reached with a temporary "clear" button in the dev pause menu, removed again before the
final test run (it is not in the diff). Those forced clears overwrote three best times in the simulator's dev
save; they were put back (01-03 58.42 s, 09-05 43.08 s exactly; 05-05 to 25.50 s — its hundredths digit was not
recorded before the overwrite). 07-02 and 08-04 were not opened: they take the same code path as 01-02.

Not possible in the simulator: tilt (item 1), a real motion-permission refusal, a real restart on the phone.

## Tests

| Check | Result |
|---|---|
| `npm test` | 1066 / 1066 node tests (+22) and 48 / 48 in the four script suites (+2) |
| `npm run typecheck` (app + V13 tools) | 0 errors |
| lint | 0 errors (1 existing warning) |
| `campaign:snapshot` | **45 / 45 SAME** (05-05 RC patrol baseline unchanged) |
| `campaign:audit` | 45 / 45 clean, 1 known finding (05-02) |
| manifest validation / `test:stability` | missing 0, invalid 0 / 37 / 37 |

New: `tiltStop.test.ts` (10), `controlMode.test.ts` (6), `resultNavigation.test.ts` (6), two guard-vision cases.

Existing tests changed, because they pinned the behaviour this hotfix replaces:
- `tilt.test.ts`: default tuning now has `moveStart`; "2° from rest gives 1–4 px/s" became "2° from rest is zero,
  2.3° is slow precise input".
- `guardVision.test.ts` G: "far + idle → barely (< 0.1 after 3 s)" became "rises slowly (0.15–0.35), no alert".
- `validateCampaign.test.ts`: "far-edge idle takes > 20 s" became "10–20 s", plus "still is slower than sneak".
- `PROTECTED_HASHES.json`: refreshed for the four intentionally edited files (`tilt.ts`, `tiltProfiles.ts`,
  `tiltMovement.ts`, `guardTuning.ts`). `guardSystem.ts`, `cctv.ts`, `campaignProgress.ts` are unchanged.

## iPhone checklist

1. **Still** — hold the phone as you play, do not move it for 30 s: no drift. Tilt very slightly: still nothing.
2. **Start / stop** — tilt until he starts; ease back toward level: he stops at once and stays stopped. Repeat in
   four directions and diagonally.
3. **Not dull** — a small, deliberate tilt (about the width of a finger at the top edge) must sneak. If it takes a
   clearly larger tilt than before to get going, that is a FAIL to report.
4. **Stop from a run** — full tilt, then level: no slide.
5. **Walls** — run along a wall, into a corner, release: no sticking, no jitter.
6. **Recenter** — change posture, Recenter: still at rest in the new posture.
7. **Guards** — stand in a cone at the far end: the meter climbs slowly. Same spot sneaking, walking, running:
   each faster. Step behind cover: it stops and falls.
8. **Touch** — Settings → 터치. Play 01-02. Quit the app, reopen: still 터치. Back to 기울이기.
9. **Result** — clear 01-02 (다음 스테이지), a chapter's last mission (다음 챕터), 09-05 (챕터 선택). Use 홈 once,
   reopen the app, check the clear and the unlock are there.

Missions to cover: 01-02, 05-05, 07-02, 08-04, 09-05.

## Files

Changed: `src/game/input/tilt.ts`, `tiltProfiles.ts`, `tiltMovement.ts`, `useTiltControl.ts`;
`src/game/guards/guardTuning.ts`; `src/game/progress/stageProgress.ts`; `src/ui/VisualPlaygroundScreen.tsx`,
`src/ui/branding/StartupScreen.tsx`, `src/ui/menu/MenuContext.tsx`, `MenuScreens.tsx`, `strings.ts`;
tests `tilt.test.ts`, `guardVision.test.ts`, `tools/campaign/validateCampaign.test.ts`; `package.json` (test list);
`docs/design/v12/phase4c/PROTECTED_HASHES.json`.
Added: `src/game/input/controlMode.ts`, `touchStick.ts`, `sensorPresence.ts`; `src/ui/resultNavigation.ts`,
`src/ui/hud/MissionResult.tsx`, `TouchStickHud.tsx`; three test files; this report.

`VisualPlaygroundScreen.tsx` is 720 lines (691 before). The new UI went into separate components; the file was
already over the 300-line guideline and was not split in this hotfix.
