using UnityEngine;
namespace DontMove
{
    public sealed class DetectionSystem : MonoBehaviour
    {
        [Range(0.1f, 5f)] public float multiplier = 1f;
        [Range(0.5f, 30f)] public float freezeThreshold = 3.5f; // Pose change in degrees/second above calibrated tremor.
        [Range(0f, 0.3f)] public float movementDeadZone = 0.06f;
        [Range(0.01f, 2f)] public float worldSpeedThreshold = 0.15f;
        [Range(0.5f, 10f)] public float worldSpeedForMaxScore = 3f;
        [Range(0f, 20f)] public float slowGainPerSecond = 2f;
        [Range(5f, 150f)] public float fastGainPerSecond = 45f;
        [Range(0.5f, 10f)] public float closeDistance = 3f;
        [Range(1f, 4f)] public float closeMultiplier = 1.8f;
        public float Detection { get; private set; }
        public float MaximumDetection { get; private set; }
        public float Stability { get; private set; }
        public int PerfectFreezes { get; private set; }
        public float MovementScore { get; private set; }
        public float GainPerSecond { get; private set; }
        float stableTime, freezeTime, freezePeak;
        float totalStableTime, totalFreezeTime;
        public void BeginFreeze() { stableTime = freezeTime = freezePeak = MovementScore = GainPerSecond = 0; }
        public void Tick(float sensorScore, bool visible, float worldSpeed, float guardDistance, float dt)
        {
            float speedScore = Mathf.InverseLerp(worldSpeedThreshold, Mathf.Max(worldSpeedThreshold + 0.01f, worldSpeedForMaxScore), worldSpeed);
            MovementScore = Mathf.Clamp01(Mathf.Max(sensorScore, speedScore));
            GainPerSecond = 0f;
            if (!visible) { Detection = Mathf.Max(0, Detection - 3f * dt); return; }
            freezeTime += dt;
            freezePeak = Mathf.Max(freezePeak, MovementScore);
            if (MovementScore <= movementDeadZone) { stableTime += dt; Detection = Mathf.Max(0, Detection - 4f * dt); }
            else
            {
                float motion = Mathf.InverseLerp(movementDeadZone, 1f, MovementScore);
                float proximity = 1f + Mathf.Clamp01(1f - guardDistance / Mathf.Max(0.01f, closeDistance)) * (closeMultiplier - 1f);
                GainPerSecond = Mathf.Lerp(slowGainPerSecond, fastGainPerSecond, motion) * multiplier * proximity;
                Detection = Mathf.Min(100f, Detection + GainPerSecond * dt);
            }
            MaximumDetection = Mathf.Max(MaximumDetection, Detection);
        }
        public void EndFreeze()
        {
            if (freezeTime <= 0) return;
            totalStableTime += stableTime;
            totalFreezeTime += freezeTime;
            Stability = totalStableTime / totalFreezeTime;
            if (freezePeak < 0.12f && stableTime / freezeTime > 0.8f) PerfectFreezes++;
        }
        public void ResetRun()
        {
            Detection = MaximumDetection = Stability = 0;
            MovementScore = GainPerSecond = 0;
            PerfectFreezes = 0;
            totalStableTime = totalFreezeTime = 0;
        }
    }
}
