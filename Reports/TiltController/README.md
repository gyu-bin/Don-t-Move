# Tilt controller candidate — device feel validation pending

## Scope
Only SensorManager, PlayerController, the sensor-to-detection handoff in GameStateController and the existing DebugPanel were changed. Stage 01, Guard AI/Vision, Cover, DetectionSystem gain rules, MissionController, triggers, camera and assets were not changed. PrototypeBuild has a separate iOS-Tilt output method to preserve the previous iOS export.

## Pipeline
Raw Input System samples (requested 60 Hz) → quaternion relative to the 3-second averaged calibration pose → angle low-pass filter → adaptive radial dead zone → continuous remap and sensitivity → configurable AnimationCurve → target velocity → acceleration/braking → CharacterController.Move with wall-plane velocity projection → actual world velocity and stable facing.

Calibration records averaged orientation, raw acceleration/gyro baselines, variance and tremor. Quaternion angle differences use atan2 to preserve tiny rotations. Sensor pose-rate uses sensor timestamps, independently of rendering and score queries. Gyro/linear acceleration bias and calibrated noise are removed from device-motion evidence. The accelerometer-only fallback cannot resolve all axes in all postures; iPhone attitude sensing is the primary path.

FREEZE captures the current pose independently of guard visibility. A still device requests a stop; velocity decelerates normally, not a phase-triggered hard zero. Braking inertia is excluded from Detection's world-speed contribution when device motion is under its existing dead zone. When device motion exceeds the dead zone, the speed contribution is capped by the current freeze-relative input target, so small new hand motion cannot inherit previous fast braking speed. Actual device movement continues to drive Detection, including when blocked by a wall. A changed pose does not produce endless detection once the hand becomes still.

## Default candidate (not device-tuned final values)
Sensitivity 1; dead zone 1 degree (effective floor may rise with calibrated variance); max tilt 18.75 degrees; smoothing 0.10 s, neutral-release ratio 0.25; max speed 5.2 m/s; acceleration 15 m/s²; deceleration 28 m/s²; stop threshold 0.035 m/s; rotation 540 deg/s with 4-degree dead zone. Existing freeze threshold 3.5 deg/s and detection multiplier 1 are retained.

Curve input/output: 0/0, 0.15/0.075, 0.30/0.25, 0.50/0.50, 0.70/0.75, 1/1. Runtime response shape defaults to 2.2. The legacy minSpeed field (0.55) now marks the Sneak state ceiling; it never forces a nonzero minimum velocity. Idle/Sneak/Walk/Run are exposed from actual speed.

DBG provides live pipeline values, variance, target/actual speed, velocity, facing, device motion, reference delta and detection gain. PRECISE/BALANCED/FAST are development candidates. Changes are immediate but currently reset on Retry/app restart. Keyboard: WASD/arrows, Ctrl precision, default normal, Shift fast.

## Editor evidence
See EditorVerification.txt and Stage01Regression.txt. Four neutral orientations, 3-second noisy calibration and 10-second stationary replay each; continuous/radial/diagonal mapping; sensitivity endpoints; 30/60/120fps braking; Stage 01 wall sliding; partition/statue circuit repeated three times; FREEZE reference/inertia fairness; existing patrol/vision/cover/diamond/exit/success/failure/retry flow passed. These are automated checks, not human device-play validation.

## Physical iPhone acceptance checklist
A. Hold comfortably for 10 s: actual speed exactly 0.
B. Micro tilt: slow continuous motion, no jump at dead-zone edge.
C. Comfortable large tilt: reaches max speed without extreme wrist angle.
D. Fast → neutral: accurate stop, no lingering crawl.
E/F. Repeat narrow corners, statue route and diagonal wall slide.
G. Sudden FREEZE: hold its starting pose; no penalty from character braking; returning to neutral while visible is real motion.
H. Recalibrate sitting, standing, reclining and lying down; repeat A–G and verify portrait directions.

No final feel, FPS or best sensor values are claimed without physical testing. If CalibrationUnstable is shown, hold still and recalibrate. No new haptics were added.

## iPhone delivery
Final signed Release build succeeded and was installed on the paired iPhone 14 Pro. Remote launch was denied because the device was locked. Unlock and open DONTMOVE to perform A–H. Device feel and FPS remain unverified; this is a tuning candidate, not final acceptance. See IosBuild.txt.
