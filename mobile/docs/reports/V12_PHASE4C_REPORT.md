# V12 PHASE 4C — 결과

**V12 PHASE 4C — CHAPTER 1–4 VISUAL & ARCHITECTURAL REBUILD IMPLEMENTED, PLAYTEST PENDING**

20개 시각 검토 결과: **14 PASS / 6 MINOR / 0 MAJOR / 0 REBUILD**. 전부 Visual PASS 또는 Production Ready로 선언하지 않는다. 실기기 Tilt/완주 검증은 미완료다.

## 1–5. 초기 Visual audit

초기: **0 PASS / 0 MINOR / 7 MAJOR / 13 REBUILD**. [초기 미션별 근거](../../Reports/V12Phase4C/INITIAL_VISUAL_AUDIT.md).

## 6–10. Scale / 공간

- 장식 수량을 늘리는 대신 전시대·작업대·보안 데스크·금고·연구 셀을 기능별로 재배치했다.
- 일괄 배율 대신 각 구조물의 역할별 배율을 사용한다. 충돌 구조물의 `scale`과 `collisionScale`은 일치한다.
- 방 크기를 무조건 축소하지 않고 비어 있는 연결 간격과 우회 루프를 선택적으로 압축했다. 일부 경계 크기는 경로 재배치로 증가하므로 일괄 면적 감소를 주장하지 않는다.
- 실제 atlas/player/door를 동일한 world scale로 그린 [Player-relative scale](../../Reports/V12Phase4C/visual/player-relative-scale.png).

| Mission | 맵 타일 크기 Before → After | 최종 시각 등급 | 남은 사항 | Before/After |
|---|---|---|---|---|
| 01-01 | 28×23 → 27×22 | MINOR | 평행 순환 동선의 반복감 | [비교](../../Reports/V12Phase4C/final/before-after/01-01.png) |
| 01-02 | 33×27 → 32×27 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/01-02.png) |
| 01-03 | 26×25 → 25×24 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/01-03.png) |
| 01-04 | 33×27 → 33×26 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/01-04.png) |
| 01-05 | 37×26 → 35×25 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/01-05.png) |
| 02-01 | 26×26 → 25×25 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/02-01.png) |
| 02-02 | 29×27 → 29×26 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/02-02.png) |
| 02-03 | 29×31 → 27×28 | MINOR | 남쪽 서비스 구간의 단조로움 | [비교](../../Reports/V12Phase4C/final/before-after/02-03.png) |
| 02-04 | 38×31 → 36×33 | MINOR | 서쪽 외부 연결 구간의 단조로움 | [비교](../../Reports/V12Phase4C/final/before-after/02-04.png) |
| 02-05 | 30×27 → 28×26 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/02-05.png) |
| 03-01 | 38×26 → 37×25 | MINOR | 금고 상인방과 Objective glow 하단이 일부 겹침 | [비교](../../Reports/V12Phase4C/final/before-after/03-01.png) |
| 03-02 | 31×26 → 24×26 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/03-02.png) |
| 03-03 | 29×28 → 27×31 | MINOR | 남쪽 현금 이송 구간의 단조로움 | [비교](../../Reports/V12Phase4C/final/before-after/03-03.png) |
| 03-04 | 39×28 → 35×27 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/03-04.png) |
| 03-05 | 54×30 → 47×27 | MINOR | 동쪽 서비스 구간 및 상인방/glow 경계 | [비교](../../Reports/V12Phase4C/final/before-after/03-05.png) |
| 04-01 | 23×29 → 22×27 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/04-01.png) |
| 04-02 | 29×23 → 27×21 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/04-02.png) |
| 04-03 | 24×24 → 22×24 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/04-03.png) |
| 04-04 | 33×30 → 31×27 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/04-04.png) |
| 04-05 | 25×25 → 25×23 | PASS | 검토 이미지에서 명백한 scale/접지/배치 결함 없음 | [비교](../../Reports/V12Phase4C/final/before-after/04-05.png) |

