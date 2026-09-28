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
| 25–50% | Patrol 속도 감소, 마지막으로 실제 본 위치를 확인 (Facing/Cone 일치) |
| 50–75% | Patrol 중단, 개인 Suspicion LKP로 느리게 접근 (기존 Navigation 재사용) |
| 75–99% | 같은 개인 LKP를 더 적극적으로 조사. 숨은 현재 좌표는 추적하지 않음 |
| 100% | `? → !` 완전 발각 |

## 17. Suspicion Decay

100% 전에 시야에서 벗어나면 상승이 즉시 멈춘다. 50% 미만은 약 0.5초의 기억 시간 후 기존 속도로 감소한다.
V2의 50% 이상 조사에서는 개인 LKP 도착 후 1.5초 주위를 확인하고 감소한다. 0%가 되면 `?`가 사라지고
Navigation으로 중단했던 Patrol/Roaming 지점에 복귀한다. 실제로 재발견할 때만 LKP를 갱신한다.

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

Vertical Slice 장소 확장에서는 아래 Diamond 규칙을 각 Stage의 Valuable/Objective에 동일하게 적용한다.
판정·획득 반경·Exit 활성 조건은 변경하지 않는다. 화면 문구는 `OBJECTIVE ACQUIRED` / `OBJECTIVE SECURED`이며,
획득 전 HUD에 목표물 이름을 표시한다. 그림·프로토타입·케이스·데이터 장치는 기존 환경 에셋을 재사용한 임시 아이콘이다.

- Diamond 획득 전에는 EXIT가 비활성이다.
- Diamond에 접근하면 `DIAMOND ACQUIRED`가 뜨고 Exit가 활성화된다.
- Diamond를 가진 채 Exit에 도달하면 **MISSION COMPLETE**다.
- Stage 01부터 순서대로 진행하며 Clear한 다음 Stage를 로컬 진행도에 저장한다.
- Alert / Chase / Search 여부와 무관하게 Diamond + Exit 진입이면 성공한다. 같은 프레임의 접촉보다 Exit 진입을 먼저 확정하며, 이미 CAUGHT가 된 플레이는 되살리지 않는다.
- Stage 10 탈출은 **CHAPTER COMPLETE**다. Retry는 현재 Stage를 처음부터 재시작한다.
- Clear Time, Alerts(Whistle 횟수), Stage별 Best Time 및 Clear 상태를 로컬 저장한다. Settings의 Stage Select는 Clear한 Stage와 다음 Stage까지 허용한다.
- Diamond 획득은 Cyan flash / Haptic / 효과음 / 1초 문구, 이후 작은 DIAMOND SECURED 상태와 탈출 안내를 표시한다. 실제 접촉에는 Red flash / Haptic을 표시한다.
- V3에서는 보물 획득만으로 순찰 대기·주시·속도를 변경하지 않는다. 실제 빈 Case 발견 후 도난 경계가 시작된다.
- Patrol은 Loop / PingPong / WaitAndLook, waitDuration / lookDirection / turnDuration을 데이터로 지정하며 정지 후 회전하고 다음 구간으로 이동한다. Facing 단일 규칙을 유지한다.
- V2 Roaming은 등록된 Patrol Points 중 현재/직전 지점을 제외하여 근거리·원거리 목적지를 결정론적으로 선택한다.
  A* 이동 → 1~3초 정지/둘러보기 → Turn → 다음 이동. 01–02는 Fixed, 03부터 1/1/1/2/2/2/3/3명을 섞는다.
- 각 Stage 마지막 Guard는 Objective 전담 Fixed Patrol이다. 획득만으로 경보가 생기지 않으며 개인 조사로 유인 가능하다.
- Objective Case는 접근 가능한 장식/상호작용 표시이며 주변 구조물은 Movement+Vision / Movement-only / 장식으로 구분한다.
  획득 후 귀중품과 Cyan Glow는 사라지고 열린 덮개 표시, 빈 Case와 따뜻한 Spotlight는 남는다.

