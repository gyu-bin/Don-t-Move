# DON'T MOVE — Level Design Bible / Museum Floor Plan V1

2026-09-27 · 공간 구조 / Mission progression 승인 · 정확한 치수와 실플레이 승인 대기

이 문서는 사용자 승인 DESIGN LOCK을 공간 설계 기준으로 고정한다. 도면은 승인된 공간 연결을 나타내며 현재 게임 캡처가 아니다. 01-01만 구현된 상태로 유지하고 iPhone Tilt 실플레이 승인을 기다린다. 01-02~01-05는 [구현 준비 문서](IMPLEMENTATION_PREPARATION.md)까지만 작성하며, 기존 45개 StageDefinition을 변경하지 않는다. 도면의 정확한 크기/타일 수치는 최종 승인되지 않았다.

## 제작 순서와 승인 단계

ARCHITECTURE → PLAYER ROUTE → GUARD SIGHTLINE → COVER → OBJECTIVE → LIGHTING → DECORATION.

1. 완료: 이름·기능을 가진 공간과 Mission progression의 Floor Plan 승인. 치수 확정은 아님.
2. 지금: 01-01 현재 StageDefinition 유지, iPhone Tilt 실플레이 결과 대기. 01-02~01-05의 공간·경로·Anchor·검증 계획만 준비하며 greybox/생성기/런타임 데이터에는 적용하지 않는다.
3. 실기기 Tilt에서 관찰 → 짧은 이동 → 엄폐 → 관찰 → 결단의 리듬을 확인한다. 경로 존재와 클리어 가능한 타이밍이 있다는 것만으로 재미를 승인하지 않는다.
4. Museum 승인 후에만 다른 Chapter로 확대한다. 각 승인 전 임의 재생성·StageDefinition 대량 변경을 금지한다.

Architecture 60% / Gameplay Structure 30% / Decoration 10%는 공간을 읽게 하는 기여도의 목표다. 오브젝트 수나 바닥 점유율의 기계적인 할당량이 아니다. 방마다 주요 구조물 1–3개, 장식 0–3개에서 시작하고 추가 이유를 기록한다. 빈 공간을 장식으로 메우지 않는다.

## 공통 설계 기준

- 방은 건축적 기능을 가진다. 전시실, 직원 통로, 수장고, 보안실과 서비스 통로의 연결에 이유가 있어야 한다.
- 문턱은 다음 공간과 경비를 관찰하는 지점이다. 입장 직후 피할 수 없는 노출이나 즉시 접촉을 만들지 않는다.
- Safe/Risk를 매번 평행 복도 두 개로 만들지 않는다. Rotunda의 가장자리/중앙, 선반 끝의 기다림/횡단, 보안 교차로의 타이밍처럼 장소 자체에서 선택이 생겨야 한다.
- Safe도 Objective에 무조건 안전하게 도착한다는 뜻은 아니다. 관찰 기회와 시야를 끊을 장소를 제공하며 마지막 접근은 경비의 주시 전환을 읽는다.
- 문·통로는 Player/Guard 몸 반경과 시각적 벽 높이를 포함해 검증한다. 도면의 문 표시는 잠금 기믹이 아닌 열린 연결이다.
- 경비 Anchor는 출입문, 교차부, 중요한 전시 구역, 보안 데스크, Objective 입구로 한정한다. 속도는 현재 낮춘 값을 유지한다.
- 길이 비교는 동일 이동속도에서 한다. Sneak Safe와 Run Risk의 시간 차이만으로 좋은 경로 선택이라고 판정하지 않는다.
- 분기 전에는 선택의 결과가 읽혀야 한다. Safe는 긴 거리/관찰 시간, Risk는 짧은 거리/시야 횡단 압력을 갖는다.
- Objective 획득 전후가 다른 동선이 되도록 Escape를 마련한다. 도난 즉시 경보나 Player 위치 공유는 없다.
- Empty Case 실제 시야 확인 → ! → Whistle → Theft Alert. Case 발견 전 Silent Escape와 Alert 중 Objective+Exit 성공을 모두 유지한다.
- Landmark는 방의 형태·용도·조명과 함께 기억된다. 이 Floor Plan 단계에서는 이름만 예약하고 Prop은 배치하지 않는다.

## 한 건물 안의 연결

공공 전시 구역 → 주 전시장 → 직원/수장고 구역 → 보안 통제 구역 → 최종 전시 및 서비스 출구.