## 11–16. Door 13종

| Chapter | 실제 runtime style IDs |
|---|---|
| Museum | museumExhibition4c / museumRestrictedCollection4c / museumSecurity4c |
| Gallery | galleryMinimal4c / galleryGlassSliding4c / galleryPrivateCollection4c |
| Bank | bankStaff4c / bankSecurity4c / bankSecurityPortal4c / bankVault4c |
| Lab | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |

모두 Ch1–4에 실제 배치했다. 기존 18종은 유지하므로 전체 renderer 계약은 31종이다. 색만 바꾼 공용 문 대신 프레임·문짝·유리·보안 장치·금고 구조가 다르다. 신규 PNG kit가 아니라 runtime vector door art다. [13종 비교](../../Reports/V12Phase4C/visual/doors-13-profiles.png).

| Mission | 적용 style IDs |
|---|---|
| 01-01 | museumSecurity4c / museumRestrictedCollection4c |
| 01-02 | museumExhibition4c / museumSecurity4c / museumRestrictedCollection4c |
| 01-03 | museumSecurity4c / museumRestrictedCollection4c |
| 01-04 | museumRestrictedCollection4c / museumSecurity4c |
| 01-05 | museumSecurity4c / museumRestrictedCollection4c |
| 02-01 | galleryMinimal4c / galleryPrivateCollection4c |
| 02-02 | galleryPrivateCollection4c |
| 02-03 | galleryGlassSliding4c / galleryPrivateCollection4c |
| 02-04 | galleryMinimal4c / galleryPrivateCollection4c |
| 02-05 | galleryPrivateCollection4c |
| 03-01 | bankVault4c / bankSecurityPortal4c |
| 03-02 | bankVault4c / bankSecurityPortal4c |
| 03-03 | bankStaff4c / bankVault4c / bankSecurityPortal4c |
| 03-04 | bankStaff4c / bankSecurityPortal4c / bankVault4c |
| 03-05 | bankStaff4c / bankSecurity4c / bankVault4c / bankSecurityPortal4c |
| 04-01 | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |
| 04-02 | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |
| 04-03 | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |
| 04-04 | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |
| 04-05 | labSliding4c / labRestrictedGlass4c / labPrototypeSecurity4c |

## 17–20. Lockdown

기존 임의의 짧은 corridor shutter를 주요 공용 복귀 체크포인트와 대응시켰다. 문이 닫히면 독립된 하역·정비·서비스 동선이 남는다. 실제 runtime의 28초 폐쇄, occupancy pause, collision revision 및 nav 재생성은 기존 serialized runtime 테스트로 확인했다. 시뮬레이터에서 보물→28초→대체 탈출 완주한 것으로 주장하지 않는다.

다음 수치는 실제 충돌 footprint를 사용한 오프라인 최단 경로 비교다. 단위는 tile이다.

| Mission | OPEN escape | CLOSED escape | 증가 | 폐쇄 후 도달 |
|---|---:|---:|---:|---|
| 01-01 | 21.77 | 36.74 | 14.97 | PASS |
| 01-02 | 25.38 | 31.45 | 6.08 | PASS |
| 01-03 | 24.40 | 28.83 | 4.43 | PASS |
| 01-04 | 22.74 | 25.83 | 3.09 | PASS |
| 01-05 | 23.79 | 26.61 | 2.82 | PASS |
| 02-01 | 15.47 | 18.98 | 3.51 | PASS |
| 02-02 | 27.06 | 35.80 | 8.75 | PASS |
| 02-03 | 23.49 | 28.83 | 5.34 | PASS |
| 02-04 | 34.41 | 47.16 | 12.75 | PASS |
| 02-05 | 24.53 | 29.32 | 4.79 | PASS |
| 03-01 | 24.80 | 27.64 | 2.84 | PASS |
| 03-02 | 21.86 | 28.55 | 6.69 | PASS |
| 03-03 | 27.74 | 31.38 | 3.64 | PASS |
| 03-04 | 25.74 | 31.19 | 5.44 | PASS |
| 03-05 | 26.55 | 29.96 | 3.41 | PASS |
| 04-01 | 19.39 | 28.42 | 9.03 | PASS |
| 04-02 | 23.31 | 28.39 | 5.08 | PASS |
| 04-03 | 23.08 | 28.26 | 5.19 | PASS |
| 04-04 | 21.94 | 28.49 | 6.55 | PASS |
| 04-05 | 20.31 | 30.16 | 9.85 | PASS |

