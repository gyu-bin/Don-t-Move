# 프로젝트 안정화 및 핵심 게임플레이 검증

검증일: 2026-10-23. 기준/작업 시작 HEAD: `6e867ba58948258cf1c1835f858088a7f4dd9b01`, `main`. 시작 작업 트리는 깨끗했다.

## 1. 작업 요약

런타임 밸런스와 45개 미션은 유지했다. 오래된 플랫폼 계약 테스트와 보호 해시를 실제 승인된 구현에 맞게 갱신했고, OTA의 의도적 지연 로딩에 제한적인 lint 예외를 설명했다. 실제 런타임 기반 540회 미션 시뮬레이션, 18회 횡단, 기준 커밋 대비 성능/상태 비교를 실행했다.

변경 파일:

- `src/ui/branding/introTimeline.test.ts`: iOS 무이미지/Android drawable 계약 분리, PNG 실체 검증 추가.
- `src/ota/applyUpdate.ts`: native module 확인 후 require하는 이유와 해당 한 줄 lint 예외. 실행 동작 동일.
- `docs/design/v12/phase4c/PROTECTED_HASHES.json`: 기존 성능 커밋의 CCTV 해시만 갱신.
- `docs/design/v12/phase4c/PROTECTED_HASH_MIGRATIONS.md`: 해시 변경의 provenance/검증/한계.
- `tools/performance/benchmarkSimulation.ts`: 별도 결과 파일 경로 지원, 이전 보고서 보호.
- `tools/performance/stabilityGameplay.ts`: 실제 runtime 기반 재현 및 메모리 전용 후보 실험 도구.
- 이 보고서 폴더의 증거 JSON, 상세 보고서, 검증 로그.

`legacy-unity/`, 캠페인, 세이브, 앱/상품 ID, 광고/IAP 동작, 오디오, package.json/lock은 변경하지 않았다. 커밋/Push/EAS 제출/OTA 배포/스토어 업로드 없음.

## 2. 해결한 문제

### Splash 테스트

원인: `app.json` 전체에 `splash-mark` 문자열이 없다는 오래된 검사가 Android Release drawable 구성까지 잘못 거부했다. iOS/shared splash 이미지 금지를 유지하고 Android의 PNG/크기/contain 계약을 검사하도록 변경했다. Branding 수정 전 48 PASS/1 FAIL, 수정 후 50 PASS.

### OTA lint

`expo-updates`는 지원하지 않는 빌드에서도 정적 import 시 평가될 수 있다. native 존재 확인 뒤 지연 require하는 의도를 유지했다. 해당 줄만 명시적으로 예외 처리하여 warning을 제거했으며, OTA 로직은 바꾸지 않았다.

### CCTV 보호 해시 2건

전체 테스트에서 v124c/v124d scope가 과거 CCTV 소스 해시를 기대했다. 이전 해시는 `6e867ba^`와 정확히 일치하고, 현재 성능 커밋은 이동 중 geometry cache 사용 여부만 지정했다. 행동 테스트 및 baseline 동치 결과 확인 후 이 한 항목만 마이그레이션했다. 다른 6개 해시와 검사 루프 유지. 27 PASS/2 FAIL → 29 PASS. 자세한 이력은 [마이그레이션 기록](../../design/v12/phase4c/PROTECTED_HASH_MIGRATIONS.md).

### 의존성/환경

