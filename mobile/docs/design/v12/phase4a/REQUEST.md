# DON'T MOVE — V12 PHASE 4A  
## Chapter 1–2 Full Spatial Rebuild + Physical Lockdown System

현재 `mobile/` 최신 상태에서 작업한다.

V12 현재 상태:

- Campaign: **9 Chapter × 5 Mission = 45 Mission**
- Ch1~3는 이미 15 Mission으로 압축
- Ch4~9는 기존 30 Mission 유지
- Tilt 확정:
  - Dead Zone **1.75°**
  - Max Tilt **10°**
  - Smoothing **0.07 sec**
  - Max Speed 유지
- Save migration v5 적용
- 전체 테스트/TypeScript 통과 상태

이번 Phase 4A에서는:

- Chapter 1 Museum 5 Mission
- Chapter 2 Art Gallery 5 Mission

총 **10 Mission**

을 실제로 전면 재구성한다.

이번 작업은 단순 Guard/CCTV 수치 조정이 아니다.

핵심 목표:

1. 빈 공간 문제 제거
2. 실제 장소에 침투하는 공간 흐름 구현
3. Objective 위치를 공간적으로 자연스럽게 배치
4. 문을 실제 Gameplay Object로 전환
5. 28초 Lockdown이 실제 맵 상태를 바꾸도록 구현
6. Safe / Risk / Alternate Escape Route 구현
7. Museum < Gallery 난이도 차이 명확화

`legacy-unity/` 수정 금지.

---

# 0. 이번 작업의 핵심 철학

현재 맵에서 가장 큰 문제는:

- 큰 빈 공간
- 의미 없는 구조물
- Objective가 맵에 "놓여 있는" 느낌
- 문이 단순 이미지
- Lockdown이 HUD 텍스트에 가까움
- 챕터별 공간 정체성이 약함

이번에는:

> **실제 건물 내부를 점점 깊게 침투하는 느낌**

으로 바꾼다.

---

# 1. 전체 Spatial Design Rule

모든 Mission은:

**PUBLIC / ENTRY  
→ TRANSITION  
→ RESTRICTED  
→ SECURE OBJECTIVE  
→ THEFT  
→ FIRST LOS BREAK  
→ ALTERNATE ESCAPE  
→ EXIT**

구조를 가진다.

단 Mission마다 이 구조를 다르게 변형한다.

---

# 2. 빈 공간 제거

현재처럼:

큰 사각형 방  
+ 몇 개 Prop  
+ Guard

구조 금지.

큰 공간은 최소:

- Landmark
- Gameplay Island
- Cover
- Route Divider
- Security Point

중 **2~3개 이상**을 가져야 한다.

---

# 3. 맵 크기 재조정

필요하면 기존 Map Dimensions를 줄여도 된다.

빈 공간이 많은 경우:

**약 15~30% 압축**

허용.

단 단순 축소가 아니라
Functional Zone 재구성이 우선.

---

# 4. Prop Spam 금지

밀도 문제를:

- 식물
- 벤치
- 책상
- 장식

수량으로 해결하지 않는다.

모든 Major/Medium 구조물은:

- Cover
- LOS Break
- Landmark
- Route Divider
- Security
- Environmental Story

중 하나의 역할을 가져야 한다.

---

# 5. Zone Design

모든 Mission은 최소 3~5개의 의미 있는 Zone으로 나눈다.

각 Zone은 이름과 역할이 있어야 한다.

예:

- Lobby
- Exhibit Hall
- Security Corridor
- Private Collection

처럼.

---

# PART A — PHYSICAL DOOR SYSTEM

# 6. Door를 실제 Gameplay Object로 만든다

기존 단순 Door sprite 개념을 확장.

공통 Door State:

- OPEN
- CLOSING
- CLOSED

필요하면:

- LOCKED
- OPENING

도 지원 가능.

---

# 7. Door Runtime State

각 Door는 최소:

- id
- type
- position
- width
- orientation
- state
- collision state
- LOS blocking
- lockdown behavior

