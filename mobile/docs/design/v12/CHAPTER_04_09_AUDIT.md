# V12 Phase 1 — Chapter 04–09 Audit and 30 Mission Blueprint

Revision: V12-1 · 2026-10-03 · Design only. No runtime data, game logic, or legacy Unity changes.

## Evidence and limits

- Source of truth: `src/game/levels/stages/campaignStages.json` loaded directly by `campaignStages.ts`; catalog counts are 10/10/10/5/5/5/5/5/5 = 60. Existing Chapter 04–09 already has exactly five missions each.
- All 30 later layouts have distinct SHA-256 hashes. No exact layout duplicates; MERGE/REMOVE must not be invented merely to reach 45. The reduction is in Chapters 01–03.
- All 30 lack `cameras[]`. `world/compileStage.ts` creates runtime cameras only from that field. Security HQ has 5–9 decorative `cctv` props per map, not functional CCTV. A CCTV network cannot be credited from its visual dressing.
- Lab uses generic equipment/table/partition/pillar props and no explicit glass panel definitions. The requested visibility-through-glass/blocked-movement identity is not demonstrated by these maps. Glass in the blueprint is proposed, not current runtime behavior.
- Later chapter guards still ramp by mission number: Ch4–6 = 3/3/4/4/5; Ch7–9 = 4/4/5/5/6. `chapterDifficulty.ts` defines equal chapter authoring budgets but these budgets do not rewrite baked map deployment. Counts alone are not a difficulty measurement.
- Every map uses the same named safe/risk templates (wall-side observation vs direct cross-room). Waypoints vary but names do not establish a meaningful tactical alternative. Escape routes are generic independent objective-to-exit legs.
- Props concentrate on a regular 2.1-unit lattice, repeatedly cycling generic kinds. Landmarks can be far from the objective (e.g. 09-05 landmark (8.4,6.3), objective (22.25,3.25)). This does not meet the objective-as-landmark contract.
- This is code/data inspection, not a simulator or device playtest. No current chapter tier, clear rate, FPS, or human fairness is certified here. Design budgets and pressure targets are [PLACEHOLDER] until post-Tilt actual-device testing.

## Audit decisions

KEEP requires a tier-appropriate playable heist as a whole. Useful topology can be retained inside a REBUILD; REBUILD does not mean erasing every wall. No later mission currently merits unconditional KEEP because baked mission ramp, generic flow/dressing, and absent chapter security/visibility behavior remain.