| 연결 | 이전 Exit | 다음 Entry | 연결 의미 |
|---|---|---|---|
| 01-01 → 01-02 | RIGHT | LEFT | Side Exit가 다음 전시동의 Painting Gallery로 이어짐 |
| 01-02 → 01-03 | BOTTOM | TOP | 유물실 후면에서 직원 수장고 통로로 내려감 |
| 01-03 → 01-04 | RIGHT | LEFT | Restricted Archive 직원문 → 보안실 서측 출입 |
| 01-04 → 01-05 | TOP | BOTTOM | Security Gate 통과 후 Grand Exhibition 후면 진입 |
| 01-05 → 외부 | RIGHT | 해당 없음 | 관람객 동선과 다른 Service Exit로 Chapter 종료 |

각 문쌍은 승인 후 동일한 문 폭·재질·전환 방향으로 맞춘다. 현재 구현된 03–05의 출입구와 다르더라도 이번에는 변경하지 않는다. 도면은 각 미션의 로컬 방위이며 건물 연결도는 위상도다.

## Mission별 Flow / 역할 / 예산

| Mission | 공간 순서 | Landmark | Guard 제안 | 초기 외곽 상한 | 첫 성공 플레이 목표 |
|---|---|---|---|---|---|
| 01-01 ENTRANCE | Lobby → First Exhibition → 분기 → Objective → Side Exit | Grand Statue | 2 | 22×15 tiles 이하 | 35–55초 |
| 01-02 MAIN GALLERY | Painting Gallery → Central Rotunda → 분기 → Sculpture Hall → Artifact Room → Exit | Central Rotunda / Large Sculpture | 2 | 현재 15×15 tiles 이하 | 45–70초 |
| 01-03 ARCHIVE | Staff Corridor → Archive Shelves → Storage → Restricted Archive → Exit | Archive Shelves | 2 | 15×14 tiles 이하 | 45–75초 |
| 01-04 SECURITY WING | CCTV Room → Security Hub → Guard-controlled Junction → Security Gate → Restricted Passage | Security Control Room | 3 | 16×14 tiles 이하 | 55–85초 |
| 01-05 DIAMOND HALL | Grand Exhibition → Final Security Area → Diamond Chamber → Service Escape Route | Diamond Chamber | 3 | 17×15 tiles 이하 | 65–100초 |

치수·시간은 검증 전 초기 예산이며 확정값이 아니다. 도면은 비례·연결 검수용(NOT TO SCALE)이다. 긴 빈 바닥을 추가해 시간을 맞추지 않는다. 01-02 크기를 키우지 않으며, door/room이 안 들어가면 실 배치를 다시 검수한다.

### 01-01 ENTRANCE

Lobby는 방향을 익히는 관찰 공간, First Exhibition은 첫 경비를 보는 열린 전시실이다. 분기에서 긴 북측 gallery recess와 짧은 전시실 횡단을 고른다. Objective 전시실에서 다시 합류하고 동측 Side Exit로 빠진다. Ticket 기능은 Lobby 안에 포함하여 새 방을 늘리지 않는다.

Guard A는 Lobby 문턱 ↔ First Exhibition 입구를 확인한다. Guard B는 Objective 입구 ↔ Side Exit 접속부를 돌며 항상 한 방향에 틈이 생긴다. Grand Statue는 First Exhibition의 Landmark로 예약한다. 장식 없이도 입구·분기·목적지가 읽혀야 한다.

### 01-02 MAIN GALLERY

Painting Gallery에서 Rotunda 입구를 관찰한다. Rotunda의 남측 가장자리 recessed passage를 따라가면 긴 Safe, 중앙을 가로지르면 짧은 Risk다. 두 경로는 Sculpture Hall의 같은 문으로 합류한다. Hall은 유물실 진입 전 경비를 다시 관찰하는 완충 공간이다. Artifact Room의 남측 직원문에서 별도 하향 Exit 통로로 빠진다.

Guard A는 Rotunda 입구·중앙 횡단축·Sculpture Hall 문을 번갈아 감시한다. Guard B는 Artifact Room 입구와 후면 Case 확인 지점을 오간다. Central Rotunda는 팔각형에 가까운 건축 공간이며 Large Sculpture는 이후 Hall에 예약한다. 도면의 Rotunda는 원형 Prop이 아니다.

### 01-03 ARCHIVE

Staff Corridor를 꺾어 Archive Shelves로 들어간다. 선반 방의 꺾인 외곽을 이용한 우회와 짧은 중앙 통과가 Storage 문 앞에서 합류한다. Restricted Archive에 접근하고 후면 직원문으로 Exit한다. 긴 홀을 만들지 않는다.