를 가져야 한다.

---

# 8. Door Collision

OPEN:

- 통과 가능
- Collision 없음 또는 통과 가능 상태

CLOSING:

- 안전 처리 필요
- Player 끼임 방지

CLOSED:

- Collision 활성
- 통과 불가

---

# 9. Door LOS

문 종류별로 설정.

예:

Solid Security Door:
- CLOSED = LOS BLOCK
- OPEN = LOS PASS

Glass Door:
- CLOSED = Movement BLOCK / LOS PASS 가능

---

# 10. Player Pinch 방지

Door가 닫히는 중 Player가 문 영역에 있으면:

- 즉시 닫아 Player를 끼우지 않는다
- 짧은 grace
- nearest valid side로 밀어내기
- 또는 closing pause

중 안전한 방식을 선택.

---

# 11. Door Animation

최소:

OPEN  
→ CLOSING  
→ CLOSED

시각적으로 보여야 한다.

순간적으로 Sprite swap만 하는 것보다
짧은 animation 권장.

---

# 12. Chapter-specific Door Style

## Museum

최소:

- Classical Exhibition Door
- Restricted Collection Door
- Museum Security Door

## Gallery

최소:

- Minimal Gallery Door
- Glass Sliding Door
- Private Collection Security Door

---

# 13. Door Asset 개선

현재 문 이미지가 너무 심플하므로
기존 Environment Art 방향에 맞춰 개선.

단 이번 Phase에서 불필요한 대량 Asset Generation 금지.

실제 사용되는 Door 종류만 만든다.

---

# PART B — PHYSICAL LOCKDOWN

# 14. 현재 28초 Timer 유지

Confirmed Theft
→ 28 sec Countdown

유지.

Search / Spotted로 Timer reset 금지.

---

# 15. Lockdown 변화

Timer 0:

HUD `LOCKDOWN`

만 띄우는 것으로 끝내지 않는다.

실제 Mission State가 바뀌어야 한다.

---

# 16. Lockdown Door Behavior

각 Mission에서 지정된:

`lockdownDoors`

가 실제로 닫힌다.

예:

- main corridor
- staff access
- quick return route
- security shortcut

---

# 17. Lockdown 목적

Lockdown은:

즉시 패배

가 아니다.

목적:

**탈출 경로 변화**

이다.

---

# 18. Alternate Escape 유지

Lockdown 이후에도
반드시 최소 하나의 탈출 Route는 남는다.

예:

Quick Route:
LOCKDOWN으로 닫힘.

Service Route:
여전히 사용 가능.

---

# 19. Lockdown Design Rule

Lockdown 전:

빠른 탈출 가능.

Lockdown 후:

더 길고 위험한 Alternate Escape.

이 구조 권장.

---

# 20. Lockdown Feedback

필요하면:

- Door warning light
- 짧은 warning flash
- closing SFX
- HUD

사용.

Audio 전체 재설계 금지.

---

# PART C — CHAPTER 1 MUSEUM

# 21. Museum Identity

Chapter 1:

**VERY EASY / EASY**

핵심:

- Classic exhibits
- columns
- statues
- display cases
- archive
- restricted collection
- museum security

Player가 공간을 빠르게 이해해야 한다.

---

# 22. Museum Spatial Progression

기본 언어:

**PUBLIC EXHIBIT  
→ RESTRICTED COLLECTION  
→ SECURE OBJECTIVE**

단 Mission별로 다르게 변형.

---

# 23. Museum Difficulty

Chapter 1은 반드시 확실히 쉬워야 한다.

- 낮은 Guard overlap
- 낮은 CCTV pressure
- 짧은 exposed crossing
- 명확한 timing
- 충분한 LOS break
- 쉬운 first cover
- forgiving escape

---

# 24. Ch1 Mission 01-01 — Entrance Hall

목표:

Museum 잠입의 가장 읽기 쉬운 버전.

Zones 예:

1. Visitor Entrance
2. Main Exhibit Hall
3. Side Collection
4. Objective Display
5. Service Exit

