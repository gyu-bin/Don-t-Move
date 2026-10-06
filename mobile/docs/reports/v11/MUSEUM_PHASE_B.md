# V11 Phase B — Museum 변경 및 검증

상태: **IMPLEMENTED — NATIVE PLAYTEST PENDING**

## 범위와 보호

`applyV11Museum`는 V9/V10 적용 뒤 호출하는 순수 authoring overlay다. 절대 좌표를 사용하며 두 번 적용해도 데이터가 누적되지 않는다. 입력 객체를 수정하지 않는다.

- 수정: 01-01, 01-04, 01-05, 01-08, 01-10.
- 01-03은 TUNE 검토 후 유지했다. 두 Guard / CCTV 없음 / 기존 좁은 통로의 radius18 경로가 유효하다. 실제 Tilt 불편함은 확인되지 않았으므로 임의의 추가 cover 또는 통로 변경을 하지 않았다.
- KEEP: 01-02, 01-06, 01-07, 01-09. 다른 Chapter는 함수가 입력 참조를 그대로 반환한다.
- Entry, Objective, Exit 좌표 및 조건, 기존 props/dressing/lights, Guard 수/속도/시야 범위/시야각, CCTV 감지율/회전속도를 유지한다.
- 기존 01-08 reaction delay 0.85s는 core 값이며 이 overlay에서 변경하지 않는다.

## 미션별 공간 변경

| Mission | 이전 문제/의도 | 적용 |
|---|---|---|
| 01-01 | 입문 전시실에서 inspector가 멈춰 보는 방향과 기다림을 읽기 쉽게 한다. | g2 첫 전시 stop의 north look / 2.4s wait. serialized `patrolPlan`의 `diamond-door`도 반영하여 compiled patrol이 실제 2.4s를 사용한다. |
| 01-03 | 좁은 Archive의 통로 선택을 보존한다. | 변경 없음. 추가 cover로 Tilt 통로를 줄이지 않는다. |
| 01-04 | 보물 뒤 북쪽 문으로 직행하면 동일 경비의 시야를 계속 받는다. | Gate 동쪽에 outbound inspection bay(x16–19, y5–8), 남쪽 연결(x14–16, y7–8), 북쪽 return(x17–18, y2–5 및 x14–18,y2–3)을 만든다. 기존 x15/y4–6 opaque wall이 시야를 끊는다. 짧은 북쪽 직행은 risk 대안으로 유지한다. |
| 01-05 | Theft search가 여러 지역의 공통 anchor를 반복하며 모일 수 있다. | 첫 inspector의 기존 east look/0.8s stop을 유지하고 4명의 지역별 search circuit을 적용한다. 구조를 더 좁히지 않는다. |
| 01-08 | 북쪽 objective와 inspector/CCTV 방향이 중첩되고, 탈출 시 모든 Guard가 같은 종착점을 검색한다. | archive 서쪽 read/relief bay(x9–11,y1–5), south approach(x10–11,y5–8), portal(x11–13,y3–4)을 연결한다. x12/y0–2 및5–6을 opaque shoulder로 닫아 portal을 통한 두 번의 방향 전환을 만든다. g3는 동쪽 inspection circuit(18.5,1.5→18.5,3.2→18.5,6→16.5,6)으로 이동한다. cam1은 위치/감지율/범위를 유지하면서 남쪽 checkpoint를 본다. 5명 search를 access/cross/archive/maintenance/evacuation으로 나눈다. |
| 01-10 | 서쪽 Exit service room이 검색 목적지로 몰리는 것을 줄인다. | 기존 service room의 x6,y22–26을 opaque strip으로 분할한다. 북쪽 y21과 남쪽 y27을 연결해 양쪽 우회를 유지한다. 서쪽은 evacuation refuge, 동쪽은 g5 inspection이다. g5 patrol/search를 x10.25–10.75의 동쪽으로 옮기며 나머지 5명은 각 기존 zone circuit을 검색한다. Exit(1.6,25)는 유지한다. |

