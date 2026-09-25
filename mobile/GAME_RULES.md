# DON'T MOVE — Core Game Rules V1

이 문서가 게임 규칙의 **Source of Truth**다.
- 코드와 이 문서가 충돌하면 **문서를 기준으로 판단**한다.
- 규칙을 바꾸려면 먼저 이 문서를 고친 뒤 구현한다.
- `legacy-unity/`는 대상이 아니다.

맨 아래에 현재 구현 상태(✅ 구현 · ⚠️ 충돌 · ⏳ 미구현)와 규칙별 테스트 매핑이 있다.

---

## 1. 게임 목표

2D Top-down Tilt Stealth Game.

START → 경비 회피 → 목표물 접근 → **DIAMOND 획득** → EXIT 활성화 → 탈출 → **MISSION COMPLETE**

발각 자체는 Game Over가 아니다. 실패 조건은 Guard가 Player를 실제로 잡은 경우(`CAUGHT`)뿐이다.

## 2. Player 조작

- 휴대폰 Tilt: 기울기 방향 = 이동 방향, 기울기 크기 = 이동 속도.
- Neutral → IDLE · Small Tilt → SNEAK · Medium → WALK · Large → RUN.
- 대각선 이동을 지원하되, 대각선이라고 더 빨라지지 않는다.

## 3. Neutral / Calibration

- 게임 시작 시 현재 편하게 든 자세를 Neutral로 저장한다. 앉기, 서기, 기대기, 눕기 모두 플레이 가능해야 한다.
- Neutral은 자동으로 이동하지 않는다. 자세를 바꾸려면 `RECENTER`를 쓴다.

## 4. 움직임과 위험도

- 위험도: IDLE < SNEAK < WALK < RUN.
- IDLE도 완전히 투명하지 않다. Guard 바로 앞에서는 가만히 있어도 결국 발견된다.

## 5. Guard State

PATROL → SUSPICIOUS → ALERT → WHISTLE → GLOBAL ALERT → CHASE / INVESTIGATE → SEARCH → RETURN → PATROL

각 Guard는 기본적으로 독립적으로 행동한다.

## 6. Guard Facing — Single Source of Truth

Guard에는 canonical `facing` 값이 **하나만** 있다.

**화면에서 바라보는 방향 = Vision Cone 방향 = Detection 판정 방향.** 셋이 다르면 버그다.

## 7. Vision Cone

Player가 보이려면 세 조건을 모두 만족해야 한다.
- **Distance:** Vision Range 안에 있다.
- **Angle:** Guard가 바라보는 Cone 안에 있다.
- **Line of Sight:** Guard와 Player 사이에 Wall이나 Vision-blocking Cover가 없다.

## 8. Visual Cone = Detection

화면의 Red Cone이 곧 실제 판정 영역이다. Renderer와 Detection은 같은 `facing`, `visionRange`, `visionAngle`, occlusion geometry를 쓴다. 화면과 판정의 각도나 거리가 다르면 금지다.

## 9. Suspicion `?`

Vision에 들어오면 해당 Guard 머리 위에 `?`가 뜬다. Guard마다 독립적인 Suspicion 0–100을 가지며, Global Alert 전까지는 공유하지 않는다.

## 10. Suspicion Gain

**Final Gain = Base × Difficulty × Movement × Distance × Vision Position × Visibility**

## 11. Movement Factor

IDLE 매우 낮음 · SNEAK 낮음 · WALK 중간 · RUN 높음. 정확한 수치는 플레이 테스트로 조절한다.

## 12. Distance Factor

거리가 가까울수록 훨씬 빠르게 발견되어야 한다. 순서는 Vision 끝(느림) < 중간 < 근처 < 바로 앞(매우 빠름)이고, 그 차이가 플레이에서 확실히 체감되어야 한다.

## 13. Close Detection

`closeDetectionRadius` 안에서는 IDLE이어도 Suspicion이 확실히 오른다. 멀리서 정지하면 발견되기 어렵고, 코앞에서 정지하면 빠르게 발견된다.

## 14. Vision Position Factor

Cone 중앙은 빠르고, 중간은 보통, 가장자리는 느리다. Cone 끝을 스치는 것과 정면으로 달려드는 것은 위험도가 확실히 달라야 한다.

## 15. Visibility

