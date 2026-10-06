# V11 — 90 Mission Overview

Phase A 설계 검토용 목록. 현재 앱은60개이며, 신규30개는 구현 전이다. 전체19필드(구조·구역·Entry/Objective/Exit·Safe/Risk·첫LOSbreak·수색·탈출)는 각 상세문서에 있다. 이 표는 개별 작성한 설계의 색인이며 맵 자동 생성 결과가 아니다.

- [Chapter 01–03 상세설계와 현재맵 분류](CHAPTER_01_03_BLUEPRINT_AND_AUDIT.md)
- [Chapter 04–09 상세설계](CHAPTER_04_09_BLUEPRINT.md)
- [전체 난이도 예산과 Phase B 게이트](README.md)
- [공통 시스템 조사](SYSTEM_CONSISTENCY.md)

## Chapter 01 — Museum

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 01-01 | Entrance Hall | 조각상 뒤에서 기다린 뒤 짧은 전시실 횡단 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-02 | Main Gallery | 두 조각상 사이에서 안전한 우회 방향 선택 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-03 | Archive | 선반 끝에서 관찰하고 짧은 통로를 건너는 좁은 공간 잠입 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-04 | Security Wing | 교차로와 검문을 차례로 읽고 보물 뒤의 보호된 대기점 이용 | PARTIAL REBUILD; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-05 | Restricted Collection | 넓은 전시 우회와 좁은 검문 횡단의 선택 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-06 | Conservation Lab | 낮은 작업대와 불투명 복원 screen 의 시야 차이를 이용 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-07 | Private Gallery | 개인 전시실의 긴 우회와 노출된 VIP 연결로 선택 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-08 | Security Core | 검문과 보물 경계를 차례로 통과하며 두 경비의 동시 압박을 피함 | PARTIAL REBUILD; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-09 | Master Exhibition | 조각상과 전시 case 를 잇는 관찰 지점 연쇄 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 01-10 | Grand Heist | Museum 의 조각 우회·검문 관찰·별도 탈출을 통합하되 출구 집결 완화 | PARTIAL REBUILD; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 02 — Art Gallery

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 02-01 | Front Exhibition | 개방된 조각 court 의 양쪽 횡단과 타이밍 선택 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-02 | Portrait Hall | 긴 직선 시야를 읽고 전시 screen 으로 이동을 분절 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-03 | Sculpture Studio | 조각상 양쪽 우회와 보물 접근 순찰의 타이밍 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-04 | Modern Wing | 엇갈린 미술 벽의 양쪽 이동과 다음 구역 관찰 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-05 | Collector's Room | 전시실을 차례로 읽는 개인 컬렉션 침입과 별도 복귀 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-06 | Glass Gallery | Glass collision BLOCK / LOS PASS 와 불투명 끝단 엄폐의 구분 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-07 | Curator's Floor | 업무 전시실 침입과 중앙 교차로 타이밍 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-08 | Grand Atrium | 넓은 설치 미술 섬의 외측 우회와 중앙 노출 횡단 선택 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-09 | Private Collection | 개인 전시 courtyard 의 긴 우회와 pickup 순찰 타이밍 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 02-10 | Masterpiece | Gallery 의 열린 횡단·설치 미술·초상화 전이를 통합하되 보물과 탈출 압박 분리 | PARTIAL REBUILD; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 03 — Bank

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 03-01 | Public Lobby | 공공/직원 경계와 짧은 출고 검수층 통과 | PARTIAL REBUILD; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-02 | Teller Hall | 정면 counter 횡단과 실제 직원 우회로 선택 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-03 | Staff Offices | 직원 방과 중앙 records 를 통과하는 층별 침입 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-04 | Records Room | 좁은 기록 aisle 과 북쪽 검수 우회의 선택 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-05 | Deposit Boxes | 실제 deposit wall 에 연결된 자산 침입과 반환 교차로의 관찰 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-06 | Security Checkpoint | Gate 정면 타이밍과 별도 직원 인가 통로 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-07 | Cash Processing | 낮은 현금 작업대와 불투명 기록 bank 를 구분하는 긴 작업장 횡단 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-08 | Inner Security | Guard/CCTV 의 서로 다른 보안층과 실제 analysis 대안 통로 | TUNE; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-09 | Vault Antechamber | 금고 문 접근과 records 대안을 읽는 보안층 침입 | KEEP; 동일 Chapter Tier 내 공간·경로 변주 |
| 03-10 | Main Vault | Bank 의 검문·관찰·금고·현금 반출을 통합하는 Chapter Summary | KEEP; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 04 — Lab

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 04-01 | Observation Lobby | 유리 관찰선과 실제 bay 입구 구분. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-02 | Research Wing | ring 외주 대기와 radial aisle timing 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-03 | Specimen Lab | workcell 실제 문과 관찰 glass의 차이 읽기. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-04 | Containment Sector | cross 네 arm를 단계적으로 관찰. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-05 | Prototype Chamber | 두 loop와 opaque spine의 독립 탈출 연결. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-06 | Cryo Transfer | cryo 전면 노출과 후면 thermal cover 비교. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-07 | Sample Storage | storage 끝단 우회와 cross aisle의 timing. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-08 | Observation Exchange | observation room 너머 Guard를 보고 다음 문 선택. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-09 | Cleanroom Split | cleanroom 외주에서 실제 측문 찾기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 04-10 | Core Prototype Transfer | 유리 crescent·장비 spine·service junction 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 05 — Casino

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 05-01 | Hotel Reception | reception 양끝 crossing의 감시 방향 비교. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-02 | Gaming Floor | 두 pit 사이 교차 cone를 한 번에 관찰. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-03 | Service Lounge | 낮은 lounge 가구와 높은 bar back의 cover 차이. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-04 | VIP Salon | VIP 문턱에서 다음 salon Guard turn 판단. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-05 | Royal Jewel Room | royal display 첫 break와 cashier loop 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-06 | Cashier Cage | 투명 cage front와 opaque rear wall 구분. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-07 | High Roller Loop | oval patrol와 crescent patrol의 재접근 관찰. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-08 | Surveillance Balcony | 관제 sightline 아래 pit crossing의 phase 읽기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-09 | Private Casino Circuit | 두 private pit의 connector timing 선택. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 05-10 | The House Take | slot·roulette·cashier의 연속 crossing 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 06 — Mansion

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 06-01 | Garden Vestibule | salon 문 뒤에서 다음 garden route 관찰. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-02 | Drawing Room | 긴 hall 대신 응접실 문 뒤 cover 연결. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-03 | Library Wing | 서가 끝과 방 출입구를 연속 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-04 | Family Apartments | family rooms에서 한 문당 한 위협 해석. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-05 | Heirloom Gallery | heirloom suite 진입과 service return 분리. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-06 | Servant Passage | guest hall 대신 좁은 pantry service route 선택. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-07 | Moonlit Study | study와 bedroom의 엇갈린 문 읽기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-08 | Trophy Hall Circuit | trophy wall 안팎을 바꾸며 music room 탈출. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-09 | Hidden Wing | dogleg 뒤 실제 rear passage 판독. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 06-10 | The Family Collection | 문·서가·salon·service return 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 07 — Warehouse

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 07-01 | Loading Entrance | bay island 양쪽 lane의 patrol turn 판독. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-02 | Cargo Sorting | 세 rack aisle 끝단 우회와 cross-loading 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-03 | Storage Aisles | fork와 실제 hidden cross passage 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-04 | Inspection Bay | inspection cross arm별 phase 관찰. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-05 | Secured Shipment | container court에서 shipping return으로 경로변경. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-06 | Machinery Transfer | machinery 양쪽 loading lane의 roaming 재접근. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-07 | Cold Chain Depot | cold cell 문과 insulated cover의 관계 읽기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-08 | Dispatch Interchange | 세 dispatch lane의 junction 진입 순서. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-09 | Packing Reserve | 낮은 packing table과 높은 rack cover 구분. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 07-10 | Black Cargo Dispatch | rack·machinery·container 반출 경로 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 08 — Security HQ

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 08-01 | Security Reception | desk Guard turn와 reception camera 창 연결. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-02 | Monitoring Room | server islands 사이 surveillance crossing 관찰. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-03 | Server Wing | S corridor corner와 technician bypass 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-04 | Restricted Corridor | room 문과 gate portal의 시간 분리. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-05 | Black Site Archive | archive dogleg와 outer bypass의 독립 수색 회피. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-06 | Response Planning Room | response corridor Guard 이동을 미리 읽기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-07 | Command Floor | command horseshoe에서 다음 monitor sector 판단. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-08 | CCTV Hub Transfer | quadrant camera phase와 maintenance spokes 연결. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-09 | Watch Handover | handover 두 duty corridor의 turn phase 읽기. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 08-10 | The Network Breach | monitor·server·archive 보안망의 틈 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