`safeZones`는 authoring/검증용 대기점이다. 감지 면역을 추가하지 않는다. 새 bay의 보호는 실제 compiled opaque wall에 의해서만 발생한다.

## 경로와 First LOS Break

- 01-04: objective(13.7,7.3) → 남쪽 shoulder(14,7.6) → 동쪽 연결(16.5,7.6) → bay(18,7.3) → north return(18,3) → 기존 Exit. radius18을 위해 y7.3 직선 대신 남쪽 shoulder를 사용한다.
- 01-08: objective → (13.5,3) → portal(13.5,3.75) → 서쪽 bay(10.5,3.75) → read pocket(10.5,1.8) → south connection(10.5,7.5) → control cross(11,9.5→13,9) → 기존 maintenance/evacuation escape. 벽 가까운 x13 대신 x13.5 shoulder를 사용한다.
- 01-10: 기존 sanctuary 첫 시야 차단과 cloister escape를 유지한다. service room 진입 뒤 서쪽 Exit와 동쪽 inspector 사이의 새 opaque strip이 추가 분리를 제공한다. first break를 최종 Exit까지 지연시키지 않는다.

실제 compiled ray 검증:

| Mission | Guard/inspection ray 시작 | Refuge | Vision ray |
|---|---|---|---|
| 01-04 | (14.2,4.8) | (18,7.3) | BLOCK |
| 01-08 | (18.5,1.5) | (10.5,1.8) | BLOCK |
| 01-10 | (9,25) | (3,25) | BLOCK |

이 세 ray 결과가 모든 시간/방향에서 완전한 안전을 보장하지는 않는다. Guard가 직접 다른 입구로 들어오면 정상적으로 발견할 수 있다.

## 검증 결과

`node --import tsx --test tools/campaign/v11Museum.test.ts`: **7 tests PASS**.

검증 범위: 모든 보호 미션 입력 동일성, 순수성/멱등성, Guard/카메라 tuning 유지, 실제 compiled radius18 route leg, Guard patrol/search anchor 도달, semantic patrol 적용, opaque ray, 실제 공유 게임 runtime의 scripted full-heist CLEAR.

Frozen 비교 입력은 `Reports/V11B/campaign-before.json`. evidence는 `Reports/V11B/museum-targeted-runtime-telemetry.json`에 기록했다. 일반 입력/프레임 루프만 사용하며 보물·Guard·Alert·CLEAR 상태를 강제로 변경하지 않는다.

| Mission | Input | Before | After | Pickup / Theft / End (After, sec) |
|---|---|---|---|---|
| 01-04 | safe0, escape0, Sneak, 시작 대기2s | CAUGHT 24.78s | CLEAR 27.82s | 23.57 / 24.60 / THEFT_ALERT |
| 01-05 | route0, escape0, Walk, 대기3s | CLEAR 27.88s | CLEAR 27.88s | 20.00 / 미발동 / STEALTH |
| 01-08 | route0, escape0, Sneak, 대기3s | CAUGHT 29.23s | CLEAR 37.40s | 24.62 / 35.15 / THEFT_ALERT |
| 01-10 | route0, escape0, Sneak, 대기3s | CLEAR 39.53s | CLEAR 39.53s | 28.55 / 미발동 / STEALTH |

01-04는 Pickup 후 첫 all-Guard-unseen 시점이24.40s, position(14.21,7.60). 같은 입력의 기존 escape에서는 이 시점 전에 first break가 없어 24.62s Player Spotted 뒤 capture됐다. 01-08은 동쪽 inspector의 현재 위치/방향 때문에 Pickup 시점에 all-Guard-unseen이 되었으며, 실제 서쪽 bay의 벽 차단은 별도 ray/경로 검사로 검증했다.

