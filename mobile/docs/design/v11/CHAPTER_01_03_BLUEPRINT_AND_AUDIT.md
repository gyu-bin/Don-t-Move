# V11 — Chapter 01–03 Blueprint + Current Runtime Audit

## 범위와 증거 수준

Phase A 설계 문서. `mobile/src/game/levels/stages/campaignStages.json`의 현재 30개 미션과 기존 V5/V9 설계, V10.1 압박 측정 및 전체 heist 증거를 대조했다. **이 문서 작성으로 runtime/JSON/AI/UI는 변경되지 않았다.** 좌표는 stage의 tile 좌표(x 우측, y 아래)이며 Unity meter가 아니다. `현재`는 JSON/evidence에서 읽은 값, `제안`은 승인 후 Phase B에서 nav/LOS/native 검증할 설계다. Opaque prop 근처 좌표만으로 LOS break나 안전을 확정하지 않는다.

KEEP 는 구조 보존 결론이고 실제 EASY/실기기 통과 선언이 아니다. 이 audit 에서 FULL REBUILD 를 남발할 근거가 없다. 목적이 있는 현재 architecture 를 버리지 않고 실제 약점이 발견된 Objective/escape 만 부분 재구성한다. Phase B 에서는 before/after 같은 카메라 screenshot 과 관찰된 플레이 결과를 같이 저장한다.


### 현재 의미 SHA256의 계산 방법

각 미션의 현재 stage 객체를 Python `json.dumps(stage, sort_keys=True, separators=(',', ':'), ensure_ascii=True)`로 직렬화하고 UTF-8 bytes의 SHA256을 계산했다. 이 방식은 `RUNTIME_BASELINE.json`에 기록한 **현재 데이터 의미 해시**와 동일하다. 키 순서와 파일 들여쓰기에는 영향을 받지 않지만, 배열 순서와 값은 보존한다. JavaScript의 정렬 없는 `JSON.stringify` 해시나 V101 도구 내부의 개별 해시와 혼용하지 않는다. 아래 해시는 V11 제안 맵의 해시가 아니며 Phase B의 미수정 기준점이다.

## Chapter difficulty budgets (Phase B 목표, 측정 PASS 아님)

| Chapter | Tier / 장면 목표 | 공간 보안 예산 | 경비/CCTV 배치 원칙 | Timing / refuge 원칙 |
| --- | --- | --- | --- | --- |
| 01 Museum | 1 EASY, 기다림→다음 전시로 한 번씩 | 주요 횡단마다 읽어야 할 위협 1개. 좁은 방은 중첩 최소화. Finale도 같은 관찰 박자를 연결 | 현재 2–6명/0–2 CCTV를 수량 목표로 쓰지 않는다. 01-08 북쪽 archive와 crossing의 경계를 분리하고 01-10 출구 집결을 해소 | 입구 관찰 여유 확보. 횡단 전 불투명 대기점, 보물 직후 첫 시야 차단→별도 출구 관찰. 01-08 reaction 0.85s 유지 |
| 02 Gallery | 2 EASY+, 열린 전시 timing crossing | 긴 LOS 횡단 1–2개를 읽되 양쪽 측면 동시 봉쇄 금지. 유리는 볼 수 있지만 걸어서 통과하지 못하는 구조 | 현재 2–7명/0–2 CCTV. 열린 횡단을 경비/카메라가 번갈아 담당. Finale 7명은 증설 근거가 아니라 완화 검토 대상 | 큰 Gallery screen/조각상만 LOS 대기점. Bench/plinth/glass의 가짜 엄폐 표현 금지. Museum보다 관찰·기다림 선택이 복합적이어도 안전한 관람 공간은 분명하게 표시 |
| 03 Bank | 3 MEDIUM, public→staff→security→asset 층 | 공공/직원 문턱 이후 보안층 2–3개를 차례로 이해. 03-01 직원 출고 검수 탈출 보강 | 현재 2–7명/0–3 CCTV. Camera는 gate/junction/vault 문턱에 설치. 같은 유일 출입구를 guard+camera로 영구 봉쇄하지 않음 | 보안층 사이 records/corner 관찰점. 도난 후 첫 시야 차단→verification/dispatch→출구. 03-10은 사용자 ‘할 만함’ 피드백에 따라 유지 |

공통 정책: Mission10은 규모와 연출의 summary이지 추가 stat tier가 아니다. Guard/Player/chase/CCTV V9 감지/벽slide/센서/audio 변경 없음. 현재 Ch2 chase178 vs others168 및 02-10 search4s 예외는 이번 Phase A에서 건드리지 않으며 공통시스템 consistency 결정 항목으로 상위 문서에 기록한다. Theft는 빈 objective에 대한 지식뿐이고 **실제 sighting 전 global Player LKP 금지**. 물리 route는 body diameter+Tilt margin을 통과해야 하며 Fake Gap0은 실제 DebugOFF frame과 nav의 별도 gate다. 현재 `v5Geometry.ts`의 player body radius9world / Tilt margin radius18world, minimum clear width0.90tile 계약을 보존한다. .90tile는 기술적 최소이며 초급 Tilt 손맛의 추천 폭 인증이 아니다. Bench/low pedestal/small sculpture/plant/low display는 LOS PASS로 취급하므로 첫 LOS break를 이 soft structure 하나에 기대지 않는다.

예산 비교는 guard-area 하나를 weighted score 로 합쳐 PASS 처리하지 않는다. 동일 route-choice/기다림 프로토콜의 chapter 별 pickup/escape exposure, uninterrupted LOS, cover 까지 거리, observed timing window, 실제 CLEAR/CAUGHT 를 별도 비교한다. Chapter 내 flatness 목표는 대략 상대 pressure0.95–1.05의 작은 변동이지만 현 숫자를 그 범위로 normalize 하여 판정하지 않는다. 안전한 대안 존재는 최소 두 관찰 가능한 timing 접근과 정상 whole-heist witness 로 확인한다.

## 현재 evidence 가 말하는 문제

V10.1 independent mean guard coverage Museum/Gallery/Bank=.09729/.05521/.07827, safe-route exposure=.10690/.06210/.07811. Matched continuous whole-heist failure mean=81.042%/76.875%/82.292%. **Museum<Gallery<Bank 달성 아님.** 봇은 intermediate wait 없이 이동하여 높은 실패율을 사람 난이도로 환산할 수 없지만 역전을 area bias 만으로 무시할 수도 없다. Native9회 에서 CLEAR0; waypoint/AX 지연 영향으로 native 실패를 자동 game bug 로 취급하지 않는다. 실제 iPhone Tilt, lying/recenter, 처음 기다림/횡단 hand-feel 은 미검증.

아래 first break 는 기존 prop/corner 를 이용하는 **설계 후보**다. V101 geometric break 는 제한된 sources/phase proxy 이므로 모든 현재 공격자가 보지 못한다는 human-safe 보증이 아니다. 정확 body-clearance 와 sighting break 를 Phase B normal/theft/spotted 각각에서 확인해야 한다.

## 30 Mission audit 요약

| ID | Current title | Decision | Current guards/CCTV | Grounded reason |
| --- | --- | --- | --- | --- |
| 01-01 | Entrance Hall | TUNE | 2/0 | 로비·중앙 조각상·북쪽 관람 recess의 선택을 유지한다. Objective→Exit 5.98tile이고 현재 firstGeometricLosBreak=None이므로 보물 직후의 첫 대기점을 실제 시야 기준으로 확인한다. |
| 01-02 | Main Gallery | KEEP | 3/0 | 중앙 rotunda의 두 조각상 우회→북쪽 collection→동쪽 loggia로 침입과 탈출이 분리된다. 3명/0 CCTV 구조를 보존하되 EASY 체감은 아직 인증하지 않는다. |
| 01-03 | Archive | TUNE | 2/0 | 꺾인 Archive와 선반 끝·Storage 복귀 구조를 보존한다. 2명/0 CCTV의 작은 보안 구성이 적절한 후보이며 좁은 틈과 후퇴 공간은 실제 Tilt로 검증해야 한다. |
| 01-04 | Security Wing | PARTIAL REBUILD | 3/0 | V101 safe exposure .1747, search escape .2513이며 고정 main/safe 12회에서 CLEAR 0이다. 기존 사무실·허브를 보존하고 보물 뒤 직선 탈출에 보호된 대기 공간과 우회 전이를 설계한다. 봇 실패만으로 불가능 판정하지 않는다. |
| 01-05 | Restricted Collection | TUNE | 4/1 | 서쪽 court→동쪽 diamond→북쪽 service의 역L과 두 탈출 선택을 보존한다. Native 2회 CAUGHT와 4명/1 CCTV의 좁은 제한 접근로를 EASY 기준으로 다시 관찰한다. |
| 01-06 | Conservation Lab | KEEP | 3/0 | 두 복원 작업 구역과 동쪽 표본실→북쪽 서비스 동선이 분명하고 낮은 작업대·불투명 screen의 역할이 구분된다. 3명/0 CCTV 구조를 보존한다. |
| 01-07 | Private Gallery | KEEP | 3/0 | 북쪽 현관→서쪽 초상화→남쪽 salon→서쪽 출구의 U 동선에 개인 전시실 서사가 있다. 3명/0 CCTV를 보존한다. Museum lockdown/HUD 차이는 별도 시스템 검토 대상이다. |
| 01-08 | Security Core | PARTIAL REBUILD | 5/2 | 사용자가 보물 주변 두 경비의 압박을 보고했다. g2 교차로·g3 보물 검사·cam1 북쪽 시야가 겹칠 수 있다. V101 approach .3217/search .3975, 고정 3/48 CLEAR다. 교차로를 보존하고 검문과 보물의 관찰 공간을 분리한다. |
| 01-09 | Master Exhibition | KEEP | 4/0 | 계단형 조각 산책로와 동쪽 collection→북쪽 balcony의 별도 탈출을 보존한다. 4명/0 CCTV이며 미션 번호9를 이유로 새 보안을 추가하지 않는다. |
| 01-10 | Grand Heist | PARTIAL REBUILD | 6/2 | 사용자가 출구 쪽 경비 집결을 보고했다. 현재 6명/2 CCTV이고 서쪽 cloister→service 연결에 집결할 수 있다. Native pickup36.98→caught43.05는 탈출 취약성의 관찰이지만 자동화 한계도 함께 기록한다. |
| 02-01 | Front Exhibition | KEEP | 2/0 | 중앙 조각상의 양쪽 우회와 작품 벽으로 이어지는 Gallery 동선이 분명하다. 2명/0 CCTV다. Entry/Exit가 남쪽에 가깝더라도 목표 경유 횡단이 있으며 EASY+ 체감은 실측해야 한다. |
| 02-02 | Portrait Hall | TUNE | 3/0 | Portrait 시각 수정은 유지한다. 긴 spine의 Safe/Risk가 같은 노출 구간으로 합쳐지는지 확인한다. 3명/0 CCTV이고 Objective→Exit의 긴 직선 탈출은 관찰 지점 검증이 필요하다. |
| 02-03 | Sculpture Studio | TUNE | 4/0 | 조각 작업 구역과 북쪽 주문 작품→동쪽 설치 미술의 dogleg을 보존한다. 현재 4명 중 roaming 경비 (14.75,4.75)가 보물 연결로를 담당하므로 기존 세 역할과의 동시 압박을 확인한다. |
| 02-04 | Modern Wing | KEEP | 4/0 | 엇갈린 art wall S와 서쪽 collection→남동쪽 court가 이동식 전시 벽의 정체성을 보여준다. 4명/0 CCTV이며 추가 벽은 필요하지 않다. |
| 02-05 | Collector's Room | KEEP | 4/0 | 개인 collector court·portrait salon→서북쪽 masterpiece→남쪽 service의 U 동선과 역할 분리를 보존한다. 4명/0 CCTV다. |
| 02-06 | Glass Gallery | TUNE | 5/1 | Glass BLOCK/LOS PASS와 중앙 전시섬의 선택을 보존한다. 5명/1 CCTV이며 Native 보물 획득 전 CAUGHT는 입구 관찰 타이밍의 검토 근거다. 유리 뒤를 완전 엄폐처럼 보이게 해서는 안 된다. |
| 02-07 | Curator's Floor | TUNE | 5/1 | 남쪽→서쪽 curator 작업실→북쪽 초상화 교차로의 구조를 보존한다. 5명/1 CCTV이며 동쪽 roaming 경비가 대안 접근로를 지나치게 점유하는지 확인한다. |
| 02-08 | Grand Atrium | TUNE | 5/0 | 큰 atrium의 두 설치 작품과 서쪽 작품 방→남동쪽 복귀로를 보존한다. 5명/0 CCTV다. 낮은 면적 대비 압박을 경비 수로 보정하지 않고 중앙 횡단 타이밍을 검토한다. |
| 02-09 | Private Collection | TUNE | 4/0 | U courtyard와 남쪽 collection→북동쪽 balcony의 구분을 유지한다. V101 objective approach .0343→.1037 상승과 고정 CLEAR 3→5/48 개선이 함께 나타났다. 점수 하나만 보고 성급히 되돌리지 않는다. |
| 02-10 | Masterpiece | PARTIAL REBUILD | 7/2 | 현재 7명/2 CCTV와 highSecurity다. V101 고정 0/48 CLEAR, Native pickup22.88 후 입력 정체가 있었다. Masterpiece 공간은 보존하고 chamber→portrait→exit가 이중 압박의 finale spike가 되지 않도록 대기점과 검색 구역을 정리한다. |
| 03-01 | Public Lobby | PARTIAL REBUILD | 2/0 | Public Lobby와 teller 맥락은 좋지만 Objective (17.5,7)→Exit (20.5,6)가 3.16tile 직통이다. 목표와 teller를 보존하고 직원 출고 검수 탈출 구역만 부분 재구성한다. |
| 03-02 | Teller Hall | KEEP | 3/1 | 긴 teller spine·서쪽 직원 우회·U 탈출이 공공/직원 구분과 counter 업무 동선을 보여준다. 3명/1 CCTV 구조를 보존한다. |
| 03-03 | Staff Offices | KEEP | 4/1 | V5의 여섯 방 office망과 공유 records→audit→dispatch에 목적이 있다. 4명/1 CCTV이고 supervisor 우회와 서쪽 clerk 접근이 실제로 다르다. |
| 03-04 | Records Room | KEEP | 4/0 | 동쪽 intake→ledger bridge→secure audit→북쪽 verification이 좁은 records 공간의 대안을 제공한다. 4명/0 CCTV를 보존하며 MEDIUM 점수를 위해 카메라를 추가하지 않는다. |
| 03-05 | Deposit Boxes | TUNE | 4/1 | Deposit wall의 두 접근과 별도 service 복귀를 보존한다. Native pickup43.85→caught52.85 때문에 도난 후 교차로 관찰을 추가 검증한다. 4명/1 CCTV다. |
| 03-06 | Security Checkpoint | KEEP | 4/2 | Gate 정면과 실제 서쪽 직원 우회→authorization office가 층별 은행 보안을 보여준다. 4명/2 CCTV이며 좁은 gate의 대안 통로를 유지한다. |
| 03-07 | Cash Processing | TUNE | 4/1 | 넓은 현금 작업장은 table/cart/records/loading 업무 구역으로 나뉜다. 4명/1 CCTV다. 낮은 table와 cart의 LOS PASS를 완전 엄폐로 오해하지 않도록 동선 가독성을 확인한다. |
| 03-08 | Inner Security | TUNE | 5/2 | V9 command망과 실제 analysis 우회·별도 동쪽 verification을 보존한다. 5명/2 CCTV와 Native 보물 획득 전 CAUGHT는 관찰 타이밍 검토 근거이며 전면 재설계의 증거는 아니다. |
| 03-09 | Vault Antechamber | KEEP | 5/2 | 보이는 Vault 문과 records 우회·남쪽 service가 실제 보물/landmark 소속에 맞는다. 5명/2 CCTV의 층별 연결 구조를 보존한다. |
| 03-10 | Main Vault | KEEP | 7/3 | 사용자 '할 만함' 피드백을 유지한다. 실제 Vault 안 목표·여덟 zone·두 탈출이 있고 V101 safe index1/escape1/Walk/지연0에서 shared runtime CLEAR77.1s다. 1/48 CLEAR이며 Native CLEAR는 없어 넓은 성공 범위와 실기기 검증은 미완이다. |

## Blueprint — 필수 19필드 + 보충 Main mechanic

V11 §43의 필수 19필드명을 그대로 사용하고, §71의 보고 요구를 위해 Main mechanic을 보충한다. 좌표는 현재 runtime 앵커 또는 명시한 설계 후보다. Safe/Risk 서술은 설계 의도이며 현재 전체 경로는 아래 데이터 참조표에 별도로 기록한다.

