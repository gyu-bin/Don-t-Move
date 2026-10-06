# DON'T MOVE — V12 PHASE 4C
## CHAPTER 1–4 VISUAL SCALE & ARCHITECTURAL INTEGRATION REBUILD

현재 `mobile/` 최신 상태에서 작업한다.

이번 작업은 단순 Visual Polish가 아니다.

현재 실제 사용자 확인에서 다음 문제가 발견됐다.

1. 맵 크기에 비해 구조물/가구/환경 에셋이 너무 작음
2. 넓은 바닥에 작은 오브젝트를 흩뿌린 느낌이 남음
3. Chapter별 Door 디자인이 거의 동일하게 보임
4. Lockdown Door가 의미 없는 통로 중간을 막고 있어 그냥 옆길로 돌아가면 됨
5. Chapter 4 Lab 일부 에셋이 공중에 떠 있거나 바닥과 접촉하지 않는 것처럼 보임
6. Lab이 실제 연구시설이 아니라 “Lab Asset을 바닥에 붙여놓은 느낌”
7. Chapter마다 장소 구조가 달라야 하는데 여전히 동일한 게임판에 Theme Asset만 바꾼 느낌이 남음
8. Topology PASS / Test PASS만으로 Visual/Spatial 품질을 승인했던 것이 문제였음

이번에는:

> **Chapter 1~4, 총 20 Mission을 실제 공간처럼 보이도록 시각적 스케일·건축·에셋 배치·Door·Lockdown까지 전면 재검토 및 수정한다.**

`legacy-unity/` 수정 금지.

---

# 0. 최우선 규칙

이번 작업의 성공 기준은:

**자동 테스트 PASS가 아니라 실제 Debug OFF 화면에서 좋은 맵으로 보이는가**

이다.

자동 테스트는 보조다.

다음 중 하나라도 보이면 실패:

- 넓은 빈 바닥
- 작은 소품 흩뿌리기
- Chapter가 달라도 같은 구조
- 문 디자인 동일
- Objective가 공간과 무관
- 공중에 떠 있는 에셋
- 벽/가구와 ground contact 불량
- Lockdown Door가 의미 없는 위치
- 구조물이 Route에 영향 없음

---

# PART A — 작업 범위

이번 Phase는 다음 20 Mission만 수정한다.

## Chapter 1 — Museum
01-01
01-02
01-03
01-04
01-05

## Chapter 2 — Art Gallery
02-01
02-02
02-03
02-04
02-05

## Chapter 3 — Bank
03-01
03-02
03-03
03-04
03-05

## Chapter 4 — Lab
04-01
04-02
04-03
04-04
04-05

Chapter 5~9 map data 변경 금지.

---

# PART B — 수정 전에 반드시 Visual Audit

## 1. 20개 Overview 생성

Debug OFF 기준으로
Chapter별 5개 Overview를 먼저 만든다.

가능하면 동일 World Scale / 동일 Camera Rule 사용.

---

## 2. 각 Mission을 다음 항목으로 평가

### A. Architecture
실제 장소처럼 방/구역이 구성됐는가?

### B. Scale
구조물 크기가 Player / Door / Room 크기와 어울리는가?

### C. Density
바닥만 넓게 남아 있지 않은가?

### D. Landmark
한눈에 기억되는 핵심 구조가 있는가?

### E. Gameplay Structure
구조물이 실제 Cover / LOS Break / Route Divider 역할을 하는가?

### F. Objective Context
왜 보물이 거기 있는지 자연스러운가?

### G. Door Context
왜 이 문이 여기 있는지 설명 가능한가?

### H. Lockdown Context
왜 이 문이 Lockdown 때 닫히는지 의미가 있는가?

### I. Ground Contact
모든 에셋이 바닥/벽과 제대로 연결돼 보이는가?

### J. Chapter Identity
스크린샷만 봐도 Museum / Gallery / Bank / Lab 구분 가능한가?

---

# 3. Visual Audit 등급

각 Mission을:

PASS
MINOR FIX
MAJOR FIX
REBUILD

