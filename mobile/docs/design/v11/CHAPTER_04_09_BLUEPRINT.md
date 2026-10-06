# V11 — Chapter 04–09 구조 Blueprint

**상태: Phase A / 검토용 설계. Runtime 변경 없음.**

## 근거와 범위

- 기준: 사용자 V11 §§30–57, 43의 19개 필드, 49–51의 공통 보안 계약.
- 확인한 현재 소스: `src/game/levels/campaignCatalog.ts`, `src/game/levels/stages/campaignStages.json`, `docs/LEVEL_DESIGN_BIBLE_V5.md`, 이전 `docs/CAMPAIGN_BLUEPRINT_90.md`.
- 현재 Ch04–09는 각각 **5개, 총 30개** 데이터만 존재한다. 아래 01–05는 실제 JSON title을 보존한 **재해석 제안**, 06–10은 **신규 설계**다. 어느 행도 현재 Runtime이 이 구조를 구현했거나 통과했다는 뜻이 아니다.
- 이전 90미션 표의 Mission 번호별 Guard/Zone 증가 규칙은 이 문서에서 폐기한다. 모든 Mission은 자기 Chapter의 동일 난이도 대역을 사용한다. 10번은 단원을 연결하는 종합 공간이며 추가 난이도 배율이 아니다.
- 방향은 북/남/동/서의 위상 설계다. 좌표·tile 치수·Nav polygon은 Phase B에서 실제 player radius와 Tilt margin을 사용하여 작성한다. 통로 여유가 확보되기 전 안전 경로를 PASS로 선언하지 않는다.

## 공통 구현 계약과 실패 조건

**목적 / 경험:** 볼 수 있는 위협을 관찰하여 이동 또는 대기를 선택한다. 발각 후에도 시야를 끊고 수색을 피하여 탈출할 수 있어야 한다.

**입력:** 기존 Tilt/Touch 이동, 기존 정지/FREEZE 입력만 사용. 문 열기, 해킹, 스위치, 엘리베이터, 새 소음 유인, 실제 층 이동 등 새 verb를 요구하지 않는다. 문/게이트는 기존 통과 가능한 입구와 고정 architecture로 표현한다.

**출력:** Entry → Approach → Security Crossing → Objective → Theft → First LOS Break → Escape → Exit. Safe와 Risk는 같은 Objective를 향하는 서로 다른 이동 판단이며 구매/키 획득 조건이 없다.

**공통 보안:** Theft는 도난 사실만 전달하며 Player 위치를 공유하지 않는다. 실제 Guard/CCTV Spotted에서만 snapshot LKP를 생성한다. 수색은 지정 sector를 탐색하고 LOS 없이 live target을 추적하지 않는다. Direct Chase AI/speed와 CCTV V9 detection tuning은 동결한다. Chapter별 차이는 배치·관찰 단계·route와 sector에서 만든다. 아래 '봉쇄'는 기존 alert/search 압박의 공간적 연출이며 동적 벽/잠기는 문을 새로 구현하라는 뜻이 아니다.

**HUD:** Phase B에서는 모든 Chapter에 공통 Theft/Spotted/Search/Exit 피드백을 적용한다. Escape Timer는 공통 시스템 문서의 확정 조건을 따른다. Timer 표시 차이로 난이도를 만들지 않는다. Countdown 0을 임의로 Game Over로 바꾸지 않는다.

**실패:** 기존 Capture Radius 접촉으로 CAUGHT. 그림상 틈은 보이는데 collision 때문에 막힘, 안정적으로 기다릴 곳 없이 전 방향 감시, pickup 직후 다음 cover까지 항상 잡힘, Theft만으로 Player LKP 생성은 설계/구현 실패다.

**Edge cases:** pickup과 Spotted가 같은 프레임이면 두 event의 의미를 유지하고 중복 whistle/audio만 방지한다. 한 Guard의 LOS break가 다른 Guard에게 발견된 상태를 지우지 않는다. 유리 뒤는 collision BLOCK/LOS PASS이므로 안전 pocket으로 계산하지 않는다. 낮은 테이블·plinth·rope도 검증 없이 Full Cover로 계산하지 않는다. 이 문서의 실질 LOS break는 불투명 벽/기둥/높은 구조물의 뒤다. Search 회피에서 timer 만료/Guard return까지 기존 규칙 그대로 사용한다.

**Assets / 성능:** Ch04 Lab와 Ch05 Casino는 현재 승인 Kit 우선. Ch06–09에는 승인된 독립 Kit를 가정하지 않으며 후속 제작 dependency만 기록한다. 현재 generic prop을 완성 에셋으로 취급하지 않는다. 새 이미지 생성·맵 생성·Runtime code 변경 없음. Guard/CCTV 개수는 아래 예산의 범위 안에서도 총 coverage를 보고 선택한다.

## Chapter별 Difficulty Budget — 설계 목표 / 미검증

수치는 **동일한 route/속도/관찰 조건으로 비교할 향후 설계 목표**다. 기존 측정치에 맞춰 숫자를 역산하지 않았다. 단일 압력 합산 점수를 만들지 않는다. 아래는 관찰할 독립 축이며 실기기 체감 검증을 대체하지 않는다. Ch01–03 예산은 별도 Blueprint와 통합하여 `Ch1<…<Ch9`를 검토한다.

| Chapter | Tier / 정체성 | 한 Chapter 내부 대역 | Guard 설계 후보* | CCTV 후보* | Safe crossing 여유** | 수색 공간 부담*** |
|---|---|---|---|---|---|---|
| 04 Lab | 4 MEDIUM+ / 보이지만 갈 수 없는 유리 연구망 | Chapter 내 상대 체감 목표 0.95–1.05 | 3–5 | 1–3 | 1.3–1.8 이동시간 | 2개의 서로 다른 연구 sector |
| 05 Casino | 5 MEDIUM-HIGH / 다방향 open floor와 cover islands | Chapter 내 상대 체감 목표 0.95–1.05 | 3–6 | 2–3 | 1.25–1.65 이동시간 | 2–3개 pit/서비스 sector |
| 06 Mansion | 6 MEDIUM-HIGH+ / 문·코너·방 전이 | Chapter 내 상대 체감 목표 0.95–1.05 | 3–5 | 1–3 | 1.2–1.6 이동시간 | 3개 방군, 회복 방 유지 |
| 07 Warehouse | 7 HARD / 긴 lane와 횡단 roaming | Chapter 내 상대 체감 목표 0.95–1.05 | 4–6 | 2–4 | 1.15–1.5 이동시간 | 3개 aisle sector, 끝단 우회 유지 |
| 08 Security HQ | 8 VERY HARD / Guard+CCTV 네트워크 | Chapter 내 상대 체감 목표 0.95–1.05 | 4–7 | 3–5 | 1.1–1.4 이동시간 | 3–4개 보안 sector, 시간차 재관찰 |
| 09 High Security Vault | 9 FINAL/HIGHEST / 보안층 종합 | Chapter 내 상대 체감 목표 0.95–1.05 | 4–7 | 3–5 | 1.1–1.35 이동시간 | 4개 구획, 같은 안전 pocket 동시봉쇄 금지 |

* 개수는 Mission ordinal 규칙이 아니다. 작은 방/짧은 lane는 하한을 선택하고 CCTV 기여가 크면 Guard를 줄인다. 넓은 Finale는 count만 늘리기보다 담당 구역을 분리하고 휴식 구간을 늘린다. Guard 최대 7은 이 Blueprint 후보 상한이지 현재 Runtime의 검증된 성능 보장도 아니다.

** `safe crossing 여유 = 다음 위협 노출 전 관찰 가능한 안전 시간 / 해당 crossing의 실제 이동시간`. 각 대역 최소값은 Tilt overshoot·입력 지연을 흡수할 가설이다. 좁은 공간에서 이를 줄여 압력을 올리지 않는다. 구간을 분리하고 대기 pocket을 늘린다. Global sensing/detection 속도는 바꾸지 않는다.

*** Sector 수는 동시 Full LOS overlap 수가 아니다. 검색 방향의 선택 부담을 키우되, 추적되지 않은 Player의 경로를 사전에 알고 배치하지 않는다.

**상승 근거:** Lab은 유리의 통과/시야 차이를, Casino는 같은 위치에서 여러 방향을, Mansion은 다음 방 선택을, Warehouse는 긴 노출 lane와 roaming 재접근을, HQ는 서로 보완하는 감시망을, Vault는 연속 보안층과 탈출 재계획을 요구한다. 속도 buff가 아닌 관찰·경로 결정을 추가하는 Chapter 순서다.

**flatness 검증 계획:** 모든 10개 Mission의 같은 고정 속도 Safe/Risk 전체 heist를 동등 가중치로 비교한다. Entry만 또는 월드면적 평균만으로 판정하지 않는다. 같은 Chapter 안 최악 Mission이 budget을 벗어나면 room/cover/search 구조를 수정하고 10번이라는 이유로 예외를 허용하지 않는다. 실기기 Chapter 평균 상승이 확인되기 전 난이도 정규화 VERIFIED 선언 금지.

## 현재 30개 ID의 제목 출처

JSON의 `title`과 catalog 내부 `names`가 다르다. 아래는 실제 map title을 보존한다. UI에 어느 이름이 표시되는지 수정하는 작업은 아니다. 별칭 통일은 별도 승인 범위다.

| ID | JSON title (Blueprint 보존) | catalog 별칭 (현재) |
| 04-01 | Observation Lobby | COLD ENTRY |
| 04-02 | Research Wing | INNER ORBIT |
| 04-03 | Specimen Lab | FALSE SIGNAL |
| 04-04 | Containment Sector | CONTAINMENT |
| 04-05 | Prototype Chamber | THE PROTOTYPE |
| 05-01 | Hotel Reception | SMALL STAKES |
| 05-02 | Gaming Floor | TABLE HOP |
| 05-03 | Service Lounge | HOUSE DISTRACTION |
| 05-04 | VIP Salon | VIP PRESSURE |
| 05-05 | Royal Jewel Room | THE ROYAL JEWEL |
| 06-01 | Garden Vestibule | SIDE ENTRANCE |
| 06-02 | Drawing Room | THE LONG HALL |
| 06-03 | Library Wing | UPSTAIRS ECHO |
| 06-04 | Family Apartments | NIGHT WATCH |
| 06-05 | Heirloom Gallery | THE HEIRLOOM |
| 07-01 | Loading Entrance | LOADING BAY |
| 07-02 | Cargo Sorting | STACKED SHADOWS |
| 07-03 | Storage Aisles | WRONG AISLE |
| 07-04 | Inspection Bay | CARGO CHECK |
| 07-05 | Secured Shipment | LAST SHIPMENT |
| 08-01 | Security Reception | CONTROL DESK |
| 08-02 | Monitoring Room | SERVER LOOP |
| 08-03 | Server Wing | BLIND FEED |
| 08-04 | Restricted Corridor | RESTRICTED WING |
| 08-05 | Black Site Archive | BLACK SITE ARCHIVE |
| 09-01 | Outer Checkpoint | OUTER SEAL |
| 09-02 | Vault Antechamber | INNER CHAMBERS |
| 09-03 | Mechanism Hall | DECOY CORRIDOR |
| 09-04 | Security Ring | LOCKDOWN ROUTE |
| 09-05 | Master Diamond Chamber | THE MASTER DIAMOND |

## 작성 형식

각 Mission은 §43의 **19개 필드**를 모두 갖는다. '기존 ID 재해석'은 title/Heist theme를 보존한 미래 구조 제안이며 runtime layout을 복사했다는 의미가 아니다. 06–10은 새 map과 ID 추가가 필요한 계획이다. 각 Safe Route는 cover → crossing → cover 판단을 명시하고 각 Escape는 Objective 이후 최소 한 security crossing과 junction을 포함한다.

## Chapter 04 — LAB