### 01-01 — Entrance Hall

**Audit: TUNE.** 로비·중앙 조각상·북쪽 관람 recess의 선택을 유지한다. Objective→Exit 5.98tile이고 현재 firstGeometricLosBreak=None이므로 보물 직후의 첫 대기점을 실제 시야 기준으로 확인한다.

현재 stage 의미 SHA256: `6fb6ba210e3bfdabdb73a3ad7d8dbfb088543b5aded2b4ced6c4730e3982f846`. 현재 guard coverage=0.0868, sampled safe exposure=0.1455, objective approach=0.1951, search approach=0.1861. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-01 |
| Title | Entrance Hall |
| Mission Fantasy | 첫 전시실의 경비를 관찰하고 중앙 조각상을 우회해 작은 다이아를 꺼낸다. |
| Architecture | 서쪽 로비→중앙 전시→북쪽 관람 recess→동쪽 보물방의 짧은 비대칭 루프 |
| Main mechanic | 조각상 뒤에서 기다린 뒤 짧은 전시실 횡단 |
| Main Zones | 로비 관찰 / 중앙 조각 우회 / 북측 recess / 보물방 / 동측 출구 |
| Entry | 현재/기본 유지: (1.75,9.75) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (15,6.5) diamond; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (19.25,8.75) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (4,10) 로비 partition 뒤→(7,10)→상 남측 (9.5,8)→북측 recess (9.5,3)→(13.5,3)→Objective |
| Risk Route | 중앙 전시를 (9.5,8)에서 직접 건너 Objective 로; 북쪽 recess 우회보다 짧고 상의 외측 노출이 큼 |
| Landmark | Grand Statue (7.8,7.5)는 처음 경비와 두 어깨를 읽는 기준; objective Case (15,6.45)는 회수 초점 |
| Security Style | 2명/0 CCTV 유지 후보. 로비 횡단과 보물 검사를 순차적으로 읽게 하고 pickup와 출구를 동시에 봉쇄하지 않는다. |
| Guard concept | 현재: g1 room@(9.7,10.8), g2 objective@(15.6,8); 제안: 2명/0 CCTV 유지 후보. 로비 횡단과 보물 검사를 순차적으로 읽게 하고 pickup와 출구를 동시에 봉쇄하지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | 보물 검사자가 빈 case 확인; 로비 경비는 로비/접속부 검사, 숨은 Player 의 위치를 받지 않음 |
| First LOS Break | Objective (15,6.5)→기존 기둥 (14.5,9.5)의 동남 어깨 후보 (16.2,8.8). 아직 모든 관련 경비 LOS 차단 증명 없음; 도달선과 기둥 footprint 재검증 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 기둥 어깨 대기→(18.5,8.8)→동측 Exit. 짧은 첫 미션이지만 pickup 후 별도 경비 읽기 한 번 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-02 — Main Gallery

**Audit: KEEP.** 중앙 rotunda의 두 조각상 우회→북쪽 collection→동쪽 loggia로 침입과 탈출이 분리된다. 3명/0 CCTV 구조를 보존하되 EASY 체감은 아직 인증하지 않는다.

현재 stage 의미 SHA256: `8f77b068743aee86ef9d6da194c44ee7eaa16f1fc1a349769e8a007a0368d602`. 현재 guard coverage=0.0681, sampled safe exposure=0.0686, objective approach=0.2100, search approach=0.1450. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-02 |
| Title | Main Gallery |
| Mission Fantasy | 중앙 회전 전시장을 관찰해 북쪽 수집품을 가져오고 동쪽 초상화 회랑으로 빠진다. |
| Architecture | 중앙 rotunda 허브 / 북쪽 보물방 침입 / 동쪽 초상화 회랑 탈출 |
| Main mechanic | 두 조각상 사이에서 안전한 우회 방향 선택 |
| Main Zones | Painting Vestibule / Rotunda / North Collection / Portrait Loggia |
| Entry | 현재/기본 유지: (1.6,13) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (15.5,2.6) artifact; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (25.4,13) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | 서쪽 vestibule→(9.5,14.5)→(13.3,14.5)→동쪽 어깨 (17,9)→(13.5,4.7)→Objective |
| Risk Route | (13.5,11)→(13.5,5)의 중앙 직통; 조각 우회 생략 대신 회전 경비 timing 요구 |
| Landmark | statue (11,10.5), (15.4,13.3)가 양쪽 우회; 북 case 가 목표 소속을 표시 |
| Security Style | Rotunda·collection·loggia에 각각 1명, CCTV 없음. 각 방 전이에서 한 위협을 관찰하는 박자를 유지한다. |
| Guard concept | 현재: g1 room@(10,7), g2 objective@(13,2), g3 exit@(19.8,10); 제안: Rotunda·collection·loggia에 각각 1명, CCTV 없음. 각 방 전이에서 한 위협을 관찰하는 박자를 유지한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | Objective 경비는 북측 collection, loggia 경비는 exit approach, rotunda 경비는 연결부 검사 |
| First LOS Break | 북쪽 collection 출입 corner (17,6)→statue (15.4,13.3) 북동 어깨 (17,12); 후보 각도 확인 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 동쪽 어깨→loggia partition (21.5,12.7) 남측 (23,14)→Exit; 서쪽 rotunda 반대 어깨 alternate 유지 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-03 — Archive

**Audit: TUNE.** 꺾인 Archive와 선반 끝·Storage 복귀 구조를 보존한다. 2명/0 CCTV의 작은 보안 구성이 적절한 후보이며 좁은 틈과 후퇴 공간은 실제 Tilt로 검증해야 한다.

현재 stage 의미 SHA256: `5782acb153e2eb7ae9eb630d0391fbdb755e6db6c731cb9e94d03f18cce80931`. 현재 guard coverage=0.1144, sampled safe exposure=0.1259, objective approach=0.2485, search approach=0.1932. Runtime routes=2, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-03 |
| Title | Archive |
| Mission Fantasy | 선반 끝에서 순찰을 읽고 제한 보관실의 분류 문서를 꺼내 뒤쪽 직원 문으로 나간다. |
| Architecture | 꺾인 직원 통로→선반 전시→보관실 / 동쪽 직원 문으로 돌아 나오는 동선 |
| Main mechanic | 선반 끝에서 관찰하고 짧은 통로를 건너는 좁은 공간 잠입 |
| Main Zones | Staff Corridor / Archive Shelves / Storage / Restricted Archive / rear staff door |
| Entry | 현재/기본 유지: (2.5,1.5) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (12.5,8) classified; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (16.5,11.5) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (2.5,5.8)→(5.5,5.8) 선반 끝→(5.5,9.3)→(9.5,9.3)→Storage (11.5,11.5)→Objective |
| Risk Route | 중앙 선반 aisle 를 직접 건너 Restricted Archive; shelf-end 관찰 생략 |
| Landmark | Archive Shelves (7,8): 선반 끝과 보관실 접속이 침입/탈출 교차를 안내 |
| Security Style | 2명/0 CCTV 보존. 좁은 aisle에 서로 반대 방향의 cone이 동시에 머물지 않게 하고 통로 전체를 덮는 새 CCTV는 추가하지 않는다. |
| Guard concept | 현재: g1 room@(7,4.7), g2 objective@(11.6,6.5); 제안: 2명/0 CCTV 보존. 좁은 aisle에 서로 반대 방향의 cone이 동시에 머물지 않게 하고 통로 전체를 덮는 새 CCTV는 추가하지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | Archive 경비는 shelf aisle 재확인, objective 경비는 Restricted Archive/Storage; 같은 좁은 끝에 동시에 모으지 않음 |
| First LOS Break | Objective→(11.5,9.5) Storage corner 후보; 선반 끝의 경비/문 경비 양쪽 LOS 재검증 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | Storage (11.5,11.5)에서 순찰 읽고 동측 staff Exit (16.5,11.5); 끝단 여유 폭을 body+Tilt margin 으로 확인 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-04 — Security Wing

**Audit: PARTIAL REBUILD.** V101 safe exposure .1747, search escape .2513이며 고정 main/safe 12회에서 CLEAR 0이다. 기존 사무실·허브를 보존하고 보물 뒤 직선 탈출에 보호된 대기 공간과 우회 전이를 설계한다. 봇 실패만으로 불가능 판정하지 않는다.

현재 stage 의미 SHA256: `2966ab4f2912daa47aba5d8e7d322b71996fb11998d5b857806d23e728911986`. 현재 guard coverage=0.1613, sampled safe exposure=0.1686, objective approach=0.1682, search approach=0.0606. Runtime routes=2, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-04 |
| Title | Security Wing |
| Mission Fantasy | 보안 사무실에서 교차로를 읽고 검문 사이에 자료를 빼내 북쪽 직원 문으로 빠진다. |
| Architecture | 사무실→허브→세 갈래 교차로 유지 / 검문 북쪽에 별도 탈출 대기 공간 제안 |
| Main mechanic | 교차로와 검문을 차례로 읽고 보물 뒤의 보호된 대기점 이용 |
| Main Zones | Security Office / Hub observation / Junction / Gate inspection / Restricted Passage + 제안 Escape Read Bay |
| Entry | 현재/기본 유지: (1.75,10.25) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (13.7,7.3) data; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (14,1.5) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (6.75,7.75) hub 뒤→(9.5,7.5)→(9.5,5)→(12.5,5) 기존 safe route 를 유지→gate 측면 관찰→Objective; Phase B 에서 safe waypoint 전체 확인 |
| Risk Route | hub 중앙과 gate 직통; 양측 observation bay 생략 |
| Landmark | Security Control Room (6.8,12.5), gate inspection: 단순 computer 장식이 아니라 허브 읽기/접속 기준 |
| Security Style | 현재 3명/0 CCTV 유지 후보. g1의 V101 동쪽 facing을 보존하고 junction 검사와 gate 검사를 공간적으로 분리한다. |
| Guard concept | 현재: g1 room@(8.8,11.8), g2 room@(10,4.5), g3 objective@(14.2,4.8); 제안: 현재 3명/0 CCTV 유지 후보. g1의 V101 동쪽 facing을 보존하고 junction 검사와 gate 검사를 공간적으로 분리한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | Gate 경비는 objective 검사, junction 경비는 hub 재확인; 두 경비가 북측 유일출구를 동시에 sweep 하지 않는 순회 공간 분리 |
| First LOS Break | Objective (13.7,7.3)→gate 측벽 뒤 새 Escape Read Bay. 제안 위치는 기존 (14,5.5) 전후, 현재 walkable/footprint 미확정; 지형 추가 전에 폭 측정 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | bay 에서 wait→(14,3)→북측 Exit; gate 북측 별도 어깨 우회로는 동일 spine 의 위장 safe 가 되지 않도록 연결 검증 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-05 — Restricted Collection

**Audit: TUNE.** 서쪽 court→동쪽 diamond→북쪽 service의 역L과 두 탈출 선택을 보존한다. Native 2회 CAUGHT와 4명/1 CCTV의 좁은 제한 접근로를 EASY 기준으로 다시 관찰한다.

