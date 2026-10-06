# DON'T MOVE — V12 PHASE 4B  
## FULL 45-MISSION TOPOLOGY REBUILD

현재 `mobile/` 최신 상태에서 작업한다.

이번 작업은 기존 맵을 조금 수정하는 작업이 아니다.

현재 사용자 실제 확인 결과:

- 01-05 포함 여러 Mission에서 Entry와 Exit가 서로 붙어 있음
- Phase 4A에서 요구한 “침투 → 깊은 Objective → 다른 탈출 경로”가 제대로 구현되지 않음
- 맵이 넓은데 빈 공간이 많음
- Objective가 공간 맥락과 맞지 않는 경우가 있음
- Door / Lockdown은 구현됐지만 Level Topology 자체가 잘못된 Mission이 많음
- Chapter별 Difficulty 차이도 아직 명확하지 않음

따라서 이번 작업에서는:

> **현재 45 Mission 전체를 Level Topology 기준으로 다시 설계하고 다시 만든다.**

기존 맵을 보존하는 것이 목표가 아니다.

좋은 Asset / 시스템 / 일부 구조만 재사용하고,
맵 구조는 필요하면 과감히 다시 만든다.

`legacy-unity/` 수정 금지.

---

# 0. 최우선 원칙

모든 Mission은 반드시:

**ENTRY  
→ PUBLIC / APPROACH  
→ TRANSITION  
→ RESTRICTED / SECURE  
→ OBJECTIVE  
→ THEFT  
→ FIRST LOS BREAK  
→ ALTERNATE ESCAPE  
→ EXIT**

구조를 가진다.

---

# 1. Entry와 Exit 절대 분리

가장 중요한 규칙.

다음은 자동 FAIL:

- Entry와 Exit가 같은 Zone
- Entry와 Exit가 바로 붙어 있음
- Entry와 Exit 사이가 한 방/한 corridor
- Objective 획득 후 몇 초 만에 Entry 옆 Exit로 탈출
- 들어온 길 그대로 한 번 되돌아가면 끝

---

# 2. Entry / Exit 거리 규칙

각 Mission에서:

Entry → Objective

와

Objective → Exit

둘 다 의미 있는 이동 거리와 Gameplay를 가져야 한다.

최소:

- Entry → Objective: 2~4 Functional Zones
- Objective → Exit: 1~3 Functional Zones

권장.

---

# 3. Objective는 반드시 깊은 곳

Objective는:

- Entry 앞
- Exit 앞
- 큰 방 중앙
- 보안문 바로 앞

에 두지 않는다.

Objective는 반드시 해당 장소의 “보호받는 내부 공간”에 있어야 한다.

---

# 4. Objective Context Rule

예:

Bank Vault Door가 있다면:

Objective는 Vault Door **밖이 아니라 안쪽**.

Museum:

Objective는 Restricted Collection / Private Exhibition 내부.

Gallery:

Objective는 Private Collection / Masterpiece Chamber 내부.

Lab:

Objective는 Restricted Research / Prototype Chamber 내부.

Casino:

Objective는 Cashier / VIP / Surveillance Core 내부.

---

# 5. Alternate Escape 필수

Objective 획득 이후
왔던 길 그대로 되돌아가는 것만 존재하면 안 된다.

가능하면:

Entry Route
≠
Escape Route

이어야 한다.

---

# 6. Backtracking 허용 조건

일부 Mission에서 짧은 Backtracking은 허용.

하지만:

Objective → Entry 전체 역주행

만이 탈출 방법인 구조는 금지.

반드시 중간에서:

- Side Corridor
- Service Route
- Maintenance Path
- Staff Passage
- Secondary Gallery

등으로 갈라져야 한다.

---

# 7. Route Topology 다양화

45개 맵이 비슷한 모양이 되지 않게 한다.

사용 가능한 예:

- Left → Right
- Bottom → Top
- Diagonal
- L-shape
- U-shape
- Loop
- Cross
- Split Route
- Deep-in / Side-out
- Outer Ring / Inner Core