### 04-01 — Observation Lobby

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 04-01
- **Title:** Observation Lobby
- **Mission Fantasy:** 관찰창 너머 시제품을 보고 실제 접근 입구를 찾는다.
- **Architecture:** L자 lobby와 유리 observation bay, 불투명 equipment spine의 양옆 루프.
- **Main Zones:** 서부 접수 → 관찰로 → 실험 bay → 동부 반출실.
- **Entry:** 서쪽 접수 alcove.
- **Objective:** 북쪽 observation tank 부속 sample case.
- **Exit:** 동쪽 반출실, 접수와 다른 corridor.
- **Safe Route:** 접수 벽 → spine 서단 대기 → 북문 → case; 유리 뒤를 cover로 착각하지 않는다.
- **Risk Route:** bay 남쪽 열린 관찰선을 한 번에 횡단.
- **Landmark:** Observation Tank가 목적물의 위치와 실험 bay 입구를 설명.
- **Security Style:** 접근 관찰선과 반출 crossing을 시간 분리.
- **Guard concept:** bay 순찰, spine 회전 확인, 반출 확인 역할; objective 상시 이중 경계 금지.
- **CCTV concept:** 관찰창 위 camera가 bay 입구만 sweep; spine 뒤 opaque pocket 제외.
- **Theft flow:** case 발견 후 bay와 접수 인접 sector 수색; 유리로 보이기만 하는 숨은 Player 위치는 공유 금지.
- **First LOS Break:** case 서쪽 불투명 tank service shroud.
- **Escape flow:** shroud → 남쪽 junction → 동부 반출실; 북부 bay 역주행 대신 독립 exit leg.
- **Main mechanic (보충):** 유리 관찰선과 실제 bay 입구 구분.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-02 — Research Wing

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 04-02
- **Title:** Research Wing
- **Mission Fantasy:** 연구 장비 둘레의 두 radial aisle 중 안전한 접근선을 고른다.
- **Architecture:** offset ring형 research floor, 방사형 aisle 두 개와 서측 console room.
- **Main Zones:** 서부 검수 → 외주 ring → console room → 북부 coolant aisle.
- **Entry:** 서쪽 검수실.
- **Objective:** 동쪽 Research Console의 탈착 prototype tray.
- **Exit:** 북쪽 coolant 반출문.
- **Safe Route:** 외주 ring 높은 rack 두 개 → console 서문; 정지 pocket에서 반대편 순찰을 본다.
- **Risk Route:** 중앙 장비 사이 radial aisle로 직진, 먼 CCTV와의 타이밍 선택.
- **Landmark:** Research Console이 ring 안쪽의 장비를 제어하며 target을 보유.
- **Security Style:** 동시 cone 교차는 중앙 risk crossing에 한정.
- **Guard concept:** 외주 순찰, console 옆 확인, 북부 exit patrol을 서로 다른 시간대로 배치.
- **CCTV concept:** ring 남쪽 mount가 radial crossing 관찰; 외주 opaque rack에 관찰 휴식.
- **Theft flow:** tray 발견 → console와 ring 남북 sector로 분산, 미발각 Player를 추적하지 않음.
- **First LOS Break:** console room 북쪽 opaque service column.
- **Escape flow:** column → coolant aisle → ring 북부 junction → 반출문; 두 radial aisle가 탈출 선택지.
- **Main mechanic (보충):** ring 외주 대기와 radial aisle timing 선택.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-03 — Specimen Lab

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 04-03
- **Title:** Specimen Lab
- **Mission Fantasy:** 유리 옆 복도가 shortcut처럼 보여도 specimen room의 실제 문으로 진입한다.
- **Architecture:** paired workcell와 불투명 sample storage, 유리 관찰 통로의 S자 연결.
- **Main Zones:** 남부 입고 → workcell A → specimen room → workcell B → 서부 포장.
- **Entry:** 남쪽 입고 alcove.
- **Objective:** 동쪽 Specimen Cylinder service case.
- **Exit:** 서쪽 포장실.
- **Safe Route:** sample rack 뒤 → cell A opaque corner → 실제 북문 → cylinder.
- **Risk Route:** 유리 관찰로에 노출된 채 cell 사이 crossing; 유리는 통과 못함을 명확 표시.
- **Landmark:** Specimen Cylinder와 label이 보물의 연구 용도를 표현.
- **Security Style:** 시각적 접근성과 실제 Nav 차이를 읽는 crossing.
- **Guard concept:** cell별 확인 순찰과 포장 junction roaming; 긴 opaque aisle에는 중복 감시 줄임.
- **CCTV concept:** 유리 관찰로 끝 mount가 두 workcell 전면만 관찰; 실제 문 대기 pocket은 벽 뒤.
- **Theft flow:** 도난 sample 확인 → cell A/B의 작업대 sector 수색; 관찰창을 통해 실제 발견될 때만 LKP.
- **First LOS Break:** cylinder 남쪽 불투명 sample rack.
- **Escape flow:** rack → cell B 뒤 service corner → 포장 junction → 서부 exit; entry와 다른 작업실 통과.
- **Main mechanic (보충):** workcell 실제 문과 관찰 glass의 차이 읽기.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-04 — Containment Sector

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 04-04
- **Title:** Containment Sector
- **Mission Fantasy:** 격리실 중앙 array를 우회하여 반대편 service aisle로 시제품을 반출한다.
- **Architecture:** 불투명 중앙 containment core와 유리 observation arm 네 개의 cross.
- **Main Zones:** 동부 admission → 남부 검수 → containment → 북부 service → 서부 관찰 recess.
- **Entry:** 동쪽 admission.
- **Objective:** 중앙 Containment Array 내부 접근 bay의 prototype.
- **Exit:** 북쪽 service exit.
- **Safe Route:** 남쪽 arm opaque 검수벽 → array 남문 → bay, 진입 전 북쪽 arm 순찰을 관찰.
- **Risk Route:** 동쪽 유리 arm crossing을 이용한 짧은 array 접근.
- **Landmark:** Containment Array가 목적 bay와 네 arm의 실제 통로를 결정.
- **Security Style:** 네 방향 관찰은 각 arm의 회전으로 stagger; 중앙 모든 방향 상시 overlap 금지.
- **Guard concept:** 입고 patrol, 두 arm 교대 순찰, 북 service 확인; 좁은 arm는 낮은 후보 count.
- **CCTV concept:** 대각 arm 끝 camera 두 개 phase를 엇갈리게, array 뒤 불투명 recess를 남김.
- **Theft flow:** array alarm → admission/observation/service를 다른 sector로 조사.
- **First LOS Break:** array 서쪽 opaque maintenance housing.
- **Escape flow:** housing → 서부 recess → 북쪽 arm junction → service exit; east entry로 되돌아가지 않음.
- **Main mechanic (보충):** cross 네 arm를 단계적으로 관찰.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-05 — Prototype Chamber

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 04-05
- **Title:** Prototype Chamber
- **Mission Fantasy:** 두 experiment loop 사이 보호 spine을 이용해 reactor prototype을 훔친다.
- **Architecture:** 쌍둥이 experiment loop와 중앙 opaque equipment spine, 동측 dispatch bay.
- **Main Zones:** 남부 prep → 서부 experiment loop → reactor room → 동부 loop → dispatch.
- **Entry:** 남쪽 prep corner.
- **Objective:** 북서 Prototype Reactor의 service pedestal.
- **Exit:** 동쪽 dispatch.
- **Safe Route:** prep → spine 남단 → 서부 loop 외주 → reactor 측문.
- **Risk Route:** loop 중앙의 유리 bridge 접근, 양쪽 순찰 turn을 연속 읽음.
- **Landmark:** Prototype Reactor가 목적물과 spine 분기의 방향 landmark.
- **Security Style:** 두 loop에 보안 분담; 종전 5번 capstone pressure를 Chapter 평균으로 재해석.
- **Guard concept:** 각 loop patrol과 spine junction 확인; reactor와 dispatch를 같은 Guard cluster로 만들지 않음.
- **CCTV concept:** loop 연결부 camera는 유리 bridge를 보고 reactor 측면 cover는 제외.
- **Theft flow:** reactor 빈 pedestal 확인 → 두 loop search sector 분리; Player 위치 공유 없음.
- **First LOS Break:** reactor 뒤 불투명 coolant cabinet.
- **Escape flow:** cabinet → spine 북단 junction → 동쪽 loop 외주 → dispatch; 한 loop를 더 해석하는 escape.
- **Main mechanic (보충):** 두 loop와 opaque spine의 독립 탈출 연결.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-06 — Cryo Transfer

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 04-06
- **Title:** Cryo Transfer
- **Mission Fantasy:** 서늘한 cryo pod 열 사이에서 specimen을 transfer bay로 반출한다.
- **Architecture:** 세 cryo alcove가 직선 주복도와 평행 service lane에 붙은 comb.
- **Main Zones:** 서부 receiving → cryo row → transfer bay → 남부 coolant return.
- **Entry:** 서쪽 receiving.
- **Objective:** 가운데 cryo pod의 cyan sample tray.
- **Exit:** 남쪽 coolant loading.
- **Safe Route:** service lane 불투명 thermal wall → 중앙 alcove 측면 → tray.
- **Risk Route:** cryo row 전면의 긴 glass sightline으로 접근.
- **Landmark:** 중앙 Cryo Unit의 cylinder와 transfer chute가 보물 위치를 고정.
- **Security Style:** 긴 전면 LOS와 짧은 측면 opaque cover를 대비.
- **Guard concept:** row 왕복, transfer turn, coolant junction 역할; alcove 안 상시 Guard 배치 안함.
- **CCTV concept:** row 양끝 중 한쪽 camera가 pod 전면 sweep, 서비스 통로는 opaque wall로 차단.
- **Theft flow:** tray 확인 → receiving과 transfer row 탐색; coolant에 즉시 Player target 부여 금지.
- **First LOS Break:** 중앙 pod의 뒤쪽 불투명 thermal enclosure.
- **Escape flow:** enclosure → 동쪽 transfer corner → 남부 coolant junction → loading.
- **Main mechanic (보충):** cryo 전면 노출과 후면 thermal cover 비교.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-07 — Sample Storage

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 04-07
- **Title:** Sample Storage
- **Mission Fantasy:** 보이는 냉장 storage의 실제 aisle를 택해 registry prototype을 찾아 반출한다.
- **Architecture:** 네 storage workcell이 ㄷ자 장비벽과 단일 넓은 cross aisle를 구성.
- **Main Zones:** 북부 catalog → 서부 storage → registry bay → 남부 cart dock → 동부 출고.
- **Entry:** 북쪽 catalog recess.
- **Objective:** 서쪽 sample registry의 numbered prototype box.
- **Exit:** 동쪽 출고실.
- **Safe Route:** ㄷ자 장비 외주 → 높은 cabinet corner → registry bay.
- **Risk Route:** cross aisle를 가로질러 registry 정면으로 접근.
- **Landmark:** Sample Storage cabinet군이 aisle 길이와 numbered objective를 설명.
- **Security Style:** storage 좁은 bay 감시는 낮추고 cross aisle timing을 핵심으로.
- **Guard concept:** catalog roaming, cross aisle patrol, 출고 turn 역할.
- **CCTV concept:** cart dock 위 mount가 cross aisle 끝만 관찰, cabinet 뒤 휴식 유지.
- **Theft flow:** registry 확인 → storage 두 sector와 cart dock 검색, 빈 bay까지 무작정 위치 추적 안함.
- **First LOS Break:** registry 외벽의 불투명 refrigerator endcap.
- **Escape flow:** endcap → 남쪽 cart dock → 동부 cross junction → 출고; 두 storage 끝단 우회 유지.
- **Main mechanic (보충):** storage 끝단 우회와 cross aisle의 timing.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-08 — Observation Exchange

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 04-08
- **Title:** Observation Exchange
- **Mission Fantasy:** 서로를 볼 수 있는 두 관찰실의 문 위치를 읽어 console chip을 회수한다.
- **Architecture:** 유리로 분리된 figure-eight observation rooms, 중앙 opaque console bunker.
- **Main Zones:** 남부 staff → 서부 observation → console bunker → 동부 observation → 북부 technician corridor.
- **Entry:** 남쪽 staff alcove.
- **Objective:** 중앙 Observation Console 부속 prototype module.
- **Exit:** 북쪽 technician exit.
- **Safe Route:** 서부 opaque entry wall → console 남쪽 corner → bunker 측문.
- **Risk Route:** 동부 유리 room 전면을 가로지르는 짧은 loop.
- **Landmark:** Observation Console이 두 room의 고리를 실제 연결.
- **Security Style:** 유리 너머 Guard를 미리 보고 다음 room crossing을 판단.
- **Guard concept:** 각 observation room patrol, technician corridor 확인; bunker는 관찰 휴식점.
- **CCTV concept:** 각 room 끝 mount를 교대 phase로, 중앙 opaque bunker behind는 감시불가.
- **Theft flow:** console 확인 → 서/동 observation sector 개별수색; 유리 발견 가능성은 실제 LOS로만.
- **First LOS Break:** bunker 북쪽 불투명 console backwall.
- **Escape flow:** backwall → 동부 room 뒤 코너 → technician junction → 북문.
- **Main mechanic (보충):** observation room 너머 Guard를 보고 다음 문 선택.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-09 — Cleanroom Split

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 04-09
- **Title:** Cleanroom Split
- **Mission Fantasy:** 반대쪽으로 돌아야 들어가는 cleanroom sample을 service intake로 반출한다.
- **Architecture:** 중앙 cleanroom 유리 box와 서측 opaque preparation wedge, 북쪽 이중 passage.
- **Main Zones:** 동부 inspection → glass perimeter → prep room → cleanroom → 서부 intake.
- **Entry:** 동쪽 inspection.
- **Objective:** 남쪽 cleanroom의 sealed prototype cradle.
- **Exit:** 서쪽 intake.
- **Safe Route:** glass 외주 → 북쪽 opaque prep → cleanroom 실제 측문; opening을 이동가능하게 표시.
- **Risk Route:** 남쪽 perimeter를 따라 cleanroom 정면 crossing으로 접근.
- **Landmark:** Cleanroom cradle와 장비 feed line이 목적 접근 동선을 보여줌.
- **Security Style:** 문 위협과 perimeter 노출을 다른 crossing에 분담.
- **Guard concept:** perimeter patrol, prep doorway 확인, intake roaming.
- **CCTV concept:** north passage junction mount가 cleanroom 진입을 sweep; intake corner는 별도 벽 뒤.
- **Theft flow:** cradle 확인 → prep와 perimeter sector 검색, 모든 출구 동시 cone 봉쇄 금지.
- **First LOS Break:** cleanroom 서쪽 opaque service cabinet.
- **Escape flow:** cabinet → 북 passage 뒤 분기 → 서부 intake corridor → exit.
- **Main mechanic (보충):** cleanroom 외주에서 실제 측문 찾기.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

