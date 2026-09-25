# Tilt Control V1 — 2026-09-24

Status: implemented and automatically tested; physical iPhone acceptance **not performed**. User explicitly deferred physical-device testing because no iPhone can be connected now. Do not treat this as final control-feel/drift acceptance.

## Input and neutral

- Local Expo module `modules/dont-move-attitude` uses Core Motion fused attitude at 60 Hz, preferring `xArbitraryCorrectedZVertical` with `xArbitraryZVertical` fallback. Apple's corrected frame uses a calibrated magnetometer when available to reduce accumulated yaw error, without choosing magnetic north as the reference. The selected frame is shown in the debug HUD. This OS fusion correction does not mutate game Neutral. No raw accelerometer direction or app-integrated gyro. Core Motion's reference-to-device matrix is transposed and converted to a canonical device-to-reference quaternion.
- Native gyro magnitude and user-acceleration magnitude are used **only** to reject unstable calibration samples.
- Relative quaternion is inverse(neutral) × current. Screen-normal swing gives relative pitch/roll, ignoring local screen-normal yaw/twist. This avoids subtracting absolute Euler angles around vertical/upside-down postures.
- Calibration requires 0.5 s of distinct continuous samples, within a 1° candidate cone, rotation <0.12 rad/s and user acceleration <0.12 g. Gaps >0.1 s restart the stable window. READY lasts 0.35 s; there is no fixed 3-second countdown.
- Neutral is immutable while playing. RECENTER stores a fresh current attitude, clears all filter/input/player velocity immediately and displays CENTER RESET for 0.45 s without pausing Guards. It is disabled during initial calibration and after CAUGHT. Stale or invalid samples cannot replace Neutral.
- Samples older than 0.2 s stop the player and pause simulation. Sample age is preserved across the native/JS bridge. Backgrounding stops sensor updates; returning waits for an **explicit RETRY SENSOR press** before starting a new reference and calibration. It never automatically replaces Neutral on resume. Brief inactive transitions (permission prompt / Control Center) pause input but preserve the existing native reference and Neutral.
- A missing native module/permission/sensor on iPhone blocks Tilt with an explicit error and retry; it does not silently activate Touch. Simulator uses Touch only. Non-iOS development retains Touch; this V1 native implementation targets iPhone.

## Tuning / motion

Defaults: dead zone 3°, max tilt 25°, sensitivity 1, smoothing 0.06 s. Development HUD exposes +/- controls for all four. Tuning is session-local, not persisted.

Radial dead zone → time-based exponential vector smoothing → piecewise nonlinear response. Speed anchors: 8° = 38, 15° = 72, 25° = 150 world units/s. Above max saturates. Both diagonal and axial input have the same cap. Inside dead zone the filter clears immediately.

Acceleration 320 units/s², deceleration 1400 units/s² (full-speed stop ~0.11 s). Collision-resolved distance/speed drives foot planting and continuous Guard movement risk. Player animation separately selects Sneak/Walk/Run from actual speed, so precision movement does not render Idle. Existing Touch/Demo motion and Guard perception/state code are unchanged.

## Changed files (this task only)

- `modules/dont-move-attitude/package.json`, `expo-module.config.json`, `ios/DontMoveAttitude.podspec`, `ios/DontMoveAttitudeModule.swift`
- `src/game/input/tilt.ts`, `tiltMovement.ts`, `useTiltControl.ts`, `__tests__/tilt.test.ts`
- `src/game/playground/playgroundState.ts`, `src/rendering/renderFrame.ts`, `src/ui/VisualPlaygroundScreen.tsx`
- `app.json` (motion permission), `package.json` (Tilt tests, native iOS build command)
- `src/game/__tests__/coreRules.test.ts` (only pending-item description), `GAME_RULES.md`, this report
- Generated ignored `ios/` was regenerated via Expo prebuild and pods installed to include the local module. Existing scene lifecycle config plugin remains applied. No hand edits to generated native sources, no changes to legacy-unity, Guard logic, assets, mission or audio.

## Checks

- `npm test`: existing 46 + Tilt 15 = **61 passing**; 2 pending markers remain (Mission, physical iPhone acceptance).
- `npm run typecheck`: pass.
- `npm run lint`: 0 errors; 6 pre-existing warnings.
- Simulator native Debug build: **BUILD SUCCEEDED**, Xcode 27 SDK, native module linked. Installed and launched on iPhone 17 Pro / iOS 27 Simulator. Touch RUN movement worked; no Tilt calibration overlay appeared on Simulator.
- Existing Simulator Guard replay: observed `GLOBAL ON · whistles 1`, SEARCH/INVESTIGATE, then PATROL/RETURN, then `GLOBAL OFF · whistles 1 / g1 PATROL · g2 PATROL`. This is a regression smoke test, not physical Tilt verification.
- iOS development JS bundle: generated successfully by Metro.
- iPhone ARM64 Debug build with `CODE_SIGNING_ALLOWED=NO`: **BUILD SUCCEEDED** using iPhoneOS 27 SDK, including the corrected reference-frame module. This is compile verification only, not installation/signing or physical-device testing.

Both builds used `xcodebuild -jobs 2` after stopping initial high-parallelism attempts to reduce host memory/load. Final logs are `/private/tmp/dontmove-tilt-build-final.log` and `/private/tmp/dontmove-tilt-device-build-limited.log`; final test output is `/private/tmp/dontmove-tilt-tests-final.log`. These temporary logs are not committed.

Tests cover stable/unstable/duplicate/gapped calibration, arbitrary neutral poses, quaternion sign and yaw, radial dead zone and diagonal cap, response anchors, frame-independent smoothing, five minutes of synthetic fixed-neutral input, recenter and stale/invalid samples, acceleration/stop, wall/slide actual speed, input exclusion and calibration pause.

## Build / physical follow-up

This local module is not included in Expo Go. From `mobile/`, run `npm run ios` for a development native build. After a clean checkout, Expo autolinking finds `modules/`; prebuild plus pod installation includes DontMoveAttitude and the motion permission. Physical-device build/signing requires an available phone and signing setup.

On iPhone, check all 12 user acceptance items: comfortable calibration; neutral stop; four directions and diagonal; sneak/walk/run bands; fast neutral stop; several-minute drift; recenter; changed-posture recenter; Guard suspicion relative to actual speed. Repeat seated, standing, reclined, lying down, and after background/foreground and permission denial/retry.

Remaining uncertainty: physical sensor axis/sign mapping, long-session heading drift (especially under the uncorrected fallback), magnetic environments vs fusion correction behavior, sensitivity/hand tremor and device-specific latency. Software-fixed Neutral alone does not prove zero sensor drift. No physical-device result is claimed.

References: [Expo SDK 57 DeviceMotion](https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/), [Expo local modules](https://docs.expo.dev/modules/get-started/), [Apple CMAttitude](https://developer.apple.com/documentation/coremotion/cmattitude).