Stage 구조 난이도는 Suspicion Difficulty multiplier와 별개다. Stage 01→10은 맵 크기,
통로 폭, 엄폐, 경비 밀도와 순찰 동선으로 매우 쉬움→가장 어려움 순서를 만든다.
Chapter 1 Guard 수는 2 / 3 / 3 / 4 / 4 / 4 / 5 / 5 / 5 / 6이며 모든 Stage에 Spawn→Objective와
Diamond→Exit 경로, 안전 대기 공간 및 선택 가능한 우회 경로를 둔다.

## 37. 핵심 Risk / Reward

### V3 도난 경보와 역할 순찰

획득만으로 경비 행동이나 정보는 바뀌지 않는다. 빈 Case가 실제 Cone/Range/LOS 안에 들어오면
한 Guard가 멈춰 Case를 확인하고 `! → Whistle → THEFT ALERT`를 발생시킨다. 한 도난당 호루라기는 한 번이다.
THEFT ALERT는 Player Spotted Global Alert와 별개이며 Player LKP를 생성하지 않는다.
경비는 Objective/방/통로/Roaming/후반 Exit 역할에 따라 분산 조사하고 이동 속도는 기본의 1.2배다.
실제로 Player를 보는 순간만 Global LKP를 만들고 기존 Chase/Search/Return으로 연결한다.
추격이 끝나도 도난 경계는 해당 미션에서 유지된다. 케이스 발견 전에 탈출하면 조용한 정상 Clear다.
기존 획득 즉시 escapePatrol 압박은 V3에서 사용하지 않는다. 10개 Stage의 기존 지형/목표/경비 수는 유지한다.
Player 발견 경보의 100% 의심도 조건은 유지하며, 빈 Case 발견 경보는 별도 증거 기반 진입이다.

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

### Museum PATH FIRST 재설계 (V5.2 이후)

- 사용자 요청으로 01-01의 이전 지형/소품 배치를 교체한다. `museumProduction.ts`의 `MUSEUM_PATHS`가 먼저 정의하는 Main/Safe/Risk/Escape 선분을 기준으로 비대칭 공간과 큰 엄폐 구조물을 배치한다. 막힌 설계 선분을 A*로 자동 보정하지 않는다.
- 안전 경로는 입구 관찰 → 큰 전시벽의 서쪽 굴곡 → 조각 전시장 → 기둥 옆 접근. 위험 경로는 중앙 전시실을 가로질러 남쪽에서 Objective에 접근한다. 다이아는 서쪽/남쪽 접근, 동쪽 별도 통로로 탈출한다. 출구는 RIGHT, 다음 미션의 LEFT 진입 연결은 유지한다.
- 새 Museum의 큰 구조물만 `collisionScale`을 명시해 그림 배율과 이동/시야 차단 크기를 맞춘다. 생략된 다른 미션의 충돌 크기는 종전과 같다. 다른 44개 StageDefinition은 해시로 보존한다.
- Guard A는 입구/주 전시실, B는 조각/Objective의 의미 있는 Anchor를 순찰한다. Guard AI와 미션 규칙은 변경하지 않는다.
- HOME은 직전 166 기준에서 216(+30.1%)으로 확대, 왼쪽 중상단에 놓고 중앙 하단 메뉴와 수직으로 분리한다. 큰 글자는 제한된 메뉴 영역 안에서 스크롤할 수 있다.
- 자동 경로/연속 이동 통과는 실기기 재미/가독성 승인과 다르다. 최종 승인에는 실제 iPhone Tilt 평가가 필요하다.

### V5.2 — Exit 안내 / Museum 의미 순찰 / HOME