중 하나로 분류.

이 판정 후 실제 수정 시작.

---

# PART C — STRUCTURE SCALE SYSTEM

## 4. Player 기준 스케일 재정의

모든 Environment Asset은
Player sprite 대비 실제 역할에 맞는 크기로 다시 본다.

절대:

“현재 defaultScale이 1이니까 그대로 사용”

하지 않는다.

---

# 5. Scale Category

환경 에셋을 최소 다음처럼 분류한다.

### SMALL
소형 장식/도구

### MEDIUM
책상 / 벤치 / 작은 전시대

### LARGE
큰 전시대 / 조각 / 실험장비 / teller counter

### ARCHITECTURAL
벽 / 문 / 대형 vault / security desk / glass wall / fixed installation

---

# 6. Major Structure는 충분히 커야 한다

현재 가장 큰 문제:

방은 큰데 구조물이 너무 작음.

따라서 Major Structure는
실제로 공간을 점유해야 한다.

예:

- Teller counter
- Security desk
- Central installation
- Large sculpture
- Lab bench island
- Cryo equipment
- Vault structure

가 작은 소품처럼 보이면 FAIL.

---

# 7. Structure Occupancy

큰 방에서 Major/Medium 구조물이
실제 Route를 나누지 못하면 크기/배치를 다시 잡는다.

목표:

구조물이 실제로:

- 길을 나눔
- 시야를 끊음
- 우회하게 만듦
- 공간 역할을 구분

해야 함.

---

# 8. 맵 자체 축소 허용

구조물 스케일만 키우면 답답해지는 맵은
Map Dimension도 줄인다.

약 10~30% 축소 허용.

단 모든 맵을 같은 비율로 줄이지 않는다.

---

# PART D — DEAD SPACE 제거

## 9. Empty Floor 금지

Debug OFF 화면에서
큰 영역이 아무 기능 없는 바닥이면 FAIL.

---

# 10. Dead Space 해결 순서

빈 공간이 있으면:

1. Zone Architecture 조정
2. Room size 축소
3. Major gameplay structure 추가
4. Route divider 추가
5. Cover / LOS break 추가
6. 마지막으로 decoration

순서.

---

# 11. Decoration Spam 금지

식물/벤치/작은 테이블을 늘려
빈 공간을 채우는 방식 금지.

---

# PART E — CHAPTER 1 MUSEUM

## 12. Museum Visual Identity

Museum은:

- 클래식 전시실
- 큰 기둥
- 전시대
- 대형 조각
- Painting wall
- Restricted collection
- Security wing

이 실제 건축 구조로 보여야 한다.

---

# 13. Museum 구조물 스케일

특히 다음을 크게/명확하게:

- column
- large statue
- display case
- restricted partition
- security desk

---

# 14. Museum Density

Gallery보다 조금 더 폐쇄적이고
구조가 명확해야 한다.

Museum은 EASY Chapter이므로
구조는 읽기 쉬워야 한다.

---

# 15. Museum Door 디자인

최소 3종 분리:

### Exhibition Door
클래식/목재/브론즈 계열

### Restricted Collection Door
조금 더 무겁고 보안 느낌

### Security Door
금속/전자잠금 느낌

실루엣부터 달라야 한다.

---

# PART F — CHAPTER 2 GALLERY

## 16. Gallery Visual Identity

Gallery는:

- 밝은 벽
- movable wall
- installation
- sculpture island
- glass
- modern architecture

가 중심.

---

# 17. Open ≠ Empty

Gallery가 개방적이어도
빈 바닥이면 실패.

큰 공간은:

- central installation
- sculpture cluster
- art wall
- glass divider

로 Gameplay Cell 생성.

---

# 18. Gallery Scale

Movable wall / installation이 너무 작아서
소품처럼 보이면 실패.

실제로 방을 나누는 크기여야 한다.

---

# 19. Gallery Door 디자인

최소:

### Minimal Gallery Door
얇은 현대식 프레임

### Glass Sliding Door
투명/금속

### Private Collection Door
현대식 Security Door