동일 topology 반복 금지.

---

# 8. Large Empty Rectangle 금지

현재 가장 큰 문제 중 하나.

큰 사각형 방에:

Guard + Prop 몇 개

놓는 구조 금지.

---

# 9. Large Zone 분할

큰 공간은 반드시:

2~4개의 Gameplay Cell

로 나눈다.

예:

- Entry Cell
- Observation Cell
- Crossing Cell
- Objective Cell

---

# 10. Central Dead Space 금지

화면 중앙이 넓게 비어 있으면 재설계.

중앙에는 최소 하나 이상의:

- Landmark
- Gameplay Island
- Cover
- Security Anchor
- Route Divider

가 있어야 한다.

---

# 11. Density는 Prop Count가 아니다

밀도 문제를:

- 식물 추가
- 벤치 추가
- 책상 추가

로 해결하지 않는다.

모든 Major/Medium 구조물은 이유가 있어야 한다.

---

# 12. Functional Structure Rule

모든 구조물은 최소 하나의 역할:

- Cover
- LOS Break
- Route Divider
- Landmark
- Security
- Objective Support
- Environmental Story

를 가진다.

---

# 13. Cover Chain

Cover는 흩어놓지 않는다.

예:

Entry Cover  
→ Mid Cover  
→ Landmark  
→ Corner  
→ Objective Cover  
→ First LOS Break  
→ Escape Pocket

처럼 연결한다.

---

# 14. Safe / Risk Route

모든 Mission은 가능하면:

### Safe Route
느리지만 안정적.

### Risk Route
빠르지만 Exposure 높음.

두 선택지가 있어야 한다.

---

# 15. Safe Route 진짜 검증

Safe Route가 이름만 Safe면 안 된다.

실제로:

- Guard timing
- CCTV sweep
- LOS break
- cover

를 이용해 통과 가능해야 한다.

---

# 16. Fake Gap 0

보이면 지나갈 수 있어야 한다.

Player radius + Tilt margin 기준으로 실제 통과 가능.

불가능하면 시각적으로 닫는다.

---

# 17. Tilt Profile 기준

현재 확정값 유지:

- Dead Zone: 1.75°
- Max Tilt: 10°
- Smoothing: 0.07 sec
- Max Speed 유지

모든 Map Geometry는 이 감도를 기준으로 설계한다.

---

# 18. 좁은 통로 기준

Tilt 조작으로 지나가기 불편할 정도로
좁은 Gap을 남발하지 않는다.

---

# 19. Chapter Difficulty Axis

Mission 번호가 아니라 Chapter가 난이도다.

최종 목표:

Ch1 < Ch2 < Ch3 < Ch4 < Ch5 < Ch6 < Ch7 < Ch8 < Ch9

---

# 20. Chapter 내부 Flatness

같은 Chapter의 5 Mission은
난이도가 비슷해야 한다.

Mission 5 = Finale

라도 Difficulty Spike 금지.

---

# PART A — CHAPTER 1 MUSEUM

# 21. Difficulty

VERY EASY / EASY.

---

# 22. Spatial Identity

Museum:

**Lobby  
→ Exhibition  
→ Restricted Collection  
→ Secure Exhibit**

---

# 23. Museum Rules

- 쉬운 Route
- 낮은 Guard overlap
- CCTV 적음
- 명확한 Cover
- 짧은 Exposed crossing
- Objective 접근 Window 명확
- 쉬운 Escape

---

# 24. Museum 5 Mission

01-01 Entrance Hall  
01-02 Main Gallery  
01-03 Archive & Conservation  
01-04 Security Wing  
01-05 Grand Heist

---

# 25. Museum Entry/Exit

모든 5 Mission:

Entry / Exit 완전히 분리.

01-05 특히:

Grand Lobby Entry

→ Main Exhibition

→ Restricted Collection

→ Objective Chamber

