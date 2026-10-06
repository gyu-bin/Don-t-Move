# DON'T MOVE — V12 PHASE 4D  
## DEVICEHUB LIVE SIMULATOR VISUAL QA + TARGETED FIXES

현재 `mobile/` 최신 상태에서 작업한다.

이번 작업은 매우 중요하다.

이전 단계에서:

- 자동 테스트 PASS
- 오프라인 렌더 PASS
- Topology PASS
- 시각 QA PASS

가 나왔음에도 실제 사용자 플레이 화면에서는 다음 문제가 계속 발견됐다.

실제 사용자 피드백:

1. 시각적으로 지나갈 수 있어 보이는 곳이 실제로는 안 지나가짐
2. Objective 주변에 구조물이 너무 많아 과밀함
3. Chapter 2가 Chapter 1보다 더 쉬움
4. 03-05에서 Objective 획득 후 Exit까지 Guard 압박이 거의 없음
5. Chapter 4 Lab이 여전히 “Asset을 그냥 붙여넣은 느낌”
6. Chapter 4 일부 Asset이 공중에 떠 있거나 접지가 어색함
7. Chapter 5 Environment Asset이 맵 크기에 비해 너무 작아 보임
8. Chapter별 Door Visual이 충분히 다르게 보이지 않음
9. Lockdown Door가 의미 없는 통로를 막는 경우가 있음
10. 구조물 크기와 맵 크기 비율이 여전히 맞지 않는 곳이 있음

따라서 이번 작업에서는:

> **오프라인 렌더나 자동 테스트를 먼저 믿지 말고, DeviceHub에서 실제 iOS Simulator 앱을 직접 열어서 화면을 보며 QA하고, 발견한 문제를 실제 코드에 수정한 뒤 같은 화면에서 재검증한다.**

이것이 이번 Phase의 핵심이다.

`legacy-unity/` 수정 금지.

---

# 0. 절대 규칙

이번 작업에서는 다음을 VERIFIED 근거로 인정하지 않는다.

- Offline Renderer만 확인
- 자동 Test PASS만 확인
- JSON 좌표만 확인
- Topology 숫자만 확인
- Static comparison board만 확인

반드시:

**DeviceHub → 실제 iOS Simulator → 실제 DON’T MOVE 앱 → 실제 Mission 화면**

을 직접 확인해야 한다.

---

# 1. DeviceHub 사용 필수

가능한 DeviceHub/iOS Simulator 제어 기능을 사용한다.

목표 기기:

**iPhone 17 Pro Simulator**

권장.

필요하면 현재 실행 가능한 동일 세대 Simulator 사용 가능하나,
사용한 Device를 명확히 보고한다.

---

# 2. 실제 앱 실행

DeviceHub에서:

1. DON’T MOVE 실행
2. Home 진입
3. Chapter Select
4. Mission 선택
5. Mission 실제 화면 진입

까지 직접 수행.

오프라인 렌더 파일을 대신 보지 않는다.

---

# 3. 우선 검사 Mission

먼저 아래 5개를 집중 QA한다.

- 01-05
- 02-05
- 03-05
- 04-05
- 05-05

이 5개는 각 Chapter의 대표 Final Mission이며,
현재 문제를 가장 쉽게 비교할 수 있다.

---

# 4. 각 Mission에서 반드시 실제 화면 캡처

각 Mission에서 최소:

### A. Entry 시점
전체 공간 구성 확인.

### B. Objective 근처
밀도 / 보안 / 구조물 확인.

### C. Escape 구간
Exit / Lockdown / Guard 압박 확인.

가능하면 Debug OFF.

---

# 5. Screenshot Evidence 필수

각 QA 판단에는 실제 Simulator screenshot을 근거로 남긴다.

최종 보고에서:

- Mission ID
- screenshot path
- 발견 문제
- 수정 내용
- 수정 후 screenshot

을 연결한다.

---

# PART A — 01-05 MUSEUM

# 6. 01-05 실제 시각 확인

확인:

- Entry/Exit 충분히 분리됐는가
- 실제 박물관 구조처럼 보이는가
- Main Exhibition이 너무 비어 있지 않은가
- 구조물 크기가 Player 대비 적절한가
- Objective Chamber가 자연스러운가
- Exit 쪽 Guard cluster가 과하지 않은가
- Safe Route가 실제로 읽히는가