Museum 문과 절대 같은 실루엣 금지.

---

# PART G — CHAPTER 3 BANK

## 20. Bank Architecture

반드시:

PUBLIC
→ STAFF
→ SECURITY
→ VAULT

가 공간적으로 읽혀야 한다.

---

# 21. Bank 주요 구조물

다음은 충분히 큰 Architectural Element여야 한다.

- Teller Counter
- Staff Work Area
- Security Checkpoint
- Deposit Box Wall
- Cash Processing Table
- Security Desk
- Main Vault Door

---

# 22. 03-05 Main Vault

가장 중요.

반드시:

Lobby
→ Staff
→ Security Checkpoint
→ Deposit / Cash Area
→ Vault Antechamber
→ Main Vault Door
→ Vault Interior
→ Objective

순서가 화면에서도 이해돼야 한다.

---

# 23. Objective 위치

Main Vault Door 앞에 Objective 금지.

Objective는 반드시 Vault Interior 안.

---

# 24. Bank Door 디자인

최소 4종:

### Staff Door
일반 직원용 접근문

### Access-Control Door
카드리더/상태등

### Security Portal
이중문/보안 전실

### Main Vault Door
크고 압도적인 Landmark

이 네 개가 같은 sprite variation 수준이면 FAIL.

---

# PART H — CHAPTER 4 LAB FULL RECHECK

## 25. Lab은 사실상 강한 재검토 대상

현재 User feedback:

- 이상함
- 에셋 붙여넣기 느낌
- 일부 공중에 떠있는 것처럼 보임

따라서 Ch4는
필요하면 5개 전부 MAJOR FIX / REBUILD 허용.

---

# 26. Lab Architecture 우선

Asset부터 놓지 않는다.

먼저:

Reception
→ General Research
→ Glass Lab
→ Restricted Research
→ Prototype / Cryo

건축 Zone을 만든다.

그 후 장비를 배치한다.

---

# 27. Lab Equipment Placement

다음처럼 실제 실험실처럼 cluster 구성.

예:

### Research Cell
- lab bench
- workstation
- equipment rack

### Sample Cell
- sample storage
- cart
- freezer

### Prototype Cell
- prototype machine
- monitor
- security structure

---

# 28. Floating Asset 0

모든 Lab Asset의:

- pivot
- ground anchor
- objectBounds
- draw scale
- contact position

재검증.

공중에 떠 있는 느낌 0.

---

# 29. Wall-mounted / Floor-mounted 구분

벽 부착형 장비를
바닥 중앙에 세워놓지 않는다.

Floor equipment는
벽 안에 박히지 않게 한다.

---

# 30. Lab visual grounding

필요하면 작은 contact shadow / floor base는 허용.

단 Asset 품질을 가리기 위한 과한 shadow 금지.

---

# 31. Lab Door 디자인

최소:

### Glass Sliding Door
일반 연구실

### Restricted Lab Door
접근통제 표시

### Prototype Security Door
강한 보안

Museum/Gallery/Bank와 완전히 다르게.

---

# PART I — DOOR SYSTEM VISUAL REDESIGN

## 32. Runtime Door Logic은 유지

현재:

OPEN
→ CLOSING
→ CLOSED

동작 유지.

---

# 33. 이번에는 Visual만 실제로 차별화

Door type마다:

- frame
- panel
- material
- silhouette
- warning light
- handle/card reader

차별화.

---

# 34. 같은 공용 Door Asset 재사용 금지

색만 바꿔 Chapter Door라고 하지 않는다.

실루엣 차이가 있어야 한다.

---

# PART J — LOCKDOWN 재설계

## 35. 현재 문제

현재 일부 Mission은:

Lockdown Door가 통로 중간을 막지만
옆으로 돌아가면 끝.

Gameplay 의미가 약함.

---

# 36. Lockdown의 역할 재정의

Lockdown은:

“아무 길이나 하나 막음”

이 아니다.

**Primary Escape Route를 폐쇄해 Secondary Escape Route로 전환시키는 시스템**

이어야 한다.

