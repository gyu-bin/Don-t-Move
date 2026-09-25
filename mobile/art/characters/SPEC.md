# DON'T MOVE — 캐릭터 스프라이트 제작 사양서

이 문서는 게임 런타임에 바로 들어가는 **최종 캐릭터 스프라이트 시트**를 외부에서 제작할 때 따르는 계약서다.
모든 수치의 원본은 `tools/sprites/spriteSpec.ts`에 있고, 결과물은 `npm run sprites:validate`로 자동 검수한다.

### Design sources (2026-09-23 기준)

| 캐릭터 | 외형·화풍·실루엣 (Look) | 움직임 (Motion) |
|---|---|---|
| **Player** (Agent Zero) | 현재 게임의 **ASSETS** Agent Zero — `assets/characters/player_walk.png`의 그림 (얼굴, 헤어, 의상, 백팩, 팔레트, 페인팅 스타일, 머리와 몸의 비율) | **FALLBACK rig**의 몸 역학 (§3-A 수치) + `locomotion.ts` foot planting (§4-A) |
| **Guard** | **LEGACY** Guard — `assets/characters/legacy/guard_directions.png` (네이비 제복, 모자와 배지, 선글라스, 현재 체형과 색감) | `locomotion.ts` 몸 역학과 foot planting (§3-A, §4-A) |

- 현재 `player_walk.png`는 **외형 기준으로만** 쓴다. 그 Walk 모션(제자리 걸음, 약한 팔 스윙)은 최종이 아니다 (ASSET_TODO W1–W7).
- **FALLBACK rig는 움직임 기준으로만** 쓴다. rig의 외형과 머리 크기는 쓰지 않는다. rig는 머리가 키의 약 40%인 SD 비율이라, 비율은 반드시 ASSETS를 따른다.
- 금지: SD/Chibi/Anime 쪽으로 바꾸기, 머리 키우기, Player/Guard 신규 디자인.
- 폐기(deprecated): Agent Zero Character Design Sheet와 거기서 파생된 파일 (`art/characters/deprecated/`). 최종 기준으로 쓰지 않는다.
- 게임 분위기 기준: Museum Visual Reference.
- 애니메이션별 제작 지시서: `art/characters/briefs/player.md`, `briefs/guard.md`.

### 가이드 템플릿

- `art/characters/templates/*_guide.png`는 최종 시트와 픽셀 크기와 격자가 같다. **밑그림 레이어로만 쓰고, 최종 PNG에는 가이드를 넣지 않는다.**
- 템플릿 속 흐린 인물은 **FALLBACK rig의 움직임**(프레임별 팔, 다리, 상체 포즈와 타이밍)을 보여 준다. 외형 기준이 아니다.
- 초록 ● L/R은 foot planting 목표 위치다 (§4-A).

---

## 1. 공통 규격 (모든 시트)

| 항목 | 값 |
|---|---|
| 셀 크기 | **256 × 256 px**, 셀 사이 여백 없음 |
| 포맷 | PNG, RGBA, **투명 배경** (반투명 배경 금지, 불투명 배경 금지) |
| 행 순서 | **1행 Down · 2행 Up · 3행 Left · 4행 Right** |
| 열 순서 | 시간 순서 (Frame 01 → N). 마지막 프레임 다음이 첫 프레임으로 끊김 없이 이어져야 한다 (Whistle 제외) |
| 발 기준점 (Anchor) | 셀 좌표 **(128, 224)**. 두 발 사이의 바닥 지점. 모든 프레임에서 같은 위치 |
| 가장자리 여백 | 셀 테두리에서 **4 px** 안쪽까지는 완전 투명 |
| 텍스트·라벨·번호 | 넣지 않는다 |
| 바닥 그림자 | **넣지 않는다.** 그림자는 게임(Skia)에서 따로 그린다. 발바닥 바로 아래의 아주 옅은 AO만 허용 |
| 조명 | 특정 방향의 강한 조명은 넣지 않는다. 중립적인 어두운 톤, 부드러운 볼륨, 약한 림 하이라이트까지만 |

### 캐릭터 크기 (Idle 기준, 발바닥 → 머리/모자 꼭대기)

| 캐릭터 | 높이 | 허용 오차 | 어깨 폭 가이드 |
|---|---|---|---|
| Player (Agent Zero) | **172 px** | ±10 | 약 70 px |
| Guard | **186 px** | ±10 | 약 84 px (Player보다 넓고 무거운 실루엣) |

같은 캐릭터라면 모든 시트, 방향, 프레임에서 스케일이 같아야 한다.

### 발 위치 규칙 (3/4 시점)

바닥선은 y = 224다. 가장 아래 불투명 픽셀이 바닥선에서 벗어날 수 있는 범위는 다음과 같다.

| 애니메이션 | 위로 뜸 (최대) | 아래로 내려감 (최대) |
|---|---|---|
| Idle / Search | 4 px | 4 px |
| Whistle | 5 px | 5 px |
| Sneak / Walk — Left·Right 행 | 14 px | 6 px |
| Sneak / Walk — Down·Up 행 | 14 px | 22 px (카메라 쪽으로 내딛는 발은 3/4 원근 때문에 아래에 그려진다) |
| Run | 22 px (체공 프레임) | 행 종류에 따라 위와 같음 |

이동 애니메이션은 각 행에서 **적어도 한 프레임의 발이 바닥선에 닿아야 한다** (±6 px).

---

## 2. 파일 목록과 격자

최종 파일 위치: `mobile/assets/characters/`, `mobile/assets/ui/`

| 파일 | 격자 (열 × 행) | 시트 크기 | 프레임 |
|---|---|---|---|
| `player_idle.png` | 4 × 4 | 1024 × 1024 | 16 |
| `player_sneak.png` | 6 × 4 | 1536 × 1024 | 24 |
| `player_walk.png` | 8 × 4 | 2048 × 1024 | 32 |
| `player_run.png` | 8 × 4 | 2048 × 1024 | 32 |
| **Player 합계** | | | **104** |
| `guard_idle.png` | 4 × 4 | 1024 × 1024 | 16 |
| `guard_walk.png` | 8 × 4 | 2048 × 1024 | 32 |
| `guard_run.png` | 8 × 4 | 2048 × 1024 | 32 |
| `guard_whistle.png` | 6 × 4 | 1536 × 1024 | 24 |
| `guard_search.png` | 6 × 4 | 1536 × 1024 | 24 |
| **Guard 합계** | | | **128** |
| `ui/indicator_question.png` | 1 | 128 × 128 | `?` |
| `ui/indicator_alert.png` | 1 | 128 × 128 | `!` |

---

## 3. 캐릭터 디자인

### Player — Agent Zero (Look = ASSETS)
- 기준 이미지: `assets/characters/player_walk.png`. 4방향 모두 있다. Left 행은 Right 행을 좌우 반전한 것이다
- 짙은 흑갈색 헤어, 검정·차콜 잠입복, 반팔 상의에 드러난 팔, 어두운 바지와 신발, **등의 작은 어두운 백팩**
- 머리와 몸의 비율, 실루엣, 페인팅 질감은 ASSETS와 같게 한다. 머리를 키우지 않는다
- 모든 방향과 프레임에서 백팩이 보여야 한다 (Up에서 가장 분명하고, Down에서는 어깨끈)
- ASSETS의 원본 결함을 그대로 옮기지 않는다: Down 1·5번 프레임(7번은 약하게)의 회색 얼룩(W1), 업스케일로 인한 흐림(W5)

### Guard (Look = LEGACY)
- 기준 이미지: `assets/characters/legacy/guard_directions.png` (Down / Up / Left / Right 정지 포즈)
- 네이비 경비 제복, **네이비 모자와 금색 배지**, 선글라스, 금색 단추와 어깨 장식, 검정 벨트와 버클, 검정 장갑과 신발
- 현재 LEGACY의 체형, 머리와 몸 비율, 두꺼운 외곽선, 색감을 그대로 유지한다. 새로 디자인하지 않는다
- Player와 색과 실루엣 모두에서 즉시 구별돼야 한다
- 참고: LEGACY Guard는 ASSETS Player보다 머리가 크고 외곽선이 두껍다. 이 차이는 확정된 디자인으로 간주하고 맞추지 않는다. 두 캐릭터를 같은 화면에서 비교해 조명과 채도만 맞춘다

### 일관성 (금지 사항)
프레임마다 얼굴이 바뀌는 것, 머리 크기 변화, 옷 변화, 가방이나 모자가 사라지거나 형태가 바뀌는 것, 체형 변화, 색상 변화를 모두 금지한다.

### 3-A. Body Mechanics (FALLBACK rig 수치 → 스프라이트 px)

FALLBACK rig(`src/rendering/fallback/proceduralCharacter.ts`)가 게임에서 보여 주는 움직임을 캐릭터 크기에 맞게 환산한 값이다. 가이드 템플릿 속 인물이 이 값대로 움직인다. 페인팅 스프라이트는 **ASSETS 비율의 몸**으로 이 움직임을 재현한다. 보폭과 착지 발 위치는 §4-A를 따른다.

| 동작 | 발 들림 | 몸 bounce (최고↔최저) | 웅크림 | 상체 기울기 | 팔 스윙 | 팔 기본 전방각 | 팔꿈치 굽힘 |
|---|---|---|---|---|---|---|---|
| Idle | 0 | 호흡 약 ±1.4px | 0 | 0° | 0 | 3° | 9° |
| Sneak (Player만) | 7 px | 2.2 px | **11 px** 낮게 | 9° | ±13° | 32° (손을 앞에) | 77° |
| Walk | 11 px (Guard 12) | 4.4 px (Guard 4.8) | 0 | 2° | **±32°** | 3° | 20° |
| Run | 18 px (Guard 19) | 7.6 px (Guard 8.2) | 4 px (Guard 5) | **13°** | **±54°** | 11° | 89° |

규칙:
- **팔은 같은 쪽 다리와 반대로** 스윙한다. 왼다리가 앞이면 왼팔은 뒤로 간다.
- **몸 높이:** Contact 직후(Down)에 가장 낮고, 다음 Contact 직전(Up)에 가장 높다.
- **발 들림:** 공중으로 옮겨지는 발만 들린다. 지면에 닿은 발은 들리지 않고 뒤로 이동한다 (§4-A).
- **백팩:** 몸의 상하 움직임을 1프레임 늦게 따라간다.
- **어깨와 상체:** 반대로 흔들리는 팔을 따라 살짝 비틀린다.
- **Guard:** 같은 역학을 쓰되 bounce는 절제하고 착지를 단단하게 해서 Player보다 무겁게 보이게 한다. Guard는 Sneak가 없다.

---

## 4. 애니메이션별 요구 사항

이동 애니메이션(Sneak/Walk/Run)은 게임에서 **실제 이동 거리에 맞춰** 재생된다. 한 루프는 정확히 **두 걸음(좌+우)**이어야 한다. 발 위치는 아래 **4-A. Foot Planting** 표를 정확히 따른다. 각 프레임의 비트는 템플릿 하단에도 적혀 있다.

### Player
| 애니메이션 | 프레임 | 비트 | 핵심 |
|---|---|---|---|
| Idle | 4 | 기본 · 들숨(가슴 2px 올라감) · 유지 · 날숨 | 미세한 호흡만. 떠다니면 안 됨 |
| Sneak | 6 | Contact(좌, 낮게) · Down · Passing/Up(발끝) · Opposite Contact(우, 낮게) · Down · Passing/Up(발끝) | 몸을 낮추고, 보폭 작게, 팔 움직임 작게, 조심스럽게. Walk와 확실히 달라야 한다 |
| Walk | 8 | Contact(좌) · Down · Passing · Up · Opposite Contact(우) · Down · Passing · Up | 다리 교차, 반대쪽 팔 스윙, 상체 회전, 작은 상하 bounce, **백팩의 2차 움직임**, 체중 이동 |
| Run | 8 | Contact(좌) · Down/밀기 · Passing(체공) · Up(뻗기, 체공) · Opposite Contact(우) · Down/밀기 · Passing(체공) · Up(뻗기, 체공) | 상체 앞으로 기울임, 큰 보폭, 굽힌 팔의 강한 스윙, 큰 bounce, 체공 프레임. Walk를 빨리 돌린 느낌이면 안 된다 |

### Guard
| 애니메이션 | 프레임 | 비트 | 핵심 |
|---|---|---|---|
| Idle | 4 | 기본 · 들숨 · 유지 · 날숨 | Player보다 느리고 묵직하게 |
| Walk | 8 | Player Walk와 같은 비트 | Player보다 무겁게. bounce는 작고, 착지는 단단하게, 팔 스윙은 절도 있게 |
| Run / Chase | 8 | Player Run과 같은 비트 | 추격 느낌. 몸을 앞으로 숙이고 강한 팔 스윙 |
| Whistle | 6 | 정지·발 고정 · 손 올라감 · **호루라기를 입에** · **불기(볼, 약간 젖힘)** · 유지 · 손 내림 | 작은 화면에서도 "호루라기를 분다"가 읽혀야 한다. 호루라기와 손이 얼굴 앞에서 또렷해야 한다. Up 방향에서는 팔꿈치가 올라간 것이 보여야 한다. **`!`는 그리지 않는다** |
| Search | 6 | 경계 자세 · 머리·상체 좌로 회전(≤25°) · 좌측 주시 · 정면 복귀 · 우로 회전(≤25°) · 우측 주시 | 주변을 살피는 경계 자세. **발 위치와 몸 방향은 그 행의 방향을 유지한다.** 머리와 상체만 최대 25° 돌린다 (게임의 시야 방향과 어긋나지 않게) |

---

## 4-A. Foot Planting (필수)

**제자리 걸음(walking in place)은 불합격이다.** Walk, Sneak, Run의 stance 구간에서는 지면에 닿은 발이 **캐릭터 몸 기준으로 뒤쪽으로 이동**해야 한다. 캐릭터가 게임에서 앞으로 이동하면, 그 발은 월드 좌표에서 고정된 것처럼 보인다.

보행 주기: **Contact → Down → Passing → Up → Opposite Contact** (8프레임 기준)

1. **Contact:** 앞발 뒤꿈치가 가장 앞쪽 지점(+reach)에 착지한다. 뒷발은 가장 뒤쪽(−reach)에서 발가락으로 떨어지기 직전이다.
2. **Down:** 체중을 받으며 몸이 가장 낮아진다. 착지한 발은 뒤로 이동 중이다.
3. **Passing:** 착지한 발이 몸 바로 아래(0) 있다. 반대 발은 들린 채 지나간다.
4. **Up:** 몸이 가장 높다. 착지한 발은 몸 뒤쪽이다.
5. **Opposite Contact:** 반대 발이 앞에 착지한다. 이전 발은 −reach에서 떨어진다.

규칙:
- 지면에 닿은 발은 **매 프레임 정확히 "몸 이동량/프레임"만큼 뒤로** 이동한다 (아래 표의 px/frame). 수치는 게임 런타임의 보폭(`GAIT_STRIDE`)에서 계산하므로, 이 수치대로 그리면 게임에서 발이 미끄러지지 않는다.
- 들린 발(swing)은 앞으로 이동하며 지면에서 떨어진다.
- Run은 두 발이 모두 공중에 뜨는 flight 프레임이 있다.
- **Left/Right 행:** 표의 수치는 기준점 x=128에서의 가로 오프셋이다. Right 행은 +가 오른쪽, Left 행은 +가 왼쪽이다.
- **Down/Up 행:** 3/4 원근으로 앞뒤 이동이 화면 세로로 줄어든다(×0.42). Down 행은 +가 화면 아래(카메라 쪽)이고, Up 행은 +가 화면 위다. 발바닥 좌우 위치는 ±12px 정도로, 카메라를 볼 때 캐릭터의 왼발은 화면 오른쪽에 온다.
- 가이드 템플릿의 **초록 ● L/R** 표식이 각 프레임에서 착지한 발의 목표 위치다.
- 검수 도구가 자동으로 확인한다. 착지한 발이 기대 이동량의 ±35%(Down/Up은 원근 보정해서 더 넓게) 안에서 뒤로 움직인 전환이 75% 미만이면 **ERROR**다.

#### player_sneak.png — body 15.0 px/frame, cycle 90 px (24 world units), stance 50%
| Frame | Beat | Planted feet (px, + = forward) |
|---|---|---|
| 1 | Contact (L, low) | L +22, R -22 |
| 2 | Down | L +7 |
| 3 | Passing / Up (tiptoe) | L -7 |
| 4 | Opposite Contact (R, low) | L -22, R +22 |
| 5 | Down | R +7 |
| 6 | Passing / Up (tiptoe) | R -7 |

#### player_walk.png — body 18.7 px/frame, cycle 150 px (40 world units), stance 50%
| Frame | Beat | Planted feet (px, + = forward) |
|---|---|---|
| 1 | Contact (L) | L +37, R -37 |
| 2 | Down | L +19 |
| 3 | Passing | L +0 |
| 4 | Up | L -19 |
| 5 | Opposite Contact (R) | L -37, R +37 |
| 6 | Down | R +19 |
| 7 | Passing | R +0 |
| 8 | Up | R -19 |

#### player_run.png — body 24.3 px/frame, cycle 194 px (52 world units), stance 34%
| Frame | Beat | Planted feet (px, + = forward) |
|---|---|---|
| 1 | Contact (L) | L +33 |
| 2 | Down / push | L +9 |
| 3 | Passing (flight) | L -16 |
| 4 | Up (reach) | — (both feet airborne) |
| 5 | Opposite Contact (R) | R +33 |
| 6 | Down / push | R +9 |
| 7 | Passing (flight) | R -16 |
| 8 | Up (reach) | — (both feet airborne) |

#### guard_walk.png — body 18.6 px/frame, cycle 149 px (40 world units), stance 50%
| Frame | Beat | Planted feet (px, + = forward) |
|---|---|---|
| 1 | Contact (L) | L +37, R -37 |
| 2 | Down | L +19 |
| 3 | Passing | L +0 |
| 4 | Up | L -19 |
| 5 | Opposite Contact (R) | L -37, R +37 |
| 6 | Down | R +19 |
| 7 | Passing | R +0 |
| 8 | Up | R -19 |

#### guard_run.png — body 24.2 px/frame, cycle 193 px (52 world units), stance 34%
| Frame | Beat | Planted feet (px, + = forward) |
|---|---|---|
| 1 | Contact (L) | L +33 |
| 2 | Down / push | L +9 |
| 3 | Passing (flight) | L -15 |
| 4 | Up (reach) | — (both feet airborne) |
| 5 | Opposite Contact (R) | R +33 |
| 6 | Down / push | R +9 |
| 7 | Passing (flight) | R -15 |
| 8 | Up (reach) | — (both feet airborne) |

## 5. UI 아이콘 (`?` / `!`)

- 128 × 128 투명 PNG. 글리프는 가운데에 두고, 템플릿의 안쪽 박스(16px 여백) 안에 들어가야 한다
- `?`: 따뜻한 노랑, `!`: 강한 빨강
- 두 아이콘 모두 **어두운 외곽선**과 은은한 글로우를 넣는다. 글로우는 반투명이며 템플릿 박스 안에 들어가야 한다
- 원형 게이지(0~100%)는 게임이 그리므로 **넣지 않는다**

---

## 6. 납품 전 체크 (자동 + 수동)

```bash
cd mobile
npm run sprites:validate
```

자동 검사 항목:
- 파일 존재 여부, 정확한 시트 크기, 알파 채널, 투명 배경, 반투명 헤이즈(배경에 구운 글로우나 그림자)
- 빈 셀, 셀 가장자리 침범
- 발 위치 규칙, **Foot Planting (착지한 발이 매 프레임 뒤로 이동하는지)**, 좌우 흔들림, 기준점 중심 정렬
- Idle 높이 규격, 행 안에서 스케일이 튀는지, **Idle이 정지 이미지인지** (프레임이 모두 같으면 ERROR)
- 색 일관성 (모든 프레임의 색이 해당 캐릭터 Idle과 비슷한지), Guard가 Player보다 크고 넓고 푸른지
- **Identity (보조 검증):** 캐릭터마다 별도의 기준 이미지와 비교한다.
  - Player: `art/characters/reference/player_identity.png`. ASSETS `player_walk.png`의 각 행 4번 프레임을 잘라낸 것이다. 1·5번 프레임에는 W1 얼룩이 있다.
  - Guard: `guard_identity.png`. LEGACY `guard_directions.png`를 크기와 기준점만 맞춘 것이다.
  - 둘 다 `npm run sprites:identity`로 다시 만들 수 있다. 크롭과 정렬만 하고 그림은 바꾸지 않는다.
  - 비교 항목: 평균 팔레트, 실루엣 높이, 차지하는 폭과 면적, 주요 색 분포(16단계 히스토그램 겹침. 같은 캐릭터 91–100%, 다른 버전의 Agent Zero 73–82%, rig 44–54%로 실측해 85%를 경계로 잡음).
  - 모두 **WARN**이다. 팔레트가 크게 바뀐 경우(Δ>40)만 ERROR다. **자동 검사 통과는 디자인 승인이 아니다.** 외형은 사람이 검수한다
- 아이콘 크기, 중앙 정렬, 색상(노랑/빨강), 어두운 외곽선

ERROR가 하나라도 있으면 실패다. WARN은 사람이 확인한다.

수동 검수에는 `art/characters/preview/`에 생성되는 파일을 쓴다. **이 파일들은 게임 에셋이 아니다.**
- `player_preview.png`, `guard_preview.png`, `indicators_preview.png`: 한눈에 비교하는 보드
- `preview.html`: 브라우저로 열면 모든 행이 애니메이션으로 재생된다

수동 Quality Gate:
- [ ] Player가 실제로 걷는 것처럼 보이는가 (착지한 발이 뒤로 이동해 발이 미끄러지지 않는가, 팔·상체·백팩이 함께 움직이는가)
- [ ] Guard가 Player보다 무게감 있게 걷는가
- [ ] Run이 Walk를 빨리 재생한 것처럼 보이지 않는가
- [ ] Sneak가 Walk와 확실히 다른가
- [ ] Whistle에서 호루라기를 부는 동작이 읽히는가
- [ ] Search에서 주변을 찾는 동작이 읽히는가 (발과 방향은 고정)
- [ ] 모든 프레임이 같은 캐릭터인가
- [ ] Player가 ASSETS Agent Zero와 같은 외형인가 (헤어, 의상, 백팩, 비율, 머리 크기)
- [ ] Guard가 LEGACY Guard와 같은 외형인가 (모자와 배지, 선글라스, 제복, 체형)
- [ ] 움직임이 FALLBACK rig와 같은 역학인가 (§3-A 팔 스윙, 보폭, bounce, 기울기)

---

## 7. 도구

| 명령 | 역할 |
|---|---|
| `npm run sprites:templates` | 가이드 템플릿 재생성 (`art/characters/templates/`) |
| `npm run sprites:validate` | 납품물 검수 + 미리보기 생성. `-- --chars <dir> --ui <dir> --out <dir>`로 다른 폴더도 검사 가능 |
| `npm run sprites:selftest` | 검수 도구 자체 테스트 (정상 세트는 통과, 일부러 망가뜨린 세트는 적발되는지) |
| `npm run typecheck:tools` | 도구 타입 검사 |

게임 런타임 연결(`src/assets/manifest.ts`)은 검수를 통과한 뒤에 한다. 시트의 한 행이 한 방향의 클립이 되고, `StripDef`의 `y = 행 × 256`, `anchor = [0.5, 224/256]`로 매핑된다.
