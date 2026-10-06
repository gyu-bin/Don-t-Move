# DON'T MOVE — V12 PHASE 4D  
## CHAPTER 1–5 MAP STRUCTURE & SPATIAL COMPOSITION REBUILD

현재 `mobile/` 최신 상태에서 작업한다.

이번 작업은 **플레이 테스트 단계가 아니다.**

지금은:

- CLEAR 시도
- Theft 이후 탈출
- Lockdown 우회
- Safe/Risk 실제 완주
- 난이도 플레이 평가

를 하지 않는다.

이번 목표는 오직:

> **Chapter 1~5 총 25개 Mission의 맵 구조를 실제 게임 화면에서 보고 제대로 다시 잡는 것**

이다.

DeviceHub/iOS Simulator는 실제 화면 확인 용도로 사용하되,
게임을 끝까지 플레이하지 않는다.

`legacy-unity/` 수정 금지.

---

# 0. 이번 Phase의 성공 기준

각 맵이 Debug OFF 실제 Simulator 화면에서:

- 실제 장소처럼 보임
- 공간 구조가 명확함
- 구조물 크기가 적절함
- 빈 공간이 과하지 않음
- Objective 위치가 자연스러움
- Entry / Objective / Exit 위치가 논리적임
- Chapter별 공간 정체성이 확실함
- Door가 장소에 맞음
- 에셋이 떠 있지 않음
- 단순 Asset 붙여넣기처럼 보이지 않음

이면 성공.

---

# 1. 이번에는 Gameplay Complete 테스트 금지

하지 말 것:

- Full-Heist
- CLEAR
- Objective → Escape 완주
- 28초 기다려 Lockdown 탈출
- Guard에게 일부러 걸리기
- 난이도 수치 맞추기

맵 구조가 확정되기 전에 플레이 밸런스를 테스트하지 않는다.

---

# 2. DeviceHub 사용 목적

DeviceHub에서는 각 Mission을 열어서:

1. Entry 화면
2. 맵 전체 구도
3. Objective Zone
4. Exit 쪽 공간

을 **눈으로 확인**한다.

필요하면 Camera/Debug 기능으로 전체 맵을 본다.

---

# 3. 검사 범위

총 25 Mission.

### Chapter 1 — Museum
01-01 ~ 01-05

### Chapter 2 — Gallery
02-01 ~ 02-05

### Chapter 3 — Bank
03-01 ~ 03-05

### Chapter 4 — Lab
04-01 ~ 04-05

### Chapter 5 — Casino
05-01 ~ 05-05

Chapter 6~9 수정 금지.

---

# PART A — MAP SCALE

# 4. 현재 가장 먼저 볼 것

각 Mission에서:

**Map Size vs Structure Size**

비율을 확인한다.

현재 사용자 피드백:

> 맵은 넓은데 구조물이 너무 작다.

이 문제가 남아 있으면 FAIL.

---

# 5. 구조물 스케일

Player를 기준으로 확인:

- Door
- Desk
- Counter
- Display Case
- Sculpture
- Lab Machine
- Casino Table
- Vault
- Security Desk

가 실제 공간을 차지하는 크기로 보여야 한다.

---

# 6. 단순 일괄 확대 금지

모든 Asset을 `1.3x`로 키우는 방식 금지.

Asset role에 따라 개별 조정.

---

# 7. 맵 축소 허용

구조물을 키워도 공간이 여전히 비면:

Room / World size를 줄인다.

대략 10~30% 축소 허용.

---

# PART B — SPATIAL COMPOSITION

# 8. 큰 방 하나 금지

큰 방 하나에 소품을 흩뿌리는 방식 금지.

각 Mission은 최소 3~5개의 Functional Zone으로 나눈다.

---

# 9. Functional Zone

각 Zone은 반드시 역할이 있어야 한다.

예:

### Museum
Lobby  
→ Exhibition  
→ Restricted Collection

### Gallery
Public Gallery  
→ Installation  
→ Private Collection

### Bank
Public  
→ Staff  
→ Security  
→ Vault

### Lab
Reception  
→ Research  
→ Restricted Lab  
→ Prototype

### Casino
Casino Floor  
→ Staff  
→ Cashier/VIP  
→ Secure Area

---

# 10. 중앙 Dead Space 금지

화면 중앙이 비어 있으면:

- Landmark
- Gameplay Island
- Wall/Partition
- Major Structure
- Security Anchor

중 하나 이상 배치.

---

# 11. 구조물은 Cluster로

작은 구조물을 낱개로 뿌리지 않는다.

예:

Desk  
+ Monitor  
+ Filing  
+ Chair

처럼 하나의 Staff Cell.

또는:

Lab Bench  
+ Equipment Rack  
+ Monitor

처럼 Research Cell.

---

# PART C — OBJECTIVE PLACEMENT

# 12. Objective 위치 전면 점검

각 Mission에서 질문:

> “실제 이 장소에서 이 보물이 왜 여기에 있는가?”

설명이 안 되면 이동.

---

# 13. Objective 금지 위치

금지:

- 출입문 앞
- Vault Door 앞
- 복도 한가운데
- 큰 방 중앙
- Entry 근처
- Exit 근처

---

# 14. 좋은 Objective 위치

### Museum
Restricted Collection / Display Chamber

### Gallery
Private Collection / Masterpiece Room

### Bank
Vault Interior

### Lab
Prototype / Secure Sample Chamber

### Casino
Cashier Vault / VIP Secure Room

---

# 15. Objective 주변 과밀 금지

사용자 피드백:

> 보물 근처에 뭐가 너무 많음.

Objective Zone은 깔끔해야 한다.

기본:

- Main Landmark 1개
- Security Structure 1~2개
- 충분한 접근 공간

정도.

---

# PART D — ENTRY / EXIT POSITION

# 16. Entry / Exit 다시 확인

모든 Mission에서:

Entry와 Exit가 충분히 떨어져 있어야 한다.

---

# 17. Spatial Rule

가능하면:

Entry는 건물 바깥/공개구역 쪽.

Exit은:

- Side Exit
- Service Exit
- Loading Exit
- Staff Exit
- Maintenance Exit

등 다른 위치.

---

# 18. Entry / Objective / Exit가 화면에서 삼각형 구조가 되도록 우선 고려

일직선만 반복하지 않는다.

다양한 topology 사용.

---

# PART E — DOOR VISUAL

# 19. Door 디자인 다시 확인

현재 사용자 피드백:

> 문 디자인이 다 비슷해 보임.

실제 Simulator 화면에서 비교.

---

# 20. Chapter별 문 실루엣

### Museum
Classical / Wooden / Bronze

### Gallery
Modern / Thin frame / Glass

### Bank
Metal / Access Control / Heavy Vault

### Lab
Automatic Sliding / Glass / Tech

### Casino
Luxury / Gold / VIP / Staff

색만 바꾸지 않는다.

---

# 21. Door는 Architecture 일부

Door를 방 한가운데 놓지 않는다.

반드시:

Wall
→ Door frame
→ Next Zone

연결이 자연스러워야 한다.

---

# PART F — CHAPTER 1 MUSEUM

# 22. 목표

쉬운 Chapter답게 공간이 읽혀야 한다.

---

# 23. 구조

Museum 5개는 서로 다른 전시 구조를 갖게 한다.

예:

01-01:
Entrance + Main Exhibition

01-02:
Rotunda + Sculpture Gallery

01-03:
Archive + Conservation

01-04:
Security Wing

01-05:
Grand Exhibition + Private Collection

---

# 24. Museum Scale

특히:

- Column
- Statue
- Display Case
- Partition

가 충분히 크게 보이게.

---

# PART G — CHAPTER 2 GALLERY

# 25. Gallery는 개방적이되 비어 있으면 안 됨

각 큰 방마다:

- art wall
- sculpture island
- installation
- glass partition

등 실제 공간 분할 구조 필요.

---

# 26. Museum과 Architecture 차이

Museum:
방/기둥 중심.

Gallery:
open plan / movable partition 중심.

한눈에 달라야 한다.

---

# PART H — CHAPTER 3 BANK

# 27. Bank 구조를 실제 은행처럼

반드시:

PUBLIC
→ STAFF
→ SECURITY
→ VAULT

순서가 화면에서 읽혀야 한다.

---

# 28. 03-05 특별 확인

Main Vault는:

단순 큰 문 Asset이 아니다.

실제:

Vault Antechamber
→ Vault Door
→ Vault Interior

구조로 만든다.

---

# 29. Objective

03-05 Objective는 Vault Interior 안.

Door 앞 금지.

---

# 30. Bank 구조물 스케일

다음은 큰 구조물:

- Teller Counter
- Security Checkpoint
- Deposit Box Wall
- Cash Processing Area
- Vault Door

작은 Prop처럼 보이면 FAIL.

---

# PART I — CHAPTER 4 LAB

# 31. Ch4는 강하게 다시 본다

현재 User feedback:

> 에셋을 그냥 붙여놓은 느낌.

이 문제를 구조부터 해결.

---

# 32. Lab Architecture 먼저

Asset 배치 전에:

Reception
→ Main Research
→ Glass Lab
→ Restricted Research
→ Prototype Chamber

공간을 먼저 설계.

---

