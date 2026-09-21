using UnityEngine;
using UnityEngine.InputSystem;
using InputGyroscope = UnityEngine.InputSystem.Gyroscope;

namespace DontMove
{
    [DefaultExecutionOrder(-200)]
    public sealed class SensorManager : MonoBehaviour
    {
        // Physical angles make the dead zone and full-speed tilt easy to tune on a device.
        [Range(0f, 8f)] public float deadZoneDegrees = 1f;
        [Range(8f, 60f)] public float maxTiltDegrees = 18.75f;
        [Range(0.01f, 0.5f)] public float smoothing = 0.10f;
        [Range(1f, 4f)] public float poseNoiseMultiplier = 1.8f;
        [Range(1f, 4f)] public float accelerationNoiseMultiplier = 1.8f;
        [Range(1f, 4f)] public float rotationNoiseMultiplier = 1.8f;
        [Range(0.1f, 4f)] public float accelerationThreshold = 1f;
        [Range(0.05f, 3f)] public float rotationThreshold = 0.7f;
        public Vector2 MovementVector { get; private set; }
        public Vector2 FreezeMovementVector { get; private set; }
        public Vector3 RawAcceleration { get; private set; }
        public Vector3 Rotation { get; private set; }
        public Quaternion Pose { get; private set; } = Quaternion.identity;
        public float AccelerationNoise { get; private set; }
        public float RotationNoise { get; private set; }
        public float TremorBaseline { get; private set; }
        public float FreezePoseDeltaDegrees { get; private set; }
        public bool HasAttitude => !Application.isEditor && AttitudeSensor.current != null;
        public bool HasMotionSensor => !Application.isEditor && (AttitudeSensor.current != null || Accelerometer.current != null);

        Quaternion neutralPose = Quaternion.identity;
        Vector3 neutralGravity;
        Vector3 filteredGravity;
        float noiseSumAcceleration, noiseSumRotation, noiseSumPoseRate, noiseSumPoseStep;
        int noiseSamples;
        Vector2 smoothed, freezeSmoothed;
        Quaternion previousCalibrationPose, previousMotionPose, freezeReferencePose;
        Vector3 freezeReferenceGravity;
        bool hasFreezeReference;

        void OnEnable()
        {
            if (Accelerometer.current != null) InputSystem.EnableDevice(Accelerometer.current);
            if (InputGyroscope.current != null) InputSystem.EnableDevice(InputGyroscope.current);
            if (AttitudeSensor.current != null) InputSystem.EnableDevice(AttitudeSensor.current);
            if (GravitySensor.current != null) InputSystem.EnableDevice(GravitySensor.current);
            if (LinearAccelerationSensor.current != null) InputSystem.EnableDevice(LinearAccelerationSensor.current);
        }

        void Update()
        {
            float dt = Mathf.Max(Time.unscaledDeltaTime, 0.0001f);
            if (Application.isEditor)
            {
                Vector2 keys = ReadKeys();
                MovementVector = keys.normalized;
                FreezeMovementVector = hasFreezeReference ? keys.normalized : Vector2.zero;
                RawAcceleration = new Vector3(keys.x, keys.y, 0);
                Rotation = new Vector3(keys.y, keys.x, 0);
                Pose = Quaternion.Euler(-keys.y * 25f, keys.x * 25f, 0);
                return;
            }
            RawAcceleration = Accelerometer.current != null ? Accelerometer.current.acceleration.ReadValue() : Vector3.zero;
            Rotation = InputGyroscope.current != null ? InputGyroscope.current.angularVelocity.ReadValue() : Vector3.zero;
            Pose = AttitudeSensor.current != null ? AttitudeSensor.current.attitude.ReadValue() : Quaternion.identity;
            Vector3 gravity = GravitySensor.current != null ? GravitySensor.current.gravity.ReadValue() : RawAcceleration;
            filteredGravity = Vector3.Lerp(filteredGravity, gravity, 1f - Mathf.Exp(-dt / 0.16f));
            smoothed = SmoothTilt(smoothed, TiltFrom(neutralPose, neutralGravity), dt);
            MovementVector = smoothed;
            freezeSmoothed = hasFreezeReference ? SmoothTilt(freezeSmoothed, TiltFrom(freezeReferencePose, freezeReferenceGravity), dt) : Vector2.zero;
            FreezeMovementVector = freezeSmoothed;
        }

        Vector2 TiltFrom(Quaternion referencePose, Vector3 referenceGravity)
        {
            if (!HasAttitude)
            {
                Vector2 direction = new Vector2(filteredGravity.x - referenceGravity.x, filteredGravity.y - referenceGravity.y);
                return direction.sqrMagnitude < 0.000001f ? Vector2.zero : direction.normalized * Vector3.Angle(referenceGravity, filteredGravity);
            }
            Quaternion relative = Quaternion.Inverse(referencePose) * Pose;
            relative.ToAngleAxis(out float angle, out Vector3 axis);
            if (angle > 180f) angle -= 360f;
            return new Vector2(axis.y, -axis.x) * angle;
        }