Player 몸을 최소 Center, Left, Right 세 점으로 검사한다. 완전히 가려지면 상승이 없고, 일부만 보이면 Visibility Factor가 낮아진다.

## 16. 단계별 Guard 반응

| Suspicion | 반응 |
|---|---|
| 0–25% | PATROL 유지, `?` 표시 |
| 25–60% | Patrol 속도 감소, Player 방향을 살짝 확인 (facing이 바뀌면 Cone도 함께 바뀜) |
| 60–99% | Patrol 중단, Player 쪽으로 몸을 돌려 집중 확인 |
| 100% | `? → !` 완전 발각 |

## 17. Suspicion Decay

100% 전에 시야에서 벗어나면 상승이 즉시 멈추고, 약 0.5초의 기억 시간 후 감소한다. 0%가 되면 `?`가 사라지고 정상 Patrol로 돌아간다.

## 18. ALERT `!`

어느 Guard든 100%가 되면 `!`가 된다. **`!`는 Game Over가 아니다.**

## 19. Whistle

Alert Guard는 Player를 바라본 상태에서 Whistle Animation → Whistle Sound → Global Alert 순서로 진행한다 (약 0.4–0.8초). 한 번의 Alert에서 Whistle은 한 번만 발생한다.

## 20. GLOBAL ALERT

한 Guard라도 `!` 후 Whistle을 불면 **모든 Guard가 Alert**가 된다. 이때부터 개인 Suspicion 단계는 끝난다. 다른 Guard가 다시 `?`를 채우는 과정은 없다.

## 21. Global Alert UI

- Player를 직접 보고 있는 Guard: `!`
- Player를 잃고 수색 중인 Guard: Search Indicator
- Alert 위치로 이동 중인 Guard: 표시 없음 (필요하면 추가)
- 일반 `?` 게이지는 표시하지 않는다.

## 22. Global Alert Target

Whistle 순간의 Player **Last Known Position**을 모든 Guard에게 공유한다. 모든 Guard가 Patrol을 멈추고 그 위치로 이동한다.

## 23. 정보 규칙

- **노출 중:** Player를 실제로 보는 Guard가 위치를 갱신하고, 그 값이 Global LKP로 다른 Guard들에게 전달된다.
- **숨었음:** 보는 Guard가 없으면 위치 갱신을 멈춘다. Guard들은 마지막으로 확인된 위치만 안다.

## 24. Last Known Position

LKP는 **실제로 보고 있을 때만** 갱신된다. 벽 뒤의 Player를 추적하면 버그다. Global Alert 중에는 가장 최근의 유효한 LKP를 공유한다.

## 25. Global Chase

- Player를 직접 보는 Guard는 CHASE한다.
- 나머지 Guard는 공유된 LKP로 이동한다.
- 계속 노출되면 결과적으로 모든 Guard가 Player 쪽으로 몰려온다.

## 26. Chase

직접 보고 있는 Guard는 RUN으로 Player를 직접 추격한다. LKP를 계속 갱신하고 `!`를 유지하며, 시야가 유지되는 동안 방향 전환도 따라간다.

## 27. Vision Lost

Player를 놓치면 현재 위치 추적을 멈추고, 마지막 LKP까지 이동한 뒤 SEARCH로 넘어간다.

## 28. Search

LKP 주변 이동, 방향 변경, 가까운 통로와 Cover 주변 확인, 잠시 정지 후 재탐색을 한다. 실제 Player 위치는 모른다.

## 29. Search 중 재발견

즉시 `! → CHASE`로 전환한다. LKP를 갱신하고, Global Alert를 유지하며, 새 LKP를 공유한다.

## 30. Search 종료

일정 시간 못 찾으면 SEARCH → RETURN → PATROL. 자신의 순찰 경로로 실제 복귀한다. **Global Alert 해제 조건:** 아무 Guard도 Player를 보지 못하고, 모든 Guard가 복귀를 마쳐 PATROL인 경우. 해제되면 일반 Suspicion 시스템이 다시 활성화된다.

CHASE / INVESTIGATE / SEARCH / RETURN 이동은 몸 반경을 고려해 Wall/Cover를 우회한다. 길을 찾지 못한 LKP는 도달 가능한 가장 가까운 지점에서 수색한다. 경로 탐색은 목표가 유의미하게 바뀔 때 제한된 주기로 실행하며 매 프레임 반복하지 않는다.

