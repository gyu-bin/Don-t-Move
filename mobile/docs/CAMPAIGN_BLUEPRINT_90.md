# DON’T MOVE — Campaign Blueprint: 90 Missions

Status: design-only 9×10 blueprint, not runtime availability. Level composition source of truth is `LEVEL_DESIGN_BIBLE_V3.md`. The chapter tables below are mission intentions; guard numbers and zone counts are examples, never ordinal generation rules. Runtime catalog remains60 entries, with actual Chapter01–03 data reviewed separately; Chapter04–09 maps are not authored by the V3 pass.

## V3 authoring requirements for every future blueprint row

Before drawing a map, attach: missionFantasy, architecture, entry/objective/exit coordinates, topology signature(entrySide/objectiveRegion/exitSide/routeShape/escapeDirection), zone purposes, landmark relation, Safe/Risk/Escape decisions, guard coverage roles, CCTV mount/counterplay, semantic theft search sectors, cover chain and intentional safety reasons. Apply gates A–G from V3. Do not infer these fields from the table's mission number or decoration count. Chapter01–03 reviewed metadata is authored separately from runtime in `tools/campaign/v3DesignSchema.ts` and its chapter implementations. Chapter04–09 inherit these **requirements only**, without producing their maps.

Order: Fantasy → Architecture → Entry/Objective/Exit → Purpose → Topology → Landmark → Security → Hide → Gameplay structure → Soft structure → Lighting → Decoration.

좋습니다. **9챕터 × 10미션 = 총 90미션**을 먼저 “맵을 그리기 전 단계의 전체 설계표”로 고정하겠습니다.

공통 원칙은 **맵 크기를 계속 키우는 게 아니라 `Zone / Route / Guard 역할 / 기믹`을 점진적으로 복잡하게 만드는 것**입니다.

### CHAPTER 01 — MUSEUM
**테마:** 기본 잠입 / 시야 / Theft Alert / 추격 / 탈출 학습

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 01-01 | Entrance Hall | 3 | 기본 시야·엄폐 | 2 |
| 01-02 | Main Gallery | 3 | Safe/Risk Route | 2 |
| 01-03 | Archive | 4 | 좁은 LOS·코너 | 2 |
| 01-04 | Security Wing | 4 | Patrol Timing | 3 |
| 01-05 | Restricted Collection | 5 | 첫 본격 Heist + Escape | 3 |
| 01-06 | Conservation Lab | 5 | 유리칸막이·복수 경로 | 3 |
| 01-07 | Private Gallery | 5 | 일부러 보여 Guard 유인 | 3 |
| 01-08 | Security Core | 5 | Junction·경비 역할 분산 | 4 |
| 01-09 | Master Exhibition | 6 | 중첩 시야·복수 루트 | 4~5 |
| 01-10 | Grand Heist | 6 | Theft→Lockdown→Chase→Escape | 5~6 |

---

### CHAPTER 02 — ART GALLERY
**테마:** 열린 전시장 / 긴 시야 / 미술품 사이의 Route 선택 / 유인

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 02-01 | Front Exhibition | 3 | Gallery 기본 구조 적응 | 2 |
| 02-02 | Portrait Hall | 3 | 긴 직선 LOS | 2 |
| 02-03 | Sculpture Studio | 4 | 조각상을 LOS Blocker로 사용 | 2~3 |
| 02-04 | Modern Wing | 4 | 낮은 Partition 사이 이동 | 3 |
| 02-05 | Collector's Room | 5 | 중앙 전시품 접근/탈출 | 3 |
| 02-06 | Glass Gallery | 5 | 보이는 벽·실제 통로 구분 | 3 |
| 02-07 | Curator's Floor | 5 | Guard 유인·Investigation | 3~4 |
| 02-08 | Grand Atrium | 5 | 열린 공간 횡단 | 4 |
| 02-09 | Private Collection | 6 | 여러 전시군 사이 Safe/Risk | 4~5 |
| 02-10 | Masterpiece | 6 | 대형 작품 절도 + 반대편 Escape | 5 |

**챕터 정체성:** Museum보다 벽은 적고 **전시물 자체가 공간을 나누는 챕터**.

---

### CHAPTER 03 — BANK
**테마:** 문 / 보안구역 / 교차로 / 금고 / 제한된 진입로

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 03-01 | Public Lobby | 3 | 카운터·기둥 기본 LOS | 2 |
| 03-02 | Teller Hall | 3 | 긴 카운터 우회 | 2~3 |
| 03-03 | Staff Offices | 4 | 방→복도 구조 | 3 |
| 03-04 | Records Room | 4 | 선반 미로·짧은 LOS | 3 |
| 03-05 | Deposit Boxes | 5 | 다중 통로 선택 | 3 |
| 03-06 | Security Checkpoint | 5 | 좁은 Choke Point | 4 |
| 03-07 | Cash Processing | 5 | 구조물 밀집 + Roaming | 4 |
| 03-08 | Inner Security | 5 | Junction Guard + timing | 4~5 |
| 03-09 | Vault Antechamber | 6 | Objective 전 고강도 잠입 | 5 |
| 03-10 | Main Vault | 6 | Vault Theft + 강한 Lockdown | 6 |

