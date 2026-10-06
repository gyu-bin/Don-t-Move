# DON'T MOVE — Campaign Level Design V11

## 검토 상태

**Phase A — 설계 검토본. Phase B 런타임 재구성은 아직 시작하지 않았다.**

현재 실제 앱은 **60미션**(1–3챕터 각10개, 4–9챕터 각5개). 이번 문서의 **90미션은 설계 범위**이며, 설치된 게임이90미션으로 바뀌었다는 뜻이 아니다. 수정 이전의 dirty working tree를 기준으로 했으며, 이전 V10/V10.1 및 개발 경고 배너 수정도 보존했다. `legacy-unity/`는 수정하지 않았다.

사용자 V11의 §57은 Blueprint 승인 후 Runtime Rebuild, §71은 먼저 Phase A 보고, §72는 설계 전에 런타임 대수술 금지를 명시한다. 따라서 검토 가능한90개 설계와 공통 규칙을 먼저 완성한다. 승인 전 캠페인 JSON, 앱/UI, 보안 AI/속도/음향을 바꾸지 않는다.

## 문서 구성

| 문서 | 내용 |
|---|---|
| [90_MISSION_OVERVIEW.md](90_MISSION_OVERVIEW.md) | 90개 미션 이름·핵심 플레이·기존/신규·난이도 역할 색인 |
| [CHAPTER_01_03_BLUEPRINT_AND_AUDIT.md](CHAPTER_01_03_BLUEPRINT_AND_AUDIT.md) | 실제30미션 구조 조사, KEEP/TUNE/PARTIAL/FULL 분류,30개 상세설계 |
| [CHAPTER_04_09_BLUEPRINT.md](CHAPTER_04_09_BLUEPRINT.md) | 기존30개 유지·재해석과 신규30개를 합친60개 상세설계 |
| [SYSTEM_CONSISTENCY.md](SYSTEM_CONSISTENCY.md) | Escape Timer 실제 두 원인, 공통 HUD/상태 규칙, 기존 예외와 수정 범위 |
| [RUNTIME_BASELINE.json](RUNTIME_BASELINE.json) | 실제60개 정의별 SHA와540개 런타임/에셋 파일 SHA, 재구성 전 기준 |
| [REVIEW.md](REVIEW.md) | 독립 설계/코드 근거 검토. 플레이테스트 인증이 아님 |
| [VALIDATION.md](VALIDATION.md) |90개 설계 누락검사, 원본 불변 검사, 타입/lint 결과 |

V11 설계가 승인되면 향후 캠페인 철학은 이 문서를 우선한다. 기존 `docs/CAMPAIGN_BLUEPRINT_90.md`와 V2/V3/V5는 역사적 참고자료다. **실행 중인 맵의 사실은 여전히 `src/game/levels/stages/campaignStages.json`**이다. 설계 문서와 런타임이 다른 상태를 숨기지 않는다.

## 1. 설계 철학

Difficulty axis는 **Chapter**, 미션 번호는 **공간과 Heist 상황의 다양성**이다. 10번은 종합 전시/연출 규모가 큰 미션이지 더 짧은 반응 시간/더 빠른 추격을 받는 보스가 아니다.

모든 미션의 인과 흐름:

`ENTRY → APPROACH → SECURITY CROSSING → OBJECTIVE → THEFT → FIRST LOS BREAK → ESCAPE ROUTE → EXIT`

Safe는 기다릴 곳과 타이밍을 관찰할 수 있는 실재 경로다. Risk는 같은 종착점을 짧게 연결하지만 더 드러나는 경로다. Safe와Risk가 같은 선에 이름만 두 개 붙은 경우는 통과시키지 않는다. 탈출은 반드시 새로운 결정을 포함하며, 목표에서 몇 걸음 떨어진 출구로 끝내지 않는다.

설계 순서: Fantasy → Architecture → Entry/Objective/Exit → Zone purpose → Route topology → Landmark → Security → Hide chain → Gameplay structures → Soft structures → Lighting → Decoration.

## 2. Chapter Difficulty Budget — 공통 계약

아래는 **새 맵을 심사할 때의 설계 목표**, 현재 측정값이나 배포 파라미터가 아니다. Guard 수 하나/면적 비율 하나로 난이도를 선언하지 않는다. Chapter profile의 기존 고정guardCount가 미래 수작업 설계의 할당 규칙을 대신하지 않는다.