→ Service Corridor

→ Side Exit

형태.

---

# PART B — CHAPTER 2 GALLERY

# 26. Difficulty

EASY+.

---

# 27. Spatial Identity

Gallery:

**Public Gallery  
→ Installation / Sculpture  
→ Private Collection**

---

# 28. Gallery Difficulty

Museum보다:

- LOS 길어짐
- Open crossing 증가
- Timing 중요

---

# 29. Gallery 5 Mission

02-01 Portrait Hall  
02-02 Sculpture Studio  
02-03 Glass Gallery  
02-04 Grand Atrium  
02-05 Masterpiece

---

# 30. Open Gallery Rule

Open ≠ Empty.

중앙에:

- installation
- sculpture island
- movable wall
- glass structure

가 Gameplay를 만들어야 한다.

---

# PART C — CHAPTER 3 BANK

# 31. Difficulty

MEDIUM.

---

# 32. Bank Spatial Identity

반드시:

**PUBLIC  
→ STAFF  
→ SECURITY  
→ VAULT**

깊이를 가진다.

---

# 33. Bank 5 Mission

03-01 Lobby / Teller  
03-02 Staff Offices  
03-03 Cash Processing  
03-04 Security Corridor  
03-05 Main Vault

---

# 34. 03-05 Main Vault

반드시 재설계.

구조:

Public Lobby  
→ Staff Area  
→ Security Checkpoint  
→ Cash / Deposit  
→ Vault Antechamber  
→ Main Vault Door  
→ Main Vault Interior  
→ Objective

---

# 35. 03-05 Objective

Objective는 Main Vault Door 앞 금지.

반드시 **Vault Interior 내부**.

---

# 36. 03-05 Escape

Objective 획득 후:

Main Vault  
→ Cash Service Passage  
→ Staff Corridor  
→ Secondary Exit

형태.

---

# PART D — CHAPTER 4 LAB

# 37. Difficulty

MEDIUM+.

---

# 38. Spatial Identity

Lab:

**Reception  
→ Research  
→ Restricted Lab  
→ Prototype**

---

# 39. Lab Identity

- Glass walls
- Equipment
- Lab benches
- Cryo
- Prototype
- Clean corridors

---

# 40. Gameplay

보이지만 바로 갈 수 없는 공간.

Glass:

Movement BLOCK  
LOS PASS

적극 활용.

---

# PART E — CHAPTER 5 CASINO

# 41. Difficulty

MEDIUM-HIGH.

---

# 42. Spatial Identity

Casino:

**Casino Floor  
→ Staff / Cashier  
→ VIP  
→ Surveillance / Secure Cash**

---

# 43. Gameplay

- Slot island
- table island
- bar
- cashier
- surveillance

를 Cover / Route 구조로 사용.

---

# PART F — CHAPTER 6 MANSION

# 44. Difficulty

MEDIUM-HIGH+.

---

# 45. Spatial Identity

Mansion:

**Public Rooms  
→ Private Wing  
→ Study  
→ Secret Vault**

---

# 46. Gameplay

- Doorway
- room transition
- corner
- library
- service route

중심.

---

# PART G — CHAPTER 7 WAREHOUSE

# 47. Difficulty

HARD.

---

# 48. Spatial Identity

Warehouse:

**Loading  
→ Storage  
→ Restricted Cargo  
→ Secure Container**

---

# 49. Gameplay

- racks
- containers
- lanes
- machinery
- roaming

---

# PART H — CHAPTER 8 SECURITY HQ

# 50. Difficulty

VERY HARD.

---

# 51. Spatial Identity

Security HQ:

**Office  
→ Security Zone  
→ Monitoring  
→ Control Core**

---

# 52. Gameplay

Guard + CCTV network.

단 모든 Route가 동시에 막히는 구조 금지.

---

# PART I — CHAPTER 9 HIGH SECURITY VAULT

# 53. Difficulty

FINAL / HIGHEST.