## 21–26. Chapter별 반영

- **Museum 5개:** 전시·보관·보존 작업의 역할이 있는 크기와 배치로 변경. 01-03 보존 작업대, 01-05 조각상 접지와 큰 전시실, 보안 체크포인트를 보강.
- **Gallery 5개:** 이동식 전시벽·조각·작품군으로 공간 분할. 02-01 초상화가 경비 실루엣을 가리지 않도록 수정. 02-03 하역 구간과 02-04 긴 우회 루프를 압축.
- **Bank 5개:** 창구·업무 구획·현금 이송·금고실의 실제 공간 역할 강화. 03-03 현금 카트가 외벽을 침범하지 않도록 수정. 03-05 금고 문을 Objective 뒤 장식 대신 실제 문턱으로 이동.
- **Lab 5개:** 작업대·관찰 콘솔·유리 셀·저온 장치·시제품 전시를 방 구조에 결합. 구조물별 크기/충돌 범위를 일치시킴.
- **Lab floating:** 타원형 공통 그림자 대신 에셋 밑면에 맞는 접지 형태를 4C revision에만 적용. 큰 그림자로 결함을 덮지 않음. 상단 장치의 base가 앞 벽에 잘리던 위치도 수정.
- **Architecture integration:** 입구/연구/제한 구역/보안 Objective/서비스 복귀를 문턱과 실제 wall opening으로 연결. 모든 20개 objective는 보안 공간 내부, 문턱과 분리되어 있다.

## 27–32. Visual evidence

전후 20쌍과 OPEN/CLOSED 40개 최종 개별 이미지는 production Skia renderer를 오프라인에서 실행한 **Debug OFF 이미지**다. 시뮬레이터 캡처가 아니다. CLOSED 비교는 문을 닫은 아트 확인이며 실제 28초 플레이 증거가 아니다.

- [Museum 동일 축척](../../Reports/V12Phase4C/final/chapter-01-overview.png)
- [Gallery 동일 축척](../../Reports/V12Phase4C/final/chapter-02-overview.png)
- [Bank 동일 축척](../../Reports/V12Phase4C/final/chapter-03-overview.png)
- [Lab 동일 축척](../../Reports/V12Phase4C/final/chapter-04-overview.png)
- [4개 Chapter 비교](../../Reports/V12Phase4C/final/four-chapter-comparison.png)

중대한 빈 공간/접지/문맥 문제는 줄었지만 위 표의 6개 MINOR는 남아 있다. 이를 자동 테스트 PASS로 상쇄하지 않는다.

## 33–39. Regression

| 검증 | 결과 | 근거 |
|---|---|---|
| Topology | 45/45 PASS | topology-audit.json |
| Enhanced current topology/runtime contract | 100/100 PASS | final-enhanced-tests.log / final-npm-test.log |
| Ch5–9 | 25/25 source data 동일 | source snapshot deep equality + independent review |
| Tilt/Guard AI/CCTV/Chase/save core | 보호 파일 7개 SHA256 동일 | PROTECTED_HASHES.json |
| TypeScript app / campaign tools | PASS | typecheck.log / tools-typecheck.log |
| lint | 0 errors, 기존 OTA warnings 2개 | lint.log |
| npm test | PASS, exit 0; node:test 집계 985 tests | final-npm-test.log (별도 assertion scripts도 성공) |
| stability | 26/26 PASS | stability.log |
| Door | 20/20 PASS | final-npm-test.log; 31 styles × 양방향 × 3 states 렌더 |
| Lockdown | 28초 runtime 폐쇄/nav rebuild, occupancy pause PASS | serialized door tests |