### 04-10 — Core Prototype Transfer

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 04-10
- **Title:** Core Prototype Transfer
- **Mission Fantasy:** 유리 관찰망과 장비 spine을 연결해 핵심 prototype을 탈취하고 다른 연구동으로 빠진다.
- **Architecture:** central experiment island+관찰 crescent+쌍 service passage의 비대칭 compound.
- **Main Zones:** 서부 delivery → observation crescent → prep → core chamber → service junction → 동부 dispatch.
- **Entry:** 서쪽 delivery alcove.
- **Objective:** 중앙 Core Prototype Machine의 lit module.
- **Exit:** 동쪽 dispatch.
- **Safe Route:** opaque spine 연속 cover → prep 측문 → core; 한 crossing씩 관찰.
- **Risk Route:** crescent 유리 전면에서 core 정문까지 연속 노출 crossing.
- **Landmark:** Core Machine이 crescent 두 passage를 가르는 실제 중심.
- **Security Style:** Lab 개념 종합; larger compound의 여분 이동거리에는 보안 휴식 구간 보상.
- **Guard concept:** 관찰 patrol, core 확인, service junction, dispatch 역할을 구역별 분리; core 이중 Guard spike 금지.
- **CCTV concept:** crescent camera와 dispatch camera는 별도 crossing, 같은 pocket 동시감시 금지.
- **Theft flow:** module 도난 → prep/관찰망/service로 분산 검색; 실제 spotted 전에는 LKP 없음.
- **First LOS Break:** core 뒤 opaque experiment-machine spine.
- **Escape flow:** spine → 북 service junction에서 관찰 후 선택 → 동부 dispatch; core와 exit 사이 의미있는 두 구역.
- **Main mechanic (보충):** 유리 crescent·장비 spine·service junction 종합.
- **Difficulty Tier:** 4 — MEDIUM+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Glass + Technology + Visibility: 유리로 보이는 곳과 실제 접근 경로를 구분한다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Chapter 05 — CASINO


### 05-01 — Hotel Reception

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 05-01
- **Title:** Hotel Reception
- **Mission Fantasy:** 호텔 desk 뒤 jewel을 open gaming floor를 통해 다른 service exit로 반출한다.
- **Architecture:** reception island와 두 gaming pit의 offset T형 circulation.
- **Main Zones:** 북부 coat check → reception → gaming crossover → 남부 service.
- **Entry:** 북쪽 coat-check corner.
- **Objective:** 중앙 Gold Reception Desk의 locked display jewel.
- **Exit:** 남쪽 service dock.
- **Safe Route:** 높은 desk 뒤 → slot endcap → reception 측면.
- **Risk Route:** desk 전면 열린 diagonal crossing으로 접근.
- **Landmark:** Gold Reception Desk가 target support와 좌우 route divider.
- **Security Style:** 큰 바닥 전체 cone 대신 desk 양끝 crossing을 감시.
- **Guard concept:** reception turn, slot patrol, service junction 담당 분리.
- **CCTV concept:** pit 상단 mount가 open crossover sweep; desk backside는 opaque cover.
- **Theft flow:** 빈 display 확인 → 접수와 pit sector 검색; service Player 위치 선지급 없음.
- **First LOS Break:** desk 남측 불투명 cashier return wall.
- **Escape flow:** wall → 서쪽 slot endcap → gaming junction → service dock.
- **Main mechanic (보충):** reception 양끝 crossing의 감시 방향 비교.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-02 — Gaming Floor

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 05-02
- **Title:** Gaming Floor
- **Mission Fantasy:** roulette island를 돌며 서로 다른 방향의 patrol 틈을 이어 보석을 가져간다.
- **Architecture:** 두 gaming pit와 중앙 roulette island, 동측 cashier 연결의 8자.
- **Main Zones:** 북부 ticket → 서 pit → roulette display → 동 pit → cashier passage.
- **Entry:** 북쪽 ticket recess.
- **Objective:** 중앙 Roulette Table 옆 높은 prize display.
- **Exit:** 동쪽 cashier-side exit.
- **Safe Route:** slot bank endcap → roulette 외주 opaque display → prize.
- **Risk Route:** 두 pit 사이 짧은 diagonal gap의 교차 cone timing.
- **Landmark:** Roulette Table은 흐름 landmark, 낮은 테이블 자체는 Full Cover로 계산 안함.
- **Security Style:** pit별 감시 방향과 shared crossover의 시간차.
- **Guard concept:** 각 pit patrol과 cashier turn; prize 상시 이중경계 금지.
- **CCTV concept:** 중앙 ceiling mount는 crossover만 sweep; slot bank 뒤 대기 가능.
- **Theft flow:** display 도난 → pit 서/동 search 분리, Guard 모두 objective 한 점 집결 금지.
- **First LOS Break:** prize display 뒤 불투명 tall prize cabinet.
- **Escape flow:** cabinet → 동 pit 바깥 slot lane → cashier junction → exit.
- **Main mechanic (보충):** 두 pit 사이 교차 cone를 한 번에 관찰.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-03 — Service Lounge

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 05-03
- **Title:** Service Lounge
- **Mission Fantasy:** bar와 service alcove의 뒤편 route로 전시 jewel을 훔친다.
- **Architecture:** 긴 bar island의 북쪽 lounge loop와 남쪽 staff loop, offset cross-connector.
- **Main Zones:** 서부 supply → lounge edge → bar display → staff return → 북부 catering.
- **Entry:** 서쪽 supply alcove.
- **Objective:** bar 북단 Card Table 옆 premium jewel cabinet.
- **Exit:** 북쪽 catering exit.
- **Safe Route:** staff-side 높은 bar back → storage corner → cabinet 측면.
- **Risk Route:** lounge 중앙 낮은 card table 사이 직선 노출.
- **Landmark:** Card Table과 bar display가 guest/staff circulation의 경계.
- **Security Style:** 낮은 lounge 가구는 soft divider, opaque bar back이 실제 break.
- **Guard concept:** lounge patrol, bar-end junction, catering check 역할.
- **CCTV concept:** bar 남쪽 soffit mount가 cross-connector sweep, storage opaque recess 제외.
- **Theft flow:** cabinet 확인 → lounge와 staff return 각각 search.
- **First LOS Break:** cabinet 서쪽 불투명 bar equipment wall.
- **Escape flow:** wall → 남쪽 staff loop → 동쪽 connector 코너 → 북쪽 catering.
- **Main mechanic (보충):** 낮은 lounge 가구와 높은 bar back의 cover 차이.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-04 — VIP Salon

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 05-04
- **Title:** VIP Salon
- **Mission Fantasy:** VIP sofa islands 사이의 문턱을 관찰하여 premium jewel을 가져온다.
- **Architecture:** broken perimeter의 세 VIP salons와 lounge court, 독립 west service.
- **Main Zones:** 남부 reception → 동 salon → VIP display → lounge court → 서부 cloakroom.
- **Entry:** 남쪽 reception corner.
- **Objective:** 북동 VIP Salon의 jewel cabinet.
- **Exit:** 서쪽 cloakroom door.
- **Safe Route:** salon opaque doorway → tall display corner → cabinet.
- **Risk Route:** lounge court를 가로질러 VIP 정문 노출.
- **Landmark:** VIP Sofa와 높은 display wall 조합이 salon 앞 휴식 지점; sofa만으로 cover 아님.
- **Security Style:** room 감시와 court crossing 감시 교대.
- **Guard concept:** salon patrol, court roaming, cloakroom 확인; 좁은 door는 중첩 cone 줄임.
- **CCTV concept:** court 서북 ceiling mount가 중앙 crossing sweep, salon side alcove는 벽 뒤.
- **Theft flow:** cabinet 확인 → salon/접수/service sector로 분산.
- **First LOS Break:** display cabinet 뒤 opaque VIP wall return.
- **Escape flow:** return → south salon 뒤 bypass → court west junction → cloakroom.
- **Main mechanic (보충):** VIP 문턱에서 다음 salon Guard turn 판단.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-05 — Royal Jewel Room

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 05-05
- **Title:** Royal Jewel Room
- **Mission Fantasy:** 왕실 display의 후면 cover를 확보하고 cashier loop로 탈출한다.
- **Architecture:** royal room와 cashier ring, 높은 slot-bank spine으로 갈린 escape aisles.
- **Main Zones:** 동부 invitation → royal antechamber → display room → cashier ring → 남부 loading.
- **Entry:** 동쪽 invitation recess.
- **Objective:** 중앙 Royal Display의 jewel.
- **Exit:** 남쪽 cashier loading.
- **Safe Route:** antechamber 벽 → slot spine endcap → display 측면.
- **Risk Route:** royal room 중앙의 open exhibition approach.
- **Landmark:** Royal Display가 목적+opaque base/후면 wall 연계, diamond focal point.
- **Security Style:** 기존 capstone을 같은 Chapter 평균으로, pickup 뒤 즉사 trap 금지.
- **Guard concept:** royal patrol, cashier roaming, aisle turn; exit에 Guard cluster 금지.
- **CCTV concept:** royal 입구와 cashier junction camera는 다른 crossing에 담당.
- **Theft flow:** display 빈 case → royal/cashier/aisle search; theft는 위치 모름.
- **First LOS Break:** display 북쪽 불투명 royal exhibit backwall.
- **Escape flow:** backwall → 서쪽 cashier loop → slot spine 남단 junction → loading.
- **Main mechanic (보충):** royal display 첫 break와 cashier loop 선택.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-06 — Cashier Cage

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 05-06
- **Title:** Cashier Cage
- **Mission Fantasy:** cashier cage의 보이는 금고를 가림벽 측면으로 접근해 jewel을 탈취한다.
- **Architecture:** cage rectangle와 bar-backed service elbow, public queue crescent.
- **Main Zones:** 서부 queue → public crescent → cage service → cash drawer → 동부 staff dock.
- **Entry:** 서쪽 queue recess.
- **Objective:** cage 내부 Cashier Vault jewel drawer.
- **Exit:** 동쪽 staff dock.
- **Safe Route:** bar rear opaque wall → service elbow → vault 측면 접근.
- **Risk Route:** queue crescent 전면 open lane crossing.
- **Landmark:** Cashier Cage가 통과 가능한 service opening과 target 위치를 명시.
- **Security Style:** cage bar는 투명 LOS, rear wall만 Full Cover.
- **Guard concept:** queue patrol, cage doorway turn, staff dock 순찰.
- **CCTV concept:** cage 위 camera가 public lane 관찰; service elbow 뒤 시야 차단.
- **Theft flow:** drawer 확인 → queue와 staff corridor search, cage 전체일괄 LKP 금지.
- **First LOS Break:** vault 옆 불투명 cashier equipment enclosure.
- **Escape flow:** enclosure → bar service elbow → staff junction → 동 dock.
- **Main mechanic (보충):** 투명 cage front와 opaque rear wall 구분.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-07 — High Roller Loop

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 05-07
- **Title:** High Roller Loop
- **Mission Fantasy:** 고액 테이블을 감싸는 patrol의 방향이 갈릴 때 jewel display로 접근한다.
- **Architecture:** 중앙 high-roller oval과 외주 slot crescent, 북서 service wedge.
- **Main Zones:** 남부 invitation → slot crescent → oval pit → prize room → 북부 service.
- **Entry:** 남쪽 invitation corner.
- **Objective:** 북동 High Roller prize case.
- **Exit:** 북쪽 service loading.
- **Safe Route:** slot bank 뒤 두 관찰점 → prize room 측문.
- **Risk Route:** oval 남북 long-axis로 table 사이 open crossing.
- **Landmark:** High Roller Table은 route island; tall prize partition이 실제 cover.
- **Security Style:** 큰 pit에 roaming 재접근, 전면일괄 cone 덮기 금지.
- **Guard concept:** oval patrol, crescent patrol, prize doorway turn과 service 담당.
- **CCTV concept:** pit 서남 mount가 oval 직선 crossing 관찰, slot 뒤 실제 pocket 유지.
- **Theft flow:** prize 확인 → oval와 crescent sector 다른 방향 search.
- **First LOS Break:** prize room 서측 불투명 partition return.
- **Escape flow:** return → 북서 service wedge → slot 끝 junction → loading.
- **Main mechanic (보충):** oval patrol와 crescent patrol의 재접근 관찰.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-08 — Surveillance Balcony

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 05-08
- **Title:** Surveillance Balcony
- **Mission Fantasy:** 관제실 아래 open casino crossing을 읽어 surveillance-held jewel을 반출한다.
- **Architecture:** 단층 balcony-shaped overlook room와 lower floor를 뜻하는 두 pit; 실제 층 이동 없음.
- **Main Zones:** 동부 staff → monitor bay → slot pit → security display → 서부 catering.
- **Entry:** 동쪽 staff nook.
- **Objective:** 북서 Casino Security Station의 confiscated jewel case.
- **Exit:** 서쪽 catering.
- **Safe Route:** monitor bay opaque screen wall → slot endcap → security side.
- **Risk Route:** pit 가운데 관제 sightline 아래 직선 approach.
- **Landmark:** Security Station이 target와 camera mounts를 연결.
- **Security Style:** Guard turn과 CCTV sweep를 시간차로 읽는 네트워크.
- **Guard concept:** pit roaming, security doorway, catering turn; station 뒤 recover pocket 확보.
- **CCTV concept:** 두 camera는 각 pit 교대 sweep, safe corridor 상시 overlap 금지.
- **Theft flow:** case 도난 → monitor/pit/service sector; 관제는 실제 vision만 공유.
- **First LOS Break:** security station의 불투명 monitor backwall.
- **Escape flow:** backwall → 남쪽 pit 외주 → catering junction → exit.
- **Main mechanic (보충):** 관제 sightline 아래 pit crossing의 phase 읽기.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-09 — Private Casino Circuit

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 05-09
- **Title:** Private Casino Circuit
- **Mission Fantasy:** 개인 게임장 두 고리의 patrol 분리를 이용해 collection jewel을 훔친다.
- **Architecture:** 두 원형 table rooms를 작은 bar spine과 비대칭 foyer가 잇는 dumbbell.
- **Main Zones:** 북부 private foyer → west pit → collection room → east pit → 남부 service.
- **Entry:** 북쪽 private foyer.
- **Objective:** 동쪽 private collection cabinet.
- **Exit:** 남쪽 service alcove.
- **Safe Route:** bar backside 높은 cabinet → 동 pit 외주 → collection 측면.
- **Risk Route:** 두 pit를 잇는 열린 central connector.
- **Landmark:** Private collection cabinet이 east pit의 목적 anchor.
- **Security Style:** multi-direction 판단은 connector, 방 안은 관찰 가능한 단일 역할.
- **Guard concept:** pit별 patrol, connector turn, service check 분리.
- **CCTV concept:** foyer mount와 east pit mount는 같은 시점 connector를 덮지 않음.
- **Theft flow:** collection 빈 case → 두 pit를 나눠 수색, Player current 위치 공유 안함.
- **First LOS Break:** cabinet 남측 불투명 private room 벽.
- **Escape flow:** 벽 → east pit outer corner → bar spine junction → 남부 service.
- **Main mechanic (보충):** 두 private pit의 connector timing 선택.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

