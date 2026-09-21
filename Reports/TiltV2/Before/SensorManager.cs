using UnityEngine;
using UnityEngine.InputSystem;
using InputGyroscope = UnityEngine.InputSystem.Gyroscope;

namespace DontMove
{
    [DefaultExecutionOrder(-200)]
    public sealed class SensorManager : MonoBehaviour
    {
        [Range(.25f, 3f)] public float sensitivity = 1f;
        [Range(0f, 8f)] public float deadZoneDegrees = 1f;
        [Range(8f, 60f)] public float maxTiltDegrees = 18.75f;
        [Tooltip("Angle filter time constant in seconds, BEFORE the radial dead zone.")]
        [Range(.01f, .5f)] public float smoothing = .10f;
        [Range(.1f, 1f)] public float releaseSmoothingRatio = .25f;
        [Range(1f, 4f)] public float poseNoiseMultiplier = 1.8f;
        [Range(1f, 4f)] public float accelerationNoiseMultiplier = 1.8f;
        [Range(1f, 4f)] public float rotationNoiseMultiplier = 1.8f;
        [Range(.1f, 4f)] public float accelerationThreshold = 1f;
        [Range(.05f, 3f)] public float rotationThreshold = .7f;
        public Vector2 RawTilt { get; private set; }
        public Vector2 RelativeTilt { get; private set; }
        public Vector2 FilteredTilt { get; private set; }
        public Vector2 FilteredFreezeTilt { get; private set; }
        public Vector2 MovementVector { get; private set; }
        public Vector2 FreezeMovementVector { get; private set; }
        public Vector3 RawAcceleration { get; private set; }
        public Vector3 LinearAcceleration { get; private set; }
        public Vector3 Rotation { get; private set; }
        public Quaternion Pose { get; private set; } = Quaternion.identity;
        public Quaternion NeutralPose { get; private set; } = Quaternion.identity;
        public Quaternion FreezeReferencePose { get; private set; } = Quaternion.identity;
        public Vector3 AccelerationBaseline => rawStats.Mean;
        public Vector3 GyroscopeBaseline => gyroStats.Mean;
        public Vector3 AccelerationVariance => rawStats.Variance;
        public Vector3 GyroscopeVariance => gyroStats.Variance;
        public Vector3 PoseVariance => poseStats.Variance;
        public float AccelerationNoise { get; private set; }
        public float RotationNoise { get; private set; }
        public float TremorBaseline { get; private set; }
        public float FreezePoseDeltaDegrees { get; private set; }
        public float DeviceMovementScore { get; private set; }
        public float PoseRate { get; private set; }
        public float EffectiveDeadZone => Mathf.Max(deadZoneDegrees, calibratedDeadZone);
        public bool CalibrationUnstable { get; private set; }
        public bool HasAttitude { get; private set; }
        public bool HasMotionSensor { get; private set; }
        public bool HasFreezeReference { get; private set; }
        public Vector3 GravityReference => filteredGravity;
        Vector3 neutralGravity, filteredGravity, freezeGravity;
        Quaternion calibrationOrigin, previousPose;
        Vector4 quaternionSum;
        int calibrationSamples;
        double previousPoseTime = -1;
        float calibratedDeadZone, poseSampleAge;
        bool keyboardInput, gravityInitialized;
        VectorStats rawStats, linearStats, gyroStats, poseStats, gravityStats, rateStats;

