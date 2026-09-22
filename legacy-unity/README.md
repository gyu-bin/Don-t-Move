# DON'T MOVE — Museum Stage 01

A Unity 6.3 LTS (6000.3.24f1) graybox prototype for portrait iOS and Android. Open this folder as a Unity project. On first import, `Stage01Builder` creates `Assets/Scenes/MuseumStage01.unity`, five graybox prefabs, and the build scene entry. Open that scene and press Play. The menu **Don't Move > Rebuild Museum Stage 01** recreates it.

## Editor controls

- WASD or arrows: move. Diagonals work.
- During FREEZE, the same keys simulate device motion. Hold Shift with a direction for a strong movement spike.
- F: force FREEZE; M: force MOVE; R: recalibrate.
- DBG: show the live sensor and tuning panel.

## Mobile controls

Hold the phone comfortably for the three second calibration. Tilt relative to that pose to move. When FREEZE starts, keep the current pose. The game measures rotation, orientation change, and acceleration against the calibrated hand tremor. Tilt sensitivity, dead zone, freeze threshold, detection multiplier, and phase lengths are adjustable in DBG.

The game uses Input System 1.16.0 with `AttitudeSensor`, `Gyroscope`, `Accelerometer`, `GravitySensor`, and `LinearAccelerationSensor`. Available sensors are enabled explicitly. When attitude is unavailable, gravity difference is used. The builder sets Active Input Handling to **Input System Package (New)** if Unity exposes that serialized setting; confirm it in **Project Settings > Player > Other Settings** before building.

## Building

Install Unity 6.3 LTS with Android and iOS Build Support modules. The menu **Don't Move > Build Android APK** creates an APK; **Don't Move > Export iOS Xcode Project** creates the iOS project. Connect a physical device to verify calibration, tilt axes, stability, performance, and portrait orientation. An iOS signing team must be selected in Xcode. All gameplay tuning is provisional until physical testing.

## Prototype scope and architecture

One museum is generated from basic geometry. Game logic is split by input, player, guard, camera, mission, detection, and UI. The scene owns placement and patrol routes; scripts do not depend on scene coordinates. This leaves room for another level definition later without building a general level framework now.

Unity 6.3 LTS (6000.3.24f1) is installed. The project compiles and its Stage 01 flow passed an automated Editor Play Mode smoke test. Android APK and unsigned iOS Xcode builds succeed. Physical sensor testing still requires a signed iPhone build and an unlocked device.

## Validation sequence

1. Open the generated scene. Check geometry, two guards, two covers, diamond, and exit.
2. Play in Editor. Check the three second calibration, WASD/diagonals, smooth camera, and collision.
3. Observe patrol, vision cone, wall/cover occlusion, MOVE → GET READY → FREEZE → MOVE, and the beep.
4. Hold a key during FREEZE while visible. Confirm detection increases; release it and confirm slow decay. Stand behind cover and confirm movement is allowed.
5. Take the diamond and reach the exit. Confirm the result metrics. Reach the exit without the diamond and confirm no completion. Use retry.
6. Build Android and iOS, then test on physical devices in upright, reclined, and lying positions. Tune sensor threshold and detection rates from measurements.