## Chapter 09 — High Security Vault

| ID | Title | 핵심 플레이 | 상태 / 난이도 역할 |
|---|---|---|---|
| 09-01 | Outer Checkpoint | outer seal과 checkpoint의 독립 관찰 창 연결. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-02 | Vault Antechamber | chamber 두 doorway의 교대 timing. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-03 | Mechanism Hall | 실제로 통과 가능한 decoy 긴 LOS와 side loop 비교. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-04 | Security Ring | security cross에서 서로 다른 escape lane 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-05 | Master Diamond Chamber | master vault의 두 antechamber 탈출 선택. | 기존 ID 재해석; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-06 | Secure Transit Spine | parallel transit spine 뒤에서 다음 connector 관찰. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-07 | Secure Core Fork | core Y fork와 service rooms의 수색 방향 선택. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-08 | Monitoring Bypass | monitoring rectangle에서 maintenance wedge cover 연결. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-09 | Dual Seal Reserve | 두 seal의 회복 corner와 external check 순서. | 신규 설계 / 미구현; 동일 Chapter Tier 내 공간·경로 변주 |
| 09-10 | The Final Heist | checkpoint·inner ring·vault·return dogleg 종합. | 신규 설계 / 미구현; 동일 Chapter Tier; 종합·연출, 난이도 보너스 없음 |