        public Vector2 TiltToInput(Vector2 tiltDegrees)
        {
            float angle = tiltDegrees.magnitude;
            float range = Mathf.Max(maxTiltDegrees, deadZoneDegrees + 0.5f) - deadZoneDegrees;
            float amount = angle <= deadZoneDegrees ? 0f : Mathf.Clamp01((angle - deadZoneDegrees) / range);
            return angle > 0.0001f ? tiltDegrees / angle * amount : Vector2.zero;
        }

        Vector2 SmoothTilt(Vector2 previous, Vector2 tiltDegrees, float dt)
        {
            Vector2 target = TiltToInput(tiltDegrees);
            return Vector2.ClampMagnitude(Vector2.Lerp(previous, target, 1f - Mathf.Exp(-dt / smoothing)), 1f);
        }

        static Vector2 ReadKeys()
        {
            Keyboard k = Keyboard.current;
            if (k == null) return Vector2.zero;
            float x = (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1 : 0) - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1 : 0);
            float y = (k.wKey.isPressed || k.upArrowKey.isPressed ? 1 : 0) - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1 : 0);
            return new Vector2(x, y);
        }

        public void BeginCalibration()
        {
            noiseSumAcceleration = noiseSumRotation = noiseSumPoseRate = noiseSumPoseStep = 0;
            noiseSamples = 0;
            neutralPose = Pose;
            neutralGravity = filteredGravity;
            previousCalibrationPose = Pose;
            smoothed = Vector2.zero;
            EndFreezeMotion();
            MovementVector = Vector2.zero;
        }

        public void SampleCalibration()
        {
            if (Application.isEditor) { noiseSamples++; return; }
            float poseStep = HasAttitude ? Quaternion.Angle(previousCalibrationPose, Pose) : 0f;
            previousCalibrationPose = Pose;
            float acceleration = LinearAccelerationSensor.current != null ? LinearAccelerationSensor.current.acceleration.ReadValue().magnitude : (RawAcceleration - filteredGravity).magnitude;
            noiseSumAcceleration += acceleration;
            noiseSumRotation += Rotation.magnitude;
            noiseSumPoseStep += poseStep;
            noiseSumPoseRate += poseStep / Mathf.Max(Time.unscaledDeltaTime, 0.001f);
            noiseSamples++;
        }

        public void EndCalibration()
        {
            neutralPose = Pose;
            neutralGravity = filteredGravity;
            float n = Mathf.Max(1, noiseSamples);
            AccelerationNoise = Mathf.Max(0.03f, noiseSumAcceleration / n);
            RotationNoise = Mathf.Max(0.015f, noiseSumRotation / n);
            TremorBaseline = noiseSumPoseRate / n;
            deadZoneDegrees = Mathf.Max(deadZoneDegrees, Mathf.Clamp(noiseSumPoseStep / n * 1.5f, 0.3f, 4f));
            smoothed = Vector2.zero;
            MovementVector = Vector2.zero;
        }

        public void BeginFreezeMotion(Quaternion referencePose, Vector3 referenceGravity)
        {
            freezeReferencePose = previousMotionPose = referencePose;
            freezeReferenceGravity = referenceGravity;
            freezeSmoothed = FreezeMovementVector = Vector2.zero;
            FreezePoseDeltaDegrees = 0f;
            hasFreezeReference = true;
        }

        public void EndFreezeMotion()
        {
            hasFreezeReference = false;
            freezeSmoothed = FreezeMovementVector = Vector2.zero;
            FreezePoseDeltaDegrees = 0f;
        }

        public float MotionScore(Quaternion referencePose, Vector3 referenceGravity, float threshold)
        {
            if (Application.isEditor)
            {
                Keyboard keyboard = Keyboard.current;
                float strength = keyboard != null && keyboard.shiftKey.isPressed ? 1f : 0.45f;
                return Mathf.Clamp01(ReadKeys().magnitude * strength);
            }
            FreezePoseDeltaDegrees = HasAttitude ? Quaternion.Angle(referencePose, Pose) : Vector3.Angle(referenceGravity, filteredGravity);
            float poseStep = HasAttitude ? Quaternion.Angle(previousMotionPose, Pose) : 0f;
            previousMotionPose = Pose;
            float poseRate = poseStep / Mathf.Max(Time.unscaledDeltaTime, 0.001f);
            float acceleration = LinearAccelerationSensor.current != null ? LinearAccelerationSensor.current.acceleration.ReadValue().magnitude : (RawAcceleration - filteredGravity).magnitude;
            float angular = Rotation.magnitude;
            // Use change per second: a new, stationary pose must not create gain forever.
            float posePart = Mathf.Max(0f, poseRate - TremorBaseline * poseNoiseMultiplier) / Mathf.Max(0.1f, threshold);
            float accelerationPart = Mathf.Max(0f, acceleration - AccelerationNoise * accelerationNoiseMultiplier) / accelerationThreshold;
            float rotationPart = Mathf.Max(0f, angular - RotationNoise * rotationNoiseMultiplier) / rotationThreshold;
            return Mathf.Clamp01(Mathf.Max(posePart, Mathf.Max(accelerationPart, rotationPart)));
        }

        public Vector3 GravityReference => filteredGravity;
    }
}