Guard A는 직원 출입문 ↔ Archive/Storage 연결부, B는 Restricted Archive 입구 ↔ 후면 직원문을 맡는다. Shelving 위치는 승인 후 정하되 접근 가능한 선반 끝에서 관찰하고 짧게 이동할 수 있어야 한다. 이번 도면에는 선반을 그리지 않는다.

### 01-04 SECURITY WING

CCTV Room에서 Security Hub에 진입한 뒤 Guard-controlled Junction을 통과한다. Safe는 Hub 안에서 기다리고 꺾인 문턱에서 재관찰, Risk는 교차로를 주시가 돌아가는 동안 빠르게 횡단한다. 새 병렬 복도 대신 같은 교차로의 통과 방식이 다르다. Security Gate를 거쳐 Restricted Passage로 나간다.

Guard A는 CCTV/Hub 출입, B는 Junction의 3개 통로 확인, C는 Gate/Restricted Passage를 맡는다. 세 주시가 모든 통로를 동시에 장시간 막지 않아야 한다. Gate는 건축적 문턱이며 새로운 키카드/해킹 규칙을 추가하지 않는다. Objective는 Gate 검사 구역의 귀중품 슬롯으로 예약한다.

### 01-05 DIAMOND HALL

Grand Exhibition에서 마지막 경비 패턴을 관찰하고 Final Security Area의 우회/횡단을 선택한다. Diamond Chamber 입구에서 재관찰한 뒤 Case에 접근한다. 획득 후 동측 Service Passage를 사용하여 되돌아가는 경로와 분리한다.

Guard A는 Grand Exhibition, B는 Final Security Area, C는 Chamber 입구와 Case 검사 지점을 담당한다. Chamber는 Warm Spotlight → Glass Case → Master Diamond → Pedestal의 시각 중심으로 예약한다. Guard C의 외향 관찰 시간에 획득·서비스 탈출이 가능한 시간창을 남긴다. 모든 Guard를 Chamber에 모으지 않는다.

## Guard RIGHT Walk — 별도 제작 Blocker

현재 확인: `src/assets/manifest.ts`가 `LEGACY_CHARACTERS.guard`를 사용하고 방향별 정지 프레임을 재생한다. sliding은 미해결이며 AI 속도 문제가 아니다. `finalCharacterIssues`의 미승인/프레임 검사도 유지한다.

상태: **ASSET GENERATION LIMIT REACHED — 사용자 확정, 이미지 생성 작업 종료.** Sliding은 **ASSET REQUIRED**. Release blocker는 **`Guard locomotion final asset required`**. Release에는 기존 LEGACY 정지 Sprite를 임시 유지한다. 실패 후보와 제작 기록은 모두 보존하며 PASS로 재분류하지 않는다.

추가 재생성·Validator 완화·Guard 속도 조정은 하지 않는다. 향후 전문 Sprite animation 제작을 별도로 승인받을 때 LEGACY 외형과 기존 접지/루프 품질 기준을 유지해야 한다. 현재 Level Design 준비는 에셋 승인이나 Release blocker 해제를 의미하지 않는다.

승인 순서: 동일 시트 Animated Preview → 같은 발 접지/스윙 높이 → 4→5 및 8→1 loop → artwork effective stride 측정 → distance-driven 개발 빌드 임시 적용 → 실제 Patrol 30초 및 정지/회전 재출발 검수. 속도는 현재 값 유지. Validator 완화 금지. 어느 단계든 실패하면 ASSET REQUIRED 유지, 다른 방향/Release 확장 금지.

## 승인된 공간 구조의 향후 플레이 검수 포인트

1. 5개 미션이 한 건물의 공공 구역에서 보안 심부로 들어가는 순서로 읽히는가?
2. 특히 01-02의 Rotunda 분기와 Sculpture Hall 재합류가 자연스러운가?
3. 01-03의 작은 공간, 01-04의 타이밍 교차로, 01-05의 독립 서비스 탈출이 서로 구분되는가?
4. 승인된 출입구 연결을 유지하면서 실제 Tilt에 맞는 치수와 통로 폭인가?

공간 구조 승인은 최종 Prop 배치·치수·실기기 플레이·애니메이션 품질 승인이 아니다. 01-01 실플레이 승인 전 01-02 이후 실제 구현/일괄 적용 금지.