| Existing ID/title | Decision | Actual geometry/security evidence | Preserve | Rebuild requirement |
|---|---|---|---|---|
| 04-01 Observation Lobby | REBUILD | 20×18; 3 guards; 0 runtime CCTV; layout `e32d6c5c0a` | Central apparatus loop and isolated observation bay | Implement explicit glass/opaque distinction and connect objective to workcell landmark; flatten within-tier deployment. |
| 04-02 Research Wing | REBUILD | 21×19; 3 guards; 0 runtime CCTV; layout `316e141d0a` | Offset circular-equipment ring with two radial aisles | Implement explicit glass/opaque distinction and connect objective to workcell landmark; flatten within-tier deployment. |
| 04-03 Specimen Lab | REBUILD | 22×20; 4 guards; 0 runtime CCTV; layout `22ff18ec72` | Paired workcells and a false-signal side passage | Implement explicit glass/opaque distinction and connect objective to workcell landmark; flatten within-tier deployment. |
| 04-04 Containment Sector | REBUILD | 22×20; 4 guards; 0 runtime CCTV; layout `9a41952625` | Containment cross with four independent exit connections | Implement explicit glass/opaque distinction and connect objective to workcell landmark; flatten within-tier deployment. |
| 04-05 Prototype Chamber | REBUILD | 22×23; 5 guards; 0 runtime CCTV; layout `72578b3e46` | Dual experiment loops linked by a protected equipment spine | Implement explicit glass/opaque distinction and connect objective to workcell landmark; flatten within-tier deployment. |
| 05-01 Hotel Reception | REBUILD | 20×18; 3 guards; 0 runtime CCTV; layout `1f6a77a3b7` | Open gaming pit with staggered sight-breaking islands | Convert generic table/counter grid into functional pit/bar/VIP islands; flatten within-tier pressure. |
| 05-02 Gaming Floor | REBUILD | 20×21; 3 guards; 0 runtime CCTV; layout `cc3dab823d` | Two gaming pits and an offset cashier crossover | Convert generic table/counter grid into functional pit/bar/VIP islands; flatten within-tier pressure. |
| 05-03 Service Lounge | REBUILD | 22×19; 4 guards; 0 runtime CCTV; layout `ec409bf28f` | Service alcoves around a long central table corridor | Convert generic table/counter grid into functional pit/bar/VIP islands; flatten within-tier pressure. |
| 05-04 VIP Salon | REBUILD | 22×21; 4 guards; 0 runtime CCTV; layout `3544ee7656` | VIP rooms around a broken central perimeter | Convert generic table/counter grid into functional pit/bar/VIP islands; flatten within-tier pressure. |
| 05-05 Royal Jewel Room | REBUILD | 24×21; 5 guards; 0 runtime CCTV; layout `ce6990f7f1` | Royal room, cashier loop and two competing escape aisles | Convert generic table/counter grid into functional pit/bar/VIP islands; flatten within-tier pressure. |
| 06-01 Garden Vestibule | REBUILD | 19×19; 3 guards; 0 runtime CCTV; layout `c4eba15afd` | Side entrance into two connected salons | Create semantic rooms/doorways/service route and objective refuge rather than generic furniture lattice. |
| 06-02 Drawing Room | REBUILD | 22×18; 3 guards; 0 runtime CCTV; layout `44f11d1db0` | Long hall with alternating living-room doors | Create semantic rooms/doorways/service route and objective refuge rather than generic furniture lattice. |
| 06-03 Library Wing | REBUILD | 23×20; 4 guards; 0 runtime CCTV; layout `d9cd572c5d` | Stair landing loop and three room-to-room hiding pockets | Create semantic rooms/doorways/service route and objective refuge rather than generic furniture lattice. |
| 06-04 Family Apartments | REBUILD | 23×20; 4 guards; 0 runtime CCTV; layout `f9de88bb92` | Night-watch chambers linked through a central reception hall | Create semantic rooms/doorways/service route and objective refuge rather than generic furniture lattice. |
| 06-05 Heirloom Gallery | REBUILD | 23×24; 5 guards; 0 runtime CCTV; layout `6e8993df24` | Heirloom suite, long service return and two connected loops | Create semantic rooms/doorways/service route and objective refuge rather than generic furniture lattice. |
| 07-01 Loading Entrance | REBUILD | 21×19; 4 guards; 0 runtime CCTV; layout `046233aad3` | Loading bay island and two cargo lanes | Retain readable rack/loading geometry but replace mission-count escalation with long-LOS/roaming tier budget and explicit escape chain. |
| 07-02 Cargo Sorting | REBUILD | 21×22; 4 guards; 0 runtime CCTV; layout `79e0f4b680` | Three offset storage aisles with alternating end gaps | Retain readable rack/loading geometry but replace mission-count escalation with long-LOS/roaming tier budget and explicit escape chain. |
| 07-03 Storage Aisles | REBUILD | 23×20; 5 guards; 0 runtime CCTV; layout `d7dc9461b9` | Forked aisle with a hidden cross-loading passage | Retain readable rack/loading geometry but replace mission-count escalation with long-LOS/roaming tier budget and explicit escape chain. |
| 07-04 Inspection Bay | REBUILD | 23×22; 5 guards; 0 runtime CCTV; layout `6230fea377` | Inspection cross and independent perimeter loading lanes | Retain readable rack/loading geometry but replace mission-count escalation with long-LOS/roaming tier budget and explicit escape chain. |
| 07-05 Secured Shipment | REBUILD | 25×22; 6 guards; 0 runtime CCTV; layout `6298935b23` | Container compound with a long protected shipping exit | Retain readable rack/loading geometry but replace mission-count escalation with long-LOS/roaming tier budget and explicit escape chain. |
| 08-01 Security Reception | REBUILD | 20×20; 4 guards; 0 runtime CCTV; layout `749871c7d4` | Control desk loop and blind monitor-wall approach | Add authored functional CCTV/network sectors using existing systems, readable blind windows and objective refuge; decorative cameras are insufficient. |
| 08-02 Monitoring Room | REBUILD | 23×19; 4 guards; 0 runtime CCTV; layout `ea12dd10cb` | Two server islands with a surveillance crossover | Add authored functional CCTV/network sectors using existing systems, readable blind windows and objective refuge; decorative cameras are insufficient. |
| 08-03 Server Wing | REBUILD | 22×22; 5 guards; 0 runtime CCTV; layout `048bd8ceef` | Blind-feed S corridor with two technician bypasses | Add authored functional CCTV/network sectors using existing systems, readable blind windows and objective refuge; decorative cameras are insufficient. |
| 08-04 Restricted Corridor | REBUILD | 24×20; 5 guards; 0 runtime CCTV; layout `1be03fc5ca` | Restricted rooms and a parallel security-return corridor | Add authored functional CCTV/network sectors using existing systems, readable blind windows and objective refuge; decorative cameras are insufficient. |
| 08-05 Black Site Archive | REBUILD | 23×25; 6 guards; 0 runtime CCTV; layout `95b01fd637` | Black Site archive: asymmetric rooms, security dog-leg and outer bypass | Add authored functional CCTV/network sectors using existing systems, readable blind windows and objective refuge; decorative cameras are insufficient. |
| 09-01 Outer Checkpoint | REBUILD | 21×21; 4 guards; 0 runtime CCTV; layout `7b30c6d4b9` | Outer seal loop around a heavy vault island | Combine authored functional security systems and readable vault doorway choices; remove mission-number security ramp. |
| 09-02 Vault Antechamber | REBUILD | 21×24; 4 guards; 0 runtime CCTV; layout `02df4eba0e` | Inner chambers joined by opposing security doorways | Combine authored functional security systems and readable vault doorway choices; remove mission-number security ramp. |
| 09-03 Mechanism Hall | REBUILD | 23×24; 5 guards; 0 runtime CCTV; layout `b6ee474524` | Decoy security corridor and a hidden side-room loop | Combine authored functional security systems and readable vault doorway choices; remove mission-number security ramp. |
| 09-04 Security Ring | REBUILD | 22×25; 5 guards; 0 runtime CCTV; layout `332a2169ca` | Lockdown cross with two independent protected escape lanes | Combine authored functional security systems and readable vault doorway choices; remove mission-number security ramp. |
| 09-05 Master Diamond Chamber | REBUILD | 26×24; 6 guards; 0 runtime CCTV; layout `e688e5bae2` | Master vault compound with two antechambers, outer loop and rear escape | Combine authored functional security systems and readable vault doorway choices; remove mission-number security ramp. |

