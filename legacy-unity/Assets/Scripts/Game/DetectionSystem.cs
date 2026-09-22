using UnityEngine;
using UnityEngine.Serialization;
namespace DontMove
{
    public sealed class DetectionSystem : MonoBehaviour
    {
        [Range(.1f,5f)] public float multiplier = 1f;
        [FormerlySerializedAs("freezeThreshold")][Range(.5f,30f)] public float motionThreshold = 3.5f;
        [Range(0,.3f)] public float movementDeadZone = .06f;
        [Range(.01f,2f)] public float worldSpeedThreshold = .08f;
        [Range(.5f,10f)] public float worldSpeedForMaxScore = 5.2f;
        [Range(0,20)] public float slowGainPerSecond = 2f;
        [Range(5,150)] public float fastGainPerSecond = 35f;
        [Range(0,1)] public float deviceMotionWeight = .35f;
        [Range(.5f,10)] public float closeDistance = 3f;
        [Range(1,4)] public float closeMultiplier = 1.8f;
        [Range(0,10)] public float safeDecayDelay = 1.5f;
        [Range(0,20)] public float safeDecayPerSecond = 5f;
        public float Detection { get; private set; }
        public float MaximumDetection { get; private set; }
        public float MovementScore { get; private set; }
        public float GainPerSecond { get; private set; }
        public float SafeTime { get; private set; }
        public void Tick(float sensorScore, bool visible, float worldSpeed, float guardDistance, float dt)
        {
            dt = Mathf.Max(0,dt);
            float speed = Mathf.InverseLerp(worldSpeedThreshold, Mathf.Max(worldSpeedThreshold+.01f,worldSpeedForMaxScore),worldSpeed);
            float device = Mathf.InverseLerp(movementDeadZone,1,Mathf.Clamp01(sensorScore)) * deviceMotionWeight;
            MovementScore = Mathf.Clamp01(Mathf.Max(speed,device)); GainPerSecond = 0;
            if (!visible)
            {
                float previous = SafeTime; SafeTime += dt;
                float decayTime = Mathf.Max(0,SafeTime-safeDecayDelay)-Mathf.Max(0,previous-safeDecayDelay);
                Detection = Mathf.Max(0, Detection-safeDecayPerSecond*decayTime); return;
            }
            SafeTime = 0;
            if (MovementScore > 0)
            {
                float proximity = 1+Mathf.Clamp01(1-guardDistance/Mathf.Max(.01f,closeDistance))*(closeMultiplier-1);
                // Continuous onset avoids an abrupt penalty at the noise/speed threshold.
                GainPerSecond = (slowGainPerSecond*Mathf.Sqrt(MovementScore) + (fastGainPerSecond-slowGainPerSecond)*MovementScore)*multiplier*proximity;
                Detection = Mathf.Min(100,Detection+GainPerSecond*dt);
            }
            MaximumDetection = Mathf.Max(MaximumDetection,Detection);
        }
        public void ResetRun() { Detection=MaximumDetection=MovementScore=GainPerSecond=SafeTime=0; }
    }
}