---

# 7. Museum Scale

다음이 너무 작게 보이면 수정:

- Column
- Display case
- Large statue
- Security desk
- Restricted partition

단 모든 Asset을 동일 배율로 키우지 않는다.

각 역할별로 조절.

---

# PART B — 02-05 GALLERY

# 8. Chapter 2 실제 난이도 비교

실제 화면/플레이 기준으로:

01-05보다 02-05가 조금 더 어려워야 한다.

현재 User feedback:

> Chapter 2가 오히려 더 쉬움

이 문제를 반드시 확인.

---

# 9. Gallery Difficulty Source

Guard 숫자 단순 증가 금지.

우선:

- longer LOS
- open crossing
- sculpture / installation positioning
- movable wall timing
- CCTV placement

로 조정.

---

# 10. Gallery Density

Open Gallery여도 비어 보이면 실패.

실제 Simulator에서 중앙 공간이 너무 비어 있으면:

- installation scale
- sculpture island
- art wall
- glass divider

를 조정.

---

# PART C — 03-05 BANK

# 11. 03-05 실제 플레이 확인

특히 중요.

Objective 획득 후:

**Vault → Exit**

까지 실제 Guard/CCTV 압박을 직접 확인한다.

현재 User feedback:

> 출구까지 경비가 거의 없음.

---

# 12. Bank Escape Security

Objective 이후:

최소 1~2개의 의미 있는 보안 판단이 있어야 한다.

예:

- Service Corridor Guard
- Cash Handling Junction
- Secondary Exit observation

단 Exit 바로 앞 Guard cluster는 금지.

---

# 13. 실제 은행 공간 검증

실제 Simulator 화면에서:

Public
→ Staff
→ Security
→ Vault

구조가 읽혀야 한다.

Main Vault Door 앞에 Objective가 있으면 실패.

Objective는 Vault Interior 내부.

---

# PART D — 04-05 LAB

# 14. Chapter 4는 강한 시각 재검토

현재 User feedback:

- 애매함
- Asset 붙여넣기 느낌
- 일부 떠있는 느낌

따라서 실제 Simulator에서
Lab 전체 공간을 확대해서 확인한다.

---

# 15. Lab Architecture 확인

화면에서 실제로:

Reception
→ Research
→ Glass Lab
→ Restricted Research
→ Prototype Area

가 읽히는지 확인.

안 읽히면 구조부터 수정.

---

# 16. Floating Asset 검사

각 Lab Asset:

- pivot
- ground anchor
- contact point
- scale
- wall relation

확인.

떠 있는 것처럼 보이는 Asset은 모두 수정.

목표:

**Floating Asset 0**

---

# 17. Lab Asset Cluster

장비를 단독 배치하지 않는다.

예:

Lab bench
+ monitor
+ rack
+ cart

를 기능적 cluster로 묶는다.

---

# PART E — 05-05 CASINO

# 18. Chapter 5 실제 Scale QA

이번에 반드시 DeviceHub에서 직접 확인한다.

현재 User feedback:

> Ch5 asset이 작음

이므로 Ch5를 “범위 밖이었다”로 넘기지 않는다.

---

# 19. Casino Scale

다음 Asset 확인:

- Slot bank
- Blackjack/Roulette table
- Bar island
- Cashier cage
- VIP structure
- Surveillance-related props

맵/Player 대비 작은 경우 수정.

---

# 20. Casino Architecture

단순히 Casino Asset을 뿌린 느낌이면 실패.

화면에서:

Casino Floor
→ Cashier/Staff
→ VIP
→ Secure Area

구분되어야 한다.

---

# PART F — 실제 통과 불가 구간

# 21. User screenshot에서 보인 통과 불가 문제

시각적으로 지나갈 수 있는데
Player가 안 지나가는 구간은 반드시 실제 Simulator에서 재현한다.

---

# 22. 통과 가능 검증

DeviceHub에서 실제 virtual input/touch로
해당 gap을 직접 지나가 본다.

안 지나가면:

- collider
- footprint
- prop collisionScale
- wall geometry

확인.

---

# 23. 해결 원칙

둘 중 하나:

### A
실제로 지나갈 수 있게 충분히 넓힌다.

또는

### B
시각적으로 완전히 막힌 구조로 만든다.

애매한 Fake Gap 금지.

---