---

# 25. 01-01 Structure

Entry:
Visitor Entrance.

중앙:

Large statue / exhibit island.

Safe Route:
columns + exhibit cases를 따라 이동.

Risk Route:
중앙 Hall 직선 crossing.

Objective:
Side Collection 안쪽.

Escape:
Service Exit.

---

# 26. 01-01 Security

Guard 적게.

CCTV는 없거나 매우 제한.

기본 Vision/Timing 학습.

---

# 27. Ch1 Mission 01-02 — Main Gallery

Zones:

- Gallery Entry
- Main Rotunda
- Sculpture Wing
- Restricted Exhibit
- Exit Loggia

---

# 28. 01-02 Gameplay

중앙 Rotunda를 기준으로:

Safe:
outer wall/column route.

Risk:
central exhibit crossing.

Objective는 Restricted Exhibit 안쪽.

---

# 29. Ch1 Mission 01-03 — Archive & Conservation

공간을 더 작고 복잡하게.

Zones:

- Public Archive
- Storage
- Conservation Workspace
- Restricted Archive
- Objective Room

---

# 30. 01-03 Gameplay

코너 / 짧은 LOS 중심.

좁기 때문에 Guard 수는 적게.

문과 wall이 의미 있는 LOS break.

---

# 31. Ch1 Mission 01-04 — Security Wing

Museum에서 처음 Security 느낌을 조금 강화.

Zones:

- Museum Corridor
- Security Desk
- Monitoring Room
- Restricted Collection Access
- Objective

---

# 32. 01-04 Security

CCTV 소량 허용.

하지만 Chapter 1이므로:

Guard+CCTV triple overlap 금지.

---

# 33. Ch1 Mission 01-05 — Grand Heist

Museum mechanic 종합.

하지만 난이도는 EASY 범위.

Zones 예:

- Grand Lobby
- Master Exhibition
- Security Threshold
- Private Collection
- Grand Objective Chamber

---

# 34. 01-05 Objective

보물은:

Main Exhibition의 랜덤 위치가 아니라

**Private Collection / Grand Objective Chamber**

내부에 배치.

---

# 35. 01-05 Escape

Theft:

→ nearby first LOS break  
→ side exhibit  
→ service corridor  
→ side exit

Exit Guard cluster 금지.

---

# PART D — CHAPTER 2 ART GALLERY

# 36. Gallery Identity

Difficulty:

**EASY+**

Museum보다 조금 더 어렵다.

차이는 Guard 숫자가 아니라:

- 긴 LOS
- 열린 공간
- timing crossing
- art wall
- sculpture island
- glass

에서 만든다.

---

# 37. Gallery Spatial Progression

기본 언어:

**PUBLIC GALLERY  
→ INSTALLATION / OPEN SPACE  
→ PRIVATE COLLECTION**

---

# 38. Gallery Visual Density

Open Gallery ≠ Empty Gallery.

넓은 공간도:

- art island
- sculpture
- movable wall
- installation
- seating/partition

등으로 Gameplay Cell을 만든다.

---

# 39. Ch2 Mission 02-01 — Portrait Hall

Zones:

- Reception
- Portrait Corridor
- Main Viewing Room
- Private Portrait Collection
- Exit

---

# 40. 02-01 Gameplay

Museum보다 LOS가 길다.

Safe:
art wall route.

Risk:
centerline crossing.

---

# 41. Ch2 Mission 02-02 — Sculpture Studio

Zones:

- Public Sculpture Hall
- Work Studio
- Central Sculpture Field
- Restricted Workshop
- Objective

---

# 42. 02-02 Gameplay

큰 조각이 Cover / LOS break 역할.

빈 바닥 위 조각 몇 개가 아니라
실제 이동 Node가 되게 배치.

---

# 43. Ch2 Mission 02-03 — Glass Gallery

핵심:

Glass = movement block / LOS pass

를 적극 활용.

Zones:

- Reception
- Glass Exhibit
- Installation Corridor
- Private Glass Room
- Objective

---