---

# 54. Spatial Identity

**Outer Security  
→ Inner Ring  
→ Secure Corridor  
→ Final Vault Core**

---

# 55. Gameplay

전체 시스템 종합.

하지만 관찰하면 답이 보여야 한다.

---

# PART J — DOOR / LOCKDOWN

# 56. Door System 유지

현재 구현한:

OPEN  
→ CLOSING  
→ CLOSED

유지.

---

# 57. Door Style

Chapter마다 실제 장소에 맞게.

Museum:
Classical / Restricted

Gallery:
Modern / Glass

Bank:
Staff / Security / Vault

Lab:
Sliding / Restricted Glass

Casino:
VIP / Staff

등.

---

# 58. Lockdown 28 sec

Confirmed Theft
→ 28 sec
→ Lockdown

유지.

---

# 59. Lockdown Physical Change

Timer 종료 시:

지정 Door 실제 닫힘.

Collision/LOS 변경.

---

# 60. Lockdown 후 Escape

Lockdown 이후에도 최소 1개 Route 유지.

즉시 Fail 금지.

---

# 61. Lockdown Route Design

권장:

Before Lockdown:
Quick Escape

After Lockdown:
Long Alternate Escape

---

# PART K — MAP SIZE / DENSITY

# 62. 기존 Map Size 맹목적 유지 금지

현재 Map이 너무 크면 과감히 줄인다.

---

# 63. 압축 기준

Dead Space가 많으면:

약 15~30% 축소

검토.

---

# 64. 방 크기 기준

큰 방은 실제 용도가 있는 Zone으로 분할.

---

# 65. Empty Floor Review

Debug OFF screenshot 기준으로
“너무 비어 보인다”면 FAIL.

---

# PART L — SECURITY

# 66. Guard Role

Guard는 장소 역할에 맞게.

예:

- Lobby Guard
- Staff Guard
- Restricted Guard
- Objective Guard
- Search Guard

---

# 67. Patrol Semantic Rule

Patrol이 실제 감시 동선처럼 보여야 한다.

랜덤 waypoint 금지.

---

# 68. CCTV

V9 감지 속도 유지.

난이도 차이는 배치/angle/sweep.

---

# 69. Chase

AI / speed 유지.

---

# PART M — OBJECTIVE PLACEMENT

# 70. Objective Context QA

45 Mission 전부 확인.

질문:

“왜 이 보물이 여기 있는가?”

설명이 안 되면 재배치.

---

# 71. Objective Security

Chapter가 올라갈수록:

- security layer
- approach complexity
- search pressure

증가.

---

# 72. Objective 앞 장식 금지

Door / Vault / Security gate 앞에
Objective를 그냥 두는 배치 금지.

---

# PART N — TOPOLOGY TESTS

# 73. 자동 FAIL 조건

다음 테스트 추가:

- Entry / Exit same zone
- Entry / Exit adjacent without gameplay zone
- Entry → Objective < minimum topology depth
- Objective → Exit < minimum topology depth
- Exit beside Entry
- Objective beside Entry
- Objective beside Exit
- Alternate Escape missing
- Same path overlap excessive

---

# 74. Zone Depth

각 Mission에 Functional Zone Graph 생성.

검증:

Entry Node  
→ multiple zones  
→ Objective  
→ different escape zones  
→ Exit

---

# 75. Route Overlap

Entry→Objective route와
Objective→Exit route가
거의 100% 동일하면 FAIL.

---

# 76. Minimum Route Difference

최소 하나 이상의:

- 다른 corridor
- 다른 room
- alternate junction

필수.

---

# PART O — VISUAL QA

# 77. 45 Mission Overview 생성

Debug OFF.

동일 scale 기준으로 Chapter별 board 생성.

---

# 78. Screenshot Gate

각 Mission 확인:

- Entry / Exit separation
- Objective depth
- Dead Space
- Landmark
- Central gameplay island
- Safe/Risk route
- Chapter identity