현재 stage 의미 SHA256: `098a47dbe803ff6fd895883c7001254100ec1866f2b6fb3c71a7f172c73dcaee`. 현재 guard coverage=0.0699, sampled safe exposure=0.0636, objective approach=0.2012, search approach=0.0917. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-05 |
| Title | Restricted Collection |
| Mission Fantasy | 제한 수집품 전시장의 가장자리를 타고 보물을 회수해 북쪽 직원 회랑으로 탈출한다. |
| Architecture | 전시장 양갈래→제한 접근로→동쪽 보물방 / 북서쪽 직원 회랑으로 역 L 탈출 |
| Main mechanic | 넓은 전시 우회와 좁은 검문 횡단의 선택 |
| Main Zones | Entry Exhibition / Collection Court / Restricted Approach / Diamond Chamber / Service Gallery |
| Entry | 현재/기본 유지: (1.6,17) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (28.2,5) diamond; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (2.6,2.6) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (11.5,18.5)→(16.2,18.5) 남측 statue→(20,14)→(20,8)→case 어깨 (24,9.5)→Objective |
| Risk Route | (16,14)→(17,9)→(17,4.7)→(24,6), court 와 검문 직통 |
| Landmark | case (26,8.7), statue (18,17.5), screen (17.8,6.9)는 court→검문→보물 cover chain |
| Security Style | 현재 4명/1 CCTV. Court·검문·보물·service의 역할을 분리하며 camera와 검문 경비가 Safe Route 양쪽을 동시에 봉쇄하지 않도록 관찰 공간을 확인한다. |
| Guard concept | 현재: g1 room@(11.5,10.5), g2 corridor@(16,4.2), g3 objective@(25,3.5), g4 exit@(3.5,3.5); 제안: 현재 4명/1 CCTV. Court·검문·보물·service의 역할을 분리하며 camera와 검문 경비가 Safe Route 양쪽을 동시에 봉쇄하지 않도록 관찰 공간을 확인한다. |
| CCTV concept | 현재: cam1@(20.6,3.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | diamond inspection→restricted approach 재확인, service 경비는 해당 wing 부터 시작; 전원 objective/Exit 즉시 집결 금지 |
| First LOS Break | Objective→(24,9.5) 기존 chamber case 남측→(20,8) restricted corner; 북측 direct escape (24,6)보다 느린 첫 refuge [설계 후보/실제 LOS 검증 필요] |
| Escape flow | restricted corner→service screen (8.5,5.8) 어깨 (10.5,6.5)→(4,6.5)→Exit; northern alternate 와 분리 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-06 — Conservation Lab

**Audit: KEEP.** 두 복원 작업 구역과 동쪽 표본실→북쪽 서비스 동선이 분명하고 낮은 작업대·불투명 screen의 역할이 구분된다. 3명/0 CCTV 구조를 보존한다.

현재 stage 의미 SHA256: `15fd0d71423aaafd05d8e04ceeb1140ff71cb1b415c731a87c1857cdd0553a5f`. 현재 guard coverage=0.0660, sampled safe exposure=0.0645, objective approach=0.1681, search approach=0.0972. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-06 |
| Title | Conservation Lab |
| Mission Fantasy | 복원 작업대 사이에서 표본을 훔쳐 북쪽 입고 서비스 통로로 반출한다. |
| Architecture | 서쪽 입고 공간→두 복원 작업 구역→동쪽 표본 보관실 / 북쪽 서비스 복귀 |
| Main mechanic | 낮은 작업대와 불투명 복원 screen 의 시야 차이를 이용 |
| Main Zones | Intake Read / Restoration Bays / Specimen Store / Service Return |
| Entry | 현재/기본 유지: (1.6,16) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (29.5,12) artifact; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (17,1.6) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (10.5,18)→(15.8,18)→(21,18)→(23,14.5)→store 남측 (30.5,17.8)→Objective |
| Risk Route | (16.3,11)→(21,14.5)→(26,12) 복원 bay 직통 |
| Landmark | restoration tables (13,11.5)/(18.5,16)은 LOS PASS, screen (15.5,14)은 진짜 refuge |
| Security Style | 3명/0 CCTV 유지. 낮은 작업대 뒤를 은신으로 표시하지 않고 불투명 복원 screen에서 다음 횡단을 읽게 한다. |
| Guard concept | 현재: g1 room@(10.5,8.5), g2 objective@(25.5,9.5), g3 exit@(12.5,2); 제안: 3명/0 CCTV 유지. 낮은 작업대 뒤를 은신으로 표시하지 않고 불투명 복원 screen에서 다음 횡단을 읽게 한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | store inspection 후 bay/service 각자 영역 확인; table 뒤를 search 완전 차단으로 취급하지 않음 |
| First LOS Break | Objective→store case (27,16) 서측 (25.5,16.7) 후보→(23,14.5) doorway corner [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 복원 bay 북쪽 (20.5,9.5)→(16.5,6.5)→service screen (15,4.5)→Exit; 남쪽 복원 우회 alternate 유지 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-07 — Private Gallery

**Audit: KEEP.** 북쪽 현관→서쪽 초상화→남쪽 salon→서쪽 출구의 U 동선에 개인 전시실 서사가 있다. 3명/0 CCTV를 보존한다. Museum lockdown/HUD 차이는 별도 시스템 검토 대상이다.

현재 stage 의미 SHA256: `8ee8db94be157278d3b93923eac20b0bbe4f25ecb02a4fe068d2cab367e66658`. 현재 guard coverage=0.1547, sampled safe exposure=0.1193, objective approach=0.1681, search approach=0.0215. Runtime routes=2, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-07 |
| Title | Private Gallery |
| Mission Fantasy | VIP 초상화 방의 뒤편으로 돌아 개인 컬렉션을 회수하고 측면 직원 문으로 나간다. |
| Architecture | 북쪽 현관→남쪽 개인 전시실 / 서쪽 우회로와 측면 탈출을 갖춘 U 동선 |
| Main mechanic | 개인 전시실의 긴 우회와 노출된 VIP 연결로 선택 |
| Main Zones | Private Foyer / Portrait Rooms / VIP Bridge / Objective Salon / Side Gallery |
| Entry | 현재/기본 유지: (8.5,1.5) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (12.5,16.5) artifact; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (1.5,7.5) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | foyer (7,3.5)→(7,6.5)→west portrait (4.5,6.5)→(4.5,16.5)→Objective |
| Risk Route | VIP bridge 를통해 salon 직행, 서쪽긴우회 생략 |
| Landmark | VIP Portrait Salon statue (6.5,12.5): 관람순환과서비스 escape 분기 |
| Security Style | 3명/0 CCTV 유지. 방·VIP 연결로·보물 검사 역할을 나누고 보물과 출구를 완전히 겹쳐 감시하지 않는다. |
| Guard concept | 현재: g1 corridor@(6,7), g2 objective@(12.5,12), g3 room@(10.8,4); 제안: 3명/0 CCTV 유지. 방·VIP 연결로·보물 검사 역할을 나누고 보물과 출구를 완전히 겹쳐 감시하지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | salon 빈전시 검사와 sidegallery 수색 분리; timer 는다른 chapter 와공통기준으로별도정리 |
| First LOS Break | Objective→(10.5,16.5)→(7,16.5) salon 서쪽 문/조각 어깨; 실제 화면에서 시야 차단이 시작되는 지점 확인 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | (4.5,16.5)→(4.5,10)→(4.5,7.5)→west Exit; entry foyer 재진입 불필요 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-08 — Security Core

**Audit: PARTIAL REBUILD.** 사용자가 보물 주변 두 경비의 압박을 보고했다. g2 교차로·g3 보물 검사·cam1 북쪽 시야가 겹칠 수 있다. V101 approach .3217/search .3975, 고정 3/48 CLEAR다. 교차로를 보존하고 검문과 보물의 관찰 공간을 분리한다.

현재 stage 의미 SHA256: `c0f6bc237acbec746b71fbd073378449321bb9ea349fd7cfaa960001d8728b0d`. 현재 guard coverage=0.0976, sampled safe exposure=0.1496, objective approach=0.3217, search approach=0.3975. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-08 |
| Title | Security Core |
| Mission Fantasy | 보안 교차로를 관찰해 기록 보물을 빼낸 뒤 서쪽 정비 회랑으로 사라진다. |
| Architecture | 동쪽 접근→중앙 교차로→북쪽 기록실 유지 / 서쪽 정비→남쪽 출구, 검문과 보물방 사이 완충 공간 제안 |
| Main mechanic | 검문과 보물 경계를 차례로 통과하며 두 경비의 동시 압박을 피함 |
| Main Zones | Access Hall / Control Crossing / Archive Checkpoint / Restricted Archive / Maintenance Gallery / Evacuation Gallery |
| Entry | 현재/기본 유지: (28.4,13) right; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (16.5,2.3) artifact; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (5,24.4) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | entry→desk (24.7,12.5)→(19,16.8)→centraldesk (14,13.4) 서측 (11,15)→(11,9.5)→screen (14,5.4) 측면→북 archive |
| Risk Route | centralcross (18.5,12)→(16.3,8)→(17,3), checkpoint 정면직통 |
| Landmark | securitydesk (14,13.4)→checkpoint screen (14,5.4)→archivecase (16.5,2.25)로상황읽기 |
| Security Style | 현재 5명/2 CCTV. g2는 Control Crossing, g3는 archive 검사를 담당한다. cam1 (19.6,2.4)은 archive 정면 대신 검문 threshold를 담당하는 배치 후보로 검토한다. 정확 coverage는 Phase B에서 확인하고 0.85s reaction을 보존한다. |
| Guard concept | 현재: g1 room@(22.5,10.5), g2 corridor@(11.5,9.5), g3 objective@(13,3.2), g4 room@(2.2,10.5), g5 exit@(4.5,20.2); 제안: 현재 5명/2 CCTV. g2는 Control Crossing, g3는 archive 검사를 담당한다. cam1 (19.6,2.4)은 archive 정면 대신 검문 threshold를 담당하는 배치 후보로 검토한다. 정확 coverage는 Phase B에서 확인하고 0.85s reaction을 보존한다. |
| CCTV concept | 현재: cam1@(19.6,2.4), cam2@(10.4,8.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | g3는빈 archive→checkpoint, g2는 cross/junction 부터. g4maintenance/g5evacuation 을각각 초기 sector 에두고 전원이 objective/exit 를먼저검사하지않게정적 sector 분리 |
| First LOS Break | Objective→archive 서쪽 어깨 (13,3)→checkpoint screen 서측 새로운 보호 bay 후보; 기존 escape 의 (15.75,4.25) 노출 재검증. 두 Guard를 동시에 읽지 않아도 되는 한 구간의 대기 공간 설계 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | bay→(13,9)→(10,12)→maintenance case (5,13) 뒤 (4,13.7)→(6,18)→Exit. 동측 alternate 도 유지 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-09 — Master Exhibition

**Audit: KEEP.** 계단형 조각 산책로와 동쪽 collection→북쪽 balcony의 별도 탈출을 보존한다. 4명/0 CCTV이며 미션 번호9를 이유로 새 보안을 추가하지 않는다.

현재 stage 의미 SHA256: `4162eea9139df326f5d3cda08c7934fb189325ea47ae04b7f3917274a17e1f38`. 현재 guard coverage=0.0830, sampled safe exposure=0.0880, objective approach=0.1462, search approach=0.1269. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-09 |
| Title | Master Exhibition |
| Mission Fantasy | 조각 산책로를 두 번 꺾어 동쪽 수집품을 회수하고 북쪽 초상화 발코니로 빠진다. |
| Architecture | 서쪽에서 계단형 대각선 접근 / 동쪽 수집품 방→북쪽 발코니로 별도 탈출 |
| Main mechanic | 조각상과 전시 case 를 잇는 관찰 지점 연쇄 |
| Main Zones | Vestibule / Sculpture Promenade / Central Sculpture Court / East Collection / Portrait Balcony |
| Entry | 현재/기본 유지: (1.6,21) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (31.5,13.5) artifact; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (28.5,1.6) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (10.5,21)→(16,21)→(18.5,14)→(15.3,10)→(15.3,5.5)→(23.5,5.5)→(28.2,15)→Objective |
| Risk Route | (14.5,15)→(20,8)→(25.5,9.5)→(30,14) 전시 diagonal 직통 |
| Landmark | statue (12.8,17)/(18,8.6)와 north balcony screen (29.5,4.4) |
| Security Style | 4명/0 CCTV 보존. 조각상의 각 어깨에서 다음 영역의 경비 한 명을 읽게 하고 balcony 출구에 추가 봉쇄를 만들지 않는다. |
| Guard concept | 현재: g1 room@(10.5,13.5), g2 corridor@(15.5,5.5), g3 objective@(28.3,8.3), g4 exit@(27.5,2); 제안: 4명/0 CCTV 보존. 조각상의 각 어깨에서 다음 영역의 경비 한 명을 읽게 하고 balcony 출구에 추가 봉쇄를 만들지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | 각 guard 는 promenade/court/collection/balcony 의지역확인으로시작 |
| First LOS Break | Objective→east case (30,10.5) 서측 (28.3,9) 후보; (28.3,15.5)부터 case 측면 이동 타이밍 확인 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | east collection→north balcony corner (30.5,6.5)→screen (28.5,4.8)→Exit; 동쪽 어깨 alternate 유지 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 01-10 — Grand Heist

**Audit: PARTIAL REBUILD.** 사용자가 출구 쪽 경비 집결을 보고했다. 현재 6명/2 CCTV이고 서쪽 cloister→service 연결에 집결할 수 있다. Native pickup36.98→caught43.05는 탈출 취약성의 관찰이지만 자동화 한계도 함께 기록한다.

현재 stage 의미 SHA256: `d27293dd5ce40cc9c9aaa98c594b7ddb60116334fbf8bd0607d89c4b7aca6279`. 현재 guard coverage=0.0711, sampled safe exposure=0.0698, objective approach=0.0806, search approach=0.0785. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 01-10 |
| Title | Grand Heist |
| Mission Fantasy | 대전시장의 master diamond 를 가져와 조각 회랑과 직원 반출 공간을 통과한다. |
| Architecture | 남쪽 입구→북쪽 보물 성소 유지 / 서쪽 회랑→남쪽 서비스 출구 앞 대기 공간과 양쪽 통과 여유 보강 |
| Main mechanic | Museum 의 조각 우회·검문 관찰·별도 탈출을 통합하되 출구 집결 완화 |
| Main Zones | Grand Arrival / Exhibition Crossing / Diamond Sanctuary / West Sculpture Cloister / Service Escape / East Exhibition |
| Entry | 현재/기본 유지: (20,28.4) bottom; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (23,4.5) masterDiamond; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (1.6,25) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (23.5,27)→(24,20.5)→(26,16.5)→east exhibition (29.5,19.5)→(29.5,11)→(20,11)→sanctuary 서쪽 어깨 |
| Risk Route | (20.5,20)→(19.5,13)→(19.5,9)→(21.5,7) grandaxis 직통 |
| Landmark | sanctuary screen (18.5,7.8), cloister statue (5.5,7.5), service screen (8,25.5) |
| Security Style | 현재 6명/2 CCTV를 무작정 늘리지 않는다. g4 cloister와 g5 출구의 영역을 분리하고 g1 arrival·g2 crossing·g6 east를 service에 함께 집결시키지 않는 검색 구역을 설계한다. 속도는 불변이다. |
| Guard concept | 현재: g1 room@(16.5,23.5), g2 corridor@(14.5,13.5), g3 objective@(16.5,2.5), g4 room@(2.5,4.5), g5 exit@(2.5,22.5), g6 roaming@(29.5,10.5); 제안: 현재 6명/2 CCTV를 무작정 늘리지 않는다. g4 cloister와 g5 출구의 영역을 분리하고 g1 arrival·g2 crossing·g6 east를 service에 함께 집결시키지 않는 검색 구역을 설계한다. 속도는 불변이다. |
| CCTV concept | 현재: cam1@(15.4,1.4), cam2@(13.4,12.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | g3sanctuary→북쪽 crossing, g4cloister 상단, g5service 동쪽; g1arrival/g6east 를별도 순회. 최종 room 검색이남서 door 와대기 bay 를동시덮지않도록 room footprint/sector 조정 |
| First LOS Break | 첫 refuge 후보: Objective (23,4.5)→sanctuary screen (18.5,7.8)의 북서 opaque 어깨 (16.3,5.3). 해당 어깨가 실제 objective guard/CCTV LOS 를 끊는지 검사한다. 그 다음은 west door→cloister statue 뒤 (4,8.2)의 두 번째 refuge 이며 이를 첫 break 와 혼동하지 않는다. [설계 후보/실제 LOS 검증 필요] |
| Escape flow | cloister case (8,12.5)→screen (4.5,17)→service threshold (5,20)→제안 screen (8,25.5) 남서쪽 대기 bay→Exit. 화면상 틈과 두 방향 통과 가능 여부 확인 |
| Difficulty Tier | 1 EASY; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증; Finale 역할: Chapter Summary. 규모와 연출만 확장하며 별도 pressure bonus 없음. |
| Chapter identity | Classic museum: display/statue/column 와 직원 서비스 동선; 관찰→전시 어깨 이동. |

### 02-01 — Front Exhibition

**Audit: KEEP.** 중앙 조각상의 양쪽 우회와 작품 벽으로 이어지는 Gallery 동선이 분명하다. 2명/0 CCTV다. Entry/Exit가 남쪽에 가깝더라도 목표 경유 횡단이 있으며 EASY+ 체감은 실측해야 한다.

현재 stage 의미 SHA256: `92e5f3a87015a969ed79c981255850c31e7e26a69ca5bce98e361ef74ad74dfe`. 현재 guard coverage=0.0499, sampled safe exposure=0.1010, objective approach=0.1295, search approach=0.0765. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-01 |
| Title | Front Exhibition |
| Mission Fantasy | 개방된 전시장의 조각섬 한쪽을 골라 대표 작품을 회수한다. |
| Architecture | 서쪽 접근→중앙 조각 court→북동쪽 작품 벽 / 남쪽 공공 출구 |
| Main mechanic | 개방된 조각 court 의 양쪽 횡단과 타이밍 선택 |
| Main Zones | Arrival / Sculpture Court / Featured Wall / public exit return |
| Entry | 현재/기본 유지: (2,14) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (22.05,5.6) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (12.5,15.4) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (4.25,12.75)→(9.75,13.25)→sculpture 측면 (14.25,12.25)→(16.75,9.25)→Objective |
| Risk Route | sculpture court 열린중앙을직통해 featured wall 접근 |
| Landmark | central artwork (12.49,11.8) 양어깨와 northeast featured wall |
| Security Style | 2명/0 CCTV 보존. Museum보다 긴 개방 횡단 한 곳을 제공하고 횡단 전에 기다릴 불투명 관찰 지점을 보장한다. |
| Guard concept | 현재: g1 room@(12.25,12.25), g2 objective@(21.25,3.75); 제안: 2명/0 CCTV 보존. Museum보다 긴 개방 횡단 한 곳을 제공하고 횡단 전에 기다릴 불투명 관찰 지점을 보장한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | featured wall 검사와 central court 순회를분리 |
| First LOS Break | Objective→(18.25,8.25) featured wing corner→central sculpture 뒤 (14.25,11.75); 낮은 plinth 는 LOS 차단 아님 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | court 반대 어깨→south Exit (12.5,15.4); objective 돌아오기 전에 보이는 안전 관람 bay 유지 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-02 — Portrait Hall

**Audit: TUNE.** Portrait 시각 수정은 유지한다. 긴 spine의 Safe/Risk가 같은 노출 구간으로 합쳐지는지 확인한다. 3명/0 CCTV이고 Objective→Exit의 긴 직선 탈출은 관찰 지점 검증이 필요하다.

현재 stage 의미 SHA256: `2a3c770ed510101a869f1c330383e1cb03bb473181d43d60e64a0a9422df92a8`. 현재 guard coverage=0.0578, sampled safe exposure=0.0409, objective approach=0.1356, search approach=0.0598. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-02 |
| Title | Portrait Hall |
| Mission Fantasy | 긴 초상화 hall 의 시선을 옆 전시 screen 으로 끊으며 초상화를 회수한다. |
| Architecture | 남쪽 reception→긴 초상화 spine→북동쪽 전시 recess / 북서쪽 출구 |
| Main mechanic | 긴 직선 시야를 읽고 전시 screen 으로 이동을 분절 |
| Main Zones | Reception / Portrait Spine / Portrait Recess / northernviewingreturn |
| Entry | 현재/기본 유지: (2,16) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (22.05,3.6) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (7.6,4.5) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (6.75,12.75)→(7.75,12.25)→screen 서쪽 어깨 (9,6)→Objective |
| Risk Route | spine 중앙 longaxis 직통, screen 주변관찰생략 |
| Landmark | featured portrait wall (20.12,6.85), 기존세로형 portraits grouping 유지 |
| Security Style | 3명/0 CCTV. Spine 경비와 roaming 경비의 중첩은 시간으로 분리한다. Museum보다 긴 LOS를 요구하되 충분한 대기 후 횡단 창을 확보한다. |
| Guard concept | 현재: g1 room@(11.75,11.75), g2 objective@(21.25,1.75), g3 roaming@(13.75,13.75); 제안: 3명/0 CCTV. Spine 경비와 roaming 경비의 중첩은 시간으로 분리한다. Museum보다 긴 LOS를 요구하되 충분한 대기 후 횡단 창을 확보한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | objective portrait 확인→long spine inspection, roamer 는남측부터 search |
| First LOS Break | Objective→featured screen (20.12,6.85) 북서 shoulder→북벽 관람 recess 후보; 현재 직통 탈출 관련 감시 source의 실제 시야 차단 검증 필요 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 북쪽 관람축을 따라 west Exit (7.6,4.5); alternate 는 southern observation terrace 를 통해 거리와 노출을 교환 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-03 — Sculpture Studio

**Audit: TUNE.** 조각 작업 구역과 북쪽 주문 작품→동쪽 설치 미술의 dogleg을 보존한다. 현재 4명 중 roaming 경비 (14.75,4.75)가 보물 연결로를 담당하므로 기존 세 역할과의 동시 압박을 확인한다.

현재 stage 의미 SHA256: `3e23f58b97de0bb2d8ab4241da89ae419c8c10c9fe06e202009a8359daf91489`. 현재 guard coverage=0.0630, sampled safe exposure=0.0747, objective approach=0.1365, search approach=0.1156. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-03 |
| Title | Sculpture Studio |
| Mission Fantasy | 조각 작업 구역을 둘러 주문 제작 작품을 꺼내 동쪽 설치 미술 annex 로 반출한다. |
| Architecture | 서쪽 작업실→두 조각 작업 구역→북쪽 주문 작품 전시 / 동쪽 annex 탈출 |
| Main mechanic | 조각상 양쪽 우회와 보물 접근 순찰의 타이밍 |
| Main Zones | Studio Arrival / Carving Bays / Commission Court / Installation Annex |
| Entry | 현재/기본 유지: (1.6,14) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (17,3.5) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (31.4,14) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (10.5,16.8)→(15.2,16.8)→(21,14)→(21,9)→(16,7)→(10.8,5.7)→Objective |
| Risk Route | (16,12)→(16,6) 중앙조각사이직통 |
| Landmark | sculptures (12.5,12.5)/(18.8,15.5), commission masterpiece (17,2.4) |
| Security Style | 현재 4명/0 CCTV. Roaming 경비와 보물 경비가 commission 문을 동시에 영구 점유하지 않도록 별도 작업 구역을 맡긴다. |
| Guard concept | 현재: g1 room@(10.5,9.5), g2 objective@(11.5,2), g3 exit@(25.5,6.5), g4 roaming@(14.75,4.75); 제안: 현재 4명/0 CCTV. Roaming 경비와 보물 경비가 commission 문을 동시에 영구 점유하지 않도록 별도 작업 구역을 맡긴다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | commission 검사와 carving/annex 순회를분리 |
| First LOS Break | Objective→north screen (13,5.8) 동쪽 corner (19.5,5.5) 후보, 다음 bay 와 분리 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | (20.5,10.5)→(23,12.5)→annex installation (27.5,10) 남측 (26,15.5)→Exit |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-04 — Modern Wing

**Audit: KEEP.** 엇갈린 art wall S와 서쪽 collection→남동쪽 court가 이동식 전시 벽의 정체성을 보여준다. 4명/0 CCTV이며 추가 벽은 필요하지 않다.

현재 stage 의미 SHA256: `d4906c82ca9742d3d824eb2dbc6f53a62099f32a3b204c082c431197c65cd9f8`. 현재 guard coverage=0.0551, sampled safe exposure=0.0745, objective approach=0.0491, search approach=0.0546. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-04 |
| Title | Modern Wing |
| Mission Fantasy | 이동식 전시 screen 의 엇갈린 관람 동선을 타고 서쪽 작품을 꺼내 남동쪽 courtyard 로 나간다. |
| Architecture | 북쪽→서쪽→남동쪽으로 이어지는 엇갈린 screen S 동선 |
| Main mechanic | 엇갈린 미술 벽의 양쪽 이동과 다음 구역 관찰 |
| Main Zones | North Arrival / Modern Screens / West Collection / South Installation / East Exit Court |
| Entry | 현재/기본 유지: (16,1.6) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (3.5,15) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (31.4,25) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (19,6)→(20.5,10)→(20.5,17)→(10.5,17)→(6.5,17.8)→Objective |
| Risk Route | (15.7,12)→(9,14.5) screen 중앙 shortcross |
| Landmark | movablewalls (13,11.5)/(18.3,15.4), south installation (15.7,25.3) |
| Security Style | 4명/0 CCTV. 양쪽 art wall에서 crossing을 읽게 하고 한 위협을 넘으면 다음 위협을 관찰하는 박자를 유지한다. |
| Guard concept | 현재: g1 room@(10.5,9.5), g2 objective@(2.3,11.5), g3 corridor@(11.5,21.5), g4 roaming@(7.75,15.75); 제안: 4명/0 CCTV. 양쪽 art wall에서 crossing을 읽게 하고 한 위협을 넘으면 다음 위협을 관찰하는 박자를 유지한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | western collection 부터검사, 남측 installation guard 는 자신의 전시 구역 검색 |
| First LOS Break | Objective→(6.5,17.8) collection door corner→screen 어깨 (10.5,17) [설계 후보/실제 LOS 검증 필요] |
| Escape flow | south installation 두 측면 중 선택→(20,26.5)→(23,24.5)→east court→Exit |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-05 — Collector's Room

**Audit: KEEP.** 개인 collector court·portrait salon→서북쪽 masterpiece→남쪽 service의 U 동선과 역할 분리를 보존한다. 4명/0 CCTV다.

현재 stage 의미 SHA256: `6bec87f79fedeb335dbb8036f15c6b5ad33404299e1c7c8291e86026d1684239`. 현재 guard coverage=0.0557, sampled safe exposure=0.0427, objective approach=0.0778, search approach=0.0861. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-05 |
| Title | Collector's Room |
| Mission Fantasy | 개인 수집가의 조각 court 와 초상화 salon 을 읽고 서북쪽 작품을 꺼내 서비스 gallery 로 빠진다. |
| Architecture | 동쪽 입구→서북쪽 개인 전시실 U 우회 / 남서쪽 서비스 출구 |
| Main mechanic | 전시실을 차례로 읽는 개인 컬렉션 침입과 별도 복귀 |
| Main Zones | Private Reception / Collector Court / Portrait Salon / Private Masterpiece / Service Gallery |
| Entry | 현재/기본 유지: (29.4,14) right; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (4.5,5) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (2.5,21.4) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (20,17.5)→(12.5,17.5)→(12.5,9.5)→(11.5,3.5)→(10,5.5)→(2.3,9)→Objective |
| Risk Route | (16,13.8)→(16,6)→(9,5.5) collector court 직통 |
| Landmark | installation (15.3,12.8), portrait salon screen (15,4.8), private masterpiece wall |
| Security Style | 4명/0 CCTV. 방마다 검사 경비를 직접 읽고 service 대기 screen을 유지한다. |
| Guard concept | 현재: g1 room@(12.3,9.5), g2 room@(11.5,2.3), g3 objective@(2.3,3.3), g4 exit@(2.3,14.5); 제안: 4명/0 CCTV. 방마다 검사 경비를 직접 읽고 service 대기 screen을 유지한다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | private inspection 후 portrait/court 연결재확인; service 경비는 exit room 지역검사 |
| First LOS Break | Objective→(2.3,9.5) private room 남쪽 corner→(5.5,12) connector [설계 후보/실제 LOS 검증 필요] |
| Escape flow | service screen (5,17.5) 서쪽 어깨 (2.3,16)→(2.5,20)→Exit, 동쪽 alternate 유지 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-06 — Glass Gallery

**Audit: TUNE.** Glass BLOCK/LOS PASS와 중앙 전시섬의 선택을 보존한다. 5명/1 CCTV이며 Native 보물 획득 전 CAUGHT는 입구 관찰 타이밍의 검토 근거다. 유리 뒤를 완전 엄폐처럼 보이게 해서는 안 된다.

현재 stage 의미 SHA256: `eeaf1f326c1269fe1c3b0f83bd698c7cc813288e01c86c5ce37a69a19c3064db`. 현재 guard coverage=0.0542, sampled safe exposure=0.0504, objective approach=0.0575, search approach=0.0450. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-06 |
| Title | Glass Gallery |
| Mission Fantasy | 유리 너머는 보이지만 몸은 통과하지 못함을 읽고 불투명 조각상 옆으로 북쪽 작품을 훔친다. |
| Architecture | 서쪽 유리 전시→중앙 유리 설치의 양쪽 관람 동선→북쪽 작품 방 / 동쪽 조각 구역 탈출 |
| Main mechanic | Glass collision BLOCK / LOS PASS 와 불투명 끝단 엄폐의 구분 |
| Main Zones | Approach Gallery / Glass Exhibition / Central Installation / Sculpture Art Cell / Featured Study |
| Entry | 현재/기본 유지: (1.6,24) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (19,3.8) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (32.4,20) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | (4.5,18)→(2.2,12)→(7.3,10.8)→(12.4,11)→(14,9.7)→(17.5,8)→(21.6,5.8)→Objective |
| Risk Route | southglazedside (21.5,21)→(21.5,14)→study; glass 로가려진것처럼보이나 cone 통과 |
| Landmark | installation (17,15.2), opaque north anchor (20.5,11.6), study wall (19,2.6) |
| Security Style | 현재 5명/1 CCTV. 중앙 roaming·corridor·camera의 중첩을 양쪽 관람 동선 전체가 아니라 한 노출 lane에 한정한다. Detector와 유리 규칙은 불변이다. |
| Guard concept | 현재: g1 room@(2.3,7.4), g2 corridor@(12.1,10.2), g3 objective@(13.1,2.1), g4 exit@(26.2,11.3), g5 roaming@(11.25,12.75); 제안: 현재 5명/1 CCTV. 중앙 roaming·corridor·camera의 중첩을 양쪽 관람 동선 전체가 아니라 한 노출 lane에 한정한다. Detector와 유리 규칙은 불변이다. |
| CCTV concept | 현재: cam1@(22.6,9.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | glass cell 와 study 를별도 sector 로검색; 유리를 wall 로간주하는 search/LOS 변경금지 |
| First LOS Break | Objective→study sculpture (14.7,4.8)의 남서쪽 어깨 (13.2,5.6) 후보, study door corner (17.5,8) [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 북쪽 불투명 관찰 지점→동쪽 glass 가장자리→(24,19.5)→동쪽 조각상 (28.6,15.8) 남측→Exit; 서쪽 불투명 전시를 돌아오는 대안 보존 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-07 — Curator's Floor

**Audit: TUNE.** 남쪽→서쪽 curator 작업실→북쪽 초상화 교차로의 구조를 보존한다. 5명/1 CCTV이며 동쪽 roaming 경비가 대안 접근로를 지나치게 점유하는지 확인한다.

현재 stage 의미 SHA256: `3d2bfe7c94afb51643057ca5d728730c00d8177b5395e424f8af0a0a00adf75c`. 현재 guard coverage=0.0585, sampled safe exposure=0.0353, objective approach=0.0713, search approach=0.0833. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-07 |
| Title | Curator's Floor |
| Mission Fantasy | 큐레이터의 교차 관람층을 이용해 작업실의 그림을 꺼내 북쪽 공공 초상화 문으로 빠진다. |
| Architecture | 남쪽 현관→서쪽 작업실 / 북쪽 초상화 교차로와 동쪽 전시 대안 동선 |
| Main mechanic | 업무 전시실 침입과 중앙 교차로 타이밍 |
| Main Zones | Visitor Foyer / Curator Crossing / Curator Work room / Portrait Terrace / East Installation |
| Entry | 현재/기본 유지: (17,27.4) bottom; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (4.5,11) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (16,1.6) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | 기존 safe route: (21,26)→(21.5,19.2)→(11.5,19.2)→(11.5,13.5)→west room (2.3,16)→Objective; east installation 깊은 우회는 별도 제안이며 현재 safe 로 오인 금지 |
| Risk Route | south foyer 에서 central junction 정면 cross→west work room |
| Landmark | work room masterpiece (4.5,9.9), east installation 와 portrait terrace |
| Security Style | 5명/1 CCTV. Curator 교차로 횡단을 핵심으로 삼고 동쪽 roaming 경비가 대안 전시 구역 전체를 봉쇄하지 않게 한다. |
| Guard concept | 현재: g1 corridor@(11.5,10.5), g2 objective@(2.3,9.5), g3 exit@(10.5,2.3), g4 room@(26.5,11.5), g5 roaming@(26.25,18.25); 제안: 5명/1 CCTV. Curator 교차로 횡단을 핵심으로 삼고 동쪽 roaming 경비가 대안 전시 구역 전체를 봉쇄하지 않게 한다. |
| CCTV concept | 현재: cam1@(22.6,9.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | work room 검사후 junction, east installation 은지역 inspection; 숨은 Player의 LKP 없음 |
| First LOS Break | Objective→(7.5,11) 작업실 문→(9.5,13.5) 중앙 엄폐 모서리 후보 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | (11.5,10.5)→(16.5,8.5) portrait north crossing→terrace art wall→Exit (16,1.6), entry south foyer 불필요 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-08 — Grand Atrium

**Audit: TUNE.** 큰 atrium의 두 설치 작품과 서쪽 작품 방→남동쪽 복귀로를 보존한다. 5명/0 CCTV다. 낮은 면적 대비 압박을 경비 수로 보정하지 않고 중앙 횡단 타이밍을 검토한다.

현재 stage 의미 SHA256: `10eb13d5710a3e2ee45b74c2e505c57c693bee4a45a638b49b6d85bd5304add6`. 현재 guard coverage=0.0607, sampled safe exposure=0.0667, objective approach=0.0907, search approach=0.1343. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-08 |
| Title | Grand Atrium |
| Mission Fantasy | 큰 설치 작품 사이를 가로질러 서쪽 masterpiece 를 회수한 뒤 반대편 return gallery 로 간다. |
| Architecture | 북쪽 terrace→넓은 atrium 의 부채꼴 분기→서쪽 작품 방 / 남동쪽 return |
| Main mechanic | 넓은 설치 미술 섬의 외측 우회와 중앙 노출 횡단 선택 |
| Main Zones | North Terrace / Grand Atrium / Masterpiece Wing / Return Gallery |
| Entry | 현재/기본 유지: (17,1.6) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (4.5,15) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (36.4,25) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | north terrace (21.5,6.8)→east atrium shoulder (24.5,11)→(24.5,16)→south shoulder (19,17)→(11.5,17)→west wing (2.3,19.5)→Objective |
| Risk Route | paired installation 사이 fan 중앙직통→west wing |
| Landmark | pairedmonumentalinstallation, west masterpiece (4.5,13.9) |
| Security Style | 5명/0 CCTV. Roaming 경비는 두 설치 작품 사이, room 경비는 terrace, corridor 경비는 atrium의 별도 반쪽을 맡는다. 넓은 바닥 전체를 cone으로 덮지 않는다. |
| Guard concept | 현재: g1 room@(21.5,7), g2 corridor@(11.5,10.5), g3 roaming@(17,10.5), g4 objective@(2.3,12.5), g5 exit@(29.5,19.5); 제안: 5명/0 CCTV. Roaming 경비는 두 설치 작품 사이, room 경비는 terrace, corridor 경비는 atrium의 별도 반쪽을 맡는다. 넓은 바닥 전체를 cone으로 덮지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | west wing 빈 case→atrium south/return 지역 순회, whole atrium 즉시 LKP 없음 |
| First LOS Break | Objective→(7.5,19.5) west wing 남쪽 corner→atrium 설치 작품 서쪽 어깨 후보 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | atrium 남쪽 부채꼴 동선→return gallery (29.5,19.5) 출입 경비 관찰→Exit (36.4,25) |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-09 — Private Collection

**Audit: TUNE.** U courtyard와 남쪽 collection→북동쪽 balcony의 구분을 유지한다. V101 objective approach .0343→.1037 상승과 고정 CLEAR 3→5/48 개선이 함께 나타났다. 점수 하나만 보고 성급히 되돌리지 않는다.

현재 stage 의미 SHA256: `51099e27b9a1b15d1f2add6d6c641fe2c33cd1b46f319e98b383a579e7e24e04`. 현재 guard coverage=0.0471, sampled safe exposure=0.0562, objective approach=0.1037, search approach=0.0963. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-09 |
| Title | Private Collection |
| Mission Fantasy | 조각 courtyard 의 긴 남쪽 팔 끝 작품을 회수해 북동쪽 초상화 balcony 로 나온다. |
| Architecture | 서쪽→남쪽 U 침입 / 북동쪽 balcony 로 복귀 |
| Main mechanic | 개인 전시 courtyard 의 긴 우회와 pickup 순찰 타이밍 |
| Main Zones | Reception / North Sculpture Balcony / West Collection Arm / Private Masterpiece / East Portrait Balcony |
| Entry | 현재/기본 유지: (1.6,12) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (18.5,27) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (30.5,9.6) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | north balcony (24.5,6)→east viewing return (30.5,21)→north link 복귀 (14.75,7.25)→west arm (15.25,21.25)→south bay (24.5,29.8)→Objective. 현재 safe 의 긴 반복을 줄이는 route TUNE 후보 |
| Risk Route | westarm 직통→south objective, north balcony 읽기생략 |
| Landmark | courtyard sculpture 와 masterpiece wall (18.5,25.9) |
| Security Style | 4명/0 CCTV. g3 V101 앵커 (19.25,26.75)를 보존한 뒤 pickup 타이밍을 실측한다. 미션 번호9를 이유로 수치를 올리지 않는다. |
| Guard concept | 현재: g1 room@(11.5,2.5), g2 room@(11.3,10.5), g3 objective@(11.5,25.5), g4 exit@(25.5,10.5); 제안: 4명/0 CCTV. g3 V101 앵커 (19.25,26.75)를 보존한 뒤 pickup 타이밍을 실측한다. 미션 번호9를 이유로 수치를 올리지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | south collection→courtyard 회귀, balcony guard 는 northeast local 순회 |
| First LOS Break | Objective→남쪽 collection의 불투명 art wall 측면→(24.5,29.8) 관람 공간 후보; cabinet이 없는 빈 관람 공간을 보호된 대기점으로 확정하지 않음 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | courtyard 동쪽 arm→East Portrait Balcony→Exit (30.5,9.6); north/south alternate 시야 확인 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 02-10 — Masterpiece

**Audit: PARTIAL REBUILD.** 현재 7명/2 CCTV와 highSecurity다. V101 고정 0/48 CLEAR, Native pickup22.88 후 입력 정체가 있었다. Masterpiece 공간은 보존하고 chamber→portrait→exit가 이중 압박의 finale spike가 되지 않도록 대기점과 검색 구역을 정리한다.

현재 stage 의미 SHA256: `23d9ebdee4da9a6c70cb70e5025a8b807477e1d50300b58f5915152022f0032a`. 현재 guard coverage=0.0501, sampled safe exposure=0.0746, objective approach=0.1201, search approach=0.1222. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 02-10 |
| Title | Masterpiece |
| Mission Fantasy | 주문 제작 masterpiece 를 훔쳐 초상화 side gallery 와 공공 관람 복귀로를 거쳐 빠진다. |
| Architecture | 남쪽 접근→동쪽 개인 전시 선택→중앙 설치→북쪽 masterpiece / 서쪽 초상화→side gallery→남서쪽 출구 |
| Main mechanic | Gallery 의 열린 횡단·설치 미술·초상화 전이를 통합하되 보물과 탈출 압박 분리 |
| Main Zones | Grand Arrival / Private Exhibition / Security Crossing / Masterpiece Chamber / Portrait Collection / Side Gallery / Private Escape |
| Entry | 현재/기본 유지: (21,31.4) bottom; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (23,4.5) painting; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (1.6,29) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | east sculpture private bypass→securityisland 측면→masterpiece 어깨; existing safe test Route 소스유지 |
| Risk Route | grandaxis (20.5,24)→(20.5,18)→(19.5,12)→(23,8)→Objective |
| Landmark | Masterpiece wall (23,3.2), portrait collection 와 sidegallery 를 distinctescapebeats 로보존 |
| Security Style | 현재 7명/2 CCTV. 보물 경비와 상단 roaming 경비를 서로 다른 관찰 구간에 배치하고 출구 경비는 공공 관람 공간의 한쪽만 살핀다. highSecurity의 공통 규칙은 시스템 검토로 별도 승인한다. |
| Guard concept | 현재: g1 room@(16.4,26.4), g2 corridor@(13.2,15.3), g3 objective@(13.3,2.2), g4 roaming@(2.3,3.3), g5 exit@(2.3,26.3), g6 roaming@(29.2,23.3), g7 roaming@(20.75,11.75); 제안: 현재 7명/2 CCTV. 보물 경비와 상단 roaming 경비를 서로 다른 관찰 구간에 배치하고 출구 경비는 공공 관람 공간의 한쪽만 살핀다. highSecurity의 공통 규칙은 시스템 검토로 별도 승인한다. |
| CCTV concept | 현재: cam1@(27.6,1.4), cam2@(12.4,14.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | g7V101southern sector 우선보존, objective inspection 과 exit inspection 지역 분리. Alarm 은 theft 사실만; search4s 예외는 PhaseA 동결 |
| First LOS Break | Objective→(13.75,5.25) chamber 서쪽 진입 문턱→(10.8,6.5) portrait 모서리, 제안: 기존 screen의 불투명 측면을 대기점으로 연결 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | portrait bay (2.3,8)→side gallery 모서리→개인 전시 탈출 공간 shelter→Exit; side gallery 방 안 두 통과 측면을 보존해 단일 병목 피함 |
| Difficulty Tier | 2 EASY+; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증; Finale 역할: Chapter Summary. 규모와 연출만 확장하며 별도 pressure bonus 없음. |
| Chapter identity | Modern gallery: movable walls/sculpture/glass 와 open timing crossing; 흰 전시 언어. |

### 03-01 — Public Lobby

**Audit: PARTIAL REBUILD.** Public Lobby와 teller 맥락은 좋지만 Objective (17.5,7)→Exit (20.5,6)가 3.16tile 직통이다. 목표와 teller를 보존하고 직원 출고 검수 탈출 구역만 부분 재구성한다.

현재 stage 의미 SHA256: `285c1f6368813c0531f06c1311b33b33dcb0043f3c3aa70e8361ecedf7762b6a`. 현재 guard coverage=0.1003, sampled safe exposure=0.1033, objective approach=0.1062, search approach=0.2448. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-01 |
| Title | Public Lobby |
| Mission Fantasy | 공공 대기열에서 직원 측 counter 의 보관 자산을 빼내 검수용 문으로 반출한다. |
| Architecture | 공공 대기열→teller 직원 구역→별도 출고 검수 구역을 거치는 dogleg 제안 |
| Main mechanic | 공공/직원 경계와 짧은 출고 검수층 통과 |
| Main Zones | Public Queue / Teller Target / 제안 Staff Verification Return |
| Entry | 현재/기본 유지: (2.5,6) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (17.5,7) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (20.5,6) right. 제안 목적지: teller 동쪽 직원 구역에 연결하는 출고 검수 bay의 동남쪽 서비스 문. Objective→검수 bay 진입→불투명 counter 끝단의 남쪽 corner→서비스 문으로 연결하고, 현재 objective 옆 직통 출구 접근은 검수 bay를 반드시 거치도록 전환한다. 정확 좌표는 기존 outer bounds와 body clearance 확인 후 확정한다. |
| Safe Route | queue counter 의외측 (8,8.5)→teller 등쪽 approach; existing safe 북측 queue 어깨보존 |
| Risk Route | 두 queue 사이짧은중앙 countercross→Objective |
| Landmark | bankTellerCounter (17.5,5.5): objective 소속을직원 bay 로명확히 |
| Security Style | 현재 2명/0 CCTV. 공공 대기열 관찰과 teller 검사를 분리한다. 새 출고 검수 구역의 공간 역할을 검증하며 CCTV 추가로 난이도를 대신하지 않는다. |
| Guard concept | 현재: g1 room@(12,3.1), g2 objective@(19.8,7.8); 제안: 현재 2명/0 CCTV. 공공 대기열 관찰과 teller 검사를 분리한다. 새 출고 검수 구역의 공간 역할을 검증하며 CCTV 추가로 난이도를 대신하지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | teller 빈 case 확인, public guard 는 queue, outboundguard 추가보다 teller 회귀위상으로검증 |
| First LOS Break | Objective→기존 teller staff 측 opaque end 또는 제안 출고 검수 partition corner. (20.5,6) exit 앞의 tile 여유가 적으므로 현재 bounds 확인 후 확정 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 직원 verification bay 에서 read→side exit; 문을 멀리 옮기는 것만으로 끝내지 않고 별도 검수층과 시야 차단을 정의 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-02 — Teller Hall

**Audit: KEEP.** 긴 teller spine·서쪽 직원 우회·U 탈출이 공공/직원 구분과 counter 업무 동선을 보여준다. 3명/1 CCTV 구조를 보존한다.

현재 stage 의미 SHA256: `0e30f93f8749fe17f244e436a100e2e95034bb6f89aa0c7b4bd9de7f2f77d065`. 현재 guard coverage=0.0850, sampled safe exposure=0.0706, objective approach=0.0775, search approach=0.1375. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-02 |
| Title | Teller Hall |
| Mission Fantasy | 긴 teller 업무축의 옆 직원 통로를 골라 자산을 회수하고 서쪽 counter 복귀로로 탈출한다. |
| Architecture | 남쪽 공공 hall→북쪽 teller spine / 서쪽 직원 U 복귀 |
| Main mechanic | 정면 counter 횡단과 실제 직원 우회로 선택 |
| Main Zones | Public Hall / Teller Spine / West Counter Return / Staff Bypass |
| Entry | 현재/기본 유지: (13,19.5) bottom; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (15,8) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (2.5,16) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | staffconsultationdesk/records 어깨→western staff bypass→teller 등쪽 Objective |
| Risk Route | public hall 에서 teller 정면직통, staff read 생략 |
| Landmark | teller counter (12,7), staff records/administrationworkspace |
| Security Style | 3명/1 CCTV. 공공/직원 threshold에 camera를 설치하며 같은 유일 직원 문을 camera와 guard가 동시에 영구 봉쇄하지 않게 한다. |
| Guard concept | 현재: g1 room@(11,15), g2 objective@(19.5,9), g3 corridor@(3,8.5); 제안: 3명/1 CCTV. 공공/직원 threshold에 camera를 설치하며 같은 유일 직원 문을 camera와 guard가 동시에 영구 봉쇄하지 않게 한다. |
| CCTV concept | 현재: cam1@(20.7,3.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | teller inspection→staff return, CCTV 실제 sighting 만 LKP 생성 |
| First LOS Break | Objective→(5.5,8.5) counter 서측 끝→staff door corner (4.75,13.75) [설계 후보/실제 LOS 검증 필요] |
| Escape flow | (5.5,18.5) staffed bypass→west Exit (2.5,16); 공공 arrival 과 다른 return |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-03 — Staff Offices

**Audit: KEEP.** V5의 여섯 방 office망과 공유 records→audit→dispatch에 목적이 있다. 4명/1 CCTV이고 supervisor 우회와 서쪽 clerk 접근이 실제로 다르다.

현재 stage 의미 SHA256: `f5902d69c906b4333037e6fa9bd54f2c0ab9cfe87d4bb26b329d56548b6b268c`. 현재 guard coverage=0.0657, sampled safe exposure=0.0526, objective approach=0.0771, search approach=0.1396. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-03 |
| Title | Staff Offices |
| Mission Fantasy | 직원 office 망의 공유 기록실을 돌아 audit 자산을 회수해 반대 dispatch wing 으로 나간다. |
| Architecture | 여섯 방의 엇갈린 office 순환망 |
| Main mechanic | 직원 방과 중앙 records 를 통과하는 층별 침입 |
| Main Zones | Branch Reception / West Clerk Office / Shared Records Junction / East Audit Office / Supervisor Office / Loading Dispatch |
| Entry | 현재/기본 유지: (6,2.5) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (27,14) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (27,25.5) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | reception→supervisor (16,5)→shared records (16,13) outershoulder→east audit |
| Risk Route | reception→westclerk (6,13)→junction 직통→audit; staff corner 추가 우회 생략 |
| Landmark | auditfilingbank (27,10.5), centralrecordsisland |
| Security Style | 4명/1 CCTV. Junction camera는 records의 양쪽 통로 중 한쪽을 타이밍 횡단으로 읽게 한다. |
| Guard concept | 현재: g1 room@(3.3,11.2), g2 corridor@(19.3,15.8), g3 objective@(29.7,14.5), g4 room@(13.3,3.2); 제안: 4명/1 CCTV. Junction camera는 records의 양쪽 통로 중 한쪽을 타이밍 횡단으로 읽게 한다. |
| CCTV concept | 현재: cam1@(20.7,10.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | audit 검사→records/dispatch sector 별 독립 순회; supervisor 는 alternate approach 재확인 |
| First LOS Break | Objective→audit 방의 출입구 (21.25,13.25)→shared records (16.25,15.25) corner [설계 후보/실제 LOS 검증 필요] |
| Escape flow | records 남쪽 어깨→loading dispatch (27,22) 불투명 cabinet→south Exit (27,25.5) |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-04 — Records Room

**Audit: KEEP.** 동쪽 intake→ledger bridge→secure audit→북쪽 verification이 좁은 records 공간의 대안을 제공한다. 4명/0 CCTV를 보존하며 MEDIUM 점수를 위해 카메라를 추가하지 않는다.

현재 stage 의미 SHA256: `f587d41f408648dbfee620f85ee21215487a9e19bf261b25e6d6a8ee17cc8d92`. 현재 guard coverage=0.0939, sampled safe exposure=0.0860, objective approach=0.0708, search approach=0.1368. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-04 |
| Title | Records Room |
| Mission Fantasy | 짧은 ledger bank 사이에서 secure audit 문서를 꺼내 북쪽 검수 복귀로로 간다. |
| Architecture | 동쪽 intake→남서쪽 ledger→북쪽 검수의 계단형 records 루프 |
| Main mechanic | 좁은 기록 aisle 과 북쪽 검수 우회의 선택 |
| Main Zones | Document Intake / Ledger Spine / Secure Ledger Alcove / Audit Verification / Records Bridge |
| Entry | 현재/기본 유지: (24.5,15) right; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (6.5,7) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (17,2.5) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | east intake→북쪽 Audit Verification (17,5)→서쪽 Secure Ledger Alcove; ledger 좁은 중앙을 피하는 long loop |
| Risk Route | ledger spine (10,16)→bridge (8,10)→SecureLedger 직접 |
| Landmark | bankFilingCabinet (6.5,5): restrictedledgerassetownership |
| Security Style | 4명/0 CCTV. 짧은 ledger 관찰과 문 전이를 중심으로 삼고 좁은 틈 양쪽을 반대 cone으로 영구 점유하지 않는다. |
| Guard concept | 현재: g1 room@(18.2,13.2), g2 corridor@(13.5,19.5), g3 objective@(9.5,7.8), g4 exit@(19.7,3.2); 제안: 4명/0 CCTV. 짧은 ledger 관찰과 문 전이를 중심으로 삼고 좁은 틈 양쪽을 반대 cone으로 영구 점유하지 않는다. |
| CCTV concept | 현재 CCTV 없음; 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | ledger bank 검사→audit 검수 순회, records bridge 에 전원을 모으지 않음 |
| First LOS Break | Objective→ledger alcove 동쪽 문 (11.25,5.25)→검수 cabinet 측면 (16.75,7.75) [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 검수 직원 desk 어깨→north Exit (17,2.5); intake 동측 재회귀 불필요 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-05 — Deposit Boxes

**Audit: TUNE.** Deposit wall의 두 접근과 별도 service 복귀를 보존한다. Native pickup43.85→caught52.85 때문에 도난 후 교차로 관찰을 추가 검증한다. 4명/1 CCTV다.

현재 stage 의미 SHA256: `8232928309766dbfc9f1bd5522d896d17aa2313b360ba088f97260c1190c0096`. 현재 guard coverage=0.0703, sampled safe exposure=0.0638, objective approach=0.0917, search approach=0.1229. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-05 |
| Title | Deposit Boxes |
| Mission Fantasy | 공공 deposit lobby 를 지나 보관함 wall 에 연결된 자산을 회수하고 서비스 검수로 반출한다. |
| Architecture | 공공→직원→서쪽 deposit lane 또는 동쪽 chamber / 남쪽 서비스 출구 |
| Main mechanic | 실제 deposit wall 에 연결된 자산 침입과 반환 교차로의 관찰 |
| Main Zones | Public Deposit Lobby / Staff Threshold / West Deposit Lane / Deposit Wall Chamber / Return Junction / Service Exit |
| Entry | 현재/기본 유지: (2.5,13) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (27,8) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (16,26.5) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | 현재 safe: public lobby (4.75,15.5)→staff threshold (14.75,15.5)→return junction (22.25,17.25)→(25.75,19.5)→chamber 남측 (26.75,9.75)→Objective. 북측 deposit lane 접근과 구분 |
| Risk Route | staffthreshold→depositchamber 직접, lane 우회생략 |
| Landmark | deposit wall (27,6)와 objective (27,8)가직접 연결 |
| Security Style | 4명/1 CCTV. Deposit 검사와 return junction 경비를 나누며 pickup 뒤 교차로를 읽을 대기 공간을 제공한다. |
| Guard concept | 현재: g1 corridor@(13.3,15.7), g2 room@(17.5,6.8), g3 objective@(24,8.5), g4 corridor@(29.5,17); 제안: 4명/1 CCTV. Deposit 검사와 return junction 경비를 나누며 pickup 뒤 교차로를 읽을 대기 공간을 제공한다. |
| CCTV concept | 현재: cam1@(31.7,2.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | deposit guard 검사, junction guard 는 복귀 구역 순회, service 지역 search |
| First LOS Break | Objective→chamber의 deposit bank opaque end→Return Junction (27,17) 북동 corner 후보, 첫 시야 차단 distance 검증 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | return junction record cover→(16.75,17.25)→(16.25,21.25)→Service Exit (16,26.5); staff entry 와 분리 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-06 — Security Checkpoint

**Audit: KEEP.** Gate 정면과 실제 서쪽 직원 우회→authorization office가 층별 은행 보안을 보여준다. 4명/2 CCTV이며 좁은 gate의 대안 통로를 유지한다.

현재 stage 의미 SHA256: `6ad83e52bf6185f261023ba51d3888b59c24c1c892f45a279d812f82f8cbb720`. 현재 guard coverage=0.0696, sampled safe exposure=0.0345, objective approach=0.0924, search approach=0.1465. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-06 |
| Title | Security Checkpoint |
| Mission Fantasy | 보안 gate 의 검문 틈 또는 authorization office 우회를 택해 제한 은행 자산을 회수한다. |
| Architecture | 북쪽 reception→검문 또는 서쪽 authorization→restricted banking / 동쪽 출구 |
| Main mechanic | Gate 정면 타이밍과 별도 직원 인가 통로 |
| Main Zones | Upper Reception / Gate Approach / Restricted Banking / Western Staff Bypass / Staff Authorization Office / Controlled East Exit |
| Entry | 현재/기본 유지: (16,2.5) top; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (17,26) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (31.5,24) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | west staff bypass (5,14)→authorizationoffice (5,22) records 뒤→restrictedbanking |
| Risk Route | gate approach (16,13)→gate (17,18.5) 직통, cameraendpause timing 요구 |
| Landmark | security gate (17,18.5)와 authorization records 가 realroutechoice |
| Security Style | 4명/2 CCTV. Camera의 gate 접근과 동쪽 검수 역할을 나누고 동일 gate 위에 두 cone을 겹치지 않는다. |
| Guard concept | 현재: g1 room@(13.2,6.8), g2 room@(18.5,15.5), g3 objective@(20.5,26.5), g4 exit@(26.2,21.2); 제안: 4명/2 CCTV. Camera의 gate 접근과 동쪽 검수 역할을 나누고 동일 gate 위에 두 cone을 겹치지 않는다. |
| CCTV concept | 현재: cam1@(19.7,10.6), cam2@(31.7,20.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | restrictedbanking 검사후 gate/authorization 각자 circuits, CCTVV9유지 |
| First LOS Break | Objective→제한 은행 구역의 직원 counter 끝→연결로 모서리 (22.25,24.25) 후보 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | east verification (28,24) 두 측면 중 경비를 관찰한 뒤 Exit (31.5,24) |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-07 — Cash Processing

**Audit: TUNE.** 넓은 현금 작업장은 table/cart/records/loading 업무 구역으로 나뉜다. 4명/1 CCTV다. 낮은 table와 cart의 LOS PASS를 완전 엄폐로 오해하지 않도록 동선 가독성을 확인한다.

현재 stage 의미 SHA256: `d36cb1315b6c910564ef6dd14d7ac66f928c2378e7df6101e6f3882e79c805d6`. 현재 guard coverage=0.0827, sampled safe exposure=0.0770, objective approach=0.1007, search approach=0.1500. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-07 |
| Title | Cash Processing |
| Mission Fantasy | 현금 분류 작업장의 각 업무 구역을 읽고 서쪽 자산을 꺼내 북쪽 loading 으로 반출한다. |
| Architecture | 남쪽 직원 입구→넓은 현금 작업장→서쪽 자산 구역 / 북쪽 dispatch |
| Main mechanic | 낮은 현금 작업대와 불투명 기록 bank 를 구분하는 긴 작업장 횡단 |
| Main Zones | South Staff Entrance / Cash Workfloor / West Asset Bay / North Loading |
| Entry | 현재/기본 유지: (16,29.5) bottom; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (4.5,18) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (18,2.5) top; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | workfloorrecordbankopaque 측면을연결한 outerworkinglane→westasset |
| Risk Route | tableassembly 사이직통 cashlane; 낮은 table 는방탄/시야가림아님 |
| Landmark | cash processing table (4.5,13) 목표직접 연결; sortingassemblies 와 cart work flow |
| Security Style | 4명/1 CCTV. 넓은 작업장을 cone으로 전부 덮지 않고 sorting junction과 CCTV 횡단으로 MEDIUM을 만든다. 작업대 수를 엄폐 수로 계산하지 않는다. |
| Guard concept | 현재: g1 room@(14,25.2), g2 corridor@(21.5,18.5), g3 objective@(6,18.5), g4 exit@(15.2,3.2); 제안: 4명/1 CCTV. 넓은 작업장을 cone으로 전부 덮지 않고 sorting junction과 CCTV 횡단으로 MEDIUM을 만든다. 작업대 수를 엄폐 수로 계산하지 않는다. |
| CCTV concept | 현재: cam1@(24.7,8.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | cash bay inspection 과 sorting/dispatch 지역 순회; table 뒤 hidden 으로취급금지 |
| First LOS Break | Objective→West Asset Bay opaque record/end wall→(16,18.5) 작업장 교차로 앞 대기 공간 후보; 실제 구조물 종류 검증 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | 중앙 records bank 어깨 (14.25,16.25)→북쪽 loading 작업 구역→Exit (18,2.5) |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-08 — Inner Security

**Audit: TUNE.** V9 command망과 실제 analysis 우회·별도 동쪽 verification을 보존한다. 5명/2 CCTV와 Native 보물 획득 전 CAUGHT는 관찰 타이밍 검토 근거이며 전면 재설계의 증거는 아니다.

현재 stage 의미 SHA256: `467bbf4067d23946703f9eeb58863c46fcdbfa56031f10c31990afe63c4641a4`. 현재 guard coverage=0.0589, sampled safe exposure=0.0820, objective approach=0.0518, search approach=0.1179. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-08 |
| Title | Inner Security |
| Mission Fantasy | 공공 직원 gate 에서 analysis 우회를 골라 monitor command 자료를 회수하고 동쪽 검수 문으로 빠진다. |
| Architecture | 남서쪽 공공 공간→직원 검문 또는 서쪽 analysis→command junction→북동쪽 monitor / 남동쪽 출구 |
| Main mechanic | Guard/CCTV 의 서로 다른 보안층과 실제 analysis 대안 통로 |
| Main Zones | Public Access / Staff Checkpoint / Controlled Junction / Monitor Records Command / East Verification / Analysis Bypass / Restricted Observation |
| Entry | 현재/기본 유지: (1.6,23) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (30,8.8) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (34.4,20) right; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | west analysis (4.75,12.25)→records 뒤→controlledjunctionside→directcommandroute |
| Risk Route | staff checkpoint (15.5,18)→junction 정면→northern observation→command |
| Landmark | Monitor Records Command; 실제 objective (30,8.8)는 command room 이고 landmarkmetadata (17,13.3)는 junction checkpoint 라 label review |
| Security Style | 5명/2 CCTV. 직원 gate·junction·command·동쪽 복귀를 별도 보안층으로 삼는다. Camera와 roaming 경비가 analysis 우회 전체를 덮지 않게 한다. |
| Guard concept | 현재: g1 room@(12.2,20.3), g2 corridor@(12.2,10.2), g3 objective@(26.2,3.2), g4 exit@(26.2,16.2), g5 roaming@(13.2,2.2); 제안: 5명/2 CCTV. 직원 gate·junction·command·동쪽 복귀를 별도 보안층으로 삼는다. Camera와 roaming 경비가 analysis 우회 전체를 덮지 않게 한다. |
| CCTV concept | 현재: cam1@(22.6,9.4), cam2@(34.6,15.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | command inspection→junction→east verification, analysis guard 는 ownoffice, 숨은 Player의 LKP 없음 |
| First LOS Break | Objective→command room records opaque end→east door (30.25,13.2) corner 후보 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | East Verification desk와 records→Exit (34.4,20); 허브를 거치는 대안 탈출 유지 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-09 — Vault Antechamber

**Audit: KEEP.** 보이는 Vault 문과 records 우회·남쪽 service가 실제 보물/landmark 소속에 맞는다. 5명/2 CCTV의 층별 연결 구조를 보존한다.

현재 stage 의미 SHA256: `bd8e07fc885536b5721c4a7eaf30ce359cb97805eb8d2ce6dc4658bccd861965`. 현재 guard coverage=0.0935, sampled safe exposure=0.0857, objective approach=0.0868, search approach=0.1368. Runtime routes=3, escape options=1. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-09 |
| Title | Vault Antechamber |
| Mission Fantasy | Vault 문을 관찰하고 records 우회로 antechamber 자산을 회수해 남쪽 서비스로 나간다. |
| Architecture | 동쪽 검수→북쪽 관찰 또는 records 우회→서쪽 antechamber / 남쪽 서비스 |
| Main mechanic | 금고 문 접근과 records 대안을 읽는 보안층 침입 |
| Main Zones | East Inspection / Observation Approach / Vault Antechamber / Records Detour / South Service Exit |
| Entry | 현재/기본 유지: (31.5,5) right; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (7,9) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (7,22.5) bottom; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | recordsdetour (17,16) 불투명 filing bank→antechamber 남쪽 어깨 |
| Risk Route | north observation (17,5)→vault 정면직통 |
| Landmark | Vault Door (7,2.65), antechamberasset (7,9)가문 security 와연결 |
| Security Style | 5명/2 CCTV. Vault 검사와 동쪽 checkpoint를 별도 층으로 나누며 records 우회에는 감시를 벗어나 관찰할 수 있는 공간을 둔다. |
| Guard concept | 현재: g1 room@(25.2,3.2), g2 room@(19.8,7.5), g3 objective@(4,9.5), g4 room@(19.5,14.2), g5 corridor@(4,18); 제안: 5명/2 CCTV. Vault 검사와 동쪽 checkpoint를 별도 층으로 나누며 records 우회에는 감시를 벗어나 관찰할 수 있는 공간을 둔다. |
| CCTV concept | 현재: cam1@(20.7,2.6), cam2@(11.7,2.6); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | vault 빈 asset→records/inspection/service independent circuits |
| First LOS Break | Objective→antechamber 문 (6.75,16.75)로 가기 전 vault-측면 불투명 bank 후보; 실제 geometry 미확정 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | South Service Exit records (7,19) 어깨→Exit (7,22.5); approach observation 반복 불필요 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증 |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

### 03-10 — Main Vault

**Audit: KEEP.** 사용자 '할 만함' 피드백을 유지한다. 실제 Vault 안 목표·여덟 zone·두 탈출이 있고 V101 safe index1/escape1/Walk/지연0에서 shared runtime CLEAR77.1s다. 1/48 CLEAR이며 Native CLEAR는 없어 넓은 성공 범위와 실기기 검증은 미완이다.

현재 stage 의미 SHA256: `e99001516a581c881fea0da710109f1a4cc2bac3968f6c311477dd7b53f9bcc2`. 현재 guard coverage=0.0628, sampled safe exposure=0.1210, objective approach=0.1006, search approach=0.1375. Runtime routes=3, escape options=2. 수치는 V101 proxy이며 사람의 통과율이 아니다.

| Field | Blueprint / retained runtime anchors |
| --- | --- |
| ID | 03-10 |
| Title | Main Vault |
| Mission Fantasy | 직원 검문부터 Vault 까지 층을 통과해 core 자산을 꺼내 동쪽 현금·records 회로로 돌아 나온다. |
| Architecture | 남서쪽에서 깊이 침입→북동쪽 Main Vault / 동쪽 processing→남쪽 records 로 별도 탈출 |
| Main mechanic | Bank 의 검문·관찰·금고·현금 반출을 통합하는 Chapter Summary |
| Main Zones | Staff Access / Security Checkpoint / Inner Security / Vault Antechamber / Main Vault / Cash Processing / Dispatch Junction / Records Evacuation |
| Entry | 현재/기본 유지: (1.6,28) left; 입구에서 관찰한 뒤 첫 횡단 |
| Objective | 현재/기본 유지: (32,7.2) vaultGem; landmark·전시·검수 공간에 소속시키며 단독 바닥 아이템 표현은 금지 |
| Exit | 현재: (11.6,37) left; 기본 위치 유지. 접근과 탈출을 서로 다른 공간에서 읽게 한다 |
| Safe Route | 현재 safe index1: staff checkpoint→inner security 기록 어깨→Vault Antechamber 서측 (12.2,8.7)→(12.2,3.3)→(21.7,3.3)→(13.25,4.25)→vault 연결 (24,6.5)→Objective. 현재는 antechamber 를 우회하는 cash 연결이 없으며 새 연결을 제안하지 않는다. |
| Risk Route | inner security→antechamber 정면→Main Vault; 보안축 timedcrossing |
| Landmark | Main Vault (32,3.2), objective (32,7.2)는 actual vault 실내 |
| Security Style | 현재 7명/3 CCTV를 동결한다. Vault·antechamber·junction을 차례로 관찰하고 Finale라는 이유로 속도나 수를 늘리지 않는다. |
| Guard concept | 현재: g1 room@(12.2,25.3), g2 corridor@(12.2,14.3), g3 room@(12.2,3.3), g4 objective@(27.3,4.8), g5 room@(29.2,17.3), g6 corridor@(24.2,29.3), g7 exit@(12.2,34.3); 제안: 현재 7명/3 CCTV를 동결한다. Vault·antechamber·junction을 차례로 관찰하고 Finale라는 이유로 속도나 수를 늘리지 않는다. |
| CCTV concept | 현재: cam1@(22.6,13.4), cam2@(11.4,2.4), cam3@(37.6,28.4); 제안: V9 detector 유지. 명시하지 않은 새 camera는 추가하지 않는다. 수정이 필요하면 설치 위치·순회 위상·coverage만 설계하고 정상 순찰/도난/실제 발견 상태를 각각 검증한다. |
| Theft flow | high security1.5s 공통 runtime 현재유지; discoveryguard 는빈 vault, otherszonecircuits; 숨은 Player의 LKP 없음 |
| First LOS Break | Objective→서쪽/동쪽 deposit bank opaque end→Cash Processing 문 (32.25,14.2) corner; 기존 대안 탈출 데이터 보존 [설계 후보/실제 LOS 검증 필요] |
| Escape flow | Cash Processing→Dispatch Junction 기존 opaque records bank→Records Evacuation→Exit (11.6,37); 연속 runtime에서 CLEAR한 경로 보존 |
| Difficulty Tier | 3 MEDIUM; 미션 번호에 따른 stat 상승 없음. 실제 체감 미검증; Finale 역할: Chapter Summary. 규모와 연출만 확장하며 별도 pressure bonus 없음. |
| Chapter identity | Layered bank: PUBLIC→STAFF→SECURITY→ASSET, office/records/cash/vault 의 실제 업무 동선. |

## Phase B 설계 승인 후 구현 순서

1. **01-08 objective relief**: current g2corridor/g3objective/cam1의 실제 cone sweeps 를 objective approach 와 pickup 직후에 캡처. Archive Checkpoint screen (14,5.4)와 북쪽 archive 연결을 불투명 대기 bay 로 나누고, cross 경비/inspection 경비의 역할을 서로 다른 security layer 에 둔다. 목표는 두경비동시 각도 회피가 아닌 checkpoint 관찰→pickup 관찰 순차 decision. .85s reaction, speed, CCTV detector 유지.
2. **01-10 exit relief**: current g4cloister/g5exit 및 다른 search sectors 가 (5,20) service threshold 에 모이는 시점 캡처. 기존 service screen (8,25.5) 주위 실제 body-clear 두 shoulder 와 대기 bay 를 확보하고 cloister/search/exit 의 초기 sector 를 겹치지 않게 분리. Exit 를 objective 옆으로 옮기거나 alarm 규칙을 약화하지 않는다.
3. **01-04 escape partial**: 정상 office→hub→gate 구조 유지, (14,5.5) 이후 단일축을 보호된검사대기 bay→north exit 두 beat 로 재구성. 현재 bounds 내 공간이 부족하면 해당 room footprint 만 부분변경안 제출. CLEAR0만으로 guard 제거/AI 변경하지 않는다.
4. **03-01 staff escape partial**: objective 와 tellerlandmark 를보존, 3.16tile straightgrab 를 staff verification corner 로 한보안층더거치게 설계. Medium 올리기위해 CCTV/guardspam 금지.
5. **02-10 finale cadence**: 보물 room/highsecurityescape 를일반 GalleryEASY+range 에서검증. opaquechamber/portrait/sidegallery bay 별 한 위협 read, search sectors 를 지역별로 분리; current7guard 가각 zone 경비인지 heading 허브중복인지 확인한다. 공동 search4s 예외나 chase178값은별도 systemconsistency 승인 필요.
6. 나머지 TUNE 는 authored opaque cover→junction→first break 체인의 geometry 와 phase 창을 측정 후 최소 수정. KEEP 는 구조 보존하고회귀확인. Full rebuild 로격상은 native/geometry 증거와 before/after 계획이있을때만.

## Required verification — 아직 실행하지 않음

- stage current semantic hash 를 저장해 Phase B diff 를 ID 별 추적; protected runtime/AI/tuning/other chapters unchanged 검사.
- normal patrol/theft-only/spotted→LKP/search 각각 securityoverlap 측정; theft-only 는 Player 현재좌표를대입하지않음.
- 모든 safe/risk/escape path 를 actual body nav 와 visual FakeGap 으로 확인. 임시 protectedpoint 를 nav teleport 로만들지않음.
- DebugOFF entry/objective/first break/exit screenshot, same world scale chapteroverview. Portrait/Glass/Museum/Bank style regression.
- representative completeheist Start→Objective→Theft→first LOS Break→Escape→CLEAR actual Simulator. CAUGHT/Retry 도별도확인. 실패면 APPBUG/TEST LIMITATION 을분리한다.
- actual iPhone Tilt 에서좁은 archive/Glassside/finale exit 를검증한뒤 EASY/EASY+/MEDIUM 의실제체감과 Chapter flatness 판정. simulatedwindow 만으로 선언금지.

## Source references

- Runtime: `src/game/levels/stages/campaignStages.json` (일치 좌표/role/route/landmark/asset source).
- Authoring: `tools/campaign/v5MuseumGalleryPlans.ts`, `v5BankPlans.ts`, `v3BankPlans.ts`, `museumFinalDesign.ts`, `galleryEnvironmentDesign.ts`, `curatedHeistFlows.ts`, `difficultyTuning.ts`.
- Design: `docs/LEVEL_DESIGN_BIBLE_V5.md`, `LEVEL_DESIGN_BIBLE_V3.md`, `MUSEUM_FINAL_DESIGN.md` (historical rationale; runtime보다 우선하지 않음).
- Evidence: `Reports/V101/pressure-final.json`, `pressure-final-analysis.md`, `matched-heist-pressure.json`, `matched-heist-analysis.md`, `native-playtest.json`, `verification.md` (Reports는ignored/local이며 runtimecode아님).

**Status: PHASE A CHAPTER 01–03 BLUEPRINT / AUDIT DRAFT FOR INTEGRATION.** Chapterpressure 순서달성/30native CLEAR/physicalTilt/PhaseB 완료를주장하지않는다.

## Appendix — 현재 runtime 의 정확한 route 좌표

이 목록은 V11 제안이 아니라 현재 JSON 의 authored reference 다. 짧은 design chain 은 주목할 지점만 설명하므로 이 목록의 연결 waypoint 를 생략한 직선 이동이 안전하거나 collision-clear 라고 해석하면 안 된다. Route 이름의 safe 는 데이터 라벨이며 사람 안전 인증이 아니다.

### Runtime route reference 01-01

- `safe`: (1.75,9.75) → (4,10) → (7,10) → (9.5,8) → (9.5,5.5) → (9.5,3) → (13.5,3) → (13.5,5.5) → (15,6.5)
- `risk`: (1.75,9.75) → (4,10) → (7,10) → (10,9) → (12.5,9) → (13.2,7.5) → (15,6.5)
- `escape[0]`: (15,6.5) → (16,7) → (16.2,8.8) → (18.5,8.8) → (19.25,8.75)

### Runtime route reference 01-02

- `safe`: (1.6,13) → (8.25,13.25) → (9.5,14.5) → (13.3,14.5) → (13.75,11.75) → (17,9) → (13.5,4.7) → (15.5,2.6)
- `risk`: (1.6,13) → (13.5,11) → (13.5,5) → (15.5,2.6)
- `escape[0]`: (15.5,2.6) → (17,6) → (17,12) → (19.75,13.25) → (23,14) → (25.4,13)
- `escape[1]`: (15.5,2.6) → (13.75,4.75) → (9.5,6.5) → (9.5,14.5) → (17,14.5) → (17.25,13.75) → (17.75,13.25) → (23,14) → (25.4,13)

### Runtime route reference 01-03

- `safe`: (2.5,1.5) → (2.5,5.8) → (5.5,5.8) → (5.5,9.3) → (9.5,9.3) → (9.5,11.5) → (11.5,11.5) → (11.5,9.5) → (12.5,8)
- `risk`: (2.5,1.5) → (2.5,5.8) → (5.5,5.8) → (9.5,6.5) → (9.5,9.3) → (9.5,11.5) → (11.5,11.5) → (11.5,9.5) → (12.5,8)
- `escape[0]`: (12.5,8) → (11.5,9.5) → (11.5,11.5) → (16.5,11.5)

### Runtime route reference 01-04

- `safe`: (1.75,10.25) → (3.5,10.5) → (6.375,10.5) → (7.75,9.75) → (8.75,8.75) → (8.25,7.75) → (6.75,7.75) → (9.5,7.5) → (9.5,5) → (12.5,5) → (13.5,6) → (13.7,7.3)
- `risk`: (1.75,10.25) → (3.5,10.5) → (6.5,10.5) → (8.25,9.25) → (9.5,7.5) → (9.5,5) → (12.5,5) → (13.5,6) → (13.7,7.3)
- `escape[0]`: (13.7,7.3) → (14,5.5) → (14,3) → (14,1.5)

### Runtime route reference 01-05

- `safe`: (1.6,17) → (10.25,17.25) → (11.5,18.5) → (16.2,18.5) → (16.25,15.75) → (17.25,14.75) → (20,14) → (20,8) → (20.75,7.25) → (23.25,7.25) → (23.75,7.75) → (24,9.5) → (24.25,6.75) → (28.2,5)
- `risk`: (1.6,17) → (9.25,16.75) → (16,14) → (17,9) → (15.75,7.25) → (15.75,5.75) → (17,4.7) → (21.75,5.75) → (24,6) → (28.2,5)
- `escape[0]`: (28.2,5) → (24,6) → (20.75,5.75) → (20,5.3) → (14,5.3) → (10.5,6.5) → (4,6.5) → (3.25,6.25) → (2.6,2.6)
- `escape[1]`: (28.2,5) → (24.25,6.75) → (24,9.5) → (23.75,7.75) → (23.25,7.25) → (20.25,7.25) → (20,8) → (19.75,5.75) → (16,4.4) → (12.75,4.75) → (10.5,3.3) → (4,3.3) → (2.6,2.6)

### Runtime route reference 01-06

- `safe`: (1.6,16) → (9.25,16.25) → (10.5,18) → (15.8,18) → (21,18) → (21.25,15.75) → (23,14.5) → (24.75,15.75) → (25.75,16.75) → (30.5,17.8) → (29.5,12)
- `risk`: (1.6,16) → (6.25,16.25) → (15.25,11.75) → (16.3,11) → (20.25,13.75) → (21,14.5) → (24.25,13.75) → (26,12) → (29.5,12)
- `escape[0]`: (29.5,12) → (25.5,12) → (24.25,13.75) → (23,14.5) → (21.25,13.25) → (20.5,9.5) → (17.25,7.25) → (16.5,6.5) → (17.75,5.25) → (19,5.3) → (18.75,5.25) → (17,2.5) → (17,1.6)
- `escape[1]`: (29.5,12) → (30.5,17.8) → (25.75,16.75) → (23.25,14.25) → (23,14.5) → (21.25,15.75) → (20.25,16.75) → (10.5,18) → (10.5,8.5) → (15.25,7.75) → (16.5,6.5) → (15.25,5.25) → (12.5,5.3) → (12.75,3.25) → (17,2.5) → (17,1.6)

### Runtime route reference 01-07

- `safe`: (8.5,1.5) → (7,3.5) → (7,6.5) → (4.5,6.5) → (4.5,13.5) → (4.5,16.5) → (12.5,16.5)
- `risk`: (8.5,1.5) → (10.25,2.75) → (10.5,3.5) → (10.5,6.5) → (12.5,6.5) → (12.25,11.75) → (12.5,13.5) → (12.5,16.5)
- `escape[0]`: (12.5,16.5) → (10.5,16.5) → (7,16.5) → (4.5,16.5) → (4.5,10) → (4.5,7.5) → (1.5,7.5)
- `escape[1]`: (12.5,16.5) → (12.5,10) → (9,10) → (4.5,10) → (4.5,7.5) → (1.5,7.5)

### Runtime route reference 01-08

- `safe`: (28.4,13) → (22,15) → (21.75,13.75) → (21.25,13.25) → (19.75,13.25) → (15.75,14.75) → (15.75,16.25) → (16.25,16.75) → (19,16.8) → (13.75,16.25) → (11,15) → (11,9.5) → (12.75,8.25) → (13,6) → (15.75,6.25) → (15.75,4.25) → (13,2.7) → (16.5,2.3)
- `risk`: (28.4,13) → (21.25,13.25) → (18.5,12) → (16.3,8) → (17,3) → (16.5,2.3)
- `escape[0]`: (16.5,2.3) → (13,3) → (15.75,4.25) → (15.75,6.25) → (13,9) → (10,12) → (7.25,11.25) → (6.25,10.25) → (3.25,10.75) → (3,12) → (3,15.8) → (5.25,16.25) → (5.75,16.75) → (6,18) → (5.25,21.75) → (6,23) → (5,24.4)
- `escape[1]`: (16.5,2.3) → (18.5,5.7) → (15.75,15.75) → (15.75,16.25) → (16.25,16.75) → (18.5,17) → (14.75,17.25) → (13.75,18.25) → (14,18.5) → (14,23.7) → (6,23.7) → (5,24.4)

### Runtime route reference 01-09

- `safe`: (1.6,21) → (10.5,21) → (16,21) → (15.25,20.75) → (15.25,18.25) → (18.5,14) → (15.3,10) → (15.3,5.5) → (23.5,5.5) → (24.25,8.25) → (27.75,10.75) → (28.2,15) → (31.5,13.5)
- `risk`: (1.6,21) → (6.25,21.25) → (9.25,19.75) → (11.25,17.25) → (11.25,14.75) → (14.25,14.75) → (14.5,15) → (19.75,8.75) → (20,8) → (25.5,9.5) → (27.25,10.25) → (30,14) → (31.5,13.5)
- `escape[0]`: (31.5,13.5) → (28.3,15.5) → (28.3,9) → (28.75,8.25) → (30.5,6.5) → (29.25,5.25) → (27.5,5) → (27.75,2.25) → (28.5,1.6)
- `escape[1]`: (31.5,13.5) → (32.5,15.5) → (32.5,8.5) → (30.75,6.75) → (31,6.5) → (31.25,4.75) → (31.25,3.25) → (31,2.5) → (28.5,1.6)

### Runtime route reference 01-10

- `safe`: (20,28.4) → (23.5,27) → (24,20.5) → (24.25,17.75) → (26,16.5) → (28.25,17.25) → (28.75,17.75) → (29.5,19.5) → (29.5,11) → (28.75,15.25) → (28.25,15.75) → (24.75,15.75) → (20.25,12.25) → (20,11) → (17.75,8.75) → (16.3,8.5) → (16.25,6.75) → (16.75,6.25) → (23,4.5)
- `risk`: (20,28.4) → (20.5,20) → (19.5,13) → (19.5,9) → (20.75,8.25) → (21.5,7) → (23,4.5)
- `escape[0]`: (23,4.5) → (16.3,5.3) → (15.25,6.75) → (12.5,7.3) → (3,10) → (2.25,17.25) → (3,18) → (4.25,18.25) → (4.75,18.75) → (5,20) → (4.75,21.25) → (3,25) → (1.6,25)
- `escape[1]`: (23,4.5) → (23.75,8.25) → (25,8.8) → (20.75,9.25) → (19.75,10.25) → (20,11) → (20.25,12.25) → (23,17) → (15.25,17.75) → (12,16.5) → (10.5,18) → (6.75,18.25) → (5,20) → (4.75,21.25) → (3,25) → (1.6,25)

### Runtime route reference 02-01

- `safe`: (2,14) → (4.25,12.75) → (9.75,13.25) → (10,14) → (14.25,12.25) → (16.75,9.25) → (22.05,5.6)
- `risk`: (2,14) → (4.25,12.75) → (11.25,9.75) → (22.05,5.6)
- `escape[0]`: (22.05,5.6) → (18.25,8.25) → (14.25,11.75) → (12.5,15.4)
- `escape[1]`: (22.05,5.6) → (18.25,8.25) → (14.25,11.75) → (13.75,12.75) → (10,14) → (12.5,15.4)

### Runtime route reference 02-02

- `safe`: (2,16) → (6.75,12.75) → (7.25,12.75) → (7.75,12.25) → (9,6) → (22.05,3.6)
- `risk`: (2,16) → (6.75,12.75) → (7.25,12.75) → (11.25,8.75) → (13.75,8.75) → (15.25,6.75) → (22.05,3.6)
- `escape[0]`: (22.05,3.6) → (7.6,4.5)
- `escape[1]`: (22.05,3.6) → (9,6) → (7.6,4.5)

### Runtime route reference 02-03

- `safe`: (1.6,14) → (9.25,14.25) → (9.75,14.75) → (10.5,16.8) → (15.2,16.8) → (20.25,16.25) → (21,14) → (21,9) → (18.25,10.75) → (16.25,10.75) → (16,7) → (15.25,4.75) → (14.25,4.25) → (11.25,4.25) → (10.75,5.25) → (10.8,5.7) → (10.75,4.75) → (11.75,4.25) → (17,3.5)
- `risk`: (1.6,14) → (10.75,14.25) → (14.75,12.75) → (16,12) → (16,6) → (17,3.5)
- `escape[0]`: (17,3.5) → (19.5,5.5) → (16.75,6.25) → (16.25,6.75) → (16.25,10.75) → (20.5,10.5) → (21.75,11.75) → (23,12.5) → (24.75,13.75) → (26,15.5) → (27.25,13.75) → (29.75,13.75) → (30,14) → (31.4,14)
- `escape[1]`: (17,3.5) → (11.25,4.25) → (10.75,5.25) → (10.8,6.2) → (10.75,4.75) → (11.75,4.25) → (14.75,4.25) → (15.25,5.25) → (14.25,13.25) → (10.5,16.8) → (21,16.8) → (21.25,13.75) → (23,12.5) → (29.75,13.75) → (30,14) → (31.4,14)

### Runtime route reference 02-04

- `safe`: (16,1.6) → (19,6) → (17.75,6.25) → (17.25,6.75) → (17.25,8.25) → (17.75,8.75) → (20.5,10) → (20.75,15.75) → (20.5,17) → (10.5,17) → (9.25,15.25) → (7.75,15.25) → (6.25,17.25) → (6.5,17.8) → (3.5,15)
- `risk`: (16,1.6) → (17.25,4.25) → (15.7,12) → (9,14.5) → (3.5,15)
- `escape[0]`: (3.5,15) → (6.5,17.8) → (7.25,15.75) → (7.75,15.25) → (9.25,15.25) → (10.5,17) → (15.25,17.25) → (16.5,19) → (20,26.5) → (23,24.5) → (29.25,25.75) → (30,26.5) → (31.4,25)
- `escape[1]`: (3.5,15) → (5.75,14.25) → (6.5,11.8) → (7.25,13.25) → (7.75,13.75) → (9.25,13.75) → (9.75,13.25) → (10.5,10) → (10.75,12.25) → (16.25,16.25) → (20.5,17) → (17.75,17.25) → (16.5,19) → (11.5,26.5) → (19.75,25.75) → (23,24.5) → (31.4,25)

### Runtime route reference 02-05

- `safe`: (29.4,14) → (20.75,14.25) → (20.25,14.75) → (20,17.5) → (12.5,17.5) → (12.5,9.5) → (14.25,8.75) → (14.75,8.25) → (14.75,6.75) → (12.75,5.25) → (11.5,3.5) → (10,5.5) → (2.3,9) → (4.5,5)
- `risk`: (29.4,14) → (16,13.8) → (17.25,13.25) → (16.75,8.75) → (16.25,8.25) → (16,6) → (9,5.5) → (4.5,5)
- `escape[0]`: (4.5,5) → (2.3,9.5) → (4.25,10.25) → (5.5,12) → (4.25,13.75) → (2.3,16) → (2.5,20) → (2.5,21.4)
- `escape[1]`: (4.5,5) → (7.5,9.5) → (5.25,11.75) → (5.5,12) → (6.75,13.75) → (7.5,14.5) → (7.75,18.75) → (7.75,20.75) → (7.5,21) → (2.5,20) → (2.5,21.4)

### Runtime route reference 02-06

- `safe`: (1.6,24) → (4.5,18) → (2.2,12) → (3.75,10.75) → (7.3,10.8) → (12.4,11) → (14,9.7) → (16.25,9.75) → (17.5,8) → (18.75,6.25) → (21.6,5.8) → (19,3.8)
- `risk`: (1.6,24) → (6.25,23.75) → (9.5,22) → (21.5,21) → (21.5,14) → (22.25,12.25) → (22.25,10.25) → (18.75,9.75) → (17.5,8) → (19,3.8)
- `escape[0]`: (19,3.8) → (21.6,5.8) → (18.75,6.25) → (17.5,8) → (18.75,9.75) → (22.25,10.25) → (22.25,12.25) → (21.5,14) → (21.5,19.5) → (24,19.5) → (26.3,20) → (32.4,20)
- `escape[1]`: (19,3.8) → (15.25,5.75) → (13.2,5.6) → (16.25,6.25) → (17.5,8) → (16.25,9.75) → (14.25,11.25) → (12,19.3) → (11.75,19.25) → (12.25,18.75) → (16.25,19.25) → (18.75,21.25) → (21.5,22) → (22.75,20.25) → (24,19.5) → (30.25,20.25) → (31.6,21.7) → (32.4,20)

### Runtime route reference 02-07

- `safe`: (17,27.4) → (21,26) → (18.25,21.25) → (18.25,19.75) → (18.75,19.25) → (21.5,19.2) → (11.5,19.2) → (11.5,13.5) → (8.75,14.25) → (6.75,16.25) → (2.3,16) → (4.5,11)
- `risk`: (17,27.4) → (14.75,24.75) → (15.25,22.75) → (16.75,21.25) → (16.5,19) → (17.25,12.75) → (17.25,11.75) → (16.5,11) → (12.25,11.75) → (9.5,13.5) → (4.5,11)
- `escape[0]`: (4.5,11) → (7.5,11) → (8.75,12.75) → (9.5,13.5) → (10.75,12.25) → (11.5,10.5) → (15.25,9.75) → (16.5,8.5) → (16,3) → (16,1.6)
- `escape[1]`: (4.5,11) → (2.3,16) → (2.75,14.25) → (9.5,13.5) → (18.75,19.25) → (21.5,19.2) → (22.25,18.75) → (21.5,10.5) → (17.75,9.75) → (16.5,8.5) → (18.5,6) → (16,3) → (16,1.6)

### Runtime route reference 02-08

- `safe`: (17,1.6) → (21.5,6.8) → (19.75,7.25) → (19.25,7.75) → (19.25,9.25) → (19.75,9.75) → (24.5,11) → (24.5,16) → (19,17) → (11.5,17) → (8.75,17.25) → (6.75,19.25) → (2.3,19.5) → (4.25,14.75) → (4.5,15)
- `risk`: (17,1.6) → (18.75,4.25) → (18.25,9.25) → (18,10.4) → (17.25,10.75) → (17.5,17) → (9.5,16.5) → (4.5,15)
- `escape[0]`: (4.5,15) → (6.75,17.25) → (7.5,19.5) → (8.25,17.75) → (8.75,17.25) → (11.5,17) → (18,17) → (20.25,20.75) → (24.5,23) → (27,21.5) → (28.75,22.75) → (29.5,26.5) → (31.75,24.75) → (36.4,25)
- `escape[1]`: (4.5,15) → (2.25,19.25) → (2.3,19.5) → (6.75,19.25) → (9.5,16.5) → (10.75,17.75) → (11.5,23) → (18.5,23) → (24.5,23) → (27,21.5) → (31.25,23.25) → (36.4,25)

### Runtime route reference 02-09

- `safe`: (1.6,12) → (4.25,11.25) → (7.25,11.25) → (8,12) → (10.25,11.75) → (13.5,8.5) → (14.75,7.25) → (24.5,6) → (27.5,9.5) → (29.25,13.25) → (30.5,21) → (28.75,21.25) → (27.25,23.25) → (27.5,23.5) → (26.75,21.75) → (26.25,21.25) → (25.25,20.75) → (24.75,7.75) → (24.25,7.25) → (14.75,7.25) → (14.25,7.75) → (14.25,9.25) → (15.75,14.25) → (15.25,21.25) → (14.75,21.25) → (14.25,21.75) → (14.25,24.25) → (16.75,26.75) → (24.5,29.8) → (18.5,27)
- `risk`: (1.6,12) → (4.25,13.25) → (10.25,13.25) → (10.75,13.75) → (11.3,17) → (11.75,21.25) → (12.25,21.25) → (13.5,23) → (14.75,24.75) → (16.75,26.75) → (18.5,26.8) → (18.5,27)
- `escape[0]`: (18.5,27) → (24.5,29.8) → (16.25,26.25) → (14.25,24.25) → (14.25,21.75) → (14.75,21.25) → (15.75,20.75) → (15.25,10.25) → (14.25,9.25) → (14.25,7.75) → (14.75,7.25) → (24.25,7.25) → (24.75,7.75) → (25.75,21.25) → (26.25,21.25) → (26.75,21.75) → (27.5,23.5) → (28.25,21.75) → (28.75,21.25) → (29.75,20.75) → (30.5,17) → (30.5,11) → (30.5,9.6)
- `escape[1]`: (18.5,27) → (15.75,29.25) → (11.5,29.8) → (13.25,22.75) → (13.5,23) → (12.25,21.25) → (11.75,21.25) → (11.3,10.5) → (13.5,8.5) → (14.75,7.25) → (24.5,6) → (27.5,9.5) → (30.5,9.6)

### Runtime route reference 02-10

- `safe`: (21,31.4) → (24.5,30.8) → (26.75,27.75) → (27,28) → (31.75,29.25) → (32.25,29.75) → (34.7,30.8) → (34.7,23.4) → (28.75,21.75) → (27,21) → (25.75,20.75) → (25.25,20.25) → (24.7,17) → (24.75,15.75) → (23.75,14.75) → (20.75,14.75) → (20.25,14.25) → (19.5,12) → (19.25,8.75) → (14.75,8.75) → (13.3,9.7) → (15.75,8.25) → (17.25,8.25) → (18.75,5.75) → (23,4.5)
- `risk`: (21,31.4) → (20.5,24) → (20.5,16) → (19.5,12) → (20.75,10.25) → (23,8) → (23,4.5)
- `escape[0]`: (23,4.5) → (13.75,5.25) → (13.4,6.5) → (10.8,6.5) → (2.3,8) → (1.75,8.25) → (1.75,9.75) → (3.75,11.25) → (4.25,11.25) → (5.5,12.5) → (4.75,14.25) → (4.25,14.75) → (2.3,15.3) → (2.3,21.7) → (5.25,22.25) → (6.5,24) → (5.25,25.75) → (2.3,29) → (1.6,29)
- `escape[1]`: (23,4.5) → (24.25,9.25) → (26.5,9.7) → (20.75,10.25) → (19.5,12) → (20.25,14.25) → (22.25,17.75) → (24.75,20.25) → (24.5,22) → (18.25,21.75) → (10.8,18.5) → (9.25,19.75) → (8.7,21.7) → (7.25,22.75) → (6.5,24) → (6.75,29.25) → (10.7,30.8) → (6.25,29.25) → (1.6,29)

### Runtime route reference 03-01

- `safe`: (2.5,6) → (4.25,7.75) → (6.75,8.5) → (16.25,7.5) → (17.5,7)
- `risk`: (2.5,6) → (4.25,7.75) → (9.25,8.5) → (18.75,7.5) → (17.5,7)
- `escape[0]`: (17.5,7) → (20.5,6)

### Runtime route reference 03-02

- `safe`: (13,19.5) → (11.75,18.5) → (4.25,18.5) → (3.75,14.25) → (4.75,13.25) → (4.75,9.25) → (4.25,8.5) → (13.75,8.5) → (15,8)
- `risk`: (13,19.5) → (14.25,18.5) → (11.75,18.25) → (7.75,13.75) → (5.75,13.75) → (5.25,13.25) → (5.25,9.75) → (5.75,9.25) → (16.25,8.5) → (15,8)
- `escape[0]`: (15,8) → (5.5,8.5) → (4.75,13.75) → (3.75,15.25) → (4.75,18.75) → (5.5,18.5) → (4.25,18.25) → (2.5,16)

### Runtime route reference 03-03

- `safe`: (6,2.5) → (4.25,3.75) → (4.75,6.5) → (10.75,5.25) → (14.75,5.75) → (15.25,6.5) → (15.75,8.75) → (15.25,13.25) → (15.75,14.75) → (15.25,15.5) → (21.25,13.25) → (25.25,13.75) → (25.75,14.5) → (27,14)
- `risk`: (6,2.5) → (7.75,3.75) → (7.25,6.5) → (6.25,7.75) → (6.25,10.25) → (8.25,11.75) → (8.25,13.25) → (7.25,15.5) → (9.75,13.25) → (15.25,13.25) → (17.75,15.5) → (20.75,13.25) → (27.75,13.75) → (28.25,14.5) → (27,14)
- `escape[0]`: (27,14) → (21.25,13.25) → (16.25,15.25) → (16.5,15.5) → (20.75,13.25) → (23.25,13.25) → (26.75,15.75) → (27.25,19.25) → (29.25,20.75) → (29.25,22.75) → (27,24.5) → (27,25.5)

### Runtime route reference 03-04

- `safe`: (24.5,15) → (19.75,16.5) → (18.25,15.75) → (17.75,15.25) → (16.75,8.75) → (15.75,7.5) → (13.25,5.25) → (8.25,5.75) → (5.25,7.5) → (6.5,7)
- `risk`: (24.5,15) → (22.25,16.5) → (16.25,15.25) → (14.75,15.25) → (11.75,19.5) → (10.25,17.75) → (10.75,15.25) → (10.75,12.75) → (10.25,12.25) → (9.75,10.5) → (7.75,7.5) → (6.5,7)
- `escape[0]`: (6.5,7) → (11.25,5.25) → (13.25,5.25) → (16.75,7.75) → (17,7.5) → (15.75,7.25) → (15.25,3.75) → (17,2.5)

### Runtime route reference 03-05

- `safe`: (2.5,13) → (4.75,15.5) → (10.25,13.25) → (12.25,13.25) → (14.75,15.5) → (22.25,17.25) → (25.75,19.5) → (27.25,17.75) → (26.75,9.75) → (25.75,8.5) → (27,8)
- `risk`: (2.5,13) → (4.25,14.25) → (7.25,15.5) → (9.75,13.25) → (13.25,13.25) → (17.25,15.5) → (18.25,13.25) → (18.25,11.75) → (15.75,10.75) → (15.25,10.25) → (15.25,7.75) → (16.75,6.5) → (18.75,5.25) → (22.25,5.25) → (28.25,8.5) → (27,8)
- `escape[0]`: (27,8) → (27,19.5) → (22.75,17.75) → (22.25,17.25) → (16.75,17.25) → (16.25,17.75) → (16.25,21.25) → (17.75,22.75) → (17.25,24.75) → (16,25.5) → (16,26.5)

### Runtime route reference 03-06

- `safe`: (16,2.5) → (14.25,3.75) → (14.75,6.5) → (11.75,5.25) → (5.75,5.25) → (5.25,5.75) → (3.75,15.75) → (4.25,16.5) → (4.75,18.75) → (4.25,23.5) → (9.75,22.25) → (12.25,22.25) → (15.75,26.5) → (17,26)
- `risk`: (16,2.5) → (17.75,3.75) → (17.25,6.5) → (16.25,7.75) → (16.25,10.25) → (18.25,11.75) → (18.25,13.75) → (17.25,15.5) → (17.25,22.25) → (18.25,23.25) → (18.25,26.5) → (17,26)
- `escape[0]`: (17,26) → (22.25,24.25) → (25.25,24.25) → (28.5,26.5) → (31.5,24)

### Runtime route reference 03-07

- `safe`: (16,29.5) → (14.75,28.5) → (15.75,22.75) → (15.75,19.75) → (14.75,18.5) → (3.25,18.5) → (4.5,18)
- `risk`: (16,29.5) → (17.25,28.5) → (16.25,22.75) → (16.25,19.75) → (17.25,18.5) → (5.75,18.5) → (4.5,18)
- `escape[0]`: (4.5,18) → (16,18.5) → (14.25,16.25) → (14.25,14.25) → (14.75,13.75) → (15.25,13.75) → (15.75,13.25) → (18.5,6.5) → (19.75,5.25) → (19.25,3.25) → (18,2.5)

### Runtime route reference 03-08

- `safe`: (1.6,23) → (3.75,19.25) → (3.5,18) → (3.75,16.75) → (2.2,14) → (8,12.5) → (11.25,11.75) → (12.2,11) → (22.75,11.75) → (23.5,12.5) → (25.25,11.75) → (26.3,10.7) → (28.75,9.75) → (30,8.8)
- `risk`: (1.6,23) → (9.5,22.5) → (18.25,25.25) → (19,25.2) → (19.25,23.25) → (15.75,20.75) → (15.5,18) → (16.75,16.25) → (19.25,14.25) → (21.7,14) → (23.5,12.5) → (28.75,9.75) → (30,8.8)
- `escape[0]`: (30,8.8) → (31.75,10.25) → (33.7,10.7) → (31.75,11.25) → (30.25,13.25) → (30.5,13.5) → (31.25,15.25) → (31.75,15.75) → (33.7,16.3) → (33.7,20) → (34.4,20)
- `escape[1]`: (30,8.8) → (28.25,10.25) → (26.3,10.7) → (25.25,11.75) → (23.5,12.5) → (22.25,13.75) → (22.25,16.25) → (21.8,16) → (22.25,16.25) → (22.25,13.75) → (25.75,11.25) → (29.25,11.25) → (29.75,11.75) → (29.75,15.25) → (25.25,18.75) → (23.5,19.5) → (26.3,20) → (34.4,20)

### Runtime route reference 03-09

- `safe`: (31.5,5) → (26.75,7.5) → (24.25,5.25) → (20.75,5.25) → (17.25,8.75) → (16.25,18.5) → (13.75,15.75) → (7.75,15.75) → (7.25,15.25) → (6.75,10.75) → (5.75,9.5) → (7,9)
- `risk`: (31.5,5) → (29.25,7.5) → (23.75,5.25) → (20.75,5.25) → (18.75,7.5) → (14.25,5.25) → (11.75,5.25) → (9.25,6.75) → (8.75,7.25) → (8.25,9.5) → (7,9)
- `escape[0]`: (7,9) → (6.75,16.75) → (5.25,18.25) → (5.75,20.25) → (7,21.5) → (7,22.5)

### Runtime route reference 03-10

- `safe`: (1.6,28) → (9.5,27.5) → (11.25,28.25) → (11.75,28.75) → (12.2,29.8) → (12.2,25.3) → (14.75,25.75) → (15.75,25.75) → (16.5,22.5) → (15.75,20.75) → (15.25,20.25) → (12.25,20.25) → (12.2,19.7) → (12.2,14.3) → (16.25,13.75) → (17.5,12) → (16.75,9.75) → (16.25,9.25) → (12.2,8.7) → (12.2,3.3) → (21.7,3.3) → (13.25,4.25) → (13.25,6.75) → (24,6.5) → (26.75,5.75) → (30.25,5.75) → (30.75,7.25) → (28.25,9.25) → (27.75,9.25) → (27.3,11.8) → (27.75,9.25) → (32,7.2)
- `risk`: (1.6,28) → (9.5,27.5) → (15.75,25.75) → (16.5,22.5) → (15.75,20.75) → (15.25,20.25) → (12.25,20.25) → (12.25,18.25) → (13.25,15.75) → (16.75,13.25) → (16.5,12) → (16.5,8.3) → (24,6.5) → (26.75,5.75) → (30.25,5.75) → (32,10) → (32,7.2)
- `escape[0]`: (32,7.2) → (34.25,11.25) → (36.7,11.8) → (33.75,12.25) → (32.25,14.25) → (32.5,14.5) → (33.25,16.25) → (33.75,16.75) → (34.75,16.75) → (36.75,21.25) → (36.7,23.8) → (33.75,24.25) → (32.25,26.25) → (32.5,26.5) → (31.75,28.25) → (30.75,29.25) → (25.25,29.25) → (24.2,34) → (22,35.5) → (16.25,36.75) → (12.2,37) → (11.6,37)
- `escape[1]`: (32,7.2) → (27.75,9.25) → (27.3,11.8) → (31.25,12.25) → (31.75,12.75) → (32.5,14.5) → (31.75,16.25) → (31.25,16.75) → (29.75,16.75) → (29.2,17.3) → (29.25,21.25) → (30.25,22.25) → (30.25,23.75) → (29.75,24.25) → (28.8,24.2) → (31.25,24.25) → (31.75,24.75) → (32.5,26.5) → (33.25,34.25) → (36.7,34.4) → (24.2,34) → (22,35.5) → (19.7,37) → (11.6,37)