# 44. 02-03 Difficulty

보이는데 바로 갈 수 없는 구조.

CCTV/Guard를 과하게 늘리지 않는다.

---

# 45. Ch2 Mission 02-04 — Grand Atrium

Gallery에서 가장 열린 공간.

하지만 중앙 빈 광장 금지.

반드시:

- central installation
- sculpture island
- art wall crossing
- side route

구성.

---

# 46. 02-04 Safe/Risk

Safe:
perimeter + installation cover.

Risk:
atrium diagonal crossing.

---

# 47. Ch2 Mission 02-05 — Masterpiece

Gallery Grand Heist.

Zones:

- Main Gallery
- Curator Wing
- Private Exhibition
- Masterpiece Chamber
- Service Escape

---

# 48. 02-05 Objective

Masterpiece는:

보안문 앞 바닥

금지.

반드시:

**Private Exhibition / Masterpiece Chamber 내부**

에 위치.

---

# 49. 02-05 High Security Alert

기존:

Pickup
→ 약 1.5 sec
→ Theft Alert

유지 가능.

Player 위치는 알지 못함.

---

# 50. 02-05 Lockdown

28초 후:

Private Collection의 빠른 Return Door 폐쇄.

대신:

Service Gallery / Preparation Corridor

Alternate Escape 유지.

---

# PART E — MAP DENSITY STANDARD

# 51. Empty Floor Rule

Debug OFF screenshot 기준으로:

화면의 큰 비율이
아무 기능 없는 바닥이면 재설계.

정확한 퍼센트를 맹목적으로 맞추지 말고
시각적으로 Dead Space를 검토.

---

# 52. Major Gameplay Structures

각 Mission 최소:

- 1 Landmark
- 2~4 Major/Medium Gameplay Structures
- 1 Objective Zone
- 1 Security/Transition Zone
- 1 Escape-support structure

권장.

---

# 53. Central Area

큰 Zone의 중앙을 비워두지 않는다.

필요하면:

- central exhibit
- installation
- sculpture
- security desk
- display island

배치.

---

# 54. Route Divider

큰 공간은 구조물이
실제로 Route를 나누게 한다.

장식용 placement 금지.

---

# PART F — SECURITY DESIGN

# 55. Security는 공간에 맞게

Guard가 랜덤하게 걷지 않는다.

Role 예:

- Lobby Guard
- Exhibit Guard
- Restricted Guard
- Objective Guard
- Exit/Search Guard

---

# 56. Patrol Semantic Rule

Guard Route는:

실제 업무/감시 동선처럼 보여야 한다.

예:

Security Desk
→ Restricted Door
→ Objective Viewpoint
→ Return

---

# 57. Museum vs Gallery Difficulty

최종 체감:

Museum:
“경로를 읽으면 쉽다.”

Gallery:
“경로는 보이지만 열린 구간 Timing이 필요하다.”

---

# 58. Guard Count만으로 차이 만들지 않기

Ch2가 Ch1보다 어렵다고
각 Mission Guard +1 식으로 만들지 않는다.

---

# PART G — DOOR ART QUALITY

# 59. 현재 Door 문제

기존 Door visuals가 지나치게 단순.

이번 Phase에서 실제 사용되는 Ch1/2 Door를 개선.

---

# 60. Museum Door Art

방향:

- dark wood / bronze detail
- museum/classical molding
- restricted signage
- security reinforcement

과도하게 화려하지 않게.

Top-down game에서 읽히는 실루엣 우선.

---

# 61. Gallery Door Art

방향:

- clean modern frame
- glass
- thin metal
- private collection security accents

Museum과 확실히 다르게.

---

# 62. Door Scale

실제 Runtime scale에서 검토.

Asset sheet에서 예쁜 것보다
게임 화면에서 읽히는 게 우선.

---

# PART H — IMPLEMENTATION ORDER

# 63. Step 1

Physical Door state system 구현.

---

# 64. Step 2

Lockdown Door integration 구현.

---

# 65. Step 3

Museum 5 Mission rebuild.