**정체성:** Route 자유도는 조금 낮지만 **보안선을 하나씩 뚫고 들어가는 느낌**.

---

### CHAPTER 04 — LAB
**테마:** 유리벽 / 실험장비 / 보이는 공간 / 좁은 연구실 연결

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 04-01 | Reception Lab | 3 | Lab 시야 구조 학습 | 2 |
| 04-02 | Sample Room | 3 | 작업대 사이 이동 | 2 |
| 04-03 | Glass Corridor | 4 | 보이지만 접근 못 하는 구조 | 3 |
| 04-04 | Research Floor | 4 | 복수 작은 Room | 3 |
| 04-05 | Bio Storage | 5 | 선반/장비 LOS | 3 |
| 04-06 | Experiment Hall | 5 | 큰 장비 Island | 4 |
| 04-07 | Observation Wing | 5 | Guard가 여러 Zone을 관찰 | 4 |
| 04-08 | Restricted Lab | 5 | 짧은 Route + 강한 시야 | 4~5 |
| 04-09 | Prototype Room | 6 | 여러 경비의 교차 관찰 | 5 |
| 04-10 | Core Prototype | 6 | Prototype 절도 + Lab 봉쇄 | 6 |

**정체성:** **유리 때문에 보이는데 갈 수 없는 공간**이 핵심.

---

### CHAPTER 05 — CASINO
**테마:** 열린 공간 / 중앙 Island / 다방향 Guard / 혼잡한 구조

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 05-01 | Casino Entrance | 3 | 열린 공간 기본 | 2 |
| 05-02 | Slot Floor | 3 | 반복 Island 사이 이동 | 3 |
| 05-03 | Table Games | 4 | 원형/대각 Route | 3 |
| 05-04 | Bar & Lounge | 4 | 낮은 엄폐 + 긴 LOS | 3 |
| 05-05 | VIP Floor | 5 | 중간 Heist | 4 |
| 05-06 | Cashier Cage | 5 | Choke + Side Route | 4 |
| 05-07 | High Roller Room | 5 | Roaming Guard 다수 | 4 |
| 05-08 | Surveillance Floor | 5 | 다중 방향 압박 | 5 |
| 05-09 | Private Casino | 6 | Circular Route + 시야 중첩 | 5 |
| 05-10 | Casino Take | 6 | 금고/칩 절도 + 빠른 탈출 | 6 |

**정체성:** 다른 챕터보다 **공간이 열려 있고 Guard 방향을 동시에 읽어야 함**.

---

### CHAPTER 06 — MANSION
**테마:** 방 / 문 / 코너 / 개인 공간 / 짧은 시야

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 06-01 | Main Foyer | 3 | 계단/홀/문 기본 | 2 |
| 06-02 | Dining Wing | 3 | 가구 엄폐 | 2 |
| 06-03 | Library | 4 | 책장 LOS | 3 |
| 06-04 | Guest Rooms | 4 | 작은 Room 연결 | 3 |
| 06-05 | Private Study | 5 | 첫 귀중품 절도 | 3 |
| 06-06 | Servant Passage | 5 | Service Route 활용 | 3~4 |
| 06-07 | Master Bedroom | 5 | 좁은 코너·Investigation | 4 |
| 06-08 | Trophy Hall | 5 | Landmark 중심 Patrol | 4 |
| 06-09 | Hidden Wing | 6 | 비대칭 Route | 5 |
| 06-10 | Family Treasure | 6 | 내부 깊숙한 Objective → Service Escape | 5~6 |

**정체성:** 가장 **Room-based**. 긴 복도보다 문과 코너가 많음.

---

### CHAPTER 07 — WAREHOUSE
**테마:** 대형 선반 / 긴 LOS / 좁은 Lane / 산업 구조물

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 07-01 | Loading Dock | 3 | 컨테이너 엄폐 | 2 |
| 07-02 | Storage Floor | 3 | 긴 선반 Lane | 3 |
| 07-03 | Packing Area | 4 | 작업대/박스 Route | 3 |
| 07-04 | Cold Storage | 4 | 좁은 Lane + 코너 | 3 |
| 07-05 | High Racks | 5 | 장거리 Patrol | 4 |
| 07-06 | Machinery Bay | 5 | 대형 장비 Island | 4 |
| 07-07 | Restricted Cargo | 5 | Roaming + 교차 Lane | 4 |
| 07-08 | Dispatch Center | 5 | Junction 압박 | 5 |
| 07-09 | Secured Storage | 6 | 여러 Lane 중 안전로 찾기 | 5 |
| 07-10 | Black Cargo | 6 | 대형 창고 Heist + 추격 | 6 |

