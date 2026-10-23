# 성능 회귀 검증 — 2026-10-23

기준: `6e867ba58948258cf1c1835f858088a7f4dd9b01`. 런타임 성능 코드 및 캠페인 데이터는 기준과 동일하며, 이번 작업에서 성능/물리/탐지/난이도 수치를 변경하지 않았다.

## 검토 결론

검토 범위에서 명확한 회귀 결함을 발견하지 않았다. Guard polygon cache는 위치, 각도, 거리, 시야폭, blocker 전체 좌표를 비교한다. 동일 배열 내부의 문 geometry 변화와 배열 길이 변화도 무효화한다. Polygon 재사용 중에도 현재 Player visibility/suspicion은 매 tick 계산한다. Broad phase는 거리 밖 blocker만 ray cast에서 제외하고 원래 corner ray 및 full direct LOS를 유지한다.

CCTV는 이동 중 cache snapshot을 생략하지만 매 tick fan을 다시 만든다. 정지/endpoint pause에서만 재사용하고 이동 중 stale snapshot을 reusable=false로 표시한다. 기존 고정 seed broad-phase 테스트와 cache→moving→waiting 전환 테스트를 실행했다.

실제 `useFrameCallback` 코드를 추출한 테스트에서 30/60/90/120Hz의 기존 60Hz simulation budget, 빈 simulation frame에서 상태 modify 생략, Tilt callback cadence 유지, CAUGHT/Complete/Pause/Ad covered에서 simulation 중단을 확인했다. 30Hz보다 낮은 프레임에서 기존 50ms dt clamp가 유지되므로 벽시계와 완전히 동일한 simulation 시간을 보장한다는 뜻은 아니다.

## 실제 실행 결과

- `npm run test:performance`: **8 PASS** (vision 5, frame scheduling 3)
- serialized Expo Worklet closure 테스트: **9 PASS** (vision cache/door 및 chase/fallback 포함)
- CCTV + physical door integration: **18 PASS**
- `npm run typecheck:performance`: **PASS**
- vision benchmark: 3 mission × 3 modes, 12,000 queries, 7 interleaved rounds; geometry identical.
- security benchmark: 3 mission × 3 phases, 각 120 simulated seconds × 5 interleaved rounds; 9/9 state digest 동일.

## 기준 대비 CPU 측정

단위는 120초를 가속 재생한 security simulation의 총 desktop Node CPU ms이다. 디바이스 프레임 시간이 아니다.

| Mission | Phase | 기준 ms | 현재 ms | 차이 | State |
|---|---|---:|---:|---:|---|
| 01-02 | patrol | 18.14 | 17.95 | -1.07% | 동일 |
| 01-02 | theft | 30.91 | 30.88 | -0.08% | 동일 |
| 01-02 | alert | 23.53 | 24.36 | +3.52% | 동일 |
| 05-03 | patrol | 70.97 | 71.49 | +0.73% | 동일 |
| 05-03 | theft | 101.93 | 101.67 | -0.25% | 동일 |
| 05-03 | alert | 106.17 | 107.00 | +0.78% | 동일 |
| 08-03 | patrol | 88.41 | 88.69 | +0.31% | 동일 |
| 08-03 | theft | 124.02 | 121.98 | -1.64% | 동일 |
| 08-03 | alert | 106.63 | 107.70 | +1.00% | 동일 |

현재 vision 소스가 기준과 동일하므로 차이를 성능 개선/회귀로 해석하지 않는다. Security 측정 변동은 −1.64%~+3.52%이다. Vision microbenchmark의 01-02 stationary −42.75%(1.46→0.84ms)도 동일 소스 실행의 JIT/짧은 측정 잡음으로 해석해야 한다.

이 도구는 전체 과거 앱을 실행하지 않고 현재 map/simulation/dependencies에 기준 vision kernel만 교체한다. 다른 security/runtime source도 기준과 byte-level 동일함을 별도 git diff로 확인했다. Security snapshots는 매 10 simulated seconds에 비교하며 cache 저장공간을 제외한다. 모든 tick의 full gameplay 동치 증명 또는 사람의 재미 검증은 아니다.

## 변경 파일

`tools/performance/benchmarkSimulation.ts`: 선택 출력경로 CLI 인수 추가. 기존 기본 경로는 유지한다. 과거 performance 보고서를 덮어쓰지 않고 날짜별 결과를 남기기 위한 도구 수정만 했다.

## 재현

```sh
npm run test:performance
node --test src/game/guards/__tests__/workletChase.test.cjs
node --import tsx --test src/game/security/__tests__/cctv.test.ts src/game/doors/__tests__/doorIntegration.test.ts
npm run typecheck:performance
npm run perf:vision -- 6e867ba58948258cf1c1835f858088a7f4dd9b01 docs/reports/stability-2026-10-23/vision-benchmark.json
npm run perf:security -- 6e867ba58948258cf1c1835f858088a7f4dd9b01 docs/reports/stability-2026-10-23/simulation-benchmark.json
```

## 한계 / 미실행

실제 iPhone/Android에서 Skia GPU 안정성, 네이티브 Hermes UI-thread 실행, 90/120Hz 기기 FPS, 전력/발열은 **PENDING**. Serialized closure 테스트는 undefined closure 및 JS 실행 호환성을 검증하지만 native scheduling·JSI·Skia까지 실행하지 않는다. 이번 결과만으로 디바이스 성능 또는 출시 준비 완료를 선언하지 않는다.
