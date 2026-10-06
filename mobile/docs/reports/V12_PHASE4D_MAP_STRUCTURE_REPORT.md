# V12 PHASE 4D — Chapter 1–5 Map Structure Report

## 실제 화면 확인

- iPhone 17 Pro Simulator / iOS 27.0 / DeviceHub.
- 25개 미션, 최종 실제 화면 100장: Entry / Overview / Objective / Exit 각 1장.
- 실제 앱의 Skia 렌더러를 일시 정지하고 DEV 카메라만 이동했다. QA 컨트롤은 캡처에서 숨겼다.
- 이번 결과는 공간 구성 검토다. Full-Heist·난이도·실기기 Tilt 검증 결과가 아니다.

[100장 실제 화면 및 Before/After 비교](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase4D/map-structure-evidence.html)
[9개 항목 전체 판정 및 문 위치](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase4D/map-structure-audit.json)

## 공간·스케일 수정

- 축소: 05-02 공개 입구의 높이를 2타일 압축하고 연결 지점을 함께 맞췄다. 전역 배율 변경은 하지 않았다.
- 구역: 기존 7–10개 기능 구역과 개별 토폴로지를 유지했다. 새 방을 무작정 늘리지 않았다.
- 중앙 공간: Casino 슬롯군·테이블·캐셔·VIP 구조물에 명시적 승인 이미지와 개별 크기를 적용했다. 05-04 룰렛은 벽과 통로의 여유를 고려해 배치했다.
- Lab: 04-01~05 접수 워크스테이션을 벽 쪽 작업 구역으로 정리했다. 04-03 벤치와 겹치는 독립 유리 패널 제거, 04-02 샘플 케이스를 연구 벤치 옆으로 이동했다.
- 접지: Lab 샘플 케이스의 바닥 접촉 위치 수정, 중복으로 떠 보이던 다이아/케이스 렌더링 제거. 일부 장비의 원본 이미지 원근감과 빛에 의한 접촉 그림자 약화는 MINOR로 기록했다.
- Casino: 역할에 따라 대체로 1.0~1.3의 개별 크기 및 일치하는 충돌 크기를 사용했다. 모든 에셋 일괄 확대는 하지 않았다.

## Objective

- Objective 좌표 재배치 없음: 25개 모두 지정된 보안 목표 방 내부임을 확인했다.
- 과밀 정리: 01-05 입구 앞 낮은 테이블, 02-02 중복 소형 조각, 03-01·03-05 내부 중복 금고, 04-04·04-05 두 번째 크라이오 구조물, 05-05 중복 소형 룰렛 제거.
- 03-05: Main Vault Interior 내부에 Objective가 있으며 금고 문 앞에 놓이지 않는다.

## 문과 보안 경계

- Museum: 고전 전시문 / 제한 컬렉션 문 / 보안문.
- Gallery: 얇은 프레임 / 유리 슬라이딩 / Private Collection 문.
- Bank: 직원문 / 출입 제어 / 보안 포털 / 금고 문. 열린 금고 문의 떠 있는 원형 이미지를 힌지와 문 가장자리 표현으로 수정.
- Lab: 자동 슬라이딩 / 제한 유리 / Prototype 보안문.
- Casino: 금색 VIP 왕관·기둥 실루엣과 금속 보안 그릴을 구분했다.
- 문 위치는 방 사이 기존 보안 경계를 유지했다. 05-02 방 압축에 따른 연결 보정 외 별도 보안 경계 재설계 없음.
- Lockdown 후보 문 위치는 아래 표와 JSON에 기록했다. 28초 실제 폐쇄·탈출은 이번 단계에서 검증하지 않았다.

