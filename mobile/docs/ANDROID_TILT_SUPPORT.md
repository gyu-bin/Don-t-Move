# Android Tilt support — validation notes

Android uses Expo DeviceMotion's OS-fused rotation-vector attitude. It feeds the same quaternion-relative Neutral, radial dead zone, response curve and velocity controller as iOS. Android support is additive; Core Motion remains the iOS source. Physical Android direction/latency/comfort validation is pending.

## Source contract checked

Installed: Expo 57, `expo-sensors` ~57.0.3. [Versioned DeviceMotion documentation](https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/) specifies portrait device axes, degree-per-second rotation rates and m/s² acceleration. Subscription removal is explicit. Requested 60Hz is below Android's normal 200Hz limit.

The installed authoritative implementation is `node_modules/expo-sensors/android/src/main/java/expo/modules/sensors/modules/DeviceMotionModule.kt`:

- Availability requires gyroscope, accelerometer, linear acceleration, rotation vector and gravity sensors. A missing sensor must yield an explicit unavailable state rather than fabricated attitude.
- Native rotation comes from `SensorManager.getRotationMatrixFromVector`, then `getOrientation`. No app-side gyro integration.
- Native exported rotation is `{alpha: -azimuth, beta: -pitch, gamma: roll}` in radians. The corresponding active device-to-world quaternion is `qZ(alpha) × qX(beta) × qY(gamma)`.
- Source rotation time is `rotation.timestamp`, seconds since device boot. There is no trustworthy top-level sensor timestamp. Native dispatch can repeat cached readings; repeated timestamps must not be treated as fresh samples.
- Rotation rate exports degrees/sec (despite native gyro being rad/sec). Convert its magnitude to rad/sec for the shared calibration threshold. Linear acceleration exports m/s²; divide magnitude by 9.80665 for iOS-compatible g.
- Raw acceleration including gravity is unnecessary for direction. Android's module even transforms it using `accelerometer - 2 × gravity`; do not infer attitude directly from that field.

[Android SensorManager reference](https://developer.android.com/reference/android/hardware/SensorManager#getOrientation(float[],%20float[])) defines the orientation extraction. Quaternion reconstruction avoids Euler subtraction at yaw wrap. Screen-normal twist is removed by the existing relative controller. The app is portrait-locked; automatic screen-rotation gameplay is outside this pass.

## Existing gameplay tuning retained

Dead zone 2°, max tilt 16°, sensitivity 1, smoothing 0.06s. Stable distinct attitude samples for 0.5s establish Neutral. Shared calibration limits: angular-rate magnitude <0.12rad/s and linear acceleration <0.12g. Neutral remains fixed until explicit recenter/retry. Radial clamping prevents diagonal speed boosts. Player Run remains150; guard/gameplay/animation/audio tuning is not changed by Android sensor support.

## Device acceptance still required

Physical-device checks still pending:

1. Hold Neutral10s: no unintended movement.
2. Left/right sign and screen direction.
3. Forward/back sign and screen direction.
4. Diagonal direction and capped maximum speed.
5. Small tilt precision and Sneak.
6. Larger tilt Walk→Run and comfortable16° maximum.
7. Return to Neutral: immediate stop, no residual glide.
8. Seated/reclined/lying stable calibration.
9. Explicit recenter after posture change.
10. Yaw wrap and several-minute fixed-Neutral stability.
11. Background/foreground, unavailable sensors and Retry Tilt.
12. Actual event rate, frame budget and Android vendor/device variation.

Automated math/lifecycle tests cannot prove sensor-fusion quality or physical direction signs.

## Lifecycle and stream safety

Startup polls availability every150ms for up to3s. Tilt becomes active only after a complete valid sample; unsupported/stalled sources expose Touch fallback and Retry Tilt. Native duplicate timestamps do not reset freshness. A retained minimum sensor-to-wall-clock offset rejects queued samples older than200ms; source inactivity for1s releases the listener. The very first callback has no independent native/JS clock synchronization, so its absolute transport age cannot be proven; calibration still requires advancing samples.

Background removes the listener and cancels pending timers. Foreground resubscribes while preserving Neutral and the timestamp watermark. Stale availability promises and previous callbacks are generation-guarded. Explicit retry creates a fresh calibration session. A changed display orientation ends the source session and requires retry; it does not silently rotate Neutral. Portrait remapping includes natural-landscape device axes, but physical tablet validation is pending.

## Automated evidence

`npm run test:tilt`:35 PASS (existing iOS/shared tests plus Android adapter/session tests). Coverage includes independently reconstructed Android orientation matrices, upright/reclined/inverted Neutral, cardinal/diagonal direction, yaw wrap/twist, radial clamp, smoothing, recenter, gait thresholds, units, partial data, delayed availability, bounded unavailability, async cancellation, unsubscribe/resubscribe, duplicate/stale samples, and display orientation invalidation/remapping. App TypeScript and changed-test ESLint pass. Hook code review confirms iOS source effect retains its existing behavior and Android lifecycle callbacks clear velocity input without auto-recentering.

These are synthetic adapter/lifecycle and shared-engine tests. No Android APK launch, emulator Tilt, vendor sensor quality, physical direction, native audio or FPS verification is claimed.

Parent integration also completed a production Android Hermes bundle export (`Reports/AndroidTiltV1/android-export.log`, approximately4.3MB). This proves JS/assets bundling only; it is not an APK build or Android device launch.