## 31. Global Alert 중 Suspicion 비활성

Global Alert 동안 Suspicion 시스템을 끈다. 이때 Guard의 판단은 다음과 같다.
- Player가 보임 → CHASE
- Player가 안 보이고 LKP가 있음 → INVESTIGATE / SEARCH
- 끝내 못 찾음 → RETURN

## 32. CAUGHT

실제 몸 접촉 `distance <= playerBodyRadius + guardBodyRadius + smallTolerance`일 때만 CAUGHT다. Legacy Unity의 `0.6 tile = 24 units` 환산은 사용하지 않는다. 반경과 허용치는 별도 튜닝 값이며, 벽/엄폐물을 사이에 둔 접촉은 인정하지 않는다. CAUGHT 이후 시뮬레이션을 멈추고 Retry로 초기화한다.

다음은 Game Over가 아니다: Cone 진입, `?`, Suspicion 100%, `!`, Whistle.

## 33–34. Difficulty

V1 난이도는 **최종 Suspicion Gain의 multiplier**만 바꾼다. Guard 속도, Vision Range, Search 시간은 연결하지 않는다.

| Difficulty | Gain |
|---|---:|
| EASY | ×0.65 |
| NORMAL | ×1.0 |
| HARD | ×1.4 |

Close Detection도 영향을 받지만, Easy에서도 바로 앞에 오래 있으면 반드시 발견된다.

## 35–36. Mission (Chapter 1 · Stage 01–10)

- Diamond 획득 전에는 EXIT가 비활성이다.
- Diamond에 접근하면 `DIAMOND ACQUIRED`가 뜨고 Exit가 활성화된다.
- Diamond를 가진 채 Exit에 도달하면 **MISSION COMPLETE**다.
- Stage 01부터 순서대로 진행하며 Clear한 다음 Stage를 로컬 진행도에 저장한다.
- Alert / Chase / Search 여부와 무관하게 Diamond + Exit 진입이면 성공한다. 같은 프레임의 접촉보다 Exit 진입을 먼저 확정하며, 이미 CAUGHT가 된 플레이는 되살리지 않는다.
- Stage 10 탈출은 **CHAPTER COMPLETE**다. Retry는 현재 Stage를 처음부터 재시작한다.
- Clear Time, Alerts(Whistle 횟수), Stage별 Best Time 및 Clear 상태를 로컬 저장한다. Settings의 Stage Select는 Clear한 Stage와 다음 Stage까지 허용한다.
- Diamond 획득은 Cyan flash / Haptic / 효과음 / 1초 문구, 이후 작은 DIAMOND SECURED 상태와 탈출 안내를 표시한다. 실제 접촉에는 Red flash / Haptic을 표시한다.
- 후반 Stage는 보물 획득 후 지정 Guard의 순찰 대기·주시·속도를 변경할 수 있다. 보물 획득 자체는 Global Alert를 발생시키지 않는다.
- Patrol은 Loop / PingPong / WaitAndLook, waitDuration / lookDirection / turnDuration을 데이터로 지정하며 정지 후 회전하고 다음 구간으로 이동한다. Facing 단일 규칙을 유지한다.

Stage 구조 난이도는 Suspicion Difficulty multiplier와 별개다. Stage 01→10은 맵 크기,
통로 폭, 엄폐, 경비 밀도와 순찰 동선으로 매우 쉬움→가장 어려움 순서를 만든다.
Chapter 1 Guard 수는 2 / 2 / 3 / 3 / 4 / 4 / 4 / 5 / 5 / 6이며 모든 Stage에 Spawn→Diamond와
Diamond→Exit 경로, 안전 대기 공간 및 선택 가능한 우회 경로를 둔다.

## 37. 핵심 Risk / Reward

멈추면 안전하지만 느리고, 움직이면 빠르지만 위험하다. 보였을 때 STOP(상승 최소), SNEAK(조금 위험하지만 이동), RUN(빠르게 오르지만 Cover까지 빨리 간다) 중에서 고르게 만든다.

## 38. Core Invariants