- Node v24.18.0, npm 12.0.2; Expo 57.0.27 / React Native 0.86.3 / React 19.2.3.
- Reanimated 4.5.1 / Worklets 0.10.1 / Skia 2.6.2: 설치된 Expo SDK 매핑과 일치.
- package.json과 lock root deps/devDeps 일치, npm ls 정상. 과거 미설치 의존성에 따른 TS 실패는 재현되지 않았다.
- 공식 registry에서 `babel-preset-expo@57.0.12` 조회 및 실제 tarball 다운로드 성공. 과거 ETARGET 재현 안 됨. 패키지 버전 임의 변경 없음.
- 온라인 Expo check는 일부 SDK 57 patch 업데이트를 권고(Expo ~57.0.31 등). 현재 major 호환 불일치로 단정하지 않았으며 이번 안정화에 무관한 일괄 업데이트는 하지 않았다.
- TypeScript strict Expo base, Babel Expo preset/Reanimated plugin, Metro Expo 기본 구성 유지.
- Xcode 27.1(27A9275), Android SDK 설치됨. 시스템 java_home 등록은 없으나 Android Studio 내장 JDK로 로컬 Gradle 실행 가능.
- iOS 원래 경로의 작은따옴표(`Don't Move`)가 Expo autolinking Ruby→Node 문자열을 깨뜨려 pod install 실패. 동일 소스를 작은따옴표 없는 `/private/tmp/dm-stability-ios`로 물리 복사하자 pod install 성공. vendor/생성 native 파일을 억지 수정하지 않았다. 원래 경로 문제는 남아 있으므로 네이티브 빌드는 안전한 경로를 사용해야 한다.

