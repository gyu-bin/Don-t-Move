# V11 Phase A — 검증 기록

검증 날짜: 2026-10-03. 상태: **설계 완전성 PASS / 런타임 재구성 미착수**.

## 설계 범위 검사

상세 두 문서의 각 미션 블록에서 필드를 독립적으로 추출하고 expected IDs와 비교했다. 기존 V11 설계의 내용 색인은 `BLUEPRINT_INDEX.json`, 검사 결과는 `VALIDATION.json`이다. 파서의 필드 개수 검사는 경로가 안전하다는 판정이 아니다.

| 검사 | 결과 |
|---|---|
| 고유 ID 범위 |01-01부터09-10까지90개, 누락0, 중복0, 예상 외ID0 |
| Chapter당 설계 수 |9개 Chapter 모두10개 |
| 요구19필드 |90×19=1,710개 모두 값 존재 |
| 보충 Main mechanic |90개 모두 값 존재 |
| 현재60개 title 대조 | 실제 JSON title60개 보존; 이후 챕터 catalog 별칭은 별도 표 |
| 신규 설계 |04–09 각각06–10, 합계30개. Runtime ID 추가하지 않음 |
| Safe / Risk 서술 |각 블록에 다른 경로·관찰 선택 명시. 물리/보안 안전 인증은 아직 아님 |
| 현재 Ch1–3 분류 |KEEP13 / TUNE12 / PARTIAL5 / FULL0 |
| Finale 역할 |9개의10번 모두 해당 Chapter Tier; summary와연출, stat보너스 아님 |
| 난이도 점수 |미검증 단일 pressure 중심값 제거; 독립 coverage/경로/수색/회복 지표 유지 |

## 원본 불변 검사

`RUNTIME_BASELINE.json`은 Phase A 시작 시점의 **작업 트리** 기준이다. 기존 미커밋 V10/V10.1과 경고 배너 수정도 포함한다. HEAD와의 차이가0이라는 뜻이 아니다.

- `src` / `assets` / `plugins` / 앱 진입·설정 등540개 파일의 원본 byte SHA-256과 마지막 파일 SHA 비교: **차이0**.
- 현재60개 미션 정의의 의미 SHA 비교: **차이0**.
- campaignStages.json byte SHA: `8cb031c5f82c1f5802157966c12d8c7ef4ed3f83a5342d6d9d7ecbaa20ac6ab0` 유지.
- 의미SHA 방법: Python `json.dumps(definition, sort_keys=True, ensure_ascii=True, separators=(',', ':'))`의 UTF-8 바이트를SHA-256, newline 없음. 원본byte 비교는fileSHA가정본이다.
- Phase A에서 맵/보안AI/속도/CCTV detector/UI/Audio/Tilt/에셋을 편집하지 않았다. `legacy-unity/` 편집도 없다.

## 현재 코드 검증

| 명령 | 결과 | 범위 |
|---|---|---|
| `npm run typecheck` |PASS|기존앱 TypeScript, 이번단계 코드변경없음 |
| `npm run lint` |0 errors / 기존2 warnings|src/ota/applyUpdate.ts의 require-style 경고2개 유지 |
| `node --import tsx --test tools/campaign/chapterDifficulty.test.ts` |5 PASS /0 FAIL|프로필·명시적tuning·noordinalbudget·이상치·역전/누락evidence거부 계약 |
| 독립 문서·소스 검토 |완료, 구현전 조건부검토|REVIEW.md; actualplay 승인아님 |

## 검토 중 수정한 설계 오류

1. 03-10 Safe Route 설명에 남아 있던 과거 Cash Processing 우회 내용을 현재 북측 Vault Antechamber route로 수정했다. 실제 맵은 바꾸지 않았다.
2. 통로 여유값은 기존 V5 technical gate인 radius18world /TILE40과 일치하도록0.90tile 필요조건으로 기록했다. 기술적 폭을 Tilt 편안함과 동일시하지 않는다.
3. 이후 챕터의 임의 상대압력 중심 숫자1.65–3.40를 제거했다. 목표표 숫자만으로Ch1<…<Ch9를달성했다고 판단하지 않는다.
4. 공통 Escape Timer에는 chapter1 HUD gate와 Museum4개미션만의 timer 데이터라는 두 원인을 구분해 적었다. 수정했다고 보고하지 않는다.
5. 30기존map명/30catalog별칭, 기존60/신규30/미구현상태를 구분했다.

## 아직 통과하지 않은 것

- Phase B 맵 재구성과 공통 HUD/타이머 수정.
- 새로운 geometry의FakeGap0/nav/초급Tilt여유폭/모든공격자의첫LOSbreak.
- 새 budget의실측chapter압력순서/내부flatness.
- 새 runtime의Simulator full-heist CLEAR, 실기기Tilt/손맛/FPS.
- 미래Chapter6–9 독립asset kit.

기존V10.1의0nativeCLEAR와Museum/Gallery역전은미해결근거로보존하며이PhaseA로PASS가되었다고바꾸지않는다. 이번검증은90개설계검토본의완전성과기존게임미변경에대한것이다.

**CAMPAIGN LEVEL DESIGN V11 — 90 MISSION BLUEPRINT READY FOR REVIEW**