**Totals: KEEP 0 / MERGE 0 / REBUILD 30 / REMOVE 0.** All 30 IDs remain as source references and proposed destination IDs; no runtime removal or renumbering in Phase 1.

## Chapter tier contract

| Chapter | Tier | Pressure source, identical tier across all five | Finale rule |
|---|---|---|---|
| 04 Lab | MEDIUM+ | Glass route reading; visible-but-not-directly-reachable spaces; sequential checkpoints | Two experiment loops, same exposure/window budget |
| 05 Casino | MEDIUM-HIGH | Multi-direction island timing and pit/bar route selection | Combine islands, no extra stacked objective/exit pressure |
| 06 Mansion | MEDIUM-HIGH+ | Door/corner transitions and service route choices | Larger suite, maintain door observation windows |
| 07 Warehouse | HARD | Long LOS, roaming sectors, cargo-lane commitment | Wider shipping compound, not longer unbroken exposure |
| 08 Security HQ | VERY HARD | Authored CCTV + guard sectors and tighter readable timing | Network composition, not omniscient LKP |
| 09 Vault | FINAL | Combined glass/checkpoint/CCTV/room search with readable alternatives | Combine learned decisions, no invisible trial-and-error solution |

Numeric guard/camera/exposure budgets must be set after Tilt A/B/C comparison. Do not tune chase speed, detection speed, player max speed, or timer to manufacture tier separation. Identical guard counts are neither required nor sufficient; effective overlap, observation windows, exposed crossings and escape pockets are the levers.

## 30 destination mission blueprints

Directions below are proposed semantic relationships, not approved geometry coordinates. Each mission must retain two usable choices where indicated, readable traversable gaps, and a concrete opaque first LOS break. Glass alone never supplies that break.

### Chapter 04

#### 04-01 — Observation Lobby

- **Source / decision:** existing 04-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 관찰실의 시제품을 가져와 직원 출구로 빠진다.
- **Architecture:** 중앙 observation tank와 불투명 서비스 spine, 양쪽 관찰창.
- **Main Route:** 서쪽 입구→tank 어깨→관찰실 checkpoint→시제품.
- **Safe Route:** 서비스 spine 뒤 우회→대기 pocket→관찰실; longer path with visible wait pockets.
- **Risk Route:** tank 앞 짧은 노출 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 관찰 bay 안 시제품, 기기 pedestal·작업등·인접 opaque refuge.
- **Exit / Escape:** 동쪽 직원 출구; bay 뒤 LOS break→남쪽 서비스 길.
- **Security identity:** 유리 너머 순찰을 미리 읽고 한 checkpoint를 통과.
- **Difficulty Tier:** MEDIUM+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 04-02 — Research Wing

