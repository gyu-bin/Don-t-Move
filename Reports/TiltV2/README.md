# Tilt Control V2 — physical validation pending

## Before modification
Movement primarily read Input System 1.16 AttitudeSensor.attitude, with gravity/accelerometer direction fallback when attitude was absent. No raw gyro integration and no Euler-angle subtraction. Relative rotation was already inverse(neutral)*current, but its axis-angle vector X/Y projection did not explicitly isolate tilt from axial twist. Neutral was a 3-second quaternion average changed only on calibration; there was no automatic recenter. Drift risks were OS attitude estimation, unsuitable gravity fallback, and compound-rotation axis coupling. The 2D character only switched static facing sprites with bobbing; no actual Animator gait existed.

## V2 input
OS fused AttitudeSensor quaternion → inverse(accepted Neutral)*current → relative screen normal → signed Pitch/Roll → radial dead zone and continuous remap → weak exponential input smoothing → existing AnimationCurve → target velocity → acceleration/braking → collision-resolved world velocity.

Pitch/Roll come from atan2 projections of the rotated screen normal. Rotation about the calibrated local screen-normal axis is excluded (pure Z twist produces zero tilt; adding a local Z twist to a tilted quaternion preserves tilt). No world Euler subtraction. No raw gyro integration. No raw-acceleration/gravity movement fallback. Missing/stale attitude cannot complete calibration, and absent attitude produces zero movement.

Neutral is stored from current attitude only after explicit calibration success or Manual Recenter. It is not adapted while playing. This prevents software recenter drift; it does not guarantee that an OS sensor estimate never changes over time. Physical multi-minute drift remains to be measured.

## Calibration / recenter
HOLD COMFORTABLY waits for approximately 0.5 seconds of fresh, stable sensor samples. Candidate limits: pose rate 4 degrees/sec, angular velocity .12 sensor units, linear acceleration .12 sensor units, anchor change <=1 degree. Accepted window records accel/gyro/noise statistics and stores the current quaternion. READY appears for .35 sec then play begins. After 8 seconds without stability, retry is required. Intervening render frames without new sensor data do not reset the stable window; sample timestamps determine accepted duration.

DBG → RECENTER NOW explicitly stores current attitude and clears controller velocity/input immediately, preserving detection noise baselines and the ongoing game. DBG → RECALIBRATE runs stability calibration again. Guard/Detection rules are unchanged; held tilt can still earn speed-based Detection while the character moves, even when the phone's motion score is zero.

## Candidate defaults
- Dead zone: 3 degrees radial (existing noise floor can raise it)
- Max tilt: 25 degrees; sensitivity 1
- Smoothing: .06 sec; neutral dead-zone output immediately zero
- Speed: 0–5.2 m/s; curve preserved: 0/0, .15/.075, .30/.25, .50/.50, .70/.75, 1/1
- Acceleration: 15 m/s²; deceleration: 32 m/s²; stop threshold .035 m/s
- Calibration stable hold .5 sec; timeout 8 sec; READY .35 sec
- All tuning remains candidate-only pending iPhone feedback. Runtime slider changes still reset on Retry/restart.

## Actual 2D Animator
PlayerSpriteAnimator drives a real Unity AnimatorController with Idle/Sneak/Walk/Run clips and Speed, MovementState, Facing, FacingX, FacingY, PlaybackSpeed parameters. Movement State uses actual collision-resolved speed, not target input. Nonzero precision motion no longer stays Idle merely because it is below the braking stop threshold.

Temporary articulated sole sprites replace the original static boots using native sprite subrects. These are a **placeholder gait**, not final art. Four directional body poses remain. A complete cycle consumes .45m Sneak, .9m Walk, or 1.5m Run. Normalized clip phase advances from actual traveled distance. Animator automatic time advancement is disabled and sampled explicitly, preventing frame-time advancement from sliding the feet when collision stops the actor. PlaybackSpeed exposes actual cycles/sec. Foot trajectories move backward relative to travel during each stance half-cycle; final foot-contact polish still needs art and device review.

For final assets, turn off usePlaceholderCycle, replace the four state motions with directional sprite clips/blend trees driven by FacingX/Y (supports future eight-direction content), and set stride lengths to the authored cycles. The driver then stops overwriting the body sprite or body scale and hides placeholder soles. Root motion remains off.

## Modified files
- Assets/Scripts/Input/SensorManager.cs
- Assets/Scripts/Player/PlayerController.cs
- Assets/Scripts/Game/GameStateController.cs (calibration handoff and manual recenter only)
- Assets/Scripts/UI/DebugPanel.cs and GameHUD.cs
- Assets/Scripts/Visual2D/PlayerSpriteAnimator.cs (new)
- Assets/Editor/TiltV2Setup.cs and TiltV2Verification.cs (new)
- Assets/Editor/Stealth2DVerification.cs, Museum2DBuilder.cs, PrototypeBuild.cs
- Assets/Scenes/MuseumStage01.unity (sensor settings and player visual child)
- Assets/Art2D/Animations/TiltV2/* (controller, clips, placeholder soles/body subrects)
GuardController, GuardVision, DetectionSystem, MissionController, objective triggers, map colliders and camera logic were not modified.

## Evidence
EditorTests.txt: four posture calibration/neutral/60-second hold-return/yaw/recenter replays, radial onset/diagonal clamp, unstable and missing-attitude timeout/retry, actual Animator state and moving foot samples, four facings and stopped gait. Reports/2DVerticalSlice/EditorTests.txt: full existing keyboard, guard states/vision/cover, 35-cell start→Diamond→alternate exit collision route, mission triggers, complete, detected and Retry regression.

Automated pose replay does not reproduce physical iPhone sensor drift or user comfort. On the iPhone verify 10-second neutral, four axes/diagonals, micro tilt, increasing speed, prompt stop, several minutes of held-tilt-and-return, lying calibration, explicit recenter, and no idle/foot sliding during visible movement. Also test intentionally moving during calibration to see timeout/retry and then hold comfortably to start.

## iPhone build
Unity export succeeded with 0 C# errors/warnings. Xcode Release arm64 build succeeded with existing generated native-code/deployment warnings. Installed and launched on iPhone 14 Pro. Human sensor/direction/long-session drift and subjective foot-sliding checks remain pending. See IosBuild.txt.