### 모든 챕터에 같은 기준

- Player 속도/몸체/Wall Slide/Tilt/calibration/animation을 유지한다.
- CCTV V9 detector/suspicion tuning을 고정한다. 챕터별 감지속도를 조정하지 않는다. 카메라 위치/대수/스윕/위상으로 보안 구성을 만든다.
- 기존 Direct Chase controller와 최종속도를 동결한다. 현재 Gallery178, 기타168 world units/s라는 기존 예외는 기록하고 새 예외를 만들지 않는다. 엄밀한 속도 통일은 이 작업의 범위를 넘어 별도 검토한다.
- Theft는 위치 모르는 수색, Spotted는 실제 목격과LKP. 보이지 않는 Player 위치 공유 금지.
- 타이머/HUD는 공통 계약을 쓴다. §SYSTEM_CONSISTENCY의28초 제안은 미적용이며, 0초=즉사 규칙을 추가하지 않는다.
- 각 연결통로는 실제 Player 반경9world units(0.225tile)과 Tilt margin을 검증한다. 기존 `tools/campaign/v5Geometry.ts`는 Player body 반경9와 Tilt 검사 반경18 world units를 별도로 검사한다. 이 값을 유지한다: 추가 margin9world units(0.225tile), 중심 간 최소폭 `2×18/40=0.90tile`. 이는 **필요조건**이며, 0.90tile 통로가 실기기에서 편하다는 인증이 아니다. 주요 경로는 가능하면1.5tile 이상 확보하고 코너/다중 접촉/Projected sprite는 직접 확인한다. 기존 body/radius18 검사를 약화하지 않으며 실제 편안한 통과 여부는 장치 플레이로 별도 판단한다.
- 큰 island는 적어도 두 통과 방향, 관찰 refuge와 첫 탈출 refuge는 독립 역할을 갖는다. 단일 병목이 있으면 타이밍 관찰/회복/우회가 명확해야 한다.
- 초상화·유리·계단·문·게이트는 현재 지원하는 static structure/LOS/collision 의미로만 설계한다. 새로운 해킹·문 열기·지정 버튼·다층 이동이 필요한 것처럼 플레이를 요구하지 않는다. 향후 기능은 별도 범위다.

### 9단계 예산