- **Source / decision:** existing 04-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 서로 보이는 두 연구실 중 안전한 접근면을 선택한다.
- **Architecture:** 두 workcell과 연결 vestibule, 투명 내벽/불투명 설비벽 구분.
- **Main Route:** 서쪽 입구→radial aisle→동쪽 연구실.
- **Safe Route:** 장비 spine 바깥쪽→서쪽 wait pocket→연구실 측문; longer path with visible wait pockets.
- **Risk Route:** workcell 사이 중앙 crossover; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 동쪽 console alcove 시제품, 획득 후 equipment shoulder로 회피.
- **Exit / Escape:** 북쪽 직원 문; 두 radial aisle 중 빈 쪽 선택.
- **Security identity:** 유리 시야는 열리지만 이동은 문을 거쳐야 함.
- **Difficulty Tier:** MEDIUM+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 04-03 — Specimen Lab

- **Source / decision:** existing 04-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 표본 검사 동선을 이용해 샘플을 반출한다.
- **Architecture:** paired specimen workcell, 남쪽 관찰 통로와 두 연결문.
- **Main Route:** 남쪽 입구→표본 workcell→검사문→sample bay.
- **Safe Route:** 불투명 storage back→sample bay 측면; longer path with visible wait pockets.
- **Risk Route:** paired cell 사이 검사 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** sample bay 실험대, 첫 LOS break는 storage return corner.
- **Exit / Escape:** 서쪽 샘플 반출구; 남쪽 workcell 뒤 복귀.
- **Security identity:** 관찰창으로 guard facing을 읽고 검사문에서 timing 선택.
- **Difficulty Tier:** MEDIUM+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 04-04 — Containment Sector

- **Source / decision:** existing 04-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 격리 구획을 통과해 안전한 서비스 탈출을 고른다.
- **Architecture:** containment cross와 2개의 명확한 서비스 연결, glass/opaque 혼합.
- **Main Route:** 동쪽 입구→격리 vestibule→남서 containment bay.
- **Safe Route:** 북쪽 설비 spine→bay 후면; longer path with visible wait pockets.
- **Risk Route:** cross 중심을 직접 통과; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 격리 bay 시제품, opaque 장비 뒤 refuge.
- **Exit / Escape:** 북쪽 서비스 문; pickup bay 뒤→서쪽 return aisle.
- **Security identity:** 서로 다른 창의 시야가 순차적으로 작동; 영구 동시 봉쇄 금지.
- **Difficulty Tier:** MEDIUM+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 04-05 — Prototype Chamber

- **Source / decision:** existing 04-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 시제품 반출실과 관찰 회랑을 연결하는 연구소 heist.
- **Architecture:** 두 experiment loop·서비스 spine·시제품 chamber.
- **Main Route:** 남쪽 입구→서쪽 loop→시제품 chamber.
- **Safe Route:** spine 뒤 observation pockets→chamber 측문; longer path with visible wait pockets.
- **Risk Route:** 두 loop 사이 중앙 bridge; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** chamber 중심 reactor display, 곧바로 후면 설비 뒤 LOS break.
- **Exit / Escape:** 동쪽 emergency service 문; 반출 loop가 접근 loop와 분리.
- **Security identity:** 유리 관찰·checkpoint·theft search 종합, 다른 Ch4보다 빡센 finale 금지.
- **Difficulty Tier:** MEDIUM+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

### Chapter 05

#### 05-01 — Reception Jewel

- **Source / decision:** existing 05-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 카지노 입구 전시 보석을 테이블 틈으로 반출한다.
- **Architecture:** reception apron·slot bank·두 table island.
- **Main Route:** 북쪽 입구→slot shoulder→display salon.
- **Safe Route:** 외곽 bar back→reception alcove; longer path with visible wait pockets.
- **Risk Route:** table island 사이 짧은 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** reception showcase, slot bank 뒤 첫 LOS break.
- **Exit / Escape:** 남쪽 service 문; bar pocket→직원 길.
- **Security identity:** 다방향 guard가 다른 island를 보며 회전; 한 번에 읽을 crossing.
- **Difficulty Tier:** MEDIUM-HIGH; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 05-02 — Gaming Floor

- **Source / decision:** existing 05-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 두 gaming pit 사이 경비 시선을 교대로 피한다.
- **Architecture:** 두 table pit·cashier crossover·외곽 직원 길.
- **Main Route:** 북쪽 입구→첫 pit→cashier crossover→남쪽 showcase.
- **Safe Route:** slot back aisle→pit 측면; longer path with visible wait pockets.
- **Risk Route:** 두 pit 중앙 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 남쪽 cashier display, counter shoulder가 인접 refuge.
- **Exit / Escape:** 동쪽 staff 출구; counter 뒤 escape lane.
- **Security identity:** 각 pit의 독립 patrol phase와 제한 CCTV가 순차 overlap.
- **Difficulty Tier:** MEDIUM-HIGH; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 05-03 — Service Lounge