| | Invariant |
|---|---|
| A | Guard Facing = Vision Cone = Detection Direction |
| B | Visible Vision Cone = Actual Detection Area |
| C | `?`는 100% 전 단계 |
| D | 100% → `!` → Whistle → Global Alert |
| E | Global Alert → 모든 Guard 반응 |
| F | Global Alert 중 일반 Suspicion 비활성 |
| G | Guard는 실제로 본 위치만 LKP로 안다 |
| H | 벽 뒤 Player를 자동 추적하지 않는다 |
| I | `!` 자체는 Game Over가 아니다 |
| J | 실제 Capture만 `CAUGHT` |
| K | Diamond 없이 Mission Complete 불가 |

---

# 구현 상태 (2026-09-24)

### ✅ 구현 완료
§5–36: 개별 시야/의심도와 전체 경보, 공유 LKP, CHASE/INVESTIGATE/이동 SEARCH/RETURN, 접촉 CAUGHT 및 Retry, Chapter 1의 10 Stage Diamond→Exit 미션과 로컬 진행·Clear·Best Time 저장. Whistle 동작 뒤 임시 오디오가 1회 재생되고 Global Alert가 이어지며 Sound OFF를 존중한다. 불변식 A–K는 관련 자동 테스트로 검증한다.

Chapter 1 Stage는 24×22 / 25×23 / 21×24 / 28×24 / 27×23 / 30×25 / 32×27 / 31×26 / 40×35 / 43×37 tiles다.
Stage 01–03은 Tilt/Vision, Cover/?, 좁은 통로/숨기를 순서대로 소개한다. 04 경로 선택, 05 Ring, 06 교차 Patrol, 07 긴 탈출, 08 Security, 09 복합 방, 10 Museum Heist 순이다.
Player 임시 Walk 시트는 이동 거리 기반으로 Sneak 1.41 / Walk 2.40 / Run 3.75 steps/sec를 사용한다.
시트 자체의 walking-in-place/foot-planting 결함은 코드로 보정하지 않으며 최종 Sprite 재제작 대상으로 남긴다.
Release Guard는 `assets/characters/legacy/guard_directions.png`의 잠긴 LEGACY 디자인을 사용한다.
Guard는 정지 방향 Sprite만 있어 이동 시 미끄러져 보인다. 최종 Walk/Run/Whistle/Search Sprite 교체를 AssetRegistry에 연결할 예정이며 procedural 팔다리 변형으로 보정하지 않는다.

Difficulty는 이번에 `DIFFICULTY_GAIN` multiplier로 추가했다 (`guardTuning.ts`). 기본값은 NORMAL = ×1이라 기존 동작은 바뀌지 않는다.

WHISTLE은 ALERT 상태의 동작이다. 전체 경비의 시야를 모은 뒤 공유 위치와 상태를 갱신한다. Navigation은 20-unit 격자와 몸 반경으로 확장한 충돌 영역을 사용하며, 목표가 12 units 이상 이동하면 최소 0.4초 간격으로 경로를 갱신한다. 수색은 4초이며 주변 지점을 오가고 잠시 멈춰 확인한다. 몸 반경은 Player 9 / Guard 8 / 허용치 0.5 units의 튜닝 초기값이다.

개발 화면의 `REPLAY ALERT FLOW`는 실제 박물관에서 정상 이동 목표만 입력해 발견→도주→엄폐→수색→복귀를 ¼속도로 재생한다. 경비 상태나 LKP, 접촉 판정을 강제로 바꾸지 않는다. Debug와 재현 버튼은 Release에서 숨긴다.

### 🧪 Tilt V1 — 구현·자동 검증 / 실제 iPhone 기본 동작 확인
§2–3: iPhone은 Core Motion 자세 quaternion 기반 Tilt, Simulator는 기존 Touch를 사용한다. 두 입력은 동시에 적용되지 않는다. 약 0.5초의 연속 안정 샘플 후 Neutral을 저장하고 READY 이후 시작한다. Neutral은 세션 중 자동 보정하지 않으며 RECENTER로만 변경한다. 백그라운드에서 돌아오면 자동으로 Neutral을 바꾸지 않고 멈춘다. 사용자가 RETRY SENSOR를 눌러 새 센서 세션을 시작할 때 HOLD COMFORTABLY부터 명시적으로 재교정한다. 권한 팝업이나 Control Center의 일시적인 inactive 전환은 기존 기준을 유지한다.