| Chapter / Tier | 공간·관찰 의무 | Security budget | Safe / Theft / Escape 의무 | 억까 방지 / 내부 평탄화 |
|---|---|---|---|---|
| **01 Museum / EASY** | Statue/case와코너로 다음 shelter가 보임. 좁은Archive는 한 번에 한 국소 경계 판단 | Safe의핵심통과에는 지속Guard+CCTV이중락을 피함. CCTV는 보조로, 큰공간의경비는 별도구역 담당 | 출발 관찰포켓→중앙엄폐→목표접근포켓→첫LOSbreak→탈출포켓.01-08 목표두경비의판단을순차화,01-10 exit집결해소 | 모든미션 초보가다음행동 읽을수있음.크면판단단위늘리되단위당위협/대기부담유지.01-05/08/10이상치우선검토 |
| **02 Gallery / EASY+** | 열린Room, 긴LOS, white wall/art island가 경로를 나눔 | 하나의긴횡단또는교차시야의위상을읽음. Guard+CCTV는일부junction에만보조;Museum보다엄폐사이노출선택증가 | 작품뒤관찰→열린횡단→partition후퇴→목표측면접근. Glass는movementBLOCK/LOSPASS,opaqueLOSbreak는별도 | 긴횡단에도중간재판단가능. 스윕/순찰동시폐쇄가 반복되면위상/동선재설계.큰Gallery의안전면적이전체압력을희석해도Safe노출정도를함께검토 |
| **03 Bank / MEDIUM** | PUBLIC→STAFF→SECURITY→CASH/VAULT 기능깊이. 체크포인트를하나씩통과 | Guard역할분리+CCTV 보안층. 국소복합coverage가능하지만관찰하면타이밍을찾음 | 목표보안층진입후서비스반대편escape. 최초LOSbreak는vault/cash층안쪽,exit까지중간junction필수 |03-10현재할만하다는피드백보존.반응속도/CCTV감지강화금지.카운터를fullcover로오해하게하면수정 |
| **04 Lab / MEDIUM+** | Glass뒤목적지가보이지만통로가다름. 관찰/격리/샘플역할분리 | transparentcollision과Guard/CCTV LOS조합을읽음. 감지값은Bank와동일 | glass교차전opaque장비refuge, pickup후격리실코너→serviceescape | Glass만있는막다른safe금지.각유리장벽끝우회와명확한frames.전체맵유리벽으로Sight폐쇄착시금지 |
| **05 Casino / MEDIUM-HIGH** | 테이블/slot/bar island가중앙경로와우회선 형성 | 여러방향의시야를단계적으로읽음. 일정위상불일치로한crossing의해결창유지 | island사이선택→VIP/cashier목표→bar/slotLOSbreak→서비스출구 | multi-direction은판단수증가이지모든cone동시cover아님.05-10의종합은공간리듬/연출,경비통계보너스없음 |
| **06 Mansion / MEDIUM-HIGH+** | Room transition/corner/doorway, library/study/service room | 문앞관찰/순찰교대가보안층. 긴원거리cone보다방연결선선택 | room연쇄와service우회가Main/Risk와다르게탈출.문프레임은staticpassage | close-range불가피발각이없도록경비를문턱정면에고정하지않음.길찾기복잡도를늘리되문타이밍여유고정 |
| **07 Warehouse / HARD** | 긴rack행과loadingjunction.적재구역의식별가능한branch | longLOS/roamingGuard가외곽만아닌junction으로순환,고정CCTV는중요lane지원 | rackend관찰→교차lane→cargo목표→containercorner→별도dispatch | 넓은면적의영구deadzone로쉽게만들지않음.동시에넓은방전체cone도금지.긴lane에는중간refuge/우회 |
| **08 Security HQ / VERY HARD** | desk/control/CCTV hub/checkpoint의보안망을공간으로표현 | 국소Guard+CCTV동기관찰/복수junction. 모두가한player좌표를알지않음 | 한layer통과후회복포켓→monitoring목표→불투명servercorner→servicecrossing | 관찰가능한스윕틈하나이상,직렬layer사이숨쉴공간.확정도난은authoringsector조정뿐 |
| **09 High Security Vault / FINAL** | 외곽checkpoint→innerring→securedcorridor→vault→alternateout | 앞챕터구조문법종합; 가장많은독립보안선/수색조합 | landmark안목표, 첫vaultLOSbreak→ring우회→junction→exit. main과escape실제별도phase | highest는기억/계획요구증가. blindtrial만가능한spawntrap/연속unavoidableoverlap금지.09-10추격속도보너스없음 |

### 내부 flatness를 어떻게 심사하는가

- `.95–1.05`는 동일 챕터 내 작은 변주라는 **설계 기대치**다. 플레이 실패율을이 범위에 맞게 환산하는 임의 점수/성능 multiplier가 아니다.
- Chapter당10개 모두 같은Tier. Guard수는규모/zone/junction/LOS/CCTV/목표/탈출에맞춘다.최종미션이라고더많은경비를자동배치하지않는다.
- 동일Player/CCTV/Chase값에서각맵의routeexposure/최대연속노출/이중coverage/필요관찰횟수/첫LOSbreak길이/escape병목/수색재조우를독립보고한다.
- 평균과중앙값,개별이상치를함께보고.면적coverage를단독대표로쓰지않고좁은맵의노출경로길이와큰맵의안전면적을따로본다.
- 고정속도·같은초기대기매트릭스의whole-heist는안전경로존재/통과가능성참고. waypointtimeout/automationfail을난이도로계산해“질서있게어렵다”만들지않는다.
- 실제사람Tilt플레이의readability/실수회복/죽은이유를설명가능한지우선한다.특정10번이2배어렵다면topology/출구섹터/엄폐연쇄부터고친다.

## 3. 현재 증거가 보여주는 문제

V10.1의별도측정이한번더확인한Museum/Gallery역전:

| 독립축 | Museum | Gallery | Bank | 의미 |
|---|---:|---:|---:|---|
| Guard area coverage |9.729%|5.521%|7.827%| 면적분모영향 큼; 경로노출과별도 |
| 동일 fixed full-heist probe의 미완주 평균 |81.042%|76.875%|82.292%| scripted/noadaptivewait; 실제사람실패율아님 |

**현재 `Ch1 < Ch2 < Ch3`가 검증되지 않았다.** 목표Tier표만만들었다고해결된것아님. Probe는collision/waypointtimeout과CAUGHT를구분해야하며현재자료는PhaseB출발근거다. V10.1Simulator9개시도는0CLEAR/TESTLIMITATION이므로V11 full-heist VERIFIED라고전용하지않는다.