- 획득 후 실제 exitPosition과 카메라로 Exit 안내를 계산한다. 화면 밖은 가장자리 방향, 화면 안은 작은 EXIT/활성 출구 강조. 획득 전과 완료/CAUGHT 후에는 안내를 숨긴다. 미션 성공 조건과 출입구 연속성은 변경하지 않는다.
- Museum 01-01은 `semanticPatrol.ts`의 추가 순찰 계획을 사용한다. A 입구 / B 회화 / C 조각 / D 주 전시실 / E 다이아 / F 출구를 구분하고, Guard A는 A/B/D, B는 C/D/E의 명시적 Anchor만 방문한다. 기존 45개 baked StageDefinition, 지형, Objective/Exit, Guard 수/속도는 보존한다.
- Anchor 간 이동은 A*로 벽을 우회한다. 도착 후 0.8–2.5초 확인과 점진적 회전. Controlled Roaming은 담당 Anchor 목록에서 직전 방문 제외 및 짧은/긴 이동을 선택한다. 현재 Museum은 예측 가능한 Fixed tour다.
- 4초간 남은 경로 진전이 없으면 목적지를 20초 제외하고 다른 도달 가능한 Anchor로 재계획한다. 순간이동하지 않는다. 개인 조사/전체 경보 중 Anchor 선택은 중단하고 종료 후 도달 가능한 가까운 Anchor로 복귀한다.
- HOME은 Player를 기준 크기 대비 약 20% 확대하고, 안전 영역/화면 비율을 공유하는 좌측 클립과 메뉴 경계를 사용한다.

### ✅ 구현 완료
§5–36: 개별 시야/의심도와 전체 경보, 공유 LKP, CHASE/INVESTIGATE/이동 SEARCH/RETURN, 접촉 CAUGHT 및 Retry, Chapter 1의 10 Stage Diamond→Exit 미션과 로컬 진행·Clear·Best Time 저장. Whistle 동작 뒤 임시 오디오가 1회 재생되고 Global Alert가 이어지며 Sound OFF를 존중한다. 불변식 A–K는 관련 자동 테스트로 검증한다.

V2 Stage는 22×21 / 23×22 / 22×23 / 26×22 / 27×23 / 29×25 / 33×27 / 28×24 / 36×32 / 39×34 tiles다.
기존 V1 원본은 `prePolishStages`로 보존한다. 실제 바닥 면적은 22–27% 감소했으며, 경로·안전 공간·목표물 접근을 확보한 뒤
테마별 충돌 구조물을 추가한다. 크기만 바꾼 bounds가 아니라 layout과 모든 게임 좌표가 함께 변환된다.
순서: Museum / Art Gallery / Bank / Lab / Casino / Mansion / Warehouse / Security HQ / Black Site / High Security Vault.
장소별 floor/wall/carpet 팔레트, 조명과 Objective를 StageDefinition으로 선택한다. 01–02는 입문, 03 은행 우회로,
04 중앙 연구실 Ring, 05 개방형 테이블 경로, 06 다중 방, 07 긴 화물 통로, 08 보안 구역, 09 비정형 복합 구역,
10 대형 금고 단지다. Safe/Risk/탈출 경로와 Patrol은 개별 데이터다. Best Time과 최소 Alerts 및 Clear 상태를 로컬 저장한다.

Player RIGHT Walk는 개발 빌드에서만 미승인 fullbody-v1 후보를 시험한다. 해당 Walk만 추정 보폭 54.344 units/cycle,
속도 72 유지, 실제 이동거리 누적 재생이다. 다른 방향/동작 및 production 에셋은 보존한다. 접지/전신 움직임은 미승인이다.
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
| V2 Navigation 조사/유인/개인 LKP/복귀, Roaming 목적지 전체 조합 | global: `stealthV2.test.ts` (기존 Navigation 없는 primitive 테스트도 유지) |
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

## Campaign Expansion V1 — 9 Chapters × 5 Missions (2026-09-25)

