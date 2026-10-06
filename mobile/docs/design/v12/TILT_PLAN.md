# V12 — Tilt feel candidate plan

## Actual implementation

- `src/game/input/tilt.ts:11`: default Dead Zone **2°**, Max Tilt **16°**, Sensitivity **1**, Smoothing **0.06 seconds**.
- `useTiltControl.ts` initializes a shared tuning value from these defaults. No persisted tuning override or live A/B/C selector was found in this path. The previous physical QA confirms actual iOS Tilt input, but its observer does not record tuning values, so the source defaults are not a fresh measured hardware calibration result.
- iOS reads the existing fused-attitude native module; Android retains its existing DeviceMotion adapter. Relative quaternion tilt, fixed neutral, radial dead zone, diagonal clamp, manual recenter and sensor freshness checks remain.
- `response()` applies a continuous nonlinear speed curve **after** smoothing the dead-zone-remapped input. Current curve endpoints: 38 units/s at 5.18°, 72 at 9.64°, maximum 150 at 16° (steady state, sensitivity 1, unobstructed).
- `tiltMovement.ts`: actual collision-resolved movement determines speed and locomotion; acceleration 320, deceleration 1400 units/s², maximum 150 units/s. These constants are protected. Sprite hysteresis switches later than the mathematical 38/72 endpoints; near a boundary visible animation must be checked separately.
- Within the dead zone the input is immediately zeroed, followed by the existing fast movement deceleration. No adaptive neutral is introduced.

## Candidates for physical comparison — not yet implemented or selected

| Preset | Dead Zone | Max Tilt | Smoothing | Sensitivity | Existing curve 38 / 72 endpoints |
|---|---:|---:|---:|---:|---|
| A | 2.0° | 12° | 0.07 s | 1 | 4.27° / 7.45° |
| B | 1.75° | 10° | 0.07 s | 1 | 3.63° / 6.25° |
| C | 1.5° | 9° | 0.07 s | 1 | 3.20° / 5.59° |

The request's B bands 1.75–4° Sneak, 4–7° Walk, 7–10° Run are **not** produced exactly by changing only Max Tilt/Dead Zone. First compare the existing nonlinear curve with A/B/C so the effect of wrist range is isolated. If B is preferred but the Walk/Run boundary arrives too early, explicitly adjust curve knots to 4°/7° in the next input-only step; do not silently change player maximum speed or animation thresholds.

## Physical test protocol

Use the authorized iPhone 14 Pro, actual Tilt, fixed neutral, the same unobstructed lane plus a wide corner/wall. Change one preset at a time through a development-only selector in the next phase; expose the active values and log them. No virtual sensor, neutral drift, speed multiplier, guard or map adjustment during comparison.

For each A/B/C: calibrate comfortably, hold still for 10 seconds; test slow Sneak and stopping, cardinal and diagonal movement, medium-angle Walk, comfortable Run, return to neutral, wall slide and corner precision; recenter in a changed posture; play for 2 minutes and report wrist effort and involuntary movement. Record actual angle/input/current speed, calibration source, sample freshness and timing stalls. Distinguish input response from render stalls. Compare seated and lying posture for the preferred preset. Record animation changes and speed rather than claiming exact bands from intended angles.

Select by stable Idle, controllable Sneak, accurate stopping, comfortable Run and corner precision, **not** fastest completion. B is a starting hypothesis, not an approved sensitivity. User subjective feedback is required to assess wrist fatigue; an agent cannot physically tilt a phone.

## Existing physical evidence carried forward

01-08: calibration and Tilt confirmed normal; human reports excessive objective pressure and hitching. Observer callback gaps reached 444.18 ms near pickup and 598.16 ms near first Spotted. These are callback timings, not measured GPU FPS; cause remains unestablished. Do not mask stutters by sensitivity changes. Resolve/measure this performance concern before judging the final difficulty against a new input curve.

## Phase boundary

This Phase 1 changes documents only. No tuning defaults, selector, sensor API, player speed or map changed. After blueprint review: implement isolated preset selection, run A/B/C on the physical iPhone, record selection; only then rebuild Chapter 1–3, then Chapter 4–9. Existing 28-second confirmed-Theft timer, LKP, CCTV timing, chase speed, collision, Android support, audio, startup and monetization are protected.