---

# 37. Lockdown Door 위치

다음 위치만 권장:

- Main Exit Security Door
- Main Lobby Shutter
- Primary Security Checkpoint
- Main Public Access

---

# 38. 의미 없는 corridor door 금지

문 하나 닫혔는데
같은 방 반대편으로 돌아가면 끝이면 FAIL.

---

# 39. Lockdown Example — Museum

Theft
→ 28 sec
→ Main Public Exit closes

Player:

Service Corridor
→ Side Exit

사용.

---

# 40. Gallery

Main Gallery Entrance 폐쇄.

Preparation / Loading Route 사용.

---

# 41. Bank

Main Lobby / Security Portal 폐쇄.

Staff Service / Cash Handling Route 사용.

---

# 42. Lab

Main Airlock 폐쇄.

Maintenance / Service Exit 사용.

---

# 43. Lockdown 후 Route Length

Secondary Route는 Primary보다:

- 조금 길거나
- 보안 요소가 조금 더 있거나
- 더 복잡

해야 함.

하지만 불가능하면 안 됨.

---

# PART K — DOOR CLOSING VISUAL

## 44. Lockdown 시 실제 변화가 보여야 함

Door closing animation / warning indicator로
“시설이 봉쇄되고 있다”는 느낌 제공.

---

# 45. Door가 화면 밖이어도 State 유지

Player가 나중에 돌아오면
실제로 닫혀 있어야 한다.

---

# PART L — OBJECTIVE CONTEXT

## 46. 20 Mission 전부 질문

“이 장소라면 이 Objective가 왜 여기 있는가?”

설명 가능해야 한다.

---

# 47. Objective examples

Museum:
Private Collection Case

Gallery:
Masterpiece Chamber

Bank:
Vault Interior

Lab:
Prototype / Sample Secure Chamber

---

# 48. 보안문 바로 앞 Objective 금지

이건 자동 QA로 추가.

---

# PART M — VISUAL COMPOSITION

## 49. 각 Room은 Focal Structure 필요

큰 Room마다
한눈에 들어오는 중심 구조를 둔다.

---

# 50. 중앙 Structure와 Route 연결

중앙 구조가 장식이 아니라
Safe/Risk Route 선택에 영향을 줘야 한다.

---

# 51. 구조물 반복 최소화

같은 Asset을 같은 화면에
과도하게 반복 금지.

---

# PART N — SCALE QA

## 52. Player-relative Scale Board 생성

각 Chapter에서:

Player
+ Door
+ Medium Prop
+ Large Structure
+ Landmark

동일 화면 Scale comparison 생성.

---

# 53. Scale FAIL 조건

- Door가 Player보다 지나치게 작음
- Desk가 장난감처럼 보임
- Large Machine이 작은 박스처럼 보임
- Vault Door가 일반문 크기
- Column이 얇은 장식처럼 보임

---

# PART O — 20 MISSION SCREENSHOT GATE

## 54. 수정 후 20개 Debug OFF Overview 필수

각 Mission 실제 Runtime data 기준.

---

# 55. Overview에서 직접 평가

다음 질문 전부 YES여야 함.

- 실제 장소처럼 보이나?
- 구조물이 충분히 큰가?
- 빈 공간이 과하지 않은가?
- Objective가 자연스러운가?
- Door가 장소에 맞는가?
- Chapter identity가 보이는가?
- 구조물이 Route를 만든다고 느껴지는가?

---

# 56. 하나라도 NO면 다시 수정

자동 PASS여도 종료 금지.

---

# PART P — CHAPTER DIFFERENCE

## 57. 4 Chapter Overview Board 생성

Museum / Gallery / Bank / Lab 대표 Mission을
나란히 비교.

---

# 58. 목표

스크린샷 제목을 가려도:

Museum
Gallery
Bank
Lab

구분 가능해야 한다.

---

# PART Q — 이번 작업에서 금지

## 59. 금지 사항