- **Source / decision:** existing 05-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 손님 공간과 바 뒤 직원 통로 사이에서 귀중품을 훔친다.
- **Architecture:** bar front·service alcove·긴 table aisle.
- **Main Route:** 서쪽 입구→lounge island→private display.
- **Safe Route:** bar back→service alcove→display 후면; longer path with visible wait pockets.
- **Risk Route:** table aisle 직접 횡단; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** private lounge showcase, bar 후면에서 첫 LOS break.
- **Exit / Escape:** 북쪽 service lift; alcove→bar return.
- **Security identity:** 실내 다방향 patrol, 서비스 동선은 느리지만 관찰 가능.
- **Difficulty Tier:** MEDIUM-HIGH; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 05-04 — VIP Salon

- **Source / decision:** existing 05-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** VIP room 사이의 가구 island로 숨으며 보석을 탈취한다.
- **Architecture:** VIP salons·central perimeter break·대체 staff corridor.
- **Main Route:** 남쪽 입구→salon 문→private showcase.
- **Safe Route:** staff corridor→sofa pocket→측문; longer path with visible wait pockets.
- **Risk Route:** central lounge→VIP 정문; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** VIP display, 불투명 salon door return이 첫 LOS break.
- **Exit / Escape:** 서쪽 staff 문; sofa pocket→서비스 corridor.
- **Security identity:** VIP door/checkpoint + lounge view, doorway를 동시에 봉쇄하지 않음.
- **Difficulty Tier:** MEDIUM-HIGH; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 05-05 — Royal Jewel Room

- **Source / decision:** existing 05-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** cashier와 VIP 경비 사이로 왕실 보석을 반출한다.
- **Architecture:** royal chamber·cashier loop·두 escape aisle.
- **Main Route:** 동쪽 입구→cashier shoulder→royal anteroom.
- **Safe Route:** bar-service perimeter→chamber 측문; longer path with visible wait pockets.
- **Risk Route:** gaming pit→anteroom 직접 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** royal chamber landmark showcase, 문 뒤 refuge.
- **Exit / Escape:** 남쪽 staff 문; cashier loop 또는 bar return 선택.
- **Security identity:** island timing·CCTV·theft sector 종합; pressure는 다른 Ch5와 동일.
- **Difficulty Tier:** MEDIUM-HIGH; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

### Chapter 06

#### 06-01 — Garden Vestibule

- **Source / decision:** existing 06-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 정원 옆문으로 들어가 손님 salon의 유물을 반출한다.
- **Architecture:** 두 실제 salon·중앙 doorway·정원 service return.
- **Main Route:** 서쪽 옆문→첫 salon→둘째 salon display.
- **Safe Route:** 정원 return→curtain-wall pocket→salon 측문; longer path with visible wait pockets.
- **Risk Route:** salon 정문 직접 연결; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 둘째 salon cabinet, doorway 바깥 blind corner.
- **Exit / Escape:** 동쪽 정원 문; service return.
- **Security identity:** room patrol와 doorway facing으로 corner timing 선택.
- **Difficulty Tier:** MEDIUM-HIGH+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 06-02 — Drawing Room

- **Source / decision:** existing 06-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 응접실 문이 교대로 열리는 시야를 읽고 가보를 가져간다.
- **Architecture:** 긴 hallway·alternating doors·불투명 living-room pocket.
- **Main Route:** 서쪽 입구→hall 문→drawing room.
- **Safe Route:** service passage→small reading pocket; longer path with visible wait pockets.
- **Risk Route:** 긴 hall 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** drawing room mantel cabinet, 문 뒤 첫 LOS break.
- **Exit / Escape:** 남쪽 service 문; hall 횡단 1회와 독립 return.
- **Security identity:** door-facing wait window가 명확; 긴 hall 상시 봉쇄 금지.
- **Difficulty Tier:** MEDIUM-HIGH+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 06-03 — Library Wing

- **Source / decision:** existing 06-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 서가 측면과 독서실을 연결해 수집품을 훔친다.
- **Architecture:** 실제 library shelves·reading alcove·두 room return.
- **Main Route:** 북쪽 landing→library shoulder→reading vault.
- **Safe Route:** 서가 back aisle→reading alcove 측면; longer path with visible wait pockets.
- **Risk Route:** reading room 중앙 통과; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** reading alcove cabinet, 불투명 bookshelf 뒤 회피.
- **Exit / Escape:** 서쪽 service 문; library return.
- **Security identity:** 서가 corner마다 관찰 선택; grid 테이블 밀도 대신 의미 있는 서가.
- **Difficulty Tier:** MEDIUM-HIGH+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 06-04 — Family Apartments