| Mission | Lockdown 후보 위치 (tile) | 문 스타일 |
|---|---|---|
| 01-01 | (17.00, 12.67) | museumSecurity4c |
| 01-02 | (21.50, 14.50) | museumSecurity4c |
| 01-03 | (15.80, 11.00) | museumSecurity4c |
| 01-04 | (17.50, 7.80); (25.50, 9.50) | museumSecurity4c; museumSecurity4c |
| 01-05 | (18.50, 7.80); (28.00, 9.50) | museumSecurity4c; museumSecurity4c |
| 02-01 | (17.00, 7.80) | galleryPrivateCollection4c |
| 02-02 | (19.50, 6.80); (5.50, 8.50) | galleryPrivateCollection4c; galleryPrivateCollection4c |
| 02-03 | (18.00, 19.00) | galleryGlassSliding4c |
| 02-04 | (23.00, 22.00) | galleryPrivateCollection4c |
| 02-05 | (8.50, 8.50) | galleryPrivateCollection4c |
| 03-01 | (19.00, 7.80); (29.50, 9.50) | bankSecurityPortal4c; bankSecurityPortal4c |
| 03-02 | (16.00, 8.50) | bankSecurityPortal4c |
| 03-03 | (12.00, 18.80) | bankSecurityPortal4c |
| 03-04 | (27.00, 8.33); (27.00, 19.00) | bankSecurityPortal4c; bankSecurityPortal4c |
| 03-05 | (31.00, 12.00) | bankSecurityPortal4c |
| 04-01 | (15.00, 16.50) | labRestrictedGlass4c |
| 04-02 | (19.00, 7.00) | labRestrictedGlass4c |
| 04-03 | (15.00, 12.50) | labRestrictedGlass4c |
| 04-04 | (15.67, 16.50) | labRestrictedGlass4c |
| 04-05 | (9.50, 9.33) | labRestrictedGlass4c |
| 05-01 | (13.00, 22.50) | casinoSecurity4d |
| 05-02 | (18.00, 9.50) | casinoSecurity4d |
| 05-03 | (18.00, 13.00) | casinoSecurity4d |
| 05-04 | (29.50, 7.50) | casinoSecurity4d |
| 05-05 | (3.50, 8.00) | casinoSecurity4d |

## Chapter 평가

- Ch1: 입구·회랑·전시·제한 컬렉션이 구분되며 각 미션의 방/기둥 중심 구조 유지.
- Ch2: 전시 파티션·설치물·유리와 Private Collection으로 Museum과 구별.
- Ch3: Public → Staff → Security → Vault 흐름, 목표 금고 내부 확인.
- Ch4: Reception → Research → Restricted → Prototype의 작업 구역을 정돈하고 떠 보이는 목표 렌더링 수정.
- Ch5: 슬롯·게임 테이블·VIP/캐셔·보안 구역에 충분한 개별 구조물 크기 적용.

## 최종 실제 화면 판정

**PASS 6 / MINOR 19 / MAJOR 0 / REBUILD 0**