---

# 66. Step 4

Gallery 5 Mission rebuild.

---

# 67. Step 5

Door art 적용.

---

# 68. Step 6

Offline/Simulator visual QA.

---

# 69. Step 7

Difficulty / Full-Heist QA.

---

# PART I — QA

# 70. 모든 10 Mission 검사

- Entry reachable
- Objective reachable
- Exit reachable
- Safe Route
- Risk Route
- Alternate Escape
- Lockdown escape
- Fake Gap 0

---

# 71. Door Tests

검사:

- OPEN collision
- CLOSING transition
- CLOSED collision
- LOS behavior
- Player pinch protection
- reset/retry
- mission restart

---

# 72. Lockdown Tests

검사:

- Theft 전 Timer 없음
- Theft 후 28초
- 0초 → Door closing
- designated door만 닫힘
- alternate exit remains valid
- 즉시 mission fail 아님

---

# 73. Screenshot QA

10 Mission 모두 Debug OFF overview 생성.

확인:

- empty floor
- landmark
- central gameplay island
- chapter identity
- objective context
- doors
- route readability

---

# 74. 실제 Simulator Play

최소:

01-01
01-03
01-05
02-01
02-03
02-05

6개 Full-Heist 시도.

---

# 75. 실제 iPhone Tilt

가능하면:

01-05
02-05

실제 Tilt 확인.

---

# 76. Tilt Profile 유지

- Dead 1.75°
- Max 10°
- Smooth 0.07

변경 금지.

이번에는 맵을 이 감도에 맞춘다.

---

# PART J — REGRESSION

# 77. 유지

회귀 금지:

- Startup/Home
- Save v5
- Mission Loading
- Wall Slide
- Navigation optimization
- CCTV V9
- Theft/Search/LKP
- Chase
- Locomotion
- Audio
- Monetization
- Android Tilt

---

# 78. Chapter 3~9 보호

이번 Phase에서는
Chapter 3~9 map data를 변경하지 않는다.

공통 Door Runtime code가 영향 주는 경우
기존 Mission에서 회귀 테스트만 한다.

---

# PART K — 완료 보고

# 79. Door System

보고:

1. Door state architecture
2. Collision behavior
3. LOS behavior
4. Player pinch protection
5. Lockdown integration
6. Reset/Retry

---

# 80. Door Assets

7. Museum doors
8. Gallery doors
9. 실제 runtime scale screenshot
10. 기존 단순 door 제거/교체 여부

---

# 81. Museum

01-01~01-05 각각:

- Zones
- map size before/after
- Main Route
- Safe Route
- Risk Route
- Objective location
- Guard/CCTV
- Lockdown door
- Alternate Escape
- Density changes

---

# 82. Gallery

02-01~02-05 동일 보고.

---

# 83. Density

보고:

- 어떤 Mission의 map size를 줄였는지
- 어떤 Dead Space를 제거했는지
- 중앙 Gameplay Structure
- Random prop가 아닌 기능적 배치 설명

---

# 84. Difficulty

- Museum 체감 목표
- Gallery 체감 목표
- Ch1 < Ch2 여부
- 같은 Chapter 내부 outlier

---

# 85. QA

- Fake Gap
- route connectivity
- door tests
- lockdown tests
- TypeScript
- lint
- npm test
- campaign
- stability

---

# 86. Full-Heist

6 대표 Mission:

- CLEAR / FAIL
- Objective
- Theft
- Lockdown
- Alternate Escape
- Exit
- 실패 이유

---

# 87. 최종 선언

10 Mission 재구축과 시스템 구현 완료,
실제 Full-Heist 부족:

**V12 PHASE 4A — MUSEUM/GALLERY SPATIAL REBUILD IMPLEMENTED, PLAYTEST PENDING**

대표 Full-Heist 및 Lockdown까지 확인:

**V12 PHASE 4A — MUSEUM/GALLERY SPATIAL REBUILD VERIFIED**

실제 iPhone Tilt 미검증이면
Production Ready 선언 금지.