# 33. Lab Equipment는 기능별 Cluster

Random placement 금지.

예:

Research Cell:
- Bench
- Monitor
- Equipment Rack

Cryo Cell:
- Cryo Unit
- Control Console
- Safety Partition

Prototype Cell:
- Prototype
- Control Station
- Security Glass

---

# 34. Floating Asset 0

DeviceHub 화면에서:

- 바닥과 떠 있음
- 벽에 어색하게 겹침
- 그림자/접지 이상
- 크기 이상

전부 수정.

---

# PART J — CHAPTER 5 CASINO

# 35. Ch5 실제 스케일 다시 검사

현재 User feedback:

> Asset이 너무 작음.

이번에는 Ch5까지 실제로 수정한다.

---

# 36. Casino Main Structures

- Slot Bank
- Roulette / Blackjack Table
- Bar Island
- Cashier Cage
- VIP Structure

가 작은 장식처럼 보여선 안 된다.

---

# 37. Casino 공간

큰 Floor는:

Slot Zone
→ Table Zone
→ Bar / VIP
→ Cashier / Secure

로 실제 공간 분리.

---

# PART K — LOCKDOWN은 이번에 구조만 확인

# 38. 이번 Phase에서 실제 28초 테스트 금지

Lockdown 플레이는 다음 단계.

---

# 39. 다만 Door 위치는 지금 결정

Lockdown Door는:

Primary Escape Route의 의미 있는 보안 경계에 배치.

---

# 40. 의미 없는 복도문 금지

그 문을 닫아도 2초 옆길로 돌아가면 되는 위치면 이동.

---

# PART L — DEVICEHUB VISUAL WORKFLOW

# 41. Mission 하나씩 다음 순서

1. DeviceHub로 Mission 열기
2. 화면 캡처
3. Architecture 평가
4. Scale 평가
5. Objective 위치 확인
6. Door 위치 확인
7. 수정
8. Mission 다시 열기
9. 수정 후 화면 확인

---

# 42. 완주 테스트 하지 말 것

Mission을 깨려고 시간 쓰지 않는다.

필요하면 DEV Camera / Debug Navigation을 사용해서
Objective/Exit 위치만 확인.

---

# PART M — QA

# 43. 25 Mission 전부 실제 Simulator 화면 확인

오프라인 렌더만으로 PASS 금지.

---

# 44. 각 Mission 체크

- Architecture
- Scale
- Density
- Grounding
- Objective
- Entry
- Exit
- Door
- Chapter Identity

9개 항목.

---

# 45. 판정

각 Mission:

PASS
MINOR
MAJOR
REBUILD

---

# 46. 목표

25 Mission 모두:

PASS 또는 MINOR.

MAJOR / REBUILD 0개가 될 때까지 수정.

---

# PART N — 이번에 하지 않는 것

# 47. 금지

- Full-Heist
- Difficulty balancing
- Guard 수 조정
- CCTV 조정
- Chase 조정
- Lockdown 실제 탈출 테스트
- Safe/Risk 플레이 검증
- Ch6~9 수정
- Tilt 수정

---

# PART O — 완료 보고

## DEVICEHUB

1. 사용 Simulator
2. 실제 확인 Mission 25개 여부
3. 실제 screenshot 수

## MAP STRUCTURE

4. 축소한 Mission
5. Zone 재설계 Mission
6. 중앙 Dead Space 제거 Mission

## SCALE

7. Structure scale 수정
8. Ch4 Asset grounding
9. Ch5 Asset scale

## OBJECTIVE

10. Objective 재배치 Mission
11. Objective 과밀 정리 Mission
12. 03-05 Vault Interior 여부

## DOORS

13. Chapter별 Door visual
14. Door 위치 수정
15. Lockdown 후보 Door 위치

## CHAPTERS

16. Ch1 구조 평가
17. Ch2 구조 평가
18. Ch3 구조 평가
19. Ch4 구조 평가
20. Ch5 구조 평가

## FINAL VISUAL QA

21. PASS
22. MINOR
23. MAJOR
24. REBUILD

Mission 목록.

## REGRESSION

25. TypeScript
26. lint
27. topology
28. collision
29. full tests

---

# 48. 최종 선언

DeviceHub에서 25 Mission을 실제로 확인하고
맵 구조 수정까지 끝났으면:

**V12 PHASE 4D — CH1–5 MAP STRUCTURE LOCKED FOR GAMEPLAY TUNING**

이번 단계에서는 Full-Heist / Difficulty Verified라고 절대 선언하지 않는다.

다음 단계에서만:

- Guard
- CCTV
- Safe/Risk
- Theft
- Lockdown
- Escape
- Difficulty

를 실제 플레이 기준으로 조정한다.