using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
namespace DontMove
{
    public enum GameState { Calibrating, Playing, DiamondStolen, Detected, MissionComplete }
    // Runs after PlayerController so Detection uses this frame's actual collision-resolved speed.
    [DefaultExecutionOrder(100)]
    public sealed class GameStateController : MonoBehaviour
    {
        public SensorManager sensor;
        public PlayerController player;
        public GuardController[] guards;
        public DetectionSystem detection;
        public MissionController mission;
        public GameState State { get; private set; }
        public float StateRemaining { get; private set; }
        public float RunTime { get; private set; }
        public float MovementScore { get; private set; }
        public float SensorMovementScore { get; private set; }
        public bool GuardVisibility { get; private set; }
        public float DistanceToVisibleGuard { get; private set; } = float.PositiveInfinity;
        public bool DiamondBannerVisible => diamondBannerTime > 0;
        public bool CanMove => State == GameState.Playing || State == GameState.DiamondStolen;
        public string Grade { get; private set; }
        float diamondBannerTime;
        void Start() { Application.targetFrameRate = 60; BeginCalibration(); }
        public void BeginCalibration()
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            sensor.BeginCalibration(); State = GameState.Calibrating; StateRemaining = 3f;
        }
        void Update()
        {
            if (Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame) BeginCalibration();
            TickGame(Time.deltaTime);
        }
        public void TickGame(float dt)
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            if (State == GameState.Calibrating)
            {
                StateRemaining -= dt; sensor.SampleCalibration();
                if (StateRemaining <= 0) { sensor.EndCalibration(); State = GameState.Playing; }
                return;
            }
            RunTime += dt;
            diamondBannerTime = Mathf.Max(0, diamondBannerTime - dt);
            if (State == GameState.DiamondStolen && diamondBannerTime <= 0) State = GameState.Playing;
            GuardVisibility = false; DistanceToVisibleGuard = float.PositiveInfinity;
            foreach (var guard in guards)
            {
                guard.TickPatrol(dt); guard.vision.Evaluate();
                guard.vision.SetDanger(guard.vision.SeesPlayer);
                if (!guard.vision.SeesPlayer) continue;
                GuardVisibility = true;
                DistanceToVisibleGuard = Mathf.Min(DistanceToVisibleGuard, Vector3.Distance(guard.transform.position, player.transform.position));
            }
            SensorMovementScore = sensor.EvaluateDeviceMotion(detection.motionThreshold);
            detection.Tick(SensorMovementScore, GuardVisibility, player.Speed, DistanceToVisibleGuard, dt);
            MovementScore = detection.MovementScore;
            if (detection.Detection >= 100) State = GameState.Detected;
        }
        public void OnDiamondStolen()
        {
            if (!CanMove) return;
            diamondBannerTime = 1.5f; State = GameState.DiamondStolen;
        }
        public void CompleteMission()
        {
            if (!CanMove || !mission.HasDiamond) return;
            State = GameState.MissionComplete;
            float score = detection.MaximumDetection + RunTime * .4f;
            Grade = score < 25 ? "S" : score < 45 ? "A" : score < 70 ? "B" : "C";
        }
        public void Retry() { SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex); }
    }
}