        // Acquisition boundary for hardware and deterministic recorded/synthetic sample replay.
        public struct Sample
        {
            public Quaternion pose;
            public Vector3 acceleration, linearAcceleration, gyro, gravity;
            public bool attitudeAvailable, motionAvailable;
            public double poseTime;
        }
        struct VectorStats
        {
            int count;
            public Vector3 Mean { get; private set; }
            Vector3 m2;
            public Vector3 Variance => count > 1 ? m2 / (count - 1) : Vector3.zero;
            public float Sigma => Mathf.Sqrt(Variance.x + Variance.y + Variance.z);
            public void Add(Vector3 value)
            {
                count++; Vector3 delta = value - Mean; Mean += delta / count;
                m2 += Vector3.Scale(delta, value - Mean);
            }
        }
        void OnEnable()
        {
            Enable(Accelerometer.current); Enable(InputGyroscope.current); Enable(AttitudeSensor.current);
            Enable(GravitySensor.current); Enable(LinearAccelerationSensor.current); previousPoseTime = -1;
        }
        static void Enable(Sensor device)
        {
            if (device == null) return;
            InputSystem.EnableDevice(device); device.samplingFrequency = 60f;
        }
        void Update()
        {
            float dt = Mathf.Clamp(Time.unscaledDeltaTime, .0001f, .1f);
            if (Application.isEditor)
            {
                keyboardInput = true;
                Vector2 keys = Vector2.ClampMagnitude(ReadKeys(), 1f);
                float amount = Keyboard.current != null && Keyboard.current.ctrlKey.isPressed ? .15f :
                    Keyboard.current != null && Keyboard.current.shiftKey.isPressed ? 1f : .5f;
                MovementVector = keys * amount;
                FreezeMovementVector = HasFreezeReference ? MovementVector : Vector2.zero;
                RawTilt = RelativeTilt = FilteredTilt = keys * (EffectiveDeadZone + amount * (maxTiltDegrees - EffectiveDeadZone));
                RawAcceleration = new Vector3(keys.x, keys.y, 0); Rotation = new Vector3(keys.y, keys.x, 0);
                Pose = Quaternion.Euler(-keys.y * 25, keys.x * 25, 0);
                return;
            }
            Vector3 raw = Accelerometer.current != null ? Accelerometer.current.acceleration.ReadValue() : Vector3.zero;
            Vector3 gravity = GravitySensor.current != null ? GravitySensor.current.gravity.ReadValue() :
                Vector3.Lerp(gravityInitialized ? filteredGravity : raw, raw, 1f - Mathf.Exp(-dt / .16f));
            ProcessSample(new Sample {
                pose = AttitudeSensor.current != null ? AttitudeSensor.current.attitude.ReadValue() : Quaternion.identity,
                acceleration = raw,
                gyro = InputGyroscope.current != null ? InputGyroscope.current.angularVelocity.ReadValue() : Vector3.zero,
                gravity = gravity,
                linearAcceleration = LinearAccelerationSensor.current != null ? LinearAccelerationSensor.current.acceleration.ReadValue() : raw - gravity,
                attitudeAvailable = AttitudeSensor.current != null,
                motionAvailable = AttitudeSensor.current != null || Accelerometer.current != null,
                poseTime = AttitudeSensor.current != null ? AttitudeSensor.current.lastUpdateTime : Time.unscaledTimeAsDouble
            }, dt);
        }
        public void ProcessSample(Sample sample, float dt)
        {
            keyboardInput = false; HasAttitude = sample.attitudeAvailable; HasMotionSensor = sample.motionAvailable;
            RawAcceleration = sample.acceleration; LinearAcceleration = sample.linearAcceleration; Rotation = sample.gyro;
            Pose = sample.pose.normalized; filteredGravity = sample.gravity; gravityInitialized = true;
            // Sensor timestamps avoid render-FPS dependent motion spikes; score queries are read-only.
            if (sample.poseTime > previousPoseTime)
            {
                double interval = sample.poseTime - previousPoseTime;
                PoseRate = HasAttitude && previousPoseTime >= 0 && interval < .25 ?
                    PoseAngle(previousPose, Pose) / Mathf.Max(.001f, (float)interval) : 0f;
                previousPose = Pose; previousPoseTime = sample.poseTime; poseSampleAge = 0;
            }
            else poseSampleAge += Mathf.Max(0, dt);
            if (poseSampleAge > .1f) PoseRate = 0;
            RawTilt = RelativeAngles(Quaternion.identity, Pose);
            RelativeTilt = TiltFrom(NeutralPose, neutralGravity);
            FilteredTilt = FilterAngle(FilteredTilt, RelativeTilt, dt);
            MovementVector = TiltToInput(FilteredTilt);
            if (HasFreezeReference)
            {
                FilteredFreezeTilt = FilterAngle(FilteredFreezeTilt, TiltFrom(FreezeReferencePose, freezeGravity), dt);
                FreezeMovementVector = TiltToInput(FilteredFreezeTilt);
                FreezePoseDeltaDegrees = HasAttitude ? PoseAngle(FreezeReferencePose, Pose) : Vector3.Angle(freezeGravity, filteredGravity);
            }
        }
        public static Vector2 RelativeAngles(Quaternion reference, Quaternion current)
        {
            Quaternion relative = (Quaternion.Inverse(reference) * current).normalized;
            if (relative.w < 0) relative = new Quaternion(-relative.x, -relative.y, -relative.z, -relative.w);
            Vector3 vector = new Vector3(relative.x, relative.y, relative.z);
            float sine = vector.magnitude;
            float angle = 2f * Mathf.Atan2(sine, relative.w) * Mathf.Rad2Deg;
            return sine < 1e-8f ? Vector2.zero : new Vector2(vector.y, -vector.x) * (angle / sine);
        }
        public static float PoseAngle(Quaternion reference, Quaternion current)
        {
            Quaternion q = (Quaternion.Inverse(reference) * current).normalized;
            return 2f * Mathf.Atan2(new Vector3(q.x, q.y, q.z).magnitude, Mathf.Abs(q.w)) * Mathf.Rad2Deg;
        }
        Vector2 TiltFrom(Quaternion reference, Vector3 gravity)
        {
            if (HasAttitude) return RelativeAngles(reference, Pose);
            if (gravity.sqrMagnitude < .0001f || filteredGravity.sqrMagnitude < .0001f) return Vector2.zero;
            return RelativeAngles(Quaternion.identity, Quaternion.FromToRotation(filteredGravity, gravity));
        }
        Vector2 FilterAngle(Vector2 previous, Vector2 target, float dt)
        {
            float time = Mathf.Max(.005f, smoothing) * (target.magnitude <= EffectiveDeadZone ? releaseSmoothingRatio : 1f);
            return Vector2.Lerp(previous, target, 1f - Mathf.Exp(-Mathf.Max(0, dt) / Mathf.Max(.002f, time)));
        }
        public Vector2 TiltToInput(Vector2 tiltDegrees)
        {
            float angle = tiltDegrees.magnitude, dz = EffectiveDeadZone;
            // Sensitivity changes the useful range without amplifying neutral noise.
            float normalized = Mathf.Clamp01((angle - dz) / Mathf.Max(.5f, maxTiltDegrees - dz));
            float amount = Mathf.Pow(normalized, 1f / Mathf.Max(.01f, sensitivity));
            return angle > .00001f ? tiltDegrees / angle * amount : Vector2.zero;
        }
        static Vector2 ReadKeys()
        {
            Keyboard k = Keyboard.current;
            if (k == null) return Vector2.zero;
            return new Vector2((k.dKey.isPressed || k.rightArrowKey.isPressed ? 1 : 0) - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1 : 0),
                (k.wKey.isPressed || k.upArrowKey.isPressed ? 1 : 0) - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1 : 0));
        }
        public void BeginCalibration()
        {
            rawStats = linearStats = gyroStats = poseStats = gravityStats = rateStats = default;
            quaternionSum = Vector4.zero; calibrationSamples = 0; calibratedDeadZone = 0; CalibrationUnstable = false;
            FilteredTilt = MovementVector = Vector2.zero; EndFreezeMotion();
        }
        public void SampleCalibration()
        {
            if (keyboardInput) return;
            if (calibrationSamples == 0) calibrationOrigin = Pose;
            Quaternion q = Pose;
            if (Quaternion.Dot(calibrationOrigin, q) < 0) q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
            quaternionSum += new Vector4(q.x, q.y, q.z, q.w); calibrationSamples++;
            rawStats.Add(RawAcceleration); linearStats.Add(LinearAcceleration); gyroStats.Add(Rotation);
            gravityStats.Add(filteredGravity);
            Vector2 tilt = RelativeAngles(calibrationOrigin, Pose);
            poseStats.Add(new Vector3(tilt.x, tilt.y, 0)); rateStats.Add(new Vector3(PoseRate, 0, 0));
        }
        public void EndCalibration()
        {
            NeutralPose = calibrationSamples > 0 ? new Quaternion(quaternionSum.x, quaternionSum.y, quaternionSum.z, quaternionSum.w).normalized : Pose;
            neutralGravity = calibrationSamples > 0 ? gravityStats.Mean : filteredGravity;
            AccelerationNoise = Mathf.Max(.03f, linearStats.Sigma); RotationNoise = Mathf.Max(.015f, gyroStats.Sigma);
            TremorBaseline = Mathf.Max(.1f, rateStats.Mean.x + rateStats.Sigma);
            calibratedDeadZone = Mathf.Clamp(poseStats.Sigma * 3f, 0, 4f);
            CalibrationUnstable = poseStats.Sigma > 1.3f || gyroStats.Mean.magnitude > .25f;
            FilteredTilt = MovementVector = Vector2.zero;
        }
        public void BeginFreezeMotion(Quaternion referencePose, Vector3 referenceGravity)
        {
            FreezeReferencePose = referencePose; freezeGravity = referenceGravity;
            FilteredFreezeTilt = FreezeMovementVector = Vector2.zero; FreezePoseDeltaDegrees = 0; HasFreezeReference = true;
        }
        public void EndFreezeMotion()
        {
            HasFreezeReference = false; FilteredFreezeTilt = FreezeMovementVector = Vector2.zero;
            FreezePoseDeltaDegrees = DeviceMovementScore = 0;
        }
        public float MotionScore(Quaternion referencePose, Vector3 referenceGravity, float threshold)
        {
            FreezePoseDeltaDegrees = HasAttitude ? PoseAngle(referencePose, Pose) : Vector3.Angle(referenceGravity, filteredGravity);
            return DeviceMovementScore = EvaluateDeviceMotion(threshold);
        }
        public float EvaluateDeviceMotion(float threshold)
        {
            if (keyboardInput)
                return 0f; // Keyboard tests physical movement through world velocity; it is not a phone motion sensor.
            float posePart = Mathf.Max(0, PoseRate - TremorBaseline * poseNoiseMultiplier) / Mathf.Max(.1f, threshold);
            float accelerationPart = Mathf.Max(0, (LinearAcceleration - linearStats.Mean).magnitude - AccelerationNoise * accelerationNoiseMultiplier) / Mathf.Max(.01f, accelerationThreshold);
            float rotationPart = Mathf.Max(0, (Rotation - gyroStats.Mean).magnitude - RotationNoise * rotationNoiseMultiplier) / Mathf.Max(.01f, rotationThreshold);
            return Mathf.Clamp01(Mathf.Max(posePart, Mathf.Max(accelerationPart, rotationPart)));
        }
    }
}