해당근거는 `Reports/V101/verification.md`, `pressure-final.json`, `matched-heist-pressure.json`에있다. Reports는gitignored일수있으므로본설계문서에핵심수치/한계를명시했다. 원본Runtime은별도SHA로보존한다.

## 현재30개 분류 결과

| 분류 | 수 | 적용 의미 |
|---|---:|---|
| KEEP |13| 구조 보존; 난이도/실기기 합격 인증 아님 |
| TUNE |12| 기존 구조 안에서 경로 읽기·coverage·엄폐·시각 정합 조정 |
| PARTIAL REBUILD |5|01-04 / 01-08 / 01-10 / 02-10 / 03-01의 특정 Objective/escape 공간 재구성 |
| FULL REBUILD |0| 현재 증거로 전체 구조를 버릴 근거가 없는 맵에 강제 적용하지 않음 |

30개별 근거와 현재 좌표는 상세 audit 문서에 있다. 이것은 미래 편집 추천이며 현재 적용된 map diff가 아니다.

## 4. Phase B 실행 순서와 범위

1. **Phase A 검토:**90개공간/난이도예산/타이머공통의미/30개맵분류를확인한다.
2. **공통계약과대표맵:**HUD/timer공통화를01-08/01-10/02-06/02-10/03-10의sector/escape설계와함께검증. 기존AI핵심고정.
3. **Ch1 EASY 정리:**01-05/08/10압박이상치와안전연쇄우선.KEEP맵은그대로둔다.
4. **Ch2 EASY+ 정리:**열린crossing/Glassidentity/실재Safe우회.추가구조가가짜안전공간을만들지않음.
5. **Ch3 MEDIUM 정리:**checkpoint역할과vault관계.03-10은할만한escape보존.압력순서를맞추려고모든은행cone를키우지않음.
6. **각챕터증거:**수정전후overview/objectivecrop/coverroute/DebugOFFSimulator,실제full-heist와physicalTilt별도.
7. **Ch4–9 확장:**앞30개가검토가능한플레이상태를갖춘뒤,각Chapter의기존5개를검증하고06–10을한개씩구현.한generator로90개채우지않음. 필요한Ch6–9전용환경asset은별도제작승인/의존성이지이번완성물아님.

Phase A 분류는수정추천이며승인전런타임diff를만들지않는다.각PhaseB미션은Fantasy/architecture/topology/EntryObjectiveExit/cover/search까지onebrief로편집하고bake한단일runtime정의가QA의sourceoftruth가된다.

## 5. 검증 게이트

| Gate | 증거 / 탈락 조건 |
|---|---|
| A 설계완전성 |90uniqueID,Chapter당10,19필드,기존60/신규30구분,finale동Tier |
| B 런타임구조 |Stagecompile/bodycollision/nav,EntryObjectiveExit/landmark정합,실재Safe/Risk/escape,FakeGap0 |
| C 보안 |실제시간순찰/스윕/LOS,cover가실제차단하는지,도난시섹터분산,hiddenLKP없음 |
| D 전체heist |대표맵START→Objective→Theft→Escape→CLEAR; Spotted→LOSbreak→Search와Capture별도. entryload만으로PASS금지 |
| E 화면 |actualSimulatorDebugOFFoverview/objective/exit/UIstate/safearea;offlineboard와실제캡처구분 |
| F 장치 |iPhoneTilt정지/방향/작은입력/overshoot/벽slide/누운neutral/몇분drift,실제difficultyfeedback |
| G 회귀 |TypeScript/lint/meaningfultests;CCTVV9,loading,audio,locomotion,ads,TheftvsSpotted/Exit보호 |

자동화미완주는TESTLIMITATION,원인재현없이게임수정하지않는다.실제버그수정후해당미션만재검증한다.현재V11PhaseA에서B–F를새로통과했다고선언하지않는다.

## 6. 상태 명칭

- 이번단계가제공하는것: **CAMPAIGN LEVEL DESIGN V11 — 90 MISSION BLUEPRINT READY FOR REVIEW**.
- 승인후Ch1–3runtime와정당한증거가갖춰졌을때만: **CHAPTER 1–3 STRUCTURAL REBUILD READY FOR PLAYTEST**.
- 아직90mission런타임미구현이므로ProductionComplete/FINALLOCK을선언하지않는다.