- **Source / decision:** existing 06-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 침실과 reception 사이 방 전환을 이용해 유물을 반출한다.
- **Architecture:** family chambers·reception hall·parallel service doors.
- **Main Route:** 동쪽 입구→reception→private suite.
- **Safe Route:** service door chain→suite 측문; longer path with visible wait pockets.
- **Risk Route:** reception 대각 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** suite cabinet, suite 후면 doorway corner.
- **Exit / Escape:** 북쪽 staff 문; 두 방을 거친 return.
- **Security identity:** room guard와 roaming guard의 공간 책임 분리.
- **Difficulty Tier:** MEDIUM-HIGH+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 06-05 — Heirloom Gallery

- **Source / decision:** existing 06-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 가보 suite에서 경비를 끊고 저택 서비스 회랑으로 돌아간다.
- **Architecture:** heirloom suite·두 living-room loop·service return.
- **Main Route:** 남쪽 입구→첫 salon→suite.
- **Safe Route:** library-service chain→suite 후면; longer path with visible wait pockets.
- **Risk Route:** central reception→suite 정문; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** suite centerpiece, 인접 cabinet wall 뒤 LOS break.
- **Exit / Escape:** 동쪽 service 문; suite back→service loop.
- **Security identity:** door/corner/search 종합; 넓이만 증가, pressure 추가 누적 금지.
- **Difficulty Tier:** MEDIUM-HIGH+; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

### Chapter 07

#### 07-01 — Loading Entrance

- **Source / decision:** existing 07-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 하역 구역의 검수 물품을 cargo lane으로 반출한다.
- **Architecture:** loading dock·pallet island·두 cargo lane.
- **Main Route:** 동쪽 dock→pallet shoulder→inspection case.
- **Safe Route:** rack back→loading pocket→검수대 측면; longer path with visible wait pockets.
- **Risk Route:** 긴 cargo lane 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** inspection case, container corner가 첫 LOS break.
- **Exit / Escape:** 서쪽 loading 문; outer cargo lane.
- **Security identity:** 긴 LOS와 roaming patrol; lane 끝마다 관찰 pocket.
- **Difficulty Tier:** HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 07-02 — Cargo Sorting

- **Source / decision:** existing 07-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 서로 다른 끝이 열린 세 aisle 중 경비가 비운 aisle을 고른다.
- **Architecture:** 세 offset rack aisle와 alternating end gaps 유지.
- **Main Route:** 동쪽 입구→선택 aisle→sorting bay.
- **Safe Route:** 외곽 rack end pockets→북서 sorting bay; longer path with visible wait pockets.
- **Risk Route:** 중앙 aisle 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 북서 shipping case, sorting partition 뒤 refuge.
- **Exit / Escape:** 북쪽 dispatch 문; 다른 aisle로 되돌아감.
- **Security identity:** roaming이 aisle 사이를 이동, 같은 lane을 영구 봉쇄하지 않음.
- **Difficulty Tier:** HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 07-03 — Storage Aisles

- **Source / decision:** existing 07-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 잘못 들어간 aisle에서 cross-loading 연결을 찾아 탈출한다.
- **Architecture:** forked aisle·명확한 cross-loading passage·rack pocket.
- **Main Route:** 남쪽 입구→fork→동쪽 case bay.
- **Safe Route:** rack shoulder→cross-loading bypass; longer path with visible wait pockets.
- **Risk Route:** fork 중앙 긴 노출 aisle; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** case bay landmark crates, rack end에서 첫 LOS break.
- **Exit / Escape:** 동쪽 dispatch 문; pickup bay 후면 bypass.
- **Security identity:** long LOS 선택과 roaming timing; 숨은 passage를 시각적으로 명확히.
- **Difficulty Tier:** HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 07-04 — Inspection Bay

- **Source / decision:** existing 07-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 검수 checkpoint를 넘고 perimeter loading lane으로 빠진다.
- **Architecture:** inspection cross·loading return·machine shoulder.
- **Main Route:** 서쪽 입구→inspection desk→동쪽 verified cargo.
- **Safe Route:** 남쪽 perimeter→machine pocket→desk 후면; longer path with visible wait pockets.
- **Risk Route:** cross 중앙 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** 검수 cargo case, machine body 뒤 회피.
- **Exit / Escape:** 남쪽 loading 출구; perimeter lane.
- **Security identity:** checkpoint guard와 roaming sector가 순차 대응.
- **Difficulty Tier:** HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 07-05 — Secured Shipment