---

# 79. Same Game Different Place 방지

Chapter가 달라지면
한눈에 장소가 달라 보여야 한다.

---

# PART P — IMPLEMENTATION STRATEGY

# 80. 이번에는 문서만 만들지 말 것

이번 요청은 실제 Runtime Rebuild다.

Blueprint만 만들고 끝내지 않는다.

---

# 81. 구현 순서

1. Topology QA 시스템
2. Ch1 maps
3. Ch2 maps
4. Ch3 maps
5. Ch4 maps
6. Ch5 maps
7. Ch6 maps
8. Ch7 maps
9. Ch8 maps
10. Ch9 maps
11. visual QA
12. gameplay QA

---

# 82. 중간 품질 체크

Chapter 하나를 끝낼 때마다
5개 overview를 확인.

같은 실수가 45개에 퍼지지 않게 한다.

---

# PART Q — REGRESSION PROTECTION

# 83. 절대 회귀 금지

- Startup/Home
- Save v5
- Tilt 1.75 / 10 / 0.07
- Wall Slide
- Navigation optimization
- CCTV V9
- Theft/Search/LKP
- Escape Timer
- Door state system
- Chase
- Locomotion
- Audio
- Ads/IAP
- Android Tilt

---

# PART R — QA

# 84. 45 Mission 전부

최소 자동 확인:

- load
- collision
- entry reachable
- objective reachable
- exit reachable
- Safe Route
- Risk Route
- Alternate Escape
- Lockdown escape
- Fake Gap 0

---

# 85. 대표 Full-Heist

각 Chapter 최소 1 Mission.

총 9 Mission:

01-05  
02-05  
03-05  
04-05  
05-05  
06-05  
07-05  
08-05  
09-05

---

# 86. 실제 iPhone

최소 Ch1~3 대표:

01-05  
02-05  
03-05

실제 Tilt 검증.

---

# PART S — 성공 조건

# 87. 구조

45 Mission 모두:

Entry와 Exit 분리.

---

# 88. Objective

모두 Functional Secure Zone 내부.

---

# 89. Density

Large Dead Space 제거.

---

# 90. Escape

모두 실제 Alternate Escape 존재.

---

# 91. Difficulty

체감:

Ch1 < Ch2 < Ch3 < ... < Ch9

---

# 92. Chapter 내부

Mission 1~5 큰 Difficulty Spike 없음.

---

# PART T — 완료 보고

## TOPOLOGY

1. 45 Mission Entry/Objective/Exit 결과
2. Entry/Exit same-zone FAIL 수
3. Entry/Exit adjacent FAIL 수
4. Route overlap
5. Alternate escape
6. Zone depth

## DENSITY

7. 축소한 Map
8. Map size before/after
9. Dead Space 제거
10. Central gameplay structures

## OBJECTIVE

11. 재배치 Mission
12. Objective context
13. Vault/door 앞 Objective 제거 여부

## CHAPTERS

각 Chapter 5 Mission:

- Zones
- Entry
- Objective
- Exit
- Safe Route
- Risk Route
- Alternate Escape
- Guard/CCTV
- Lockdown Door
- Difficulty Tier

## DOORS / LOCKDOWN

14. Door types
15. Physical close
16. Collision
17. LOS
18. Alternate escape after lockdown

## QA

19. Fake Gap
20. TypeScript
21. lint
22. npm test
23. campaign
24. stability
25. screenshot review
26. Full-Heist results

---

# 93. 최종 선언

45 Mission Runtime Topology Rebuild 완료,
실제 playtest 부족:

**V12 PHASE 4B — FULL 45-MISSION TOPOLOGY REBUILD IMPLEMENTED, PLAYTEST PENDING**

대표 Full-Heist까지 검증:

**V12 PHASE 4B — FULL CAMPAIGN TOPOLOGY REBUILD VERIFIED**

실제 iPhone Tilt 검증 전에는
Production Ready 선언 금지.