독립 코드 검토에서 45개 재생성 결과와 baked JSON이 완전히 같음을 확인했다. 이 검증은 실제 플레이 성공을 의미하지 않는다.

## 40–42. 실제 Simulator 대표 8개

iPhone 17 Pro / iOS 27, 일반 TOUCH 버튼·화면 터치 입력. observer는 읽기 전용. 실제 손목 Tilt는 검증하지 않았다. 미션별 실제 플레이는 최대 2회, 회당 약 45초 제한이다. 메뉴 선택 실패는 플레이 시도로 계산하지 않았다.

| Mission | Result | 확인 범위 / 한계 |
|---|---|---|
| 01-01 | CAUGHT | 로딩·이동·경비/시야·체포 화면; 완주 없음 |
| 01-05 | CAUGHT | 두 번째 시도에서 정상 이동 후 16.8초 체포; 첫 시도 버튼 입력 실패 |
| 02-01 | TEST LIMITATION / INCOMPLETE | 첫 시도 체포, 두 번째 45초 경로 진행; 완주 없음 |
| 02-05 | INCOMPLETE | 실제 보물 획득 확인, 45초 내 탈출하지 못함 |
| 03-01 | CAUGHT / TEST LIMITATION | 체포 상태 확인, 자동화 IDLE 버튼을 놓침; 완주 없음 |
| 03-05 | CAUGHT | 실제 이동·경비 반응·체포; 완주 없음 |
| 04-01 | CAUGHT | 실제 이동 후 체포; 선택 오류 조사 중 idle 시간이 있어 게임 clock은 90초대, 터치 시도는 제한 이내 |
| 04-05 | CAUGHT | 수정 후 04-05 실제 로딩 확인, 이동 후 체포; 완주 없음 |

**Full Clear 0/8. 실제 Tilt 미검증. Gameplay Verified 아님.** 프레임률/실기기 발열을 측정한 것으로 주장하지 않는다. 실제 화면 자료는 [native 폴더](../../Reports/V12Phase4C/native)에 별도 저장했다.

### 실제로 발견하고 수정한 실행 문제

개발 모드에서 잠긴 04-05를 선택해도 save normalization이 lastMission을 highestUnlocked의 04-01로 돌려놓았다. 선택한 initialMissionIndex를 transient prop으로 GameRun까지 전달하고 canPlayMission으로 검증한다. 저장 해금값과 campaignProgress는 변경하지 않았다. 새 앱 실행에서 04-05 제목과 observer missionId가 일치하고 플레이되는 것을 확인했다.

### 남은 검증

- 6개 MINOR 시각 항목의 추가 연출 검토.
- 실제 Tilt로 보물 획득 → 28초 Lockdown → 서비스 탈출 Full-Heist.
- 실제 기기 FPS/발열/조작감.
- native 자동화에서 체포 시 사라진 버튼을 누르는 한계가 있어 일부 구간을 관찰하지 못함.

### 재현/근거 위치

- Authoring: tools/campaign/v124cEarlyPlans.ts, v124cLabPlans.ts, v124cBuild.ts
- Runtime: src/game/levels/stages/campaignStages.json
- Visual: Reports/V12Phase4C/final, visual, before
- Tests/logs: Reports/V12Phase4C/final-npm-test.log, final-enhanced-tests.log, stability.log
- Native logs: native-play.log, native-second.log, native-lab-04-01.json, native-lab-04-05.json
- UI fix: src/ui/branding/missionLaunch.ts and its tests, StartupScreen.tsx, VisualPlaygroundScreen.tsx