이 절은 기존 10 Stage의 선택/진행 구조만 대체한다. 위 이동·시야·Suspicion·도난 경보·CAUGHT·Objective/Exit 규칙은 변경하지 않는다.

- Runtime은 `campaignStages.json`의 45개 독립 StageDefinition을 사용한다. `tools/campaign/blueprints.ts`는 개별 구조 원본, `buildCampaign.ts`는 오프라인 배치 도구다. 앱 시작 중 맵 제작/A* 배치 작업을 하지 않는다.
- Chapter: Museum / Art Gallery / Bank / Lab / Casino / Mansion / Warehouse / Security HQ / High Security Vault. Black Site는 Security HQ의 마지막 미션에 통합한다.
- Chapter마다 Introduction → Variation → Investigation → Alert pressure → Challenge의 5개 미션. ID는 `01-01`부터 `09-05`다. Guard AI 및 난이도 계수는 그대로 두고 구조·엄폐·순찰 조합으로 변화를 준다.
- 개발 빌드는 45개 전체 선택 가능. Release는 기존 기록과 클리어에 따른 순차 해금을 적용하며 개발 전체 해금 상태는 저장하지 않는다.
- HOME Continue는 마지막 진행 미션, Clear의 Next는 다음 미션, Retry는 현재 미션이다. `campaign.version=1` 기록에 Clear/Best Time/Alerts를 ID별로 저장한다.
- 기존 저장 키와 10개 Stage의 원본 기록을 보존한다. 같은 장소의 첫 미션으로 이전 기록을 연결하며 Black Site는 `08-05`, Vault는 `09-01`로 이관한다. `legacy` 표시는 구 맵 기록이며 새 맵의 시간과 경쟁시키지 않는다. 새 미션을 실제 클리어하면 새 기록으로 갱신한다.
- Objective 주변 경비는 1명, 나머지는 분산된 Room/Corridor/Roaming/Exit 구역을 담당한다. Case는 실제 관측될 때만 도난 경보를 낸다. 획득 즉시 위치/도난 정보를 공유하지 않는다.
- 45개 경로/순찰/Case 관측/실제 이동 탈출/경보 중 Clear는 `test:campaign`으로 확인한다. 탈출 창 검사는 Case 도착 이후의 연속 이동 검증이며 Spawn부터 완벽한 무경보 플레이 해법을 증명하지 않는다. 재미·난이도·60 FPS는 별도 실기기 평가가 필요하다.
- 기존 Player RIGHT Walk 후보는 미승인 테스트 상태를 유지한다. Guard는 LEGACY 정지 방향 에셋이며 sliding 미해결. Release의 미승인 캐릭터 에셋 검출을 우회하지 않는다.

## Production Polish V5 — Museum 기준 맵 (2026-09-26)

- 01-01만 개별 배치로 재설계한다. 원본은 `tools/campaign/museumProduction.ts`; 다른 44개 StageDefinition은 해시 검사로 보존한다.
- 왼쪽 입구 → 회화 통로/중앙 전시실의 선택 → 조각 구역/동쪽 통로 → 다이아 방 → 오른쪽 출구. 01-02의 왼쪽 입구와 연결한다.
- Guard 2명은 중앙 전시실과 Objective 쪽에 분산한다. 기존 Suspicion/도난/추적 규칙과 이동속도는 바꾸지 않는다.
- 안전 경로는 길고 벽·조각 엄폐를 사용한다. 위험 경로는 짧고 순찰 타이밍을 선택한다. 두 경로 모두 실제 연속 입력으로 획득/탈출을 검증한다.
- HOME Player는 작은 왼쪽 여백 레이어로 전환하여 메뉴 영역과 분리한다. 원화와 Intro는 보존한다.
- Player/Guard의 새 RIGHT Walk는 AutoSprite 서비스 생성 거절로 아직 미제작이다. 기존 후보·LEGACY 에셋을 유지하며 최종 애니메이션 완료로 보지 않는다.