### 05-10 — The House Take

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 05-10
- **Title:** The House Take
- **Mission Fantasy:** 슬롯·테이블·cashier의 감시를 이어 읽어 casino 최고 jewel을 탈취한다.
- **Architecture:** roulette court, slot gallery, cashier cage가 중앙 bar spine 양옆을 연결하는 compact compound.
- **Main Zones:** 서부 reception → slot gallery → roulette court → royal cashier → VIP return → 동부 service.
- **Entry:** 서쪽 reception.
- **Objective:** 북중앙 Royal Cashier Vault의 showcase jewel.
- **Exit:** 동쪽 service loading.
- **Safe Route:** slot endcap 연속 cover → bar rear → cashier 측문.
- **Risk Route:** roulette diagonal → public queue 전면이라는 두 노출 crossing.
- **Landmark:** Royal Cashier Vault가 objective와 return route 분기 중심.
- **Security Style:** 카지노 종합, pit별 observation pocket 유지로 Finale count spike 상쇄.
- **Guard concept:** slot/roulette/cashier/service 구역 역할 분리; 보물·exit cluster 금지.
- **CCTV concept:** table court와 VIP return camera는 다른 crossing, opaque bar 뒤 recover.
- **Theft flow:** 빈 showcase → cashier/slot/roulette sector 조사; 실제 spotted 전 Player target 없음.
- **First LOS Break:** cashier rear의 불투명 count-room wall.
- **Escape flow:** wall → VIP return → bar east junction에서 patrol 관찰 → service; royal room에서 바로 Exit 금지.
- **Main mechanic (보충):** slot·roulette·cashier의 연속 crossing 종합.
- **Difficulty Tier:** 5 — MEDIUM-HIGH; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Bright/Open/Multi-Directional Security: 테이블 pit와 슬롯 island 사이에서 여러 감시 방향을 읽는다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Chapter 06 — MANSION


### 06-01 — Garden Vestibule

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 06-01
- **Title:** Garden Vestibule
- **Mission Fantasy:** 옆문으로 두 salon을 통과해 수집품을 다른 정원으로 반출.
- **Architecture:** stair base 양옆 salon loop와 독립 garden gallery.
- **Main Zones:** 서원 vestibule → 남 salon → stair exhibit → 북 salon → 동원.
- **Entry:** 서쪽 garden vestibule.
- **Objective:** 중앙 Grand Stair 옆 artifact cabinet.
- **Exit:** 동쪽 garden gallery.
- **Safe Route:** salon 문 뒤 → stair 측벽 → cabinet.
- **Risk Route:** 두 salon 사이 열린 reception crossing.
- **Landmark:** Grand Stair base가 분기와 전시를 연결; 실제 층이동 없음.
- **Security Style:** 짧은 문턱 LOS를 방별로 읽음.
- **Guard concept:** salon patrol/stair turn/garden check 분리.
- **CCTV concept:** reception camera는 문 연결만 sweep; 문 뒤 opaque pocket 유지.
- **Theft flow:** cabinet 확인 → 두 salon 분산 search, 입장 방향을 Player 위치로 간주하지 않음.
- **First LOS Break:** cabinet 북쪽 opaque stair buttress.
- **Escape flow:** buttress → 북 salon 코너 → 동 garden junction → exit.
- **Main mechanic (보충):** salon 문 뒤에서 다음 garden route 관찰.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-02 — Drawing Room

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 06-02
- **Title:** Drawing Room
- **Mission Fantasy:** 응접실 문 뒤를 이어 긴 hall의 수집품을 서비스 복도로 반출.
- **Architecture:** 긴 hall 양옆 엇갈린 drawing rooms+남 service return.
- **Main Zones:** 서 vestibule → hall → drawing room → library alcove → 남 service.
- **Entry:** 서쪽 vestibule.
- **Objective:** 동쪽 Library Cabinet의 artifact.
- **Exit:** 남쪽 service exit.
- **Safe Route:** 방 문 뒤 → drawing corner → cabinet; 낮은 sofa는 cover 아님.
- **Risk Route:** hall 중앙 긴 LOS를 따라 두 문을 직선 통과.
- **Landmark:** Library Cabinet과 독서 가구가 수집품의 맥락.
- **Security Style:** room door와 hall patrol timing 분리.
- **Guard concept:** hall patrol/drawing 확인/service turn; 좁은 room는 낮은 count.
- **CCTV concept:** hall 끝 camera가 중앙만 sweep, 방 내부 벽뒤 회복.
- **Theft flow:** cabinet 확인 → hall/응접실 sector, 숨은 Player target 없음.
- **First LOS Break:** cabinet 옆 opaque library wall return.
- **Escape flow:** return → 남 drawing room → service junction → exit.
- **Main mechanic (보충):** 긴 hall 대신 응접실 문 뒤 cover 연결.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-03 — Library Wing

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 06-03
- **Title:** Library Wing
- **Mission Fantasy:** 서가로 나뉜 방들의 문을 바꿔 독서 alcove의 고물을 훔친다.
- **Architecture:** 단층 landing형 loop+세 library rooms+외주 service.
- **Main Zones:** 북 reading entry → 서 library → alcove → 동 library → 서 service.
- **Entry:** 북 reading vestibule.
- **Objective:** 동 Reading Alcove의 artifact case.
- **Exit:** 서 service gallery.
- **Safe Route:** 높은 서가끝 → 서쪽 문 뒤 → alcove 측면.
- **Risk Route:** central landing 두 문이 정렬되는 crossing.
- **Landmark:** Reading Alcove와 서가가 objective와 LOS break를 결정.
- **Security Style:** 긴 hall 대신 다음 방 문 판단, 실제 upstairs 없음.
- **Guard concept:** library 교대 patrol/landing turn/service patrol, 문 phase 엇갈림.
- **CCTV concept:** landing camera는 중앙 crossing 관찰.
- **Theft flow:** artifact 확인 → 서/동 library와 landing 검색, LOS 없이 LKP 갱신 금지.
- **First LOS Break:** alcove 뒤 opaque bookcase end.
- **Escape flow:** bookcase → 동 room 후문 → landing 서 junction → service.
- **Main mechanic (보충):** 서가 끝과 방 출입구를 연속 선택.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-04 — Family Apartments

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 06-04
- **Title:** Family Apartments
- **Mission Fantasy:** 가족 방들의 용도별 출입구를 읽고 수집품을 연회 service로 반출.
- **Architecture:** 세 family rooms가 reception을 둘러싸고 북 service와 동 guest hall 분리.
- **Main Zones:** 동 guest hall → study → salon → artifact room → 북 service.
- **Entry:** 동 guest alcove.
- **Objective:** 서부 Family Sofa 옆 높은 artifact cabinet.
- **Exit:** 북 service exit.
- **Safe Route:** study 문 뒤 → salon 코너 → display 측문.
- **Risk Route:** reception 중앙에서 두 방 Guard가 외측을 보는 순간 crossing.
- **Landmark:** Family Sofa는 identity, cabinet과 벽이 실제 cover.
- **Security Style:** room 전이당 한 위협, 좁은 문 중첩 감시 완화.
- **Guard concept:** guest patrol/family turn/service roaming; display 이중상주 없음.
- **CCTV concept:** reception camera는 study 벽뒤를 못봄.
- **Theft flow:** display 확인 → guest/family/service 방군 분산 search.
- **First LOS Break:** display room 북쪽 opaque corner.
- **Escape flow:** corner → 뒤 guest room → 북 service junction → exit.
- **Main mechanic (보충):** family rooms에서 한 문당 한 위협 해석.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-05 — Heirloom Gallery

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 06-05
- **Title:** Heirloom Gallery
- **Mission Fantasy:** 가보를 훔친 뒤 진입과 다른 service loop로 저택을 돌아나간다.
- **Architecture:** heirloom suite+긴 service return+두 salon loop, 중앙 gallery wall.
- **Main Zones:** 남 reception → 서 salon → suite → 동 salon → 동 service.
- **Entry:** 남 formal reception.
- **Objective:** 북 Antique Cabinet의 heirloom artifact.
- **Exit:** 동 service dock.
- **Safe Route:** 서 salon 높은 cabinet → suite 측문 → target.
- **Risk Route:** gallery 중앙 guest line으로 suite 정문 접근.
- **Landmark:** Antique Cabinet이 가보와 측문 경로의 landmark.
- **Security Style:** 기존05 capstone은 동일 Tier로 재해석, 긴 탈출에 회복 방 제공.
- **Guard concept:** salon patrol/suite turn/service patrol, exit cluster 금지.
- **CCTV concept:** gallery camera는 guest approach, service 내벽이 break.
- **Theft flow:** 가보 확인 → suite/gallery/service search, 숨은 위치 공유 없음.
- **First LOS Break:** suite 뒤 opaque gallery wall.
- **Escape flow:** wall → 동 salon 외측 → service return junction → exit.
- **Main mechanic (보충):** heirloom suite 진입과 service return 분리.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-06 — Servant Passage

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 06-06
- **Title:** Servant Passage
- **Mission Fantasy:** 하인 passage로 pantry 수집품에 접근해 주인 hall을 피한다.
- **Architecture:** guest hall과 평행 service passage, 넓은 연결문 두 개+pantry island.
- **Main Zones:** 북 delivery → service → pantry → guest crossing → 남 garden.
- **Entry:** 북 delivery nook.
- **Objective:** 서중앙 Pantry Cabinet의 antique artifact.
- **Exit:** 남 garden door.
- **Safe Route:** service 높은 cabinet → pantry 문 뒤 → target.
- **Risk Route:** guest hall에서 pantry 정문으로 긴 crossing.
- **Landmark:** Pantry cabinet이 서비스 기능과 수집 story 제공.
- **Security Style:** 좁은 service lane는 lower Guard count와 단계별 문 감시.
- **Guard concept:** guest patrol/pantry 확인/garden turn.
- **CCTV concept:** guest camera는 pantry opaque wall을 통과 못함.
- **Theft flow:** pantry 확인 → delivery/service와 guest sector 조사.
- **First LOS Break:** pantry 남쪽 opaque larder wall.
- **Escape flow:** larder → guest 측 corner → garden junction → exit.
- **Main mechanic (보충):** guest hall 대신 좁은 pantry service route 선택.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-07 — Moonlit Study

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 06-07
- **Title:** Moonlit Study
- **Mission Fantasy:** 침실과 서재의 엇갈린 문을 통과해 collection을 veranda로 반출.
- **Architecture:** study+bedroom 두 room, offset doorway+동 veranda ring.
- **Main Zones:** 서 guest → bedroom vestibule → study → veranda → 북 rear hall.
- **Entry:** 서 guest nook.
- **Objective:** 남 study 서재 cabinet의 artifact.
- **Exit:** 북 rear veranda.
- **Safe Route:** bedroom 문 뒤 → study 서가측 → cabinet.
- **Risk Route:** 두 방 사이 사선 doorway crossing.
- **Landmark:** Study desk는 용도, bookcase가 실제 cover; 책상만 full cover 금지.
- **Security Style:** corner 관찰 후 room 이동, 읽을 수 있는 turn timing.
- **Guard concept:** bedroom patrol/study turn/veranda patrol; 문 양쪽 동시봉쇄 금지.
- **CCTV concept:** rear hall camera는 veranda 접점 관찰.
- **Theft flow:** cabinet 확인 → study/bedroom search, veranda는 sector만 탐색.
- **First LOS Break:** study 동쪽 opaque bookcase.
- **Escape flow:** bookcase → 동 veranda corner → rear hall junction → exit.
- **Main mechanic (보충):** study와 bedroom의 엇갈린 문 읽기.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-08 — Trophy Hall Circuit

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 06-08
- **Title:** Trophy Hall Circuit
- **Mission Fantasy:** 기념품 wall 안쪽으로 훔친 뒤 music room으로 경로를 바꾼다.
- **Architecture:** central wall를 둘러싼 trophy crescent+서 music/남 drawing 분기.
- **Main Zones:** 동 lobby → trophy crescent → target alcove → music → 서 service.
- **Entry:** 동 display lobby.
- **Objective:** 북 central trophy cabinet의 artifact.
- **Exit:** 서 music-room service door.
- **Safe Route:** drawing 문 뒤 → trophy wall 안쪽 → alcove.
- **Risk Route:** crescent 외측의 노출된 긴 arc.
- **Landmark:** Trophy wall이 내외 route와 수집 context를 정의.
- **Security Style:** hall arc LOS와 사전 읽히는 corner, search는 방군 선택.
- **Guard concept:** hall patrol/music turn/drawing patrol, objective 전방향 상주 금지.
- **CCTV concept:** lobby camera는 외측 arc, wall 안쪽 recover recess 제외.
- **Theft flow:** 빈 cabinet → trophy/music/drawing 세 sector 분산.
- **First LOS Break:** target 남쪽 opaque trophy wall endcap.
- **Escape flow:** endcap → 남 drawing → music junction → 서 exit.
- **Main mechanic (보충):** trophy wall 안팎을 바꾸며 music room 탈출.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-09 — Hidden Wing

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 06-09
- **Title:** Hidden Wing
- **Mission Fantasy:** 평범한 salon 안쪽의 collection wing을 돌아 실제 rear passage로 탈출.
- **Architecture:** 비대칭 세 room+짧은 dogleg gallery, static 통로 두 개.
- **Main Zones:** 남 salon → 서 study → hidden gallery → rear passage → 동 garden.
- **Entry:** 남 salon alcove.
- **Objective:** 북서 hidden gallery의 artifact case.
- **Exit:** 동 garden door.
- **Safe Route:** study 높은 cabinet → dogleg corner → case.
- **Risk Route:** central gallery 사선 crossing으로 study 관찰점 생략.
- **Landmark:** Hidden panel은 실제 통과 입구를 표시; 새 switch 없음.
- **Security Style:** route decision 부담 증가, corner Tilt 폭은 유지.
- **Guard concept:** salon patrol/gallery turn/rear patrol.
- **CCTV concept:** rear camera는 junction sweep, dogleg는 실제 break.
- **Theft flow:** case 확인 → study/gallery/rear sector, hidden 길도 마법안전 아님.
- **First LOS Break:** case 동쪽 opaque return wall.
- **Escape flow:** wall → rear 북 분기 → 동 garden corner → exit.
- **Main mechanic (보충):** dogleg 뒤 실제 rear passage 판독.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