Dead Zone 2° / Max Tilt 16° / Sensitivity 1 / Smoothing 0.06s. 2026-09-25 실기기 피드백에 따라 약 5.18° Sneak / 9.64° Walk / 16° Run으로 각도 범위를 줄였다. Yaw(화면 법선 축 twist)를 제외한 상대 Pitch/Roll에 radial dead zone, smoothing, 비선형 속도 곡선을 적용한다. 대각선 속도를 제한하고 실제 충돌 후 속도로 Guard movement factor를 계산한다. RECENTER·센서 중단 시 즉시 정지하며 Neutral 복귀 시 빠르게 감속한다.

Player Sprite phase는 실제 이동거리 / 현재 보폭을 매 프레임 누적한다. gait 전환 때 전체 누적거리를 새 보폭으로 다시 나누지 않아 프레임 점프를 방지한다. Cadence는 1.41 / 2.40 / 3.75 steps/sec를 유지한다. 임시 Sprite의 발 모양/Foot Sliding 결함은 별도 에셋 작업으로 남는다.

실제 iPhone에서 Tilt 이동과 Guard AI의 기본 동작은 확인했다. 장시간 drift와 5 Stage 전체 조작감·성능은 Playable V1 실기기 검증에서 다시 확인한다. 상세 변경·재현 방법은 `Reports/TiltControl/README.md` 참고.

---

# 규칙 ↔ 자동 테스트

기존 iPhone 테스트 맵 01–05는 실제 Playable Stage로 승격되어 `objective`와 `exit`를 사용한다. `temporaryGoal`과 `TEST COMPLETE`는 일반 플레이에서 사용하지 않는다.

`npm test` = `test:locomotion` + `test:guards` + `test:rules` + `test:global` + `test:tilt` + `test:maps`

| 규칙 | 테스트 |
|---|---|
| Cone 밖 없음 (§7) | guards: `B` (각도 밖), `B2` (거리 밖) |
| Guard 뒤 없음 | guards: `A` |
| Wall/Cover 뒤 없음 (§7, §15) | guards: `D` |
| Cone 안 → `?` (§9) | guards: `C` |
| Visual Cone = Detection (§8/B) | guards: `Drawn cone polygon == detection region` |
| Facing 단일 (§6/A) | guards: `H`, `I` |
| 가까울수록 빠름 (§12) | rules: `§12 distance`; guards: `G` |
| Idle < Sneak < Walk < Run (§11) | rules: `§11 movement risk`; guards: `E`, `F` |
| Cone 중앙 > 가장자리 (§14) | rules: `§14 cone position` |
| 부분 가림 (§15) | rules: `§15 body partly behind a wall` |
| Close Detection (§13) | guards: `G`; rules: `§13/§34 close detection` (Easy) |
| Easy < Normal < Hard (§33) | rules: `§33 difficulty` |
| Guard별 독립 Suspicion (§9) | rules: `§9 suspicion is per guard` |
| 25–60%, 60–99% 반응 (§16) | rules: `§16 25–60 %`, `§16 60–99 %` |
| Decay, `?` 제거 후 Patrol 복귀 (§17) | guards: `Suspicion stops rising…`; rules: `§17 out of sight` |
| 100% 전 `!` 없음 (C) | rules: `Invariant C` |
| 100% → `!` → Player 바라봄 → Whistle → Global 이벤트 (D, §19) | guards: `J` |
| Whistle 1회 (§19) | rules: `§19 whistle fires exactly once` |
| 보이는 동안 LKP 갱신, 숨으면 고정 (G/H, §24) | guards: `Last known position updates only while seen` |
| Foot planting | locomotion: 전체 |
| Global Alert 전원 반응, Suspicion 비활성, LKP 공유, Chase, Search 이동, 재발견, Return, Caught | global: A–N 및 박물관 실제 입력 재현 |
| 벽/엄폐 우회, 몸 반경, 도달 불가 목표, 경로 갱신 제한, 경비 처리 순서 | global: Navigation / unreachable / bounded rate / array order |
| Tilt 계산·Calibration·Recenter·대각선·실제 속도·센서 중단·앱 복귀·입력 배타성 | tilt: 15건 |
| Mission/진행 저장/Whistle Sound/UI/Cadence | playable + maps |
