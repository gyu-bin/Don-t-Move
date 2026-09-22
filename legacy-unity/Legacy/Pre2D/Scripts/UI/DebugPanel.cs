using UnityEngine;
namespace DontMove
{
    public sealed class DebugPanel : MonoBehaviour
    {
        public bool visible;
        public SensorManager sensor;
        public GameStateController game;
        public DetectionSystem detection;
        public PlayerController player;
        float fps;
        Vector2 scroll;
        void Update()
        {
            float current = 1f / Mathf.Max(0.001f, Time.unscaledDeltaTime);
            fps = Mathf.Lerp(fps, current, 0.08f);
        }
        void OnGUI()
        {
            if (!visible) return;
            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1));
            GUILayout.BeginArea(new Rect(7, 105, 235, 625), GUI.skin.box);
            scroll = GUILayout.BeginScrollView(scroll);
            GUILayout.Label("SENSOR / MOVEMENT DEBUG");
            GUILayout.Label("Raw tilt (deg): " + sensor.RawTilt.ToString("F2"));
            GUILayout.Label("Relative (deg): " + sensor.RelativeTilt.ToString("F2"));
            GUILayout.Label("Filtered (deg): " + sensor.FilteredTilt.ToString("F2"));
            GUILayout.Label("Tilt magnitude: " + sensor.FilteredTilt.magnitude.ToString("F2"));
            GUILayout.Label("Dead zone output: " + sensor.MovementVector.ToString("F3"));
            GUILayout.Label("Effective dead zone: " + sensor.EffectiveDeadZone.ToString("F2") + " deg");
            GUILayout.Label("Curve output: " + player.ResponseOutput.ToString("F3"));
            GUILayout.Label("Actual velocity: " + player.CurrentVelocity.ToString("F2"));
            GUILayout.Label("Smoothed velocity: " + player.SmoothedVelocity.ToString("F2"));
            GUILayout.Label("Movement state: " + player.MovementState);
            GUILayout.Label("Facing: " + player.FacingDirection.ToString("F2"));
            GUILayout.Label("Wall slide: " + player.WallSliding);
            GUILayout.Label("Accel baseline: " + sensor.AccelerationBaseline.ToString("F3"));
            GUILayout.Label("Gyro baseline: " + sensor.GyroscopeBaseline.ToString("F3"));
            GUILayout.Label("Accel variance: " + sensor.AccelerationVariance.ToString("F5"));
            GUILayout.Label("Gyro variance: " + sensor.GyroscopeVariance.ToString("F5"));
            GUILayout.Label("Pose variance: " + sensor.PoseVariance.ToString("F4"));
            GUILayout.Label("Freeze filtered: " + sensor.FilteredFreezeTilt.ToString("F2"));
            GUILayout.Label(sensor.CalibrationUnstable ? "Calibration moved: recalibrate while still" : "Calibration baseline ready");
            GUILayout.Label("Tilt X/Y: " + sensor.MovementVector.x.ToString("F2") + " / " + sensor.MovementVector.y.ToString("F2"));
            GUILayout.Label("Acceleration: " + sensor.RawAcceleration.ToString("F2"));
            GUILayout.Label("Rotation: " + sensor.Rotation.ToString("F2"));
            GUILayout.Label("Movement score: " + game.MovementScore.ToString("F2"));
            GUILayout.Label("Device score: " + sensor.EvaluateDeviceMotion(detection.freezeThreshold).ToString("F2"));
            GUILayout.Label("Tremor baseline (deg/s): " + sensor.TremorBaseline.ToString("F2"));
            GUILayout.Label("Freeze pose delta: " + sensor.FreezePoseDeltaDegrees.ToString("F1") + " deg");
            GUILayout.Label("State: " + game.State);
            GUILayout.Label("Detection: " + detection.Detection.ToString("F0"));
            GUILayout.Label("Player speed: " + player.Speed.ToString("F2") + " m/s");
            GUILayout.Label("Target speed: " + player.TargetSpeed.ToString("F2") + " m/s");
            GUILayout.Label("Guard visible: " + game.GuardVisibility);
            GUILayout.Label("Distance to guard: " + (game.GuardVisibility ? game.DistanceToVisibleGuard.ToString("F2") + " m" : "--"));
            GUILayout.Label("Detection gain/sec: " + detection.GainPerSecond.ToString("F1"));
            GUILayout.Label("FPS: " + fps.ToString("F0"));
            sensor.sensitivity = Slider("Sensitivity", sensor.sensitivity, .25f, 3f);
            sensor.smoothing = Slider("Smoothing (seconds)", sensor.smoothing, .01f, .3f);
            sensor.deadZoneDegrees = Slider("Dead zone (deg)", sensor.deadZoneDegrees, 0f, 8f);
            sensor.maxTiltDegrees = Slider("Max tilt (deg)", sensor.maxTiltDegrees, 8f, 60f);
            player.minSpeed = Slider("Sneak state ceiling (m/s)", player.minSpeed, 0f, 2f);
            player.maxSpeed = Slider("Max speed (m/s)", player.maxSpeed, .5f, 10f);
            player.acceleration = Slider("Acceleration", player.acceleration, 1f, 40f);
            player.deceleration = Slider("Deceleration", player.deceleration, 1f, 60f);
            player.stopThreshold = Slider("Stop threshold (m/s)", player.stopThreshold, .005f, .2f);
            player.rotationSpeed = Slider("Rotation (deg/sec)", player.rotationSpeed, 90f, 1080f);
            player.rotationDeadZone = Slider("Rotation dead zone (deg)", player.rotationDeadZone, 0f, 20f);
            player.responseCurve = Slider("Response curve (power)", player.responseCurve, 1f, 4f);
            detection.freezeThreshold = Slider("Freeze threshold (deg/s)", detection.freezeThreshold, .5f, 30f);
            detection.movementDeadZone = Slider("Movement dead zone", detection.movementDeadZone, 0f, .3f);
            detection.worldSpeedThreshold = Slider("Speed threshold", detection.worldSpeedThreshold, .01f, 2f);
            detection.fastGainPerSecond = Slider("Fast gain/sec", detection.fastGainPerSecond, 5f, 150f);
            detection.closeMultiplier = Slider("Close multiplier", detection.closeMultiplier, 1f, 4f);
            detection.multiplier = Slider("Detection multiplier", detection.multiplier, .1f, 5f);
            game.getReadyDuration = Slider("Ready duration", game.getReadyDuration, .35f, 3f);
            game.freezeDuration = Slider("Freeze duration", game.freezeDuration, 1f, 8f);
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("PRECISE")) ApplyPreset(0);
            if (GUILayout.Button("BALANCED")) ApplyPreset(1);
            if (GUILayout.Button("FAST")) ApplyPreset(2);
            GUILayout.EndHorizontal();
            if (GUILayout.Button("RECALIBRATE")) game.BeginCalibration();
            GUILayout.EndScrollView();
            GUILayout.EndArea();
            GUI.matrix = old;
        }
        void ApplyPreset(int preset)
        {
            // Development candidates only; calibrated noise is never discarded by a preset.
            sensor.sensitivity = preset == 0 ? .85f : preset == 2 ? 1.15f : 1f;
            sensor.deadZoneDegrees = 1f; sensor.maxTiltDegrees = 18.75f;
            sensor.smoothing = preset == 0 ? .10f : preset == 2 ? .06f : .10f;
            player.maxSpeed = 5.2f; player.acceleration = preset == 0 ? 12f : preset == 2 ? 22f : 15f;
            player.deceleration = preset == 0 ? 36f : preset == 2 ? 32f : 28f;
            player.responseCurve = preset == 0 ? 2.8f : preset == 2 ? 1.8f : 2.2f;
            player.speedResponse = PlayerController.DefaultResponse();
        }
        static float Slider(string name, float value, float min, float max)
        {
            GUILayout.Label(name + ": " + value.ToString("F2"));
            return GUILayout.HorizontalSlider(value, min, max);
        }
    }
}