### 06-10 — The Family Collection

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 06-10
- **Title:** The Family Collection
- **Mission Fantasy:** 문·서가·salon·service 길을 종합하여 가문의 중심 collection을 훔친다.
- **Architecture:** library wing와 formal salon 사이 heirloom chamber+독립 service outer ring.
- **Main Zones:** 서 garden → library → salon → chamber → rear study → 동 service.
- **Entry:** 서 garden vestibule.
- **Objective:** 중앙 chamber의 높은 Antique Cabinet.
- **Exit:** 동 service dock.
- **Safe Route:** 서가 cover chain → salon 측문 → cabinet 뒤, 문마다 관찰.
- **Risk Route:** formal hall 두 문을 잇는 직선으로 cabinet 정면.
- **Landmark:** Heirloom cabinet이 library/salon 접근의 수렴 중심.
- **Security Style:** Chapter 종합, 넓은 공간의 구역 분담으로 spike 방지.
- **Guard concept:** library/salon/chamber 외주/service 역할 분리, exit 정상 patrol.
- **CCTV concept:** formal hall/rear study camera가 다른 문을 phase 분리 관리.
- **Theft flow:** 빈 collection → library/salon/rear study search, 실제 spotted만 LKP.
- **First LOS Break:** chamber 뒤 opaque bookcase wall.
- **Escape flow:** wall → rear study → service junction → dock; pickup 뒤 두 room 통과.
- **Main mechanic (보충):** 문·서가·salon·service return 종합.
- **Difficulty Tier:** 6 — MEDIUM-HIGH+; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Room-Based Stealth: 문과 코너를 넘기 전 다음 방과 서비스 우회를 선택한다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Chapter 07 — WAREHOUSE


### 07-01 — Loading Entrance

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 07-01
- **Title:** Loading Entrance
- **Mission Fantasy:** 하역 island의 두 cargo lane 중 하나로 case에 접근해 다른 dock로 반출.
- **Architecture:** loading bay island+두 cargo lane+북 dispatch elbow.
- **Main Zones:** 동 receiving → 남 cargo lane → bay → 북 dispatch → 서 dock.
- **Entry:** 동 receiving recess.
- **Objective:** 중앙 Pallet Stack 뒤 검수대의 case.
- **Exit:** 서 dispatch dock.
- **Safe Route:** 높은 pallet opaque end → bay 측면 → 검수대.
- **Risk Route:** bay 전면 open loading crossing.
- **Landmark:** Pallet Stack이 하역과 lane 선택의 실제 anchor.
- **Security Style:** 넓은 bay는 roaming, lane 끝은 읽히는 turn.
- **Guard concept:** bay patrol/lane roaming/dispatch check, 좁은 lane 중첩 완화.
- **CCTV concept:** bay 위 camera가 loading crossing sweep, pallet 뒤 실제 휴식.
- **Theft flow:** case 확인 → bay와 dispatch sector search, entry방향을 LKP로 간주하지 않음.
- **First LOS Break:** 검수대 북쪽 opaque cargo wall.
- **Escape flow:** wall → 북 dispatch elbow → west dock junction → exit.
- **Main mechanic (보충):** bay island 양쪽 lane의 patrol turn 판독.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-02 — Cargo Sorting

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 07-02
- **Title:** Cargo Sorting
- **Mission Fantasy:** 엇갈린 rack 끝단을 읽어 sorting case를 가로 loading lane로 반출.
- **Architecture:** 세 offset storage aisles+서 cross-loading lane, 열린 end gap은 실제 통과.
- **Main Zones:** 동 intake → 상단 aisle → sorting island → 서 cross lane → 북 dock.
- **Entry:** 동 intake nook.
- **Objective:** 중앙 Cargo Shelf의 sorting case.
- **Exit:** 북 dock.
- **Safe Route:** 높은 shelf끝 두 cover → 상단 aisle → case 측면.
- **Risk Route:** 세 aisle 사이 중앙 long crossing.
- **Landmark:** Cargo Shelf가 번호별 sorting과 objective aisle 위치 정의.
- **Security Style:** 긴 aisle LOS+crossing roaming, 넓은 바닥 전체 덮지 않음.
- **Guard concept:** aisle 순찰/cross lane roaming/dock turn.
- **CCTV concept:** cross lane 남단 camera, shelf end 뒤 대기는 opaque.
- **Theft flow:** case 확인 → 서/중/동 aisle를 별도 search, 숨은 live위치 없음.
- **First LOS Break:** case 북쪽 opaque rack endcap.
- **Escape flow:** endcap → 서 cross-loading lane → 북 dock junction → exit.
- **Main mechanic (보충):** 세 rack aisle 끝단 우회와 cross-loading 선택.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-03 — Storage Aisles

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 07-03
- **Title:** Storage Aisles
- **Mission Fantasy:** 보이는 shortcut 대신 fork aisle의 연결 passage로 제한 화물에 접근.
- **Architecture:** Y fork aisle+hidden cross-loading passage+동 packing room.
- **Main Zones:** 남 receiving → fork → west storage → cargo bay → 동 packing.
- **Entry:** 남 receiving.
- **Objective:** 북west Shipping Crates 옆 case.
- **Exit:** 동 packing exit.
- **Safe Route:** fork opaque end → west rack 뒤 → cargo 측면.
- **Risk Route:** fork 동 aisle에서 열린 diagonal cross-loading.
- **Landmark:** Shipping Crates는 cargo bay와 후면 passage 연결을 설명.
- **Security Style:** fork 선택과 roaming 재등장, hidden passage는 실제 clear gap.
- **Guard concept:** fork patrol/bay turn/packing roaming.
- **CCTV concept:** fork ceiling camera는 동 crossing sweep; west rack 뒤 제외.
- **Theft flow:** 빈 case → fork/storage/packing sector 탐색.
- **First LOS Break:** cargo bay 뒤 opaque container corner.
- **Escape flow:** corner → 북 cross-loading passage → 동 packing junction → exit.
- **Main mechanic (보충):** fork와 실제 hidden cross passage 선택.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-04 — Inspection Bay

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 07-04
- **Title:** Inspection Bay
- **Mission Fantasy:** 검사 cross의 네 방향을 한 번씩 읽고 case를 perimeter lane로 반출.
- **Architecture:** inspection cross+분리 perimeter loading lanes, 중심 높은 검사 booth.
- **Main Zones:** 서 admission → north inspection → case booth → east lane → 남 dispatch.
- **Entry:** 서 admission recess.
- **Objective:** 중앙 Inspection Desk 뒤 높은 검수case.
- **Exit:** 남 dispatch dock.
- **Safe Route:** booth opaque wall → north inspection 측문 → case.
- **Risk Route:** central cross 직선 crossing, 둘 이상의 방향을 미리 관찰.
- **Landmark:** Inspection Desk는 용도, opaque booth가 실제 break.
- **Security Style:** cross의 phase 분담, 모든 arm 동시 overlap 금지.
- **Guard concept:** north lane patrol/east roaming/dispatch check.
- **CCTV concept:** inspection 두 대각 mount를 반대 phase로, booth 뒤 휴식 유지.
- **Theft flow:** case 확인 → inspection/perimeter/dispatch sector 분산.
- **First LOS Break:** booth 동쪽 opaque inspection wall.
- **Escape flow:** wall → east perimeter → south dispatch junction → exit.
- **Main mechanic (보충):** inspection cross arm별 phase 관찰.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-05 — Secured Shipment

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 07-05
- **Title:** Secured Shipment
- **Mission Fantasy:** container compound에서 secured shipment를 꺼내 독립 shipping exit로 나간다.
- **Architecture:** container court+북 outer lane+긴 west shipping return.
- **Main Zones:** 북 intake → east container aisle → secured bay → south court → west return.
- **Entry:** 북 intake.
- **Objective:** 중앙 Secured Container의 봉인case.
- **Exit:** 서 shipping exit.
- **Safe Route:** container opaque end 연속 cover → bay 측면.
- **Risk Route:** court 중앙 긴 노출 approach.
- **Landmark:** Secured Container가 목적물 안착과 양 aisle 분기.
- **Security Style:** 기존05 capstone 동일 Chapter예산, 긴 return에 중간 recover bay.
- **Guard concept:** container patrol/court roaming/shipping turn, exit 동시 cluster 없음.
- **CCTV concept:** court mount가 central crossing, shipping return opaque dock wall로 분리.
- **Theft flow:** 빈 shipment 확인 → bay/court/shipping sector search.
- **First LOS Break:** secured bay 남쪽 opaque container return.
- **Escape flow:** return → south court 측면 → west shipping junction → exit.
- **Main mechanic (보충):** container court에서 shipping return으로 경로변경.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-06 — Machinery Transfer

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 07-06
- **Title:** Machinery Transfer
- **Mission Fantasy:** machinery island 둘레의 roaming을 피하며 freight case를 maintenance 길로 반출.
- **Architecture:** 중앙 machinery oblong+양옆 loading lane+남 maintenance elbow.
- **Main Zones:** 서 machine entry → north lane → transfer bay → east lane → 남 maintenance.
- **Entry:** 서 entry recess.
- **Objective:** 북동 machinery transfer station의 case.
- **Exit:** 남 maintenance exit.
- **Safe Route:** machine opaque housing → north station 측면.
- **Risk Route:** south loading lane 긴 crossing 후 bay 정면.
- **Landmark:** Machinery housing이 양 lane과 transfer bay를 실제 분리.
- **Security Style:** 긴 노출 대신 사전 관찰 후 한 번 crossing, 기계는 장식 아닌 blocker.
- **Guard concept:** loading roaming/station turn/maintenance patrol.
- **CCTV concept:** north lane camera와 maintenance camera는 다른 crossing 담당.
- **Theft flow:** case 확인 → machine 북/남 lane와 maintenance sector 탐색.
- **First LOS Break:** station 뒤 opaque machinery endhousing.
- **Escape flow:** housing → east lane → south maintenance junction → exit.
- **Main mechanic (보충):** machinery 양쪽 loading lane의 roaming 재접근.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-07 — Cold Chain Depot

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 07-07
- **Title:** Cold Chain Depot
- **Mission Fantasy:** 냉장 cargo room의 aisle 끝단을 바꿔 case를 warm dispatch로 가져간다.
- **Architecture:** 세 cold cells와 parallel service corridor, 중앙 insulated opaque wall.
- **Main Zones:** 남 receiving → west cold cell → central storage → east service → 북 dispatch.
- **Entry:** 남 receiving nook.
- **Objective:** 서북 refrigerated cargo case.
- **Exit:** 북 dispatch.
- **Safe Route:** insulated wall 끝 → west cell 문 뒤 → case.
- **Risk Route:** central loading aisle의 긴 glass observation front crossing.
- **Landmark:** Cold-storage enclosure가 보관 용도와 실제 동선 정의.
- **Security Style:** 좁은 cell는 낮은 Guard 수, 위험은 long cross aisle에 집중.
- **Guard concept:** cold aisle patrol/service roaming/dispatch turn.
- **CCTV concept:** loading camera는 observation front, opaque cell뒤는 제외.
- **Theft flow:** case 확인 → cold cells와 service sector; 투명 관찰면 뒤는 안전아님.
- **First LOS Break:** case 동쪽 insulated opaque backwall.
- **Escape flow:** backwall → east service corner → 북 dispatch junction → exit.
- **Main mechanic (보충):** cold cell 문과 insulated cover의 관계 읽기.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-08 — Dispatch Interchange

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 07-08
- **Title:** Dispatch Interchange
- **Mission Fantasy:** 세 출하 lane가 만나는 junction의 출입 순서를 읽고 case를 서브dock로 반출.
- **Architecture:** 세방향 dispatch lanes+central sorting booth+south secondary dock.
- **Main Zones:** 북 check-in → east dispatch lane → sorting booth → west aisle → 남 subdock.
- **Entry:** 북 check-in.
- **Objective:** 중앙 sorting booth의 priority case.
- **Exit:** 남 secondary dock.
- **Safe Route:** east rack cover → booth backdoor → case.
- **Risk Route:** junction 정면의 wide diagonal crossing.
- **Landmark:** Dispatch booth가 cargo 목적과 lane 간 실제 선택 중심.
- **Security Style:** junction 압력은 교대 role, broad map의 dead-zone는 roaming 재확인.
- **Guard concept:** east/west aisle patrol/dispatch roaming/subdock check.
- **CCTV concept:** north junction camera와 south camera는 safe pocket 동시감시 금지.
- **Theft flow:** case 확인 → 각 dispatch lane로 수색 분담, 플레이어 위치 모름.
- **First LOS Break:** booth 남쪽 opaque dispatch wall.
- **Escape flow:** wall → west aisle end → secondary-dock junction → exit.
- **Main mechanic (보충):** 세 dispatch lane의 junction 진입 순서.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-09 — Packing Reserve

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 07-09
- **Title:** Packing Reserve
- **Mission Fantasy:** packing floor의 낮은 가구를 cover로 오해하지 않고 고층 rack 사잇길로 접근.
- **Architecture:** low packing island+높은 reserve racks 두 줄+동 service L corridor.
- **Main Zones:** 서 intake → reserve racks → packing display → east service → 북 dock.
- **Entry:** 서 intake.
- **Objective:** 남central packing case beside 높은 검수벽.
- **Exit:** 북 service dock.
- **Safe Route:** reserve rack 끝 → 검수벽측 → case.
- **Risk Route:** low packing tables 사이 exposed crossing.
- **Landmark:** Packing island는 soft route, reserve racks가 실제 cover.
- **Security Style:** 긴 LOS와 낮은 가구 대비를 읽음, visual cover를 마법 Full Cover로 계산 안함.
- **Guard concept:** packing roaming/rack patrol/service turn.
- **CCTV concept:** packing 위 camera는 낮은 island를 통과 관찰, rack 뒤는 break.
- **Theft flow:** case 확인 → packing/rack/service search.
- **First LOS Break:** case 동쪽 opaque quality-inspection wall.
- **Escape flow:** wall → east service L → north dock junction → exit.
- **Main mechanic (보충):** 낮은 packing table과 높은 rack cover 구분.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