| Mission | 이름 | 결과 | 남은 시각 문제 |
|---|---|---|---|
| 01-01 | Entrance Hall | MINOR | 서비스 복도 일부가 단순해 보임 |
| 01-02 | Main Gallery | MINOR | 중앙 조각상이 남쪽 접근보다 강하게 보임; 좌우 접근 구분 유지 |
| 01-03 | Archive & Conservation | PASS | Archive/Conservation 구분, 목표실과 케이스 비율 명확 |
| 01-04 | Security Wing | MINOR | 보안실은 읽히나 목표 옆 전시 케이스가 시각적으로 경쟁함 |
| 01-05 | Grand Heist | PASS | Grand Exhibition–Private Collection–서비스 구역 연결 명확 |
| 02-01 | Portrait Hall | MINOR | 큰 초상화가 수집 지점보다 두드러짐 |
| 02-02 | Sculpture Studio | PASS | 중복 조각상 제거 후 Workshop 목표 구성과 접근 공간 명확 |
| 02-03 | Glass Gallery | MINOR | 입구 시점의 전방 공간 노출과 유리 프레임 대비가 약함 |
| 02-04 | Grand Atrium | MINOR | 목표 옆 조각상 받침과 케이스 간 시각 간격이 작음 |
| 02-05 | Masterpiece | MINOR | Private Collection과 중앙 installation 구분; 회색 문틀 대비가 약함 |
| 03-01 | Lobby / Teller | MINOR | 중복 금고 정리; Vault 문 상부가 목표 glow 일부와 겹침 |
| 03-02 | Staff Offices | MINOR | 반복 금고가 목표와 경쟁; 직원실/보안실 연결은 명확 |
| 03-03 | Cash Processing | MINOR | 목표 남쪽 금고가 접근을 좁게 보이게 함; 작업실/현금구역 구분 |
| 03-04 | Security Corridor | MINOR | 보안 구역 연결 명확; 서비스 복도 일부 단순 |
| 03-05 | Main Vault | MINOR | Vault 전실–Door–Interior 정상; 문틀과 목표 glow 겹침 |
| 04-01 | Research Reception | MINOR | 벽쪽 접수 작업대 정리; 작은 cart와 기울어진 cabinet 원화 시점 차이 |
| 04-02 | Observation Wing | MINOR | 샘플 케이스를 연구 bench cell에 연결; 장비 원화 시점 차이 |
| 04-03 | Glass Research | PASS | bench/glass 겹침 제거; reception–research–isolation 구분 명확 |
| 04-04 | Cryo Research | MINOR | 중복 cryo 제거; glow가 샘플 케이스 바닥 접촉을 약하게 보이게 함 |
| 04-05 | Prototype Heist | MINOR | 벽쪽 작업대/단일 cryo/containment 구조 정리; glow 접지 대비 약함 |
| 05-01 | Cashier Floor | MINOR | 슬롯/창구/목표 구성 명확; 입구 court 다소 단순 |
| 05-02 | High Roller Rooms | MINOR | 입구 2타일 압축·안내 divider 반영; 왼쪽 진행 방향 시각 유도 약함 |
| 05-03 | Surveillance Suite | PASS | 슬롯 도착–Bar–Staff–Secure alcove 구조/스케일 명확 |
| 05-04 | Roulette Exchange | MINOR | 룰렛 벽 겹침 개선; 투영 시 벽과 가까워 보임 |
| 05-05 | Casino Heist | PASS | 슬롯/테이블/VIP/보안실/목표 케이스 비율과 구역 구분 명확 |

## 보호 범위

- Chapter 6~9: 이전 SOURCE_STAGES와 20개 데이터 정확히 동일.
- 25개 미션의 작성된 Guard patrol/CCTV 구성을 보존했다. AI·Tilt·save 보호 해시 및 28초 Lockdown 값 검사를 유지했다.
- legacy-unity 수정 없음. 이 작업의 DEV 카메라는 게임 객체 위치/상태를 변경하지 않는다.

## 회귀 검사

최종 결과는 regression-final-summary.json 및 아래 실행 로그에 기록한다.
- TypeScript 앱/캠페인: PASS.
- lint: 오류 0, 기존 applyUpdate.ts require import 경고 2.
- topology: 전체 45개 PASS.
- 04-03의 기존 소품 8개 할당량 검사는 겹친 유리 패널 제거와 충돌했다. Lab 4개 주요 기능 구역에 승인된 실제 구조물이 존재하는 의미 검사로 대체했다. 다른 챕터의 기준을 낮추지 않았다.
- 전체 테스트: Node 검사 992개 + 별도 assertion 46개 PASS. 기존 pending 1개.
- 캠페인 588개 PASS; 문 21개 PASS; 안정성(충돌 포함) 26개 추가 PASS.
- 최초 전체 실행은 04-03 소품 quota에서 중단됐으며, 의미 검사 수정 후 캠페인 및 그 이후 모든 테스트를 재실행해 통과했다. 맵을 다시 수정하지 않았다.
- [최종 검사 요약](/Users/mungyubin/Desktop/Coding/Don't Move/mobile/Reports/V12Phase4D/regression-final-summary.json)

## 최종 상태

**V12 PHASE 4D — CH1–5 MAP STRUCTURE LOCKED FOR GAMEPLAY TUNING**

MINOR 19개는 위 표에 공개했다. 이번 단계는 실제 Simulator의 구조 검토이며, 실기기 성능·Tilt·탈출 난이도 승인으로 사용하지 않는다.