- **Source / decision:** existing 07-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** container compound의 봉인 화물을 dispatch lane으로 반출한다.
- **Architecture:** container rows·shipping bay·두 protected exits.
- **Main Route:** 북쪽 gate→container shoulder→sealed shipment.
- **Safe Route:** outer loading ring→shipment 후면; longer path with visible wait pockets.
- **Risk Route:** container 간 long lane; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** sealed container case, opaque container end 뒤 refuge.
- **Exit / Escape:** 서쪽 dispatch 문; long lane 중간 pocket chain.
- **Security identity:** long LOS·roaming·search sector 종합, finale guard stacking 금지.
- **Difficulty Tier:** HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

### Chapter 08

#### 08-01 — Security Reception

- **Source / decision:** existing 08-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 관제 책상 뒤 보안 데이터를 직원 통로로 반출한다.
- **Architecture:** control desk loop·monitor wall·opaque service return.
- **Main Route:** 남쪽 입구→reception checkpoint→data alcove.
- **Safe Route:** monitor-wall back→wait pocket; longer path with visible wait pockets.
- **Risk Route:** desk 앞 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** data console, monitor-wall corner refuge.
- **Exit / Escape:** 북쪽 staff 문; blind service return.
- **Security identity:** 실제 CCTV sweep + guard checkpoint를 시간으로 분리.
- **Difficulty Tier:** VERY HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 08-02 — Monitoring Room

- **Source / decision:** existing 08-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 서로 다른 camera feed가 지키는 server island를 건넌다.
- **Architecture:** 두 server islands·surveillance crossover·technician bypass.
- **Main Route:** 남쪽 입구→island shoulder→monitor bay.
- **Safe Route:** server back aisles→bay 측면; longer path with visible wait pockets.
- **Risk Route:** island 사이 crossover; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** monitor bay terminal, server corner 첫 LOS break.
- **Exit / Escape:** 동쪽 technician 문; opposite server return.
- **Security identity:** CCTV2개 권역과 guard sector, 각 sweep의 readable blind window.
- **Difficulty Tier:** VERY HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 08-03 — Server Wing

- **Source / decision:** existing 08-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** blind feed 회랑을 읽고 보안 데이터로 접근한다.
- **Architecture:** server S corridor·두 technician bypass.
- **Main Route:** 서쪽 입구→server corner→data cage.
- **Safe Route:** technician bypass→rack back→cage 측문; longer path with visible wait pockets.
- **Risk Route:** S corridor 핵심 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** data cage terminal, rack corner refuge.
- **Exit / Escape:** 남쪽 service 문; 다른 bypass로 escape.
- **Security identity:** 실제 camera coverage blind lane + roaming handoff.
- **Difficulty Tier:** VERY HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 08-04 — Restricted Corridor

- **Source / decision:** existing 08-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 보안 junction에서 순찰과 CCTV가 비우는 연결을 선택한다.
- **Architecture:** restricted rooms·parallel return·security junction.
- **Main Route:** 북쪽 입구→junction checkpoint→archive cell.
- **Safe Route:** parallel technician return→cell 후면; longer path with visible wait pockets.
- **Risk Route:** junction 직접 횡단; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** restricted terminal, opaque cell-return corner.
- **Exit / Escape:** 서쪽 staff 문; independent technician lane.
- **Security identity:** networked sectors지만 미발각 player 위치 공유 금지.
- **Difficulty Tier:** VERY HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 08-05 — Black Site Archive

- **Source / decision:** existing 08-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** control network와 archive enclave를 통과해 기록을 반출한다.
- **Architecture:** asymmetric archive rooms·security dogleg·outer bypass.
- **Main Route:** 동쪽 입구→monitor junction→archive anteroom.
- **Safe Route:** outer bypass→archive flank; longer path with visible wait pockets.
- **Risk Route:** dogleg checkpoint 직행; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** archive vault terminal, anteroom pillar-wall 회피.
- **Exit / Escape:** 북쪽 service 문; archive rear→outer return.
- **Security identity:** guard+CCTV network 종합; 같은 tier 내 더 좁은 windows 강제 금지.
- **Difficulty Tier:** VERY HARD; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

### Chapter 09

#### 09-01 — Outer Checkpoint

- **Source / decision:** existing 09-01; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 금고 outer seal의 전시 보석을 우회 반출한다.
- **Architecture:** heavy vault island·checkpoint vestibule·outer ring.
- **Main Route:** 서쪽 입구→checkpoint→outer case bay.
- **Safe Route:** vault wall ring→측문; longer path with visible wait pockets.
- **Risk Route:** checkpoint 직접 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** outer case bay masterDiamond, vault shoulder refuge.
- **Exit / Escape:** 동쪽 sealed service 문; ring escape.
- **Security identity:** guard/CCTV/glass inspection 조합, 사전 관찰 pocket 필수.
- **Difficulty Tier:** FINAL; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 09-02 — Vault Antechamber