# PART G — OBJECTIVE ZONE 과밀

# 24. Objective 주변 실제 화면 확인

User feedback:

> 보물 근처에 뭐가 너무 많음.

각 대표 Mission에서 Objective 근처를 실제로 확대 확인.

---

# 25. Objective Composition Rule

Objective Zone은:

- 1 main landmark
- 1~2 meaningful security elements
- clear approach
- visible escape direction

정도가 기본.

작은 구조물이 여러 개 몰려
길을 읽기 어렵게 하면 줄인다.

---

# 26. Objective 중심 Clear Radius

Objective 주변에는
Player가 접근/회전/탈출 가능한
시각적/물리적 breathing room을 확보.

---

# PART H — DOOR VISUAL QA

# 27. 실제 Door 확인

보고서에 “13종”이라고 적혀 있어도
화면에서 똑같아 보이면 실패.

DeviceHub 실제 화면으로 비교한다.

---

# 28. 최소 비교

실제 Screenshot:

- Museum Door
- Gallery Door
- Bank Door
- Lab Door
- Casino Door

나란히 비교.

---

# 29. FAIL 기준

색만 다르고 실루엣이 같으면 FAIL.

Door는 Chapter마다:

- silhouette
- material
- frame
- panel
- reader/light

중 최소 여러 요소가 실제로 달라야 함.

---

# PART I — LOCKDOWN

# 30. 현재 Lockdown 의미 재검증

User feedback:

> 길이 하나 막히는데 그냥 다른 데로 가면 됨.

이 경우 의미 없는 Lockdown.

---

# 31. 실제 DeviceHub에서 Lockdown 확인

가능하면 DEV override로 Timer를 줄이거나
Lockdown state를 직접 트리거.

단 Production Timer 28초는 변경하지 않는다.

---

# 32. Lockdown 위치 원칙

Lockdown은 반드시:

**Primary Escape Route의 중요한 Security Door**

를 닫아야 한다.

예:

Museum:
Main Public Exit

Gallery:
Main Gallery/Public Exit

Bank:
Main Security Portal/Lobby Exit

Lab:
Main Airlock

Casino:
Main Floor/Cashier Security Exit

---

# 33. 단순 우회 금지

문 바로 옆 2초 거리로 돌아서 갈 수 있으면 실패.

Secondary Route는:

- 다른 room
- service corridor
- maintenance passage

등 실제 별도 동선이어야 한다.

---

# PART J — CHAPTER 난이도

# 34. 실제 체감 비교

이번에는 숫자 말고
DeviceHub 실제 플레이로 최소 비교한다.

목표:

Ch1 < Ch2 < Ch3 < Ch4 < Ch5

---

# 35. 각 Chapter 대표 Mission 플레이

최소:

01-05
02-05
03-05
04-05
05-05

에서 Objective 접근까지 직접 플레이.

가능하면 Theft/Escape까지.

---

# 36. 난이도 판단 요소

각 Mission에서:

- Guard timing
- Open crossing
- CCTV
- Route depth
- Security layer
- Escape pressure

직접 체감 비교.

---

# 37. Ch2가 Ch1보다 쉬우면 반드시 수정

자동 metric이 어떻든
실제 Simulator 체감이 우선.

---

# PART K — Visual Scale

# 38. Structure Scale 실제 비교

각 Chapter 대표 Mission에서:

Player 대비:

- Door
- Desk/Table
- Major Structure
- Landmark

를 실제 화면에서 비교.

---

# 39. 너무 작은 Asset

다음처럼 보이면 수정:

- 책상 = 장난감
- Vault = 일반문
- Lab machine = 작은 상자
- Casino table = 소형 장식

---

# 40. Map 자체가 너무 큰 경우

Asset을 계속 키우는 대신
Map/Room 크기를 축소하는 것도 허용.

---

# PART L — Ch1~5 Audit 확장

# 41. 대표 5개 수정 후

다음 순서로 나머지도 확인:

01-01~04
02-01~04
03-01~04
04-01~04
05-01~04

총 Ch1~5 = 25 Mission.

---

# 42. 25 Mission 모두 DeviceHub Visual QA

각 Mission 최소:

- Entry screenshot
- Objective screenshot

가능하면 확보.

---

# 43. QA Checklist

각 Mission:

