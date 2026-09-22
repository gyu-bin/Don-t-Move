# Museum Stage 01 — 2D vertical slice candidate

## Current direction
The latest Core Gameplay & 2D Art Direction Update replaces the earlier 3D diorama and global FREEZE design. Only Stage 01 is implemented. The user explicitly clarified STOP: **keep a tilt to keep moving; return to the calibrated Neutral to stop**. Merely holding a tilted phone still does not grant immunity while the character keeps walking.

## Changes
- Global GET READY/FREEZE states, phase timer, phase cue and result metrics removed.
- Guards independently Patrol → Stop → Turn. Guard A loops; Guard B ping-pongs, with different delay/speed/turn/dwell settings.
- Continuous Detection uses collision-resolved world speed, calibrated device motion, visibility and nearest visible guard distance. Multiple guards do not multiply the gain unfairly.
- No line of sight or cover/wall occlusion: gain zero immediately. 1.5 seconds safe before decay at 5 points/sec. Visible and still: gain zero, gauge holds.
- Velocity and device-motion evidence remain separate. Holding a tilt drives character speed and therefore risk even when device-motion evidence falls to zero.
- Vision graphics raycast against the same obstacle mask as visibility; cones are red and stronger during exposure.
- Nonrectangular stepped museum with an island and two routes around it, two guards, statue/display/crate cover, Diamond and locked-until-collected Exit.
- SpriteRenderer art, fixed overhead orthographic camera with follow, baked 2D light/glow sprites; no dynamic 3D lighting or 3D character models in the new scene.
- Physics remains XZ CharacterController/BoxCollider/raycast internally. This deliberately preserves the tested movement/collision pipeline while replacing rendering; it is **not** a Physics2D migration.

## Preserved
3-second averaged relative-pose calibration, radial dead zone, response curve, smoothing, acceleration/deceleration, stop threshold, rotation and collision sliding. Movement-state API Idle/Sneak/Walk/Run and runtime development presets retained. Device motion threshold renamed with FormerlySerializedAs to preserve prior serialized tuning.

## Art and backup
Generated with the built-in imagegen tool using the user's new reference. The 3 source PNG sheets live in Assets/Art2D, with Unity Sprite subrect assets and 2 vision materials. Agent and Guard each have four facing directions; movement has a small visual bob, **not a full walk-cycle animation**. No additional chapters/stages created.

Legacy/Pre2D contains the prior Art, Scenes, Scripts, Editor, Prefabs and EditorBuildSettings. Original source art is also retained under Assets/Art, but the new scene has no references to those 3D visuals. Previous FREEZE-specific tests are archived because their acceptance criteria are obsolete.

This is a playable art/gameplay candidate, not an assertion of exact reference parity. Remaining visual differences include simpler wall joins, sparse decorative storytelling, static four-direction poses, and no polished title/pause/minimap screens. The image's future chapters and marketing layout were not implemented.

## Candidate values
Tilt: sensitivity 1, radial dead zone 1 degree (calibration can raise it), max tilt 18.75 degrees, filter 0.10 sec, speed 0–5.2 m/s, acceleration 15, deceleration 28 m/s², stop threshold 0.035 m/s.
Detection: speed floor .08 m/s, full-speed risk at 5.2 m/s; slow gain 2, fast gain 35; device-motion weight .35; motion threshold 3.5 deg/s above baseline; device dead zone .06. Near-distance 3 m, maximum proximity multiplier 1.8. At distance >=3 m and zero device motion: .3 m/s sneak ≈1.83/sec, 2.6 m/s walk ≈17.65/sec, 5.2 m/s run 35/sec. Values are starting candidates, not device-tuned final values.

## Evidence
EditorTests.txt records actual Editor Play Mode keyboard input, calibration transition, separate patrol states, visibility/cover, continuous speed risk and safe decay, wall collision, recorded-pose tests, a full 35-cell collision-resolved route from start through Diamond to the alternate north exit route, CharacterController objective/exit triggers, Mission Complete, Retry and Detected. Camera PNGs are real Unity renders; Camera.Render captures do not include the OnGUI HUD. Synthetic pose replay is not physical phone testing.

## Physical acceptance still required
On iPhone, compare Neutral/slow tilt/large tilt; maintain a tilted pose while visible and confirm continuing movement earns Detection. Return to Neutral and hold still to stop; do not expect old FREEZE-current-pose behavior. Approach a turning guard, choose stop or run to cover, confirm gain immediately stops behind cover then decays after delay, collect Diamond, and exit by the other route. Repeat while reclining/lying after calibration. Observe FPS and tuning values in DBG over 3–5 runs. Runtime sliders still reset on Retry/restart.

## iPhone delivery
Unity 6000.3.24f1 compile/export succeeded (0 C# compiler errors/warnings). Signed Release build succeeded in Xcode 27 and was installed and launched on iPhone 14 Pro. The first installation attempt hit a transient connection reset; retry succeeded. Physical tilt play and FPS still require observation on the device. See IosBuild.txt.