공식 확인: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo 문서 인덱스](https://docs.expo.dev/llms.txt). 실제 registry 증거는 `npm-pack.json`.

## 3. 테스트 결과

실제 디바이스 화면/손목 조작 검증과 Node 테스트는 구별한다.

- `npm test`: **exit 0 / 자동 검사 1,206 PASS, 0 FAIL**(Node test 1,158 + 자체 harness 48). 기존 physical Tilt acceptance 1건은 **PENDING**. 경비/틸트/캠페인614/광고/IAP/오디오 상태/OTA/Worklet/문/성능 포함.
- `npm run typecheck`(앱+campaign), `typecheck:performance`: **PASS**.
- `npm run lint`: **PASS, 0 errors / 0 warnings**. 신규 도구 별도 ESLint 및 `git diff --check`도 PASS.

- 캠페인 스냅샷: **45/45 SAME**.
- 캠페인 audit: **45/45 clean**, 단 기존 알려진 05-02-g4 순찰 충돌 접촉 1건은 유지(3.94,16.06, t=26.3s). 이를 새로 해결했다고 주장하지 않는다.
- 안정성 별도 suite: **38/38 PASS**.
- 성능 테스트 8, serialized Worklet 9, CCTV/door 18: **PASS**.
- iOS production Hermes export: **PASS**.
- Android `:app:assembleRelease :app:bundleRelease`: **PASS**, 20m34s / 1,008 tasks. 실제 APK/AAB 생성. 로컬 빌드 성공이며 스토어 서명·업로드 검증을 뜻하지 않는다.
- iOS `Release / iphonesimulator / CODE_SIGNING_ALLOWED=NO`: **BUILD SUCCEEDED**. 작은따옴표 없는 임시 복사본에서 arm64/x86_64 Simulator 앱 생성. 실기기 서명 빌드는 미실행.
- 네이티브 빌드의 vendor deprecated API 및 output 미지정 script phase 경고는 남아 있으나 빌드 오류는 없었다. lint 0 경고는 앱 ESLint 결과이며 native 경고 0이라는 뜻이 아니다.

빌드 산출물(로컬, Git 미포함):

- Android: `mobile/android/app/build/outputs/apk/release/app-release.apk`, `mobile/android/app/build/outputs/bundle/release/app-release.aab`
- iOS: `/private/tmp/dm-stability-ios-derived/Build/Products/Release-iphonesimulator/DontMove.app`
- 상세 빌드 로그: 이 폴더의 `android-build.log.gz`, `ios-build.log.gz`. 원래 경로 실패와 안전한 경로 성공은 `ios-pods.log.gz`, `ios-safe-pods.log.gz`.

- 실제 iOS/Android 플레이, GPU/FPS/발열, IAP 실결제/복원, 광고 실노출, OTA 실제 배포: **미실행**. 본 작업의 자동 회귀 테스트가 이들을 대체하지 않는다.

## 4. 게임플레이 진단

[상세 진단](GAMEPLAY.md), [실측 데이터](gameplay.json), [성능 보고서](performance.md).

| Mission | 경비/CCTV | 고정 경로 완주 Sneak/Walk/Run (각12회) | 관찰봇(24회) | 진단 |
|---|---:|---|---:|---|
|01-02|2/0|4/0/2|18|관찰 성공과 빠른 무발각 완주 모두 존재. 학습 구간 탈출 긴장감은 실제 플레이 판단 필요.|
|05-03|4/2|1/1/2|0|획득 뒤 g2 발각/g3 체포 사례. 다른 경로 완주 존재하므로 불가능 맵이 아님.|
|08-03|5/3|0/0/3|0|Run 14.5초 무발각 완주 증거. 빠른 우회가 유리한 밸런스 위험.|

현재 Sneak/Walk/Run 속도38/72/150, 탐지배율.35/.8/1.6. 실제 60Hz 동일24unit 횡단에서 의심도15.5102/18.7107/17.9618%. **Run이 Walk보다 4% 덜 누적**하는 위험 역전이 재현됐다. 코드 규칙 위반 버그로 분류하지 않았다.

랜덤 호출이 없는 고정 경로/출발 위상으로 비교하고 결정성 assertion을 실행했다. 고정경로 탈출은 모두 Run이다. 자동봇 실패율은 인간 성공률이 아니다. Search→Return 생존, 국소적으로 불공정한 모든 상황, 실패 원인의 UI 전달은 미검증이다.

## 5. 권장 밸런스 개선안

| 우선순위 | 현재→후보 | 근거/실험 | 위험/확인 사항 |
|---|---|---|---|
|P1|Run factor1.6→1.8|동일거리 Walk 대비 −4%→+8%; Run 완주2/2/3→1/1/2|중간 위험. 보물 획득 후 도주 및 중간 gait까지 어려워짐. 실기기 A/B 우선.|
|P2|Run factor1.6→2.0|Walk 대비+20%; Run 완주1/1/2|높은 위험.1.8보다 강하게 할 근거 부족, 비교 상한으로만 사용.|
|P2|CCTV 배치/타이밍 관찰|05-03 Walk 경보2회/Run0회,08-03 카메라 미노출 우회 있음|수치/위치 변경 미실험. 의도한 안전 경로일 수 있어 자동 수정 금지.|

후보는 Node 메모리에서만 적용 후 finally 복구했고 캠페인 불변을 확인했다. 1.8에서08-03 관찰봇 완주가0→2로 증가했다. 탐지가 빨라지면 경비 반응 위상도 달라지므로 전체 난이도는 단조 증가하지 않는다. 이번에는 프로덕션 변경하지 않았다.

## 6. 남은 문제

- 원래 작은따옴표 포함 경로의 iOS pod install 문제; 안전한 경로에서의 빌드가 대안.
- 기존05-02-g4 접촉 audit finding. 이번 범위에서 경로/난이도 임의 변경 없음.
- 실제 Tilt는 최신 max8°, deadzone1.75°, smoothing.07s. 과거10° 설명과 구별 필요.
- Native Skia/JSI 화면·프레임·실기기 손맛 검증은 남아 있다. CPU 벤치마크를 기기 FPS로 해석하지 않는다.
- 온라인 Expo patch 권고는 별도 의존성 업데이트에서 검토할 사항.

## 7. 다음 개발 권장사항

1. 같은 감도/기기에서01-02 Walk 대 Run,05-03 목표 직후 탈출,08-03 빠른 우회와 관찰 접근을 직접 비교한다.
2. 실패 원인 이해도·획득시간·첫 LOS break·체포 원인·대기시간을 기록한다.
3. 승인된 별도 테스트 구성에서만 Run factor1.8과 현재값 A/B.2.0은 보조 비교.
4. 실기기90/120Hz, 문 개폐, CCTV 이동/정지, CAUGHT/Complete/Pause, background/foreground를 성능 측정과 함께 확인한다.
5. 근거가 모인 뒤만 프로덕션 밸런스와 개별 경로 수정을 진행한다.