01-05/01-10의 이 witness에서는 empty case가 발견되기 전에 탈출한다. 따라서 이 두 CLEAR만으로 theft search 분산의 체감을 검증했다고 주장하지 않는다. 실제 Theft → Spotted → LOS break → Search native playtest 및 Screenshot Gate는 별도 최종 QA 항목이다.

## 제한

- 공유 TypeScript game engine evidence는 Simulator 화면/실제 iPhone Tilt 증거가 아니다.
- native full heist, 시각적 자연스러움, 압박 체감, chapter pressure ordering을 이 문서에서 PASS로 선언하지 않는다.
- 기존 frame rate, collision, LOS 및 AI는 수정하지 않았다.

정적 검사: 이 두 파일의 ESLint PASS. `tsc --noEmit -p tools/campaign/tsconfig.json`는 `v10BoundedReplay.ts`의 기존 `attempts` implicit any(TS7034/TS7005) 때문에 FAIL. Museum overlay/test의 TypeScript 오류는 없다. 이 제한을 전체 typecheck PASS로 바꾸어 보고하지 않는다.

## Patrol 실측 회귀 수정

최초 g5 동쪽 patrol의 x9 복귀선이 기존 partition(8,25.5)의 footprint를 가로질렀다. anchor 도달 검사만으로는 직접 이동하는 patrol segment의 중간 충돌을 잡지 못했다. g5를 x10.25–10.75,y22.5–28의 동쪽 검사 strip으로 옮겨 해결했다. Props를 줄이거나 AI collision 규칙을 변경하지 않았다.

추가 test는 수정한 5개 미션 각각 180초·60Hz의 모든 Guard 위치를 확인한다. 일반 patrol 및 empty-case-discovered search 두 시나리오에서 blocker 겹침 **0 frames**. search 시나리오는 off-map Player/empty-case 초기 조건을 명시적으로 구성한 isolated guard test이며 실제 보물 획득 플레이를 대체하지 않는다.

01-05 첫 wait 2.2s는 기존 route1/Sneak/delay0의 pickup 흐름을 깨뜨려 0.8s로 복원했다. 같은 정상 입력은 CLEAR50.8s를 회복했다. 기존 acceptance assertion을 약하게 변경하지 않았다.

## 기존 Runtime CCTV escalation witness 갱신

지도 변경 뒤 기존 01-08 `main route0 / escape0 / Walk / departure0`는 Search 전이를 더 이상 실행하지 않았다. gameplay 또는 assertion을 변경하지 않고, 최대126개로 제한한 route/mode/delay 조합 탐색에서 19번째 입력을 채택했다: **main0 / escape0 / Run / departure3s**.

실제 공유 runtime trace:

- Pickup 8.7167s.
- THEFT_ALERT 16.10s.
- PLAYER_SPOTTED 17.05s, source `01-08-g4`, 실제 sees=[g4], Player(3.13,11.34).
- SEARCH 17.10s, 실제 sees=[], Player(3.09,11.53).
- 이후 g4가 다시 보고 18.40s capture.

`museumRuntimeCctvQA.ts`의 escalation 입력/comment만 변경했다. Runtime stage source parity, 실제 camera source, 모든 기존 assertion을 유지한다. targeted `museumRuntimeCctvQA.test.ts` **5/5 PASS**, 해당 파일 ESLint PASS. 이는 일반 입력을 통한 transition 증거이며 Simulator/실기기 PASS 선언은 아니다.

## 최종 root 검증 갱신

기존 `v10BoundedReplay.ts` attempts 배열의 타입을 명시하여 implicit-any만 해결했다. Runtime/입력 행동 변경 없이 최종 app 및 campaign-tools TypeScript 모두 PASS. 최종 전체 npm test exit0, campaign213/213PASS. Native8개 시도는 Full-Heist CLEAR증거0/8; 최종 acceptance는 `docs/design/v11/phase-b/RESULTS.md`의 PENDING상태를 따른다.
