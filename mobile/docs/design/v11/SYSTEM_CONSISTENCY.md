# V11 — 공통 시스템 조사와 Phase B 계약

상태: **조사·설계만 완료 / 수정 전**. 이 문서는 버그 수정 결과가 아니다. 파일 경로는 `mobile/` 기준이며 Phase A에서는 런타임/UI/API를 변경하지 않는다.

## 1. Escape Timer 누락의 실제 원인

### 서로 다른 두 원인

1. `src/ui/VisualPlaygroundScreen.tsx`의 `phaseHud`는 `definition.chapter===1 && phaseInfo.phase!=='STEALTH' && !completed`에서만 렌더링된다. Chapter 2–9는 같은 phase 데이터를 받아도 지속 상태 HUD를 그리지 않는다. 짧게 표시하는 THEFT/PLAYER SPOTTED/CAMERA ALERT 배너는 이 조건 밖에 있어, 순간 배너는 보이는데 지속 상태는 없는 차이가 생긴다.
2. `src/game/guards/guardPhase.ts`의 `MUSEUM_LOCKDOWN_SECONDS`에는 `01-07/08/09=28초`, `01-10=20초`만 있다. 나머지 56개 미션은 `lockdownDuration=0`이다. HUD 조건만 제거해도 다른 챕터에는 카운트다운 값 자체가 생기지 않는다.

현재 숫자의 의미는 **발각 후 탈출 실패 제한시간**이 아니라 **확정된 도난 경보 뒤 봉쇄 압박까지 남은 시간**이다. 시작점은 `theftActivatedAt`. 실제 Player sighting은 별도 사건이다. 0초가 되어도 자동 CAUGHT가 되지 않는다. `guardPhase.ts`도 countdown은 guard pressure만 바꾸며 capture/exit는 독립이라고 명시한다.

사용자 관찰인 “Theft 뒤 Spotted에서 Museum 타이머가 보인다”는 유효하지만, 현재 코드의 타이머 시작 원인은 Spotted가 아니다. Pickup/도난 발견/실제 발각을 합쳐 하나의 사건으로 수정하면 안 된다.

### 제안할 공통 규칙 — 승인 대기

- 모든 챕터에 STEALTH / THEFT ALERT / PLAYER SPOTTED / SEARCH / RETURN을 동일한 우선순위와 HUD로 표시한다.
- 타이머 명칭은 **LOCKDOWN IN / 봉쇄까지**로 유지한다. 새 사망 타이머를 만들지 않는다.
- 모든 90개 설계 미션에서 확정된 `THEFT_ALERT` 시 한 번 시작하고, Spotted→Search→Spotted로 바뀌어도 초기화하지 않는다. 도난을 아직 발견하지 못한 단순 Pickup/Spotted는 시작 조건이 아니다.
- 기본 제안 시간은 **28초 공통**. Chapter 난이도를 줄어드는 시간이나 빨라지는 추격으로 만들지 않는다. 기존 01-10의20초를28초로 통일하는 것은 현재 대비 게임플레이 변경이므로 Phase B에서 명시적으로 승인하고 비교한다. 이 문서 작성만으로 적용하지 않는다.
- 시간이 끝나면 LOCKDOWN ACTIVE를 표시하고, 미리 작성한 자기 섹터의 수색 계획만 사용한다. Chapter 난이도는 섹터 범위/합류 지점/우회 경로로 만든다. 전 경비가 동시에 출구 한 점을 막거나 Player의 숨은 좌표를 받아서는 안 된다.
- CAUGHT/CLEAR/Retry 때 HUD를 정리하고 새 미션에서 초기화한다. 메뉴/광고/일시정지 시간은 게임 시계와 동일하게 멈춘다. 결과 화면에서 타이머를 계속 표시하지 않는다.
- highSecurity 목표의 기존1.5초 pickup alarm은 실제 보안장치에 붙은 데이터 속성이다. 02-10/03-10만의 난이도 순번 보너스로 확대하지 않는다. 경보 자체는 Player 좌표를 생성하지 않는다.
- 28초 값은 **초기 설계 제안값**이며 실기기 균형 검증값이 아니다. 숫자 승인과 실제 플레이 검증을 분리한다.

## 2. 실제 구현과 제안의 구분