- **Source / decision:** existing 09-02; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** opposing doorway의 보안 시간을 읽고 inner chamber를 통과한다.
- **Architecture:** 두 antechambers·opposing security doors·service link.
- **Main Route:** 서쪽 입구→첫 antechamber→inner showcase.
- **Safe Route:** service link→inner chamber flank; longer path with visible wait pockets.
- **Risk Route:** 두 door 직선; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** inner showcase, 불투명 doorway return 뒤 refuge.
- **Exit / Escape:** 북쪽 staff 문; 다른 antechamber return.
- **Security identity:** door guard와 camera sweep이 겹쳐도 실행 가능한 시간 창.
- **Difficulty Tier:** FINAL; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 09-03 — Mechanism Hall

- **Source / decision:** existing 09-03; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 미끼 회랑보다 안전한 mechanism service loop를 읽는다.
- **Architecture:** decoy corridor·side-room loop·mechanism rack.
- **Main Route:** 남쪽 입구→mechanism shoulder→case room.
- **Safe Route:** side-room loop→case 후면; longer path with visible wait pockets.
- **Risk Route:** decoy corridor 정면 crossing; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** case room masterDiamond, rack corner first break.
- **Exit / Escape:** 서쪽 maintenance 문; side-room return.
- **Security identity:** 미끼는 표지와 visible security로 읽힘; 정보 없는 trial/error 금지.
- **Difficulty Tier:** FINAL; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 09-04 — Security Ring

- **Source / decision:** existing 09-04; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** pickup 후 lockdown 압박 속에서도 독립된 탈출 lane을 고른다.
- **Architecture:** security cross·two protected escape lanes·wait pockets.
- **Main Route:** 동쪽 입구→cross checkpoint→vault alcove.
- **Safe Route:** outer ring→alcove rear; longer path with visible wait pockets.
- **Risk Route:** central cross 직행; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** vault alcove display, wall shoulder 즉시 회피.
- **Exit / Escape:** 남쪽 service 문; 둘 중 빈 escape lane.
- **Security identity:** confirmedTheft28s 동일; lockdown은 실패 아닌 network pressure.
- **Difficulty Tier:** FINAL; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

#### 09-05 — Master Diamond Chamber

- **Source / decision:** existing 09-05; REBUILD, retain useful architecture listed in audit.
- **Fantasy:** 전체 보안 문법을 읽고 최종 보석을 service exit로 반출한다.
- **Architecture:** master chamber·두 antechambers·outer loop·rear escape.
- **Main Route:** 북쪽 입구→첫 antechamber→master chamber.
- **Safe Route:** outer loop→rear chamber entrance; longer path with visible wait pockets.
- **Risk Route:** central checkpoint→master front; shorter exposed leg whose guard/camera phase is observable.
- **Objective:** master display landmark, 바로 옆 opaque chamber return.
- **Exit / Escape:** 동쪽 rear service 문; antechamber 또는 outer loop.
- **Security identity:** 전체 시스템 종합; guard/LOS 동시중첩은 관찰가능한 해답 보장.
- **Difficulty Tier:** FINAL; equal pressure band to all four sibling missions, including finale. [PLACEHOLDER until Tilt playtest].

## Implementation gates for later phases

1. Tilt selection precedes final geometry/pressure tuning. Phase 1 does not alter input mappings.
2. Bake semantic route nodes for ENTRY→APPROACH→SECURITY CROSSING→OBJECTIVE→THEFT→FIRST LOS BREAK→ESCAPE→EXIT. Validate collision connectivity, not merely drawn route labels.
3. Implement glass behavior with existing engine contracts: movement BLOCK, vision PASS. Choose or map an approved Lab asset separately; do not mistake an opaque generic partition for glass.
4. Camera network means explicit camera records, shared existing V9 detection timing, authored phases and readably separate coverage. Cosmetic CCTV props stay decorative.
5. Replace lattice scatter with purpose-built clusters and clear movement footprints. No new full-cover spam or hidden fake gaps.
6. Keep confirmedTheft→28s for every mission; pickup alone does not publish player LKP. No chapter-specific chase speed, audio, locomotion or navigation redesign.
7. Validate sibling variance and chapter mean pressure as warnings with observed human outcomes; no mission-number monotonic test. Numeric budgets remain hypotheses until physical Tilt playtests.
8. Required evidence after implementation: connectivity/fake-gap/wall-slide/CCTV/search/timer regressions plus Debug OFF actual renderer screenshots, one human representative per chapter, and specific failed-route retry evidence.

## Changelog

- V12-1: audited all 30 existing later missions from baked runtime source, recorded missing functional CCTV/Lab glass and mission-count deployment ramp; proposed exactly five distinct heists per later chapter. Runtime unchanged.