- 작은 Prop 수량으로 밀도 채우기
- 모든 Structure 일괄 1.3배 같은 단순 scaling
- 동일 Door recolor
- 의미 없는 Lockdown door
- Auto test PASS로 Visual QA 생략
- Ch5~9 수정
- Tilt 변경
- Guard AI 변경
- CCTV detection 변경
- Chase 변경

---

# PART R — 구현 순서

## 60. 반드시 이 순서

1. 20 Mission Visual Audit
2. Scale system 정리
3. Door visual redesign
4. Lockdown topology redesign
5. Museum rebuild
6. Gallery rebuild
7. Bank rebuild
8. Lab rebuild
9. Ground/pivot correction
10. Debug OFF Overview 생성
11. Chapter comparison board
12. 자동 QA
13. Simulator Playtest

---

# PART S — QA

## 61. Scale QA

20 Mission PASS 필요.

---

# 62. Floating Asset QA

Ch4 포함 20 Mission:

Floating/Wall penetration/ground gap

0 목표.

---

# 63. Door QA

Chapter별 Door Visual ID가
실제로 다른 asset을 사용하는지 검사.

---

# 64. Lockdown QA

각 Mission:

Primary Route close
Secondary Escape remains

검증.

---

# 65. Topology QA 유지

기존:

45/45 topology
100/100 enhanced

회귀 금지.

---

# 66. Regression

- TypeScript
- lint
- npm test
- campaign
- stability
- collision
- wall slide
- CCTV
- Theft/Search
- Door
- Lockdown

---

# PART T — PLAYTEST

## 67. 대표 8개

최소:

01-01
01-05
02-01
02-05
03-01
03-05
04-01
04-05

Simulator에서 직접 확인.

---

# 68. 확인 항목

각 Mission:

- 실제 장소 느낌
- 구조물 스케일
- Objective 위치
- Door
- Theft
- Lockdown
- Secondary Escape

---

# 69. Full Clear 부족 시 정확히 보고

CLEAR 못했다고
Visual/Spatial 검증까지 실패로 보지 않는다.

반대로
Visual만 좋다고 Gameplay Verified 선언 금지.

---

# PART U — 완료 보고 형식

## VISUAL AUDIT

1. 20 Mission 초기 등급
2. PASS
3. MINOR FIX
4. MAJOR FIX
5. REBUILD

## SCALE

6. 기존 문제
7. Player-relative Scale 기준
8. 수정한 Asset category
9. Map size 변경 Mission
10. Structure scale 변경 Mission

## DOORS

11. Museum Door 3종
12. Gallery Door 3종
13. Bank Door 4종
14. Lab Door 3종
15. 실제 Asset/ID
16. Runtime 적용 Mission

## LOCKDOWN

17. 기존 의미 없는 Door
18. 새 Primary Route Door
19. Secondary Escape
20. 28초 이후 실제 변화

## MUSEUM

21. 5 Mission 수정 결과

## GALLERY

22. 5 Mission 수정 결과

## BANK

23. 5 Mission 수정 결과

## LAB

24. 5 Mission 수정 결과
25. Floating Asset fix
26. Architecture integration

## VISUAL QA

27. 20 Overview 결과
28. Chapter Comparison 결과
29. Dead Space
30. Ground Contact
31. Objective Context
32. Door Context

## REGRESSION

33. Topology
34. TypeScript
35. lint
36. npm test
37. stability
38. Door tests
39. Lockdown tests

## PLAYTEST

40. 대표 8 Mission
41. Full Clear
42. 실제 Tilt 여부

---

# 70. 최종 선언

Visual/Spatial rebuild 완료,
실제 Full-Heist 부족:

**V12 PHASE 4C — CHAPTER 1–4 VISUAL & ARCHITECTURAL REBUILD IMPLEMENTED, PLAYTEST PENDING**

20개 Overview까지 실제 검토 완료하고
명백한 scale/door/floating/dead-space 문제가 없으면:

**V12 PHASE 4C — CHAPTER 1–4 VISUAL QA PASSED, GAMEPLAY REVIEW PENDING**

실제 Tilt Full-Heist 전에는
Production Ready 선언 금지.