### 07-10 — Black Cargo Dispatch

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 07-10
- **Title:** Black Cargo Dispatch
- **Mission Fantasy:** rack lane와 machinery junction을 연결해 최고 freight를 다른 dock로 반출.
- **Architecture:** rack comb+machinery island+secured container compound의 비대칭 연결.
- **Main Zones:** 동 inspection → rack lanes → machine crossover → secured bay → dispatch return → 서 dock.
- **Entry:** 동 inspection nook.
- **Objective:** 북중앙 Black Cargo container의 case.
- **Exit:** 서 dispatch dock.
- **Safe Route:** rack end chain → machine opaque flank → container 측문.
- **Risk Route:** loading spine long crossing을 연속 통과.
- **Landmark:** Black Cargo container가 secured bay와 dispatch 분기 anchor.
- **Security Style:** Warehouse 종합; 큰 공간 count 증가는 sector 분산, Finale spike 없음.
- **Guard concept:** rack/machinery/container/dispatch 역할을 구역별 배치.
- **CCTV concept:** loading spine와 dispatch junction camera 분담; 중간 opaque recover 제공.
- **Theft flow:** 화물 확인 → rack/machine/dispatch search, 숨은 target 실시간공유 없음.
- **First LOS Break:** container 남쪽 opaque housing corner.
- **Escape flow:** corner → machine backlane → dispatch fork → west dock; 두 의미있는 crossing 포함.
- **Main mechanic (보충):** rack·machinery·container 반출 경로 종합.
- **Difficulty Tier:** 7 — HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Large Industrial Space: 긴 storage lane와 횡단 roaming을 읽고 끝단 우회를 계획한다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Chapter 08 — SECURITY HQ


### 08-01 — Security Reception

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 08-01
- **Title:** Security Reception
- **Mission Fantasy:** 관제 desk 뒤 data case를 patrol와 camera 사이의 틈으로 가져온다.
- **Architecture:** control desk island+monitor-wall alcove+두 hallway loop.
- **Main Zones:** 남 staff entry → west hallway → desk bay → east return → 북 technician.
- **Entry:** 남 staff vestibule.
- **Objective:** 중앙 Security Desk의 data case.
- **Exit:** 북 technician exit.
- **Safe Route:** monitor opaque back → desk 측면 → case.
- **Risk Route:** desk 전면 shared reception crossing.
- **Landmark:** Security Desk가 data source와 corridor 선택 중심.
- **Security Style:** 보안망 입문도 VERY HARD 대역, 상시 모든 route 봉쇄 금지.
- **Guard concept:** hall patrol/desk turn/technician roaming.
- **CCTV concept:** reception mount는 desk front, hallway camera는 별도 crossing phase.
- **Theft flow:** data 확인 → desk/hall/technician sector search, 모니터가 숨은 Player를 알지 못함.
- **First LOS Break:** desk 북쪽 opaque equipment backwall.
- **Escape flow:** backwall → east return corridor → technician junction → exit.
- **Main mechanic (보충):** desk Guard turn와 reception camera 창 연결.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-02 — Monitoring Room

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 08-02
- **Title:** Monitoring Room
- **Mission Fantasy:** server island 둘레의 감시 phase를 이어 data storage에 접근.
- **Architecture:** server islands 두 개+surveillance crossover+동 support corridor.
- **Main Zones:** 남 intake → west server loop → monitor bay → east server loop → 동 support.
- **Entry:** 남 intake recess.
- **Objective:** 북 Monitor Wall 부속 data case.
- **Exit:** 동 support exit.
- **Safe Route:** opaque server backs → monitor 측문 → case.
- **Risk Route:** 두 server 사이 surveillance crossover 직선.
- **Landmark:** Monitor Wall가 목표와 camera network의 story anchor.
- **Security Style:** Guard와 CCTV 서로 다른 교차로 담당, safe route 창을 남김.
- **Guard concept:** 각 server loop patrol/monitor 확인/support turn.
- **CCTV concept:** crossover 양 mount phase 분리, opaque server-back 대기 가능.
- **Theft flow:** data 확인 → server 서/동+support sector 분산.
- **First LOS Break:** monitor bay 남쪽 opaque server rack end.
- **Escape flow:** rack end → east loop 뒤 → support junction → exit.
- **Main mechanic (보충):** server islands 사이 surveillance crossing 관찰.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-03 — Server Wing

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 08-03
- **Title:** Server Wing
- **Mission Fantasy:** S형 server 복도의 끝과 technician bypass를 읽고 data를 회수한다.
- **Architecture:** blind-feed S corridor+두 technician bypass+west data room.
- **Main Zones:** 서 service → S corner → server bay → south bypass → 남 maintenance.
- **Entry:** 서 service nook.
- **Objective:** 북동 Server Rack storage의 data module.
- **Exit:** 남 maintenance exit.
- **Safe Route:** opaque rack 두 corner → data room 측면.
- **Risk Route:** S 중앙의 열린 crossover로 두 corner 생략.
- **Landmark:** Server Rack이 data bay와 S 경로의 실제 blocker.
- **Security Style:** blind feed는 opaque topology로 생김; 새camera 해킹 없음.
- **Guard concept:** S patrol/data-door turn/bypass roaming.
- **CCTV concept:** S mouth camera와 maintenance camera는 distinct crossing, bypass 전부 동시감시 금지.
- **Theft flow:** 빈 module → server/S/bypass sector search.
- **First LOS Break:** data bay 서쪽 opaque rack spine.
- **Escape flow:** spine → south technician bypass → maintenance junction → exit.
- **Main mechanic (보충):** S corridor corner와 technician bypass 선택.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-04 — Restricted Corridor

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 08-04
- **Title:** Restricted Corridor
- **Mission Fantasy:** 보안 gate를 둘러싼 방군을 통해 data를 service-return으로 반출.
- **Architecture:** restricted rooms+평행 security return, 두 offset cross doors.
- **Main Zones:** 북 check-in → restricted room → data alcove → south corridor → 서 return.
- **Entry:** 북 check-in alcove.
- **Objective:** 동 Security Gate 부속 secured data cabinet.
- **Exit:** 서 security-return exit.
- **Safe Route:** room 문 뒤 → opaque gate jamb → cabinet.
- **Risk Route:** restricted corridor 직선 gate approach.
- **Landmark:** Security Gate는 고정 개방 portal, target를 secured room에 연결.
- **Security Style:** 문 Guard와 hallway camera 역할 분리; 새 locked-door mechanic 없음.
- **Guard concept:** restricted patrol/gate turn/return roaming.
- **CCTV concept:** cross doors 위 camera phase를 분리, room 내부 opaque pocket 확보.
- **Theft flow:** cabinet 확인 → restricted/return/search junction 분산.
- **First LOS Break:** cabinet 남쪽 opaque security-room wall.
- **Escape flow:** wall → south corridor corner → west return junction → exit.
- **Main mechanic (보충):** room 문과 gate portal의 시간 분리.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-05 — Black Site Archive

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 08-05
- **Title:** Black Site Archive
- **Mission Fantasy:** archive 방군의 data를 dogleg 보안 통로 밖으로 반출.
- **Architecture:** 비대칭 archive rooms+security dogleg+outer technician bypass.
- **Main Zones:** 동 service → archive rooms → terminal → dogleg → 북 technician.
- **Entry:** 동 service recess.
- **Objective:** 서남 Archive Terminal의 data module.
- **Exit:** 북 technician exit.
- **Safe Route:** archive 높은 shelf → terminal 측면 → module.
- **Risk Route:** outer bypass에서 열린 dogleg junction으로 빠른 진입.
- **Landmark:** Archive Terminal이 data 목적과 room 접근 spine 중심.
- **Security Style:** 기존05 capstone을 같은Tier로; bypass도 관찰 가능한 위협 유지.
- **Guard concept:** archive patrol/dogleg turn/bypass roaming/technician check.
- **CCTV concept:** archive 입구와 dogleg cameras는 담당선 분리.
- **Theft flow:** module 확인 → archive/dogleg/bypass search, hidden path=currentPlayer 아님.
- **First LOS Break:** terminal 뒤 opaque archive partition.
- **Escape flow:** partition → outer bypass 남끝 → dogleg 북 junction → technician.
- **Main mechanic (보충):** archive dogleg와 outer bypass의 독립 수색 회피.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-06 — Response Planning Room

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 08-06
- **Title:** Response Planning Room
- **Mission Fantasy:** 지원 Guard의 통로를 미리 관찰해 response data를 반출한다.
- **Architecture:** central operations island+두 response corridors+서 briefing bay.
- **Main Zones:** 남 staff → east response → briefing → data island → 북 service.
- **Entry:** 남 staff vestibule.
- **Objective:** 서 briefing bay의 response-plan data case.
- **Exit:** 북 service exit.
- **Safe Route:** opaque operations backs → briefing 측문 → case.
- **Risk Route:** response corridors가 만나는 중앙 crossing.
- **Landmark:** Response board와 tall island가 경보 대응 용도 설명.
- **Security Style:** 새 Guard spawn/teleport 없이 기존 sector 이동의 네트워크.
- **Guard concept:** operations patrol/corridor roaming/briefing turn; 응답은 길을 따라 이동.
- **CCTV concept:** central crossing camera와 service mount phase 분리.
- **Theft flow:** case 확인 → briefing/양 response sector로 분담, snapshot 외 마법live LKP 금지.
- **First LOS Break:** briefing 북쪽 opaque board backwall.
- **Escape flow:** backwall → west response corner → service junction → exit.
- **Main mechanic (보충):** response corridor Guard 이동을 미리 읽기.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-07 — Command Floor

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 08-07
- **Title:** Command Floor
- **Mission Fantasy:** command island 뒤에서 data를 훔쳐 다른 staff ring으로 빠진다.
- **Architecture:** command horseshoe+monitor bays 세 개+outer staff ring.
- **Main Zones:** 서 admission → south monitor → command bay → east monitor → 동 staff.
- **Entry:** 서 admission nook.
- **Objective:** 북중앙 Command Desk의 data module.
- **Exit:** 동 staff exit.
- **Safe Route:** monitor opaque backs → horseshoe 서문 → target.
- **Risk Route:** horseshoe 내부 open approach.
- **Landmark:** Command Desk가 target와 ring 분기, monitor backs는 실제 cover.
- **Security Style:** 같은위치에서 다음 monitor와 Guard turn을 동시 읽되 waiting pocket 유지.
- **Guard concept:** monitor patrol/command 확인/staff roaming 역할.
- **CCTV concept:** 각 monitor mount의 sweep sector 구분, 세대가 같은 pocket 동시감시 금지.
- **Theft flow:** module 확인 → monitor bays와staff sector search.
- **First LOS Break:** desk 동쪽 opaque command-room divider.
- **Escape flow:** divider → east monitor 후면 → staff ring junction → exit.
- **Main mechanic (보충):** command horseshoe에서 다음 monitor sector 판단.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-08 — CCTV Hub Transfer

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 08-08
- **Title:** CCTV Hub Transfer
- **Mission Fantasy:** camera hub의 연결 junction 순서를 읽어 감시data를 안전쪽으로 반출한다.
- **Architecture:** hub core 둘레 quadrants+불투명 maintenance spokes 두 개.
- **Main Zones:** 북 receiving → west monitor quadrant → hub data → east maintenance → 남 service.
- **Entry:** 북 receiving alcove.
- **Objective:** 중앙 CCTV Hub console data case.
- **Exit:** 남 service exit.
- **Safe Route:** opaque maintenance spoke → hub 측문 → case.
- **Risk Route:** open quadrant diagonal 두 crossing으로 접근.
- **Landmark:** CCTV Hub는 데이터와 각 surveillance lane의 실제 junction anchor.
- **Security Style:** camera detection은V9 고정, phase와Guard 구역으로망 구성.
- **Guard concept:** quadrant patrol/hub turn/maintenance roaming; counting 아닌coverage 통합.
- **CCTV concept:** quadrant mount들은 한 spoke뒤를 동시에 덮지 않음.
- **Theft flow:** hub 도난 → quadrants/maintenance sector; camera있다는 이유만으로 hidden LKP 없음.
- **First LOS Break:** hub 남쪽 opaque maintenance enclosure.
- **Escape flow:** enclosure → east spoke → south service junction → exit.
- **Main mechanic (보충):** quadrant camera phase와 maintenance spokes 연결.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-09 — Watch Handover

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 08-09
- **Title:** Watch Handover
- **Mission Fantasy:** 경비 handover corridor의 엇갈린 patrol을 읽고 교대기록을 반출한다.
- **Architecture:** parallel duty corridors+central records room+west briefing loop.
- **Main Zones:** 동 staff entrance → south duty → records → north duty → 서 briefing.
- **Entry:** 동 staff recess.
- **Objective:** 중앙 shift Records Cabinet의 data.
- **Exit:** 서 briefing exit.
- **Safe Route:** duty opaque wall → records 측문 → cabinet.
- **Risk Route:** handover central connector로직진.
- **Landmark:** Records Cabinet이 교대 story와 두 duty line의 실제 수렴점.
- **Security Style:** 새 schedule변경 없이 명시된 patrol turn phase를 관찰.
- **Guard concept:** 두 duty patrol/records turn/briefing roaming.
- **CCTV concept:** connector camera와 briefing camera는 각기 다른 crossing, roomcorner break 유지.
- **Theft flow:** records 확인 → 양 duty와briefing sector로 조사지역 분리.
- **First LOS Break:** records 북쪽 opaque file-wall return.
- **Escape flow:** return → north duty end → briefing junction → exit.
- **Main mechanic (보충):** handover 두 duty corridor의 turn phase 읽기.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

