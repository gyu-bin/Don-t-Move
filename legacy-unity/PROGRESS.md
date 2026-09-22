# Stage 01 implementation status — 2026-09-19

## 2026-09-20 verified build and play update

- Unity Editor **6000.3.24f1** imported the existing project. Unity C# compile errors: **0**; C# warnings: **0**.
- `Stage01Builder.Build` generated `Assets/Scenes/MuseumStage01.unity` and the Player, Guard, Cover, Diamond, and Exit prefabs. Script reference scan found **0** missing scene/prefab GUIDs after the trigger fix.
- Automated **Editor Play Mode** smoke test passed: keyboard movement, guard patrol, camera follow, MOVE → GET READY → FREEZE, wall and cover occlusion, visible movement detection, covered movement permission, diamond trigger, exit and grade, Retry, and DETECTED. The final log is `/private/tmp/dontmove-play-smoke-final2.log`. Visual appearance was not inspected on screen.
- `ObjectiveTrigger` was moved to its own C# file after Unity reported two missing scripts on the Diamond and Exit. The scene was rebuilt. `Gyroscope` was explicitly bound to the Input System type.
- Unity iOS export succeeded at `Builds/iOS`; an **unsigned** Xcode iOS device build succeeded. Signed build is blocked because Xcode reports `No Account for Team "SKJ8552QXC"` and no provisioning profile for `com.dontmove.prototype`. Direct iPhone destination build also reports that the iPhone must be unlocked for development services.
- Unity Android APK build succeeded at `Builds/Android/DontMove.apk`. No Android device was attached for installation.
- Physical iPhone sensor tests, calibration poses, FPS measurements, and tuned values remain **unverified**. Current code defaults remain provisional.

## 2026-09-20 execution update

- Unity Hub 3.21.3 and Unity Editor 6000.3.24f1 (Apple silicon) are installed. Android Build Support with SDK, NDK, and OpenJDK and iOS Build Support directories are present.
- The existing project version was aligned with 6000.3.24f1. No new project was created.
- First batch Editor launch returned exit code 198 before importing packages. The log says `No valid Unity Editor license found. Please activate your license.` Unity Hub is open for user sign-in and license activation.
- Compile errors, warnings, scene generation, Play mode, builds, and sensors remain unverified until the license is active.
- A C# ambiguity between `UnityEngine.Gyroscope` and `UnityEngine.InputSystem.Gyroscope` was resolved with an explicit Input System alias. FPS was added to the existing debug panel.
- A static route check confirms both start → diamond and diamond → exit are connected. A paired physical iPhone 14 Pro and one Apple Development signing identity were detected; no Android device is attached.

Unity 6.3 LTS was selected because Unity identifies it as the current LTS. Input System 1.16.0 matches the package update in the Unity 6.3 release notes. The local machine has Xcode 27.0 but no Unity Editor, Android SDK, or C# compiler.

| Step | Implementation and files | Status / verification | Next check |
|---|---|---|---|
| 1. Project | `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`, builder settings | Files created; Unity import unavailable | Open in Unity 6.3 and check package resolution |
| 2. Graybox map | `Stage01Builder.cs`: museum floor, corridors, turns, branch, walls, two covers, two guards, diamond, exit, five prefabs | Generator written; scene generation unavailable | Inspect generated scene |
| 3. Desktop movement | `SensorManager.cs`, `PlayerController.cs`: WASD, arrows, diagonals, variable speed, collision | Source checked; Play mode unavailable | Move through every route |
| 4. Camera | `CameraController.cs`: orthographic smooth follow, partial map | Source checked; Play mode unavailable | Inspect portrait framing |
| 5. Mobile sensors | `SensorManager.cs`: Input System accelerometer, gyro, attitude, gravity, linear acceleration | API selected from Unity documentation; hardware unavailable | Check axes on iPhone and Android |
| 6. Calibration | Three second neutral pose and noise sampling | Source checked; hardware unavailable | Test sitting, reclined, lying |
| 7. Guard patrol | `GuardController.cs`: configurable speed, rotation, routes | Source checked; Play mode unavailable | Watch both routes |
| 8. Vision | `GuardVision.cs`: cone and raycast against blocking layer | Source checked; Play mode unavailable | Check wall and cover occlusion |
| 9. Phases | `GameStateController.cs`: MOVE, GET READY, FREEZE and warning beep | Source checked; Play mode unavailable | Tune warning rhythm |
| 10. Device movement | Freeze reference pose, acceleration/rotation/orientation score | Source checked; hardware unavailable | Measure jitter and sensitivity |
| 11. Detection | `DetectionSystem.cs`: rise, decay, max, stability, perfect freeze | Source checked; Play mode unavailable | Tune gain on devices |
| 12. Cover | Cover markers block guard sight; movement allowed if unseen | Source checked; Play mode unavailable | Test moving behind cover in FREEZE |
| 13. Diamond | Trigger updates objective and banner | Source checked; Play mode unavailable | Collect in each phase |
| 14. Exit | Requires diamond | Source checked; Play mode unavailable | Try with and without diamond |
| 15. Result | Clear/fail metrics, grade, retry | Source checked; Play mode unavailable | Trigger both results |
| 16. Debug | `DebugPanel.cs`: sensor readings and live sliders | Source checked; Play mode unavailable | Test UI on narrow devices |
| 17. Android build | `PrototypeBuild.cs` APK action | Not built; Unity/Android module absent | Build and install APK |
| 18. iOS build | `PrototypeBuild.cs` Xcode export action | Not built; Unity/iOS module absent | Export, sign, run in Xcode |
| 19. Physical testing | Validation plan in README | Not performed; no project binary or connected test device | Tune and re-test core loop |

No step requiring Unity execution or sensor hardware is marked as passed. The first issue to resolve is opening the project and checking compilation. Tuning values are provisional.