- [ ] 지나갈 수 있어 보이는 곳은 실제 통과 가능
- [ ] 구조물 scale 적절
- [ ] 큰 빈 공간 없음
- [ ] Objective 과밀 아님
- [ ] Objective 위치 자연스러움
- [ ] Door가 Chapter와 맞음
- [ ] Ground contact 정상
- [ ] Lockdown Door 의미 있음
- [ ] Entry/Exit separation 정상
- [ ] Chapter identity 명확

---

# PART M — 수정 후 반드시 DeviceHub 재검증

# 44. 코드 수정 후 오프라인 렌더로 종료 금지

수정 후 같은 Mission을 DeviceHub로 다시 연다.

---

# 45. Before/After 실제 Simulator Screenshot

문제가 있었던 Mission마다:

Before
→ Fix
→ After

실제 Simulator screenshot 저장.

---

# 46. 수정 후 실제 통과 확인

Collider/Gap 수정은
실제 캐릭터를 움직여 통과까지 확인.

좌표 검사만으로 PASS 금지.

---

# PART N — 자동 테스트는 마지막

# 47. DeviceHub QA 이후 실행

그 다음:

- TypeScript
- lint
- npm test
- campaign
- topology
- stability
- door
- lockdown
- fake gap

실행.

---

# 48. 자동 테스트 때문에 Visual Fix를 되돌리지 않는다

테스트 실패가 나오면
테스트와 Runtime rule을 검토.

단 안전/충돌 회귀는 반드시 해결.

---

# PART O — 금지

# 49. 금지 사항

- 오프라인 렌더만 보고 PASS
- Report 문구만 보고 PASS
- DeviceHub 실패했다고 visual QA 생략
- Ch2 난이도를 Guard 숫자만 늘려 해결
- Ch4 빈 공간을 작은 Asset spam으로 해결
- Ch5 scale을 일괄 배율만 적용
- Door recolor만 해서 새 Door라고 주장
- Lockdown door를 아무 corridor에 배치
- 사용자 실제 스크린샷 피드백 무시

---

# PART P — 완료 보고

## DEVICEHUB SESSION

1. 사용 Simulator
2. 앱 실행 상태
3. DeviceHub 성공/실패
4. 실제 확인 Mission 수

## REPRESENTATIVE MISSIONS

### 01-05
- 실제 screenshot
- scale
- density
- objective
- door
- lockdown
- difficulty

### 02-05
동일

### 03-05
동일

### 04-05
동일

### 05-05
동일

## USER-REPORTED ISSUES

5. 통과 불가 구간
6. Objective 과밀
7. Ch2 난이도
8. 03-05 Escape Guard
9. Ch4 Asset Integration
10. Ch5 Scale

각 항목:

- 재현 여부
- 실제 원인
- 수정
- 재검증

## DOOR

11. Ch1 Door
12. Ch2 Door
13. Ch3 Door
14. Ch4 Door
15. Ch5 Door
16. 실제 visual differentiation 여부

## LOCKDOWN

17. 기존 위치
18. 새 위치
19. Primary route block
20. Secondary route length
21. 실제 Simulator 확인

## 25-MISSION QA

22. PASS
23. MINOR
24. MAJOR
25. REBUILD

Mission별 목록.

## DIFFICULTY

26. Ch1 체감
27. Ch2 체감
28. Ch3 체감
29. Ch4 체감
30. Ch5 체감
31. Ch1 < Ch2 < Ch3 < Ch4 < Ch5 여부

## REGRESSION

32. TypeScript
33. lint
34. npm test
35. topology
36. collision
37. door
38. lockdown
39. stability

---

# 50. 최종 선언

DeviceHub에서 실제 Simulator 화면을 확인하지 못했다면:

**V12 PHASE 4D — DEVICEHUB VISUAL QA INCOMPLETE**

라고 보고.

DeviceHub로 25 Mission을 직접 확인하고
문제 수정/재검증까지 끝났다면:

**V12 PHASE 4D — CH1–5 LIVE SIMULATOR VISUAL QA PASSED**

라고 선언.

대표 Full-Heist와 실제 iPhone Tilt가 끝나지 않았다면
Production Ready 선언 금지.

가장 중요:

> **이번 작업에서는 “테스트가 통과했다”보다 “DeviceHub에서 실제로 어떻게 보이고 어떻게 움직이는지”를 최우선 근거로 사용한다.**