### 08-10 — The Network Breach

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 08-10
- **Title:** The Network Breach
- **Mission Fantasy:** 관제·server·restricted room을 이어 보안망 중심 data를 탈취한다.
- **Architecture:** monitor ring+opaque server spine+restricted archive, 독립 technician return.
- **Main Zones:** 서 reception → monitor ring → server crossover → archive → technician return → 동 service.
- **Entry:** 서 reception nook.
- **Objective:** 북중앙 Network Archive Terminal의 data.
- **Exit:** 동 service exit.
- **Safe Route:** server-back cover chain → archive 측문 → terminal.
- **Risk Route:** monitor 중앙선+server crossover의 짧지만 exposed 접근.
- **Landmark:** Network Terminal이 command/monitor/server망의 결합 anchor.
- **Security Style:** HQ 종합, sector별 휴식과 phase 차로 finale spike 방지.
- **Guard concept:** monitor/server/archive/technician 역할 분리, archive와 exit cluster 금지.
- **CCTV concept:** 네트워크별 camera 담당 crossing 분리; 모든 safe pocket 겹침 금지.
- **Theft flow:** data 확인 → monitor/server/return search 분담, 실제 Spotted만 LKP.
- **First LOS Break:** archive 뒤 opaque server-service wall.
- **Escape flow:** wall → technician return → east security junction 관찰 → service exit.
- **Main mechanic (보충):** monitor·server·archive 보안망의 틈 종합.
- **Difficulty Tier:** 8 — VERY HARD; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Security Network: Guard 역할과 CCTV phase의 연결을 읽어 안전한 네트워크 틈을 찾는다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Chapter 09 — HIGH SECURITY VAULT


### 09-01 — Outer Checkpoint

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 09-01
- **Title:** Outer Checkpoint
- **Mission Fantasy:** 최종 시설 외곽 seal 뒤 core diamond를 다른 검수 출구로 반출한다.
- **Architecture:** heavy vault island 주위 outer seal loop와 두 checkpoint alcoves.
- **Main Zones:** 서 inspection → south outer loop → seal bay → north check → 동 dispatch.
- **Entry:** 서 inspection recess.
- **Objective:** 중앙 Heavy Door 안쪽 연결 bay의 masterDiamond case.
- **Exit:** 동 dispatch.
- **Safe Route:** opaque gate jamb → outer wallcorner → seal 측면.
- **Risk Route:** outer loop open frontage를 짧게 가로질러 bay 정면 접근.
- **Landmark:** Heavy Door는 항상 통과 가능한 portal, diamond는 내부 연결 bay에 존재.
- **Security Style:** 최종 Tier부터 동일 예산, checkpoint 대기점을 관찰 가능한 위치에 제공.
- **Guard concept:** outer patrol/checkpoint turn/bay 확인/dispatch roaming.
- **CCTV concept:** seal facade와 dispatch camera는 별도 crossing; gate 뒤 opaque pocket 유지.
- **Theft flow:** case 도난 → outer / check / dispatch sector 수색, seal 통과로 Player LKP 생성 금지.
- **First LOS Break:** bay 북쪽 opaque vault buttress.
- **Escape flow:** buttress → north inspection junction → east dispatch corridor → exit.
- **Main mechanic (보충):** outer seal과 checkpoint의 독립 관찰 창 연결.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-02 — Vault Antechamber

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 09-02
- **Title:** Vault Antechamber
- **Mission Fantasy:** 맞은편 보안 doorway 두 개를 이어 chamber의 diamond를 반출한다.
- **Architecture:** 세 inner chambers와 서로 엇갈린 doorway, north return corridor.
- **Main Zones:** 서 admission → south chamber → inner case room → east chamber → 북 return.
- **Entry:** 서 admission alcove.
- **Objective:** 동 inner chamber Vault Wheel 옆 masterDiamond case.
- **Exit:** 북 return exit.
- **Safe Route:** 각 chamber 문 뒤 opaque corner → case 측면, 다음 doorway turn 관찰.
- **Risk Route:** 두 doorway 정렬되는 순간 central chamber 직선 crossing.
- **Landmark:** Vault Wheel은 target room의 실제 금고 문맥, 새로운 조작 없음.
- **Security Style:** 방 사이 Guard / CCTV 담당선을 분리하되 연속 보안층 판단.
- **Guard concept:** admission patrol/inner-door turn/east chamber patrol/return check.
- **CCTV concept:** 두 door camera는 다른 phase, chamber 벽 뒤는 회복 지점.
- **Theft flow:** 빈 case → inner rooms/return 분산 search, 관찰 전 숨은 위치 없음.
- **First LOS Break:** case 북쪽 opaque chamber return wall.
- **Escape flow:** wall → east chamber 뒤 doorway → north return junction → exit.
- **Main mechanic (보충):** chamber 두 doorway의 교대 timing.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-03 — Mechanism Hall

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 09-03
- **Title:** Mechanism Hall
- **Mission Fantasy:** 노출된 decoy 접근선 대신 machinery 측면 loop로 diamond를 회수한다.
- **Architecture:** mechanism spine+긴 decoy corridor+독립 side-room loop.
- **Main Zones:** 남 inspection → west side rooms → mechanism bay → east security return → 서 loading.
- **Entry:** 남 inspection nook.
- **Objective:** 북 Mechanism Rack 뒤 secured diamond case.
- **Exit:** 서 loading exit.
- **Safe Route:** opaque mechanism housing → side-room 문 뒤 → case.
- **Risk Route:** decoy corridor 직선은 빠르지만 long Guard / CCTV crossing.
- **Landmark:** Mechanism Rack이 기계 용도와 diamond bay 접근을 결정.
- **Security Style:** decoy는 실제 통과가능 위험 루트, 막힌 길을 Safe처럼 표시 금지.
- **Guard concept:** corridor patrol/mechanism turn/side-room roaming/loading check.
- **CCTV concept:** decoy mount는 긴 시야선, side-room door mount는 시간차; opaque housing 뒤 회복 지점.
- **Theft flow:** case 확인 → decoy/side rooms/return search, decoy를 향한다고 Player 예측 위치 공유 금지.
- **First LOS Break:** case 남쪽 opaque mechanism backplate.
- **Escape flow:** backplate → east return corner → loading junction → 서 exit.
- **Main mechanic (보충):** 실제로 통과 가능한 decoy 긴 LOS와 side loop 비교.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-04 — Security Ring

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 09-04
- **Title:** Security Ring
- **Mission Fantasy:** 보안 cross의 회전 시야를 읽고 한 escape lane를 선택한다.
- **Architecture:** 중앙 security pillar core + cross 접근 + 두 protected escape lanes.
- **Main Zones:** 동 check → north security arm → core bay → south arm → west return → 남 dock.
- **Entry:** 동 check recess.
- **Objective:** 중앙 Security Pillar 안쪽 secured diamond case.
- **Exit:** 남 dock.
- **Safe Route:** pillar opaque side → north-arm corner → case.
- **Risk Route:** cross 중앙 짧은 노출선으로 core 정면 접근.
- **Landmark:** Security Pillar가 core bay와 escape lane 양쪽을 실제 분리.
- **Security Style:** 봉쇄 연출은 기존 수색으로만, 동적 문 차단새 기능 없음.
- **Guard concept:** arm patrol/core turn/outer roaming/dock check; 한 pocket 전 방향 봉쇄 금지.
- **CCTV concept:** 두 arm 끝 camera phase 분리, 같은 escape corner 동시 감시 금지.
- **Theft flow:** 빈 case → north/south/outer/dock sector로 수색, pickup으로 Player 위치 전파 없음.
- **First LOS Break:** core 뒤 opaque security pillar housing.
- **Escape flow:** housing → west protected lane → south dock junction → exit; east entry와 분리.
- **Main mechanic (보충):** security cross에서 서로 다른 escape lane 선택.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-05 — Master Diamond Chamber

**범위:** 기존 ID 재해석; 현재 실행 확인 아님.

- **ID:** 09-05
- **Title:** Master Diamond Chamber
- **Mission Fantasy:** master display를 훔친 뒤 두 antechamber 중 관찰 가능한 출구로 빠진다.
- **Architecture:** master vault+antechamber두 개+outer loop+rear escape.
- **Main Zones:** 북 admission → west antechamber → master room → east antechamber → 동 rear.
- **Entry:** 북 admission alcove.
- **Objective:** 중앙 Master Display의 masterDiamond.
- **Exit:** 동 rear exit.
- **Safe Route:** vault opaque buttress → west antechamber문 뒤 → display 측면.
- **Risk Route:** master room 중앙 노출 접근, 두 순찰 방향 동시 읽기.
- **Landmark:** Master Display는 실제 main vault 안, backdrop만 사용 금지.
- **Security Style:** 기존 05 capstone도 동일 최종 Tier, 넓은 room에 명확한 cover chain.
- **Guard concept:** antechamber patrol/vault 외주/outer roaming/rear check; 보물 주변 전원 집결 금지.
- **CCTV concept:** vault 입구와 outer-junction camera는 crossing 분담.
- **Theft flow:** display 도난 → vault/antechambers/outer/rear sector, 마법 LKP 없음.
- **First LOS Break:** display 북쪽 opaque vault service wall.
- **Escape flow:** wall → east antechamber → outer junction 선택 → rear; objective 직후 바로 exit 금지.
- **Main mechanic (보충):** master vault의 두 antechamber 탈출 선택.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-06 — Secure Transit Spine

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 09-06
- **Title:** Secure Transit Spine
- **Mission Fantasy:** secure transit corridor를 따라 diamond를 다른 검수 dock로 반출한다.
- **Architecture:** 두 parallel secure corridors+central custody island+south rear dogleg.
- **Main Zones:** 서 검수 → north transit → custody bay → east corridor → 남 dock.
- **Entry:** 서 검수 recess.
- **Objective:** 북중앙 Custody Case의 masterDiamond.
- **Exit:** 남 rear dock.
- **Safe Route:** opaque transit spine → custody 측문 → case.
- **Risk Route:** 두 corridor의 central connector 노출 crossing.
- **Landmark:** Custody Island가 반출 절차와 두 통로 선택의 anchor.
- **Security Style:** route 선택과 camera 회전 창이 겹치나 spine 뒤 관찰 휴식 유지.
- **Guard concept:** north / south corridor patrol/custody turn/dock roaming.
- **CCTV concept:** connector와 dock camera 위협 phase 분리.
- **Theft flow:** custody 도난 → 양 transit/custody/dock sector, 숨은 Player의 방향은 알 수 없음.
- **First LOS Break:** custody 동쪽 opaque armored backwall.
- **Escape flow:** wall → east corridor dogleg → south dock junction → exit.
- **Main mechanic (보충):** parallel transit spine 뒤에서 다음 connector 관찰.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-07 — Secure Core Fork

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 09-07
- **Title:** Secure Core Fork
- **Mission Fantasy:** core의 전면 경계를 관찰한 뒤 양 서비스 방 중 하나로 보물을 반출한다.
- **Architecture:** diamond core 앞 Y fork + 두 service rooms+outer security crescent.
- **Main Zones:** 동 checkpoint → north fork → core case → west service room → 북 dispatch.
- **Entry:** 동 checkpoint alcove.
- **Objective:** 남중앙 Secure Core의 masterDiamond case.
- **Exit:** 북 dispatch.
- **Safe Route:** fork opaque end → north service room문 뒤 → core 측면.
- **Risk Route:** fork 중앙 diagonal은 짧지만 Guard/CCTV 창 동시 판단.
- **Landmark:** Core Enclosure가 objective와 fork 후퇴 방향 결정.
- **Security Style:** 추격 유도 성공을 필수로 하지 않음, Spotted 후 기존 LKP search 선택 가능.
- **Guard concept:** fork patrol/core 외주/service 교대/dispatch check.
- **CCTV concept:** core front와 crescent camera는 side pocket 동시 봉쇄 금지.
- **Theft flow:** 도난 → core / fork / 두 service sector 분산, 실제 발견만 snapshot LKP.
- **First LOS Break:** core 북쪽 opaque service enclosure.
- **Escape flow:** enclosure → west room 뒤 → crescent north junction → dispatch.
- **Main mechanic (보충):** core Y fork와 service rooms의 수색 방향 선택.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-08 — Monitoring Bypass

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 09-08
- **Title:** Monitoring Bypass
- **Mission Fantasy:** monitoring 보안망의 기둥 뒤 관찰점을 연결해 diamond를 유지관리 길로 반출한다.
- **Architecture:** monitoring rectangle+vault side bay+두 opaque maintenance wedges.
- **Main Zones:** 북 입고 → west monitor lane → vault bay → east maintenance → 남 exit.
- **Entry:** 북 입고 nook.
- **Objective:** 동 vault side bay의 masterDiamond case.
- **Exit:** 남 maintenance exit.
- **Safe Route:** opaque wedge → vault jamb → case 측면.
- **Risk Route:** monitor rectangle 중앙 long crossing.
- **Landmark:** Monitoring wall과 vault portal이 감시/target 맥락을 직결.
- **Security Style:** camera + Guard overlap은 risk crossing에 집중,Safe 연속 창을 제공.
- **Guard concept:** monitor patrol/vault turn/maintenance check/outer roaming.
- **CCTV concept:** monitor corner mount는 wedges 뒤를 못 봄; next lane camera와 phase 구분.
- **Theft flow:** case 확인 → monitor/vault/maintenance/outer sector search.
- **First LOS Break:** bay 남쪽 opaque vault return wall.
- **Escape flow:** wall → east maintenance corner → south junction → exit.
- **Main mechanic (보충):** monitoring rectangle에서 maintenance wedge cover 연결.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-09 — Dual Seal Reserve

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 09-09
- **Title:** Dual Seal Reserve
- **Mission Fantasy:** 두seal중관찰 가능한접근선을택해 reserved diamond를 외주 검수실로 반출한다.
- **Architecture:** 두 seal antechambers+central reserve store+남 external check loop.
- **Main Zones:** 서 check → north seal → reserve bay → east seal → 남 external dock.
- **Entry:** 서 checkrecess.
- **Objective:** 북중앙Reserve Vault의masterDiamond.
- **Exit:** 남 external dock.
- **Safe Route:** north seal opaque jamb → reserve 후면 corner → case.
- **Risk Route:** central approach가짧지만 두seal 관찰선 연속 노출.
- **Landmark:** Reserve Vault는두seal을연결하는실제objectivezone.
- **Security Style:** 이중 보안층은 시간 분리, 동시에모든접근구멍차단금지.
- **Guard concept:** seal별patrol/reserve외주/externalroaming, dock에추가cluster없음.
- **CCTV concept:** 각seal위camera는 공유recovercorner 동시관찰금지.
- **Theft flow:** reserve도난 → 양seal/reserve/external sector, 한seal열린것만으로spotted아님.
- **First LOS Break:** reserve동쪽 opaque armor buttress.
- **Escape flow:** buttress → east seal측문 → external check junction → 남 dock.
- **Main mechanic (보충):** 두 seal의 회복 corner와 external check 순서.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

### 09-10 — The Final Heist

**범위:** 신규 Blueprint; 현재 실행 확인 아님.

- **ID:** 09-10
- **Title:** The Final Heist
- **Mission Fantasy:** checkpoint·camera망·vault·search회피를종합해최종 diamond를 다른 시설 출구로 반출한다.
- **Architecture:** outer checkpoint crescent+innersecurityring+master vault core+독립return dogleg.
- **Main Zones:** 서 checkpoint → monitoring → inner ring → master vault → servicejunction → 동 dispatch.
- **Entry:** 서 checkpoint alcove.
- **Objective:** 중앙Master Vault 실제 내부의masterDiamond display.
- **Exit:** 동secure dispatch.
- **Safe Route:** checkpoint wall → monitor opaque island → inner ring corner → vault측문.
- **Risk Route:** monitor long crossing과vault 정면 ring cut을잇는짧은길.
- **Landmark:** Master Vault가모든 보안층의 종착점, target는 landmark 내부.
- **Security Style:** 모든 system 종합이나같은 Tier budget, 큰규모에독립관찰휴식점 추가.
- **Guard concept:** checkpoint/monitor/ring/vault 외주/dispatch구역 분담, objective 전 방향 상주와 exit cluster 금지.
- **CCTV concept:** layer별 camera 배치, opaque cover chain전체를 동시 감시하는 phase 금지.
- **Theft flow:** display 도난 → checkpoint / monitor / ring / return sector, 실제 Spotted만Player LKP.
- **First LOS Break:** vault 뒤opaque armored service wall.
- **Escape flow:** wall → inner ring 측 junction → return dogleg재관찰 → 동 dispatch; 의미 있는 보안층 두 개를 탈출.
- **Main mechanic (보충):** checkpoint·inner ring·vault·return dogleg 종합.
- **Difficulty Tier:** 9 — FINAL/HIGHEST; Chapter 공통 budget, ordinal 배율 없음.
- **Chapter identity:** Final Security Facility: 외곽·내부·금고 보안층을 해석하고 탈출 junction을 재선택한다.

**Finale의 난이도 역할:** 단원 개념 종합. 위협 수 증가는 구역 분담·관찰 휴식·독립 탈출 경로로 상쇄하며 같은 Chapter budget을 벗어나면 설계 재검토.

## Phase B 연결 검증과 구현 의존성

- **본 문서 구현 여부:** 기존30개 ID의 현재 data는 frozen. 신규30개 ID는 catalog/runtime에 추가하지 않았다. Proposed geometry가 현재 layout과 같다는 주장은 없다.
- **부재하는 미래 에셋:** Mansion room/door/서가, Warehouse rack/container/machinery, HQ console/server/network wall, Vault armored core는 독립 Kit 제작/승인 의존성이다. Blueprint 검토에는 semantic blocker를 사용하되 출시 asset 완료로 부르지 않는다.
- **교체할 것:** 기존 후반5개의 자동적인 guard/size 증가를 그대로10개까지 이어붙이지 않는다. Phase B에서 각 row의 zone/cover/security를 재작성하고 동일 Chapter budget으로 다시 측정한다.
- **물리 검사:** 현재 radius 18 world 기준 최소 이동 폭은 0.90 tile이지만 이 수치는 기하학적 최소에 불과하다. 실제 Tilt margin과 corner overshoot까지 넓혀야 하며 0.90이면 '편안함' PASS라는 뜻이 아니다. 본 문서엔 좌표/폭 확정 없음.
- **공통 리듬:** 기존 MOVE/GET READY/FREEZE가 해당 Runtime에서 활성인 조건이면 모든 표에서 그대로 동작한다. 새로운 방이나 조명은 phase timer/입력 처리/센서 baseline을 바꾸지 않는다. Chapter에 없는 phase는 N/A로 기록한다.


### 향후 대표 full-heist 후보 — 아직 실행하지 않음

| Chapter | 후보 | 검증할 판단 | 필요한 전체 결과 |
|---|---|---|---|
| 04 | 04-03, 04-10 | 유리 BLOCK/LOS PASS, 실제 문, opaque 첫 break | Safe와Risk 각 Objective → Theft → Escape → CLEAR, Glass뒤의 실제 Spotted/Search |
| 05 | 05-02, 05-10 | 다방향 감시, 낮은 테이블과opaque island 차이 | pit crossover → pickup → bar/cashier 첫break → 별도exit |
| 06 | 06-03, 06-10 | 문 뒤 관찰, 다음 room선택, service return | room전이 → pickup → 서가break → service CLEAR |
| 07 | 07-02, 07-10 | 긴lane와roaming, 실재endgap, cargo반출 | lane timing → pickup → containerbreak → dock CLEAR |
| 08 | 08-08, 08-10 | Guard+CCTV망 phase와LKP 정보제약 | actualspotted/snapshot → LOSbreak → sectorsearch → exit |
| 09 | 09-05, 09-10 | 다층보안/첫cover/탈출junction 재선택 | vaultpickup → Theft → 가능한Spotted → Search/Capture/CLEAR 흐름 모두 crash없음 |

대표 Mission만 통과했다고10개 난이도flatness나90개 Production Complete를 선언하지 않는다. Automated pressure는 참고이고 실제iPhone Tilt의 관찰가능성/손목정밀도/회복시간이 최종 난이도 판단이다.


### 설계 재검토 트리거

1. Safe route가 같은 속도 조건에서 어느 patrol 위상에도 성립하지 않음 → geometry/cover/phase 재작성. Bot실패만으로게임버그판정하지 않음.
2. Objective부터firstopaqueLOSbreak까지 항상CAUGHT → 목표bay/첫corner 관계 재설계; Chasespeed 전역수정으로해결하지 않음.
3. Chapter후반만 압력상승 → Finale관찰점/sector분담으로보상, Mission번호배율삭제.
4. 높은Chapter가넓은면적때문에낮은체감 → junction/sightline/search결정을강화, 전체바닥cone덮기금지.
5. 새Stage가이전Stage와색만다름 → architecture/entry-objective-exit배치/routegraph/landmark기능비교하여재작성, decoration수증가로대체하지 않음.

## Changelog

- V11 Phase A: Ch04–09 60개 Mission 각각19필드 작성. 기존30title보존, 추가30은새설계로구분.
- 기존Blueprint의 Mission번호에따른guard/zone/difficulty ramp폐기. Chapter별가설budget과공통보안계약도입.
- Runtime변경·새asset생성·실기기난이도PASS선언없음.