| 시스템 | 현재 코드 증거 | V11 계약 / 필요한 변경 | Phase A 결과 |
|---|---|---|---|
| Theft fact | `guards/theftAlert.ts` recordTheft: empty case 실제 목격 또는 highSecurity alarm | 도난 사실과 Player sighting 분리. hidden Player LKP 금지 | 읽기만 수행, 보존 |
| Spotted 우선순위 | `guards/guardPriority.ts` hasPlayerAlert; theftAlert의 already pursuing 분기 | Chase/Search를 낮은 Theft 상태가 덮지 않음 | 보존 |
| CCTV sighting | `security/cctv.ts` suspicion full일 때 Global LKP; 보이는 동안 갱신 | CCTV V9 값/속도 유지, LOS를 끊으면 마지막 목격 좌표 | 보존 |
| 지속 phase HUD | `ui/VisualPlaygroundScreen.tsx` chapter===1 조건 | 챕터 조건 제거 후 모든 챕터 동등한 상태 표시 | **미수정 버그** |
| Timer 데이터 | `guards/guardPhase.ts` Museum 4미션만 | 위 공통 타이머 계약으로 통일 | **미수정 불일치** |
| 순간 Alert 배너 | phase HUD 밖의 theftRevision/spottedWhistleRevision/cameraAlertRevision reaction | 모두 같은 배너/우선순위, 중복 재생 방지 | 현재 공통; 런타임 재확인 필요 |
| Pickup | treasureAcquired: secured/treasureRevision, cyan flash/성공 Haptic, ESCAPE TO THE EXIT | 모두 같은 획득 피드백, 챕터별 objective 명칭만 다름 | 현재 공통; 실기기 확인은 별도 |
| Exit / CAUGHT | playground mission state와 shared core, complete/caught RN reactions | 보물 없이 CLEAR 금지, 접촉 CAUGHT, 시간0 자동실패 금지 | 공통 계약 보존 |
| Search 시간 | `guards/guardSystem.ts` roles가 있으면9초(봉쇄12초), **02-10 예외4초** | map ID 대신 같은 search controller+명시한 계획. 예외 통합 영향은 별도 회귀 검사 | 불일치 기록; **AI 수정 없음** |
| Direct Chase speed | `guards/guardChaseSpeed.ts` 02-*178; 나머지 runSpeed=150×1.12=168 | 이번 패스에서 기존178/168 고정. tier별 증가/새 예외 금지. 엄밀한 속도 통일까지 원하면 별도 승인 | 이미 존재한 차이 기록; **속도 수정 없음** |
| Theft 역할 주입 | `playground/playgroundState.ts` chapter1 / 02-10 / authored posts·sectors 조건 | 90개 모두 authored responsibility/sector 계획을 갖고 같은 dispatcher 사용 | 데이터 완비 필요 |
| World boundary | `playground/playgroundState.ts` playableBoundary가chapter1에만 생성 | 다른 챕터 wall/collision 안전 여부를 조사. chapter gate 차이 자체만으로 충돌 버그 단정 금지 | 기술 차이 기록, 미수정 |
| Title source | 이후 챕터 JSON title과 catalog/chapterArt title 별칭 존재 | 런타임 ID가 안정 식별자. Blueprint는 JSON title을 현행으로 기록; 명칭 통일 별도 목록 | 신규 미션을 기존 미션으로 잘못 표시하지 않음 |

## 3. Phase B 시스템 수정의 최소 범위

1. 공유 phase HUD의 chapter gate를 제거하고 상태 우선순위/결과 가림 조건을 공통화한다.
2. `MUSEUM_LOCKDOWN_SECONDS`의 미션별 매핑을 승인된 공통 규칙으로 교체한다. 타이머 생성을 HUD에 떠넘기지 않는다.
3. timer-driven pressure가 없던 Chapter 2/3에 봉쇄가 추가되는 만큼 maps의 sector/escape/first LOS break를 함께 검증한다. 단순 전체맵 `28` 적용 후 PASS 선언 금지.
4. Search duration의02-10예외를 유지/제거할지 명시적으로 검토한다. AI core rewrite와 추격속도 수정은 하지 않는다.
5. 모든 미션의 도난 수색 역할/회로는 Player 데이터와 무관하게 작성한다. 기존 dispatcher/travel/pursue를 재사용한다.
6. 핵심 맵은 구조 설계부터 승인한 후 바꾼다. 먼저 타이머만 생기게 해 놓고 difficulty가 더 나빠진 상태를 완료로 처리하지 않는다.

## 4. Phase B 공통 회귀 증거

각 Chapter 대표 미션에서 동일하게 기록:

- Pickup → 아직 empty case 미발견: theft=false, Player 위치 공유 없음, timer 미시작.
- Empty case 발견 / highSecurity alarm → theft=true: timer 시작, authored sectors에 이동, 보이지 않는 Player 좌표 없음.
- Theft 전후 실제 Guard sighting / CCTV detection full → PLAYER SPOTTED / Direct Chase / 올바른 LKP.
- LOS break → 마지막 LKP 도착 → SEARCH → RETURN. 재발각이 타이머를 리셋하지 않음.
- 같은 phase에서 Chapter 1/2/3/미래 챕터 모두 같은 HUD가 보임. safe area/배너 중첩은 Debug OFF 실제 캡처.
- Timer0 → LOCKDOWN ACTIVE, 게임 계속 진행; Objective→Exit CLEAR 가능; Guard 접촉 CAUGHT; Retry 초기화.
- 이미 Chase BGM인 상황에서 Spotted 재요청/검색 복귀/광고 pause/scene switch에도 disposed audio 참조 없음. 음량/음원 변경 금지.
- Tilt/Wall Slide/locomotion/loading/monetization은 보호 목록. 자동 검사와 Simulator/실기기 결과를 별도 기록.

## 5. 현재 증거의 한계

V10.1 기록에 실제 Simulator9개 시도/0CLEAR가 있다. 이는 자동화 한계까지 포함하며 불가능한 맵이라는 뜻이 아니다. V11 Phase A에서 native full-heist를 새로 완료한 적은 없으며, 타이머를 새로 고쳤다고 보고하지 않는다. 정적 원인 확인은 완료했고 실제 수정·회귀는 Phase B 검토 뒤 수행한다.