**정체성:** **길게 뻗은 시야와 Lane 선택**이 핵심.

---

### CHAPTER 08 — SECURITY HQ
**테마:** Guard 중심 / 다중 보안구역 / 빠른 경보 전파 / 차단

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 08-01 | HQ Lobby | 3 | 높은 Guard 밀도 적응 | 3 |
| 08-02 | Operations Hall | 4 | Patrol 중첩 | 3 |
| 08-03 | Records Division | 4 | Room + Corridor | 4 |
| 08-04 | Monitoring Wing | 4 | Junction Guard | 4 |
| 08-05 | Armored Offices | 5 | 강한 중간 Heist | 4 |
| 08-06 | Response Center | 5 | Alert 후 빠른 지원 | 5 |
| 08-07 | Command Floor | 5 | Guard 역할 조합 | 5 |
| 08-08 | Central Security | 6 | 다중 Junction 차단 | 5~6 |
| 08-09 | Restricted Command | 6 | Search/Investigation 압박 | 6 |
| 08-10 | HQ Breach | 6~7 | 경보망 한가운데서 절도·탈출 | 6~7 |

**정체성:** 구조물보다 **Guard Network 자체가 퍼즐**.

---

### CHAPTER 09 — HIGH SECURITY VAULT
**테마:** 전체 시스템 종합 / 최종 챕터 / 강한 탈출 압박

| 미션 | 이름 | Zone | 핵심 플레이 | Guard |
|---|---|---:|---|---:|
| 09-01 | Outer Perimeter | 4 | 최종 챕터 입문 | 3 |
| 09-02 | Access Control | 4 | Choke Point | 4 |
| 09-03 | Security Grid | 5 | 다중 시야/교차로 | 4 |
| 09-04 | Inner Corridor | 5 | Patrol Timing 강화 | 5 |
| 09-05 | Vault Gallery | 5 | 중간 Heist + 긴 Escape | 5 |
| 09-06 | Lockdown Sector | 6 | Alert 이후 Zone 변화 | 5 |
| 09-07 | Secure Core | 6 | 유인 + LKP Search | 6 |
| 09-08 | Final Security Ring | 6 | overlapping LOS + Blocker | 6 |
| 09-09 | Vault Approach | 6~7 | 모든 시스템 사전 시험 | 6~7 |
| 09-10 | Final Heist | 7 | 침투→절도→Lockdown→Chase→탈출 | 7 |

---

## 전체 난이도 곡선

90미션 전체를 보면 크게 이렇게 갑니다.

| 구간 | 목표 |
|---|---|
| 01-01 ~ 01-04 | 기본 조작·Vision·Patrol |
| 01-05 ~ 02-10 | Route 선택·Theft/Escape |
| 03~04장 | 공간 구조 읽기 |
| 05~06장 | 열린 공간 / Room 구조 응용 |
| 07장 | 긴 LOS / Lane |
| 08장 | Guard Network |
| 09장 | 모든 시스템 종합 |

### Zone 규칙도 고정
- 초반 미션: **3~4 Zone**
- 중반: **4~5 Zone**
- 후반: **5~6 Zone**
- 챕터 Final: **6~7 Zone**
- **7 Zone 초과는 원칙적으로 금지**

맵이 커진다고 Zone을 10개씩 만들지 않습니다.

### Guard 수도 상한을 둡니다
모바일 Tilt 게임이라 너무 많으면 재미보다 혼잡함이 커집니다.

- 초반: 2~3
- 중반: 3~4
- 후반: 4~6
- 최종급: **최대 7 정도**

대신 Guard 수만 늘리지 않고 **Patrol 역할/시야 중첩/Alert 행동**으로 난이도를 올립니다.

---

## 중요한 부분: 90개를 전부 다른 맵처럼 만드는 방법

각 미션은 반드시 최소 **3개 항목이 이전 미션과 달라야** 합니다.

**Route Shape / Zone Structure / Guard Role / Landmark / Objective Position / Escape Direction / Core Mechanic**

예를 들어 `Guard +1`만 하고 구조가 같은 맵은 새 미션으로 인정하지 않는 식입니다.

이 설계표를 이제 **Level Design Bible V2의 Campaign Blueprint**로 고정하고, 다음 단계부터는 각 미션마다:

`Architecture → Zone → Main/Safe/Risk Route → Guard Role → Structure → Objective → Escape`

순서로 실제 맵을 만들면 됩니다.

그리고 현재 Museum 01-01~10은 **이 표를 기준으로 기존 맵을 최대한 보존하면서 01-05처럼 규칙에서 벗어난 곳만 재설계**하는 게 좋습니다.