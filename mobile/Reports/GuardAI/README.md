# Guard AI / Global Alert V1 — 2026-09-24

## 결과

`mobile/`의 기존 시야·의심도를 유지하며 전체 경보, 시야로만 갱신되는 공유 LKP, CHASE / INVESTIGATE / 이동 SEARCH / RETURN, 전체 복귀 후 경보 해제, 몸 접촉 CAUGHT / Retry를 연결했다. 개발 Debug / 재현 UI는 Release에서 숨긴다.

20-unit 정적 격자에 경비 몸 반경을 반영한 A*와 경로 단순화를 사용한다. 이동 목표가 유의미하게 바뀔 때 최소 0.4초 간격으로 재탐색하며, CHASE↔INVESTIGATE 시야 깜박임도 이 제한을 우회하지 않는다. 맵 바깥/void와 벽/이동 차단 소품은 경로에 들어가지 않는다. 도달 불가 LKP는 같은 연결 영역의 가장 가까운 지점에서 수색한다.

## 이번 작업에서 변경한 파일

- `src/game/guards/guardSystem.ts` (신규): 다중 경비 조정, 공유 정보, 상태 이동, 접촉 판정.
- `src/game/world/navigation.ts` (신규): 정적 격자, 몸 반경 여유, 결정적 A*, 경로 단순화.
- `src/game/guards/guardBrain.ts`, `guardTuning.ts`, `src/game/core/types.ts`: 기존 발견 로직 연결, 상태/필드/속도/반경.
- `src/game/playground/playgroundState.ts`, `alertReplay.ts` (신규): 게임 루프와 실패 정지, 정상 이동 입력으로 실행하는 박물관 재현.
- `src/rendering/renderFrame.ts`, `effects/visionCone.ts`, `debug/guardDebug.ts`: 새 상태의 시야/표시와 목표 위치 Debug.
- `src/ui/VisualPlaygroundScreen.tsx`: 고정 시간 간격, CAUGHT/Retry, 상태 읽기, 개발용 재현 버튼.
- `src/game/guards/__tests__/globalAlert.test.ts` (신규): 추가 검증 14건.
- `src/game/__tests__/coreRules.test.ts`: 기존 테스트 유지; 구현된 항목의 PENDING 표기만 제거.
- `GAME_RULES.md`: 접촉 기준, 전체 복귀 조건, 구현 상태와 테스트 매핑 갱신.
- `package.json`, `package-lock.json`, `eslint.config.js` (신규): 새 테스트 명령 및 AGENTS.md에서 요구하는 Expo lint 실행 도구.
- 이 보고서와 Simulator 캡처 4장.

기존 사용자 변경은 보존했다. `legacy-unity/`, Tilt, Diamond/Exit, 게임 에셋, Sprite Validator는 수정하지 않았다. 커밋하지 않았다.

## 자동 검증

- `npm test`: **46 passed / 0 failed** (기존 32 + 신규 14).
- 남은 PENDING 2건은 이번 범위 밖의 Tilt 및 Diamond/Exit 미션이다.
- `npm run typecheck`: 통과.
- `eslint src --no-cache`: 오류 0, 기존 코드 패턴 경고 6 (값/타입 동일 이름 5건, 기존 테스트의 미사용 TILE 1건).
- `git diff --check`: 통과.

신규 검증은 4명 동시 반응, 일반 의심도 중단, 다른 경비가 목격한 위치의 공유, 숨은 위치 고정, CHASE/INVESTIGATE, 벽/엄폐 우회, 이동 수색, 즉시 재추격, 시차 복귀/경보 유지, 최종 해제/의심도 재개, 접촉 경계/벽 너머 접촉 금지, 실패 정지, 경로 재계산 제한, 시야 깜박임, 난이도 독립성, 숨은 상태에서 호루라기 완료, 도달 불가 목표, 경비 배열 순서와 실제 박물관 입력 경로를 포함한다.

## Simulator

iPhone 17 Pro / iOS 27.0의 설치된 개발 앱과 현재 Metro 코드를 사용했다. 네이티브 모듈 변경은 없으며 새 네이티브 빌드나 실제 iPhone 검증은 하지 않았다.

`REPLAY ALERT FLOW`는 정상 이동 목표만 입력한다. 경비 상태/시야/LKP/접촉 판정을 강제로 변경하지 않는다. ¼속도로 재생하고 화면과 상태 표시를 확인했다.

- PATROL → `?` → `!` / WHISTLE → GLOBAL ON (whistles 1).
- 못 보는 g1 INVESTIGATE / 보는 g2 CHASE, 이후 두 경비 추격. 일반 `?` 게이지 없음.
- 플레이어가 서쪽 벽을 돌아 도주, 경비가 벽을 우회해 LKP 조사 후 이동 SEARCH.
- g1 RETURN / g2 SEARCH 동안 GLOBAL ON 유지.
- 두 경비의 원래 순찰 경로 복귀 후 GLOBAL OFF / PATROL, whistles 1 유지.
- 이후 직접 터치 이동으로 다시 접근: 새 경보 발생 후 실제 접촉에서 CAUGHT.
- RETRY 클릭: CAUGHT 해제, GLOBAL OFF / whistles 0 / 두 경비 PATROL 확인.

초기 재현 UI에서 worklet 내부 지역 변수의 단계 변경이 다음 프레임으로 유지되지 않아 경로가 멈추는 문제를 Simulator에서 발견했다. 재현 단계를 공유 시뮬레이션 상태로 옮긴 뒤 전체 도주·수색·복귀가 완료됨을 다시 확인했다.

캡처:

- [전체 경보](01-global-alert.png)
- [수색 / 복귀 중 경보 유지](02-search-return.png)
- [전체 순찰 복귀 / 경보 해제](03-patrol-restored.png)
- [접촉 후 CAUGHT](04-caught.png)

## 남은 사항

- 접촉 반경(Player 9 / Guard 8 / tolerance 0.5), 추격 속도(116 units/s), 수색 시간(4초)은 플레이 감각에 따른 튜닝 초기값이다.
- 기존 Whistle은 동작·이벤트까지이며 음원 재생은 기존 코드에도 연결돼 있지 않다. 새 에셋은 추가하지 않았다.
- 기존 lint 경고 6건은 이번 범위 밖 코드 정리를 피하기 위해 유지했다.
