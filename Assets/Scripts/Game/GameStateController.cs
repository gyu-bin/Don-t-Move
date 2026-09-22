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
        public float MaxGuardSuspicion { get; private set; }
        public float MaximumGuardSuspicion { get; private set; }
        public GuardController AlertSource { get; private set; }
        public Vector3 GlobalLastKnownPosition { get; private set; }
        public bool GlobalAlert { get; private set; }
        public float GlobalAlertElapsed { get; private set; }
        public int SearchingGuardCount { get; private set; }
        public int AlertCount { get; private set; }
        public GuardController CaughtBy { get; private set; }
        public bool DiamondBannerVisible => diamondBannerTime > 0;
        public bool CanMove => State == GameState.Playing || State == GameState.DiamondStolen;
        public string Grade { get; private set; }
        float diamondBannerTime;
        float readyRemaining;
        bool debugAlertPreview;
        float debugAlertPreviewElapsed;
        int debugAlertPreviewPhase = -1;
        public bool ShowingReady => State == GameState.Calibrating && sensor.CalibrationReady;
        void Start()
        {
            Application.targetFrameRate = 60;
            if (guards != null)
            {
                foreach (var guard in guards)
                {
                    if (guard == null) continue;
                    guard.Configure(this, player != null ? player.transform : null);
                    if (guard.GetComponent<GuardAlertIndicator>() == null)
                    {
                        var indicator = guard.gameObject.AddComponent<GuardAlertIndicator>();
                        indicator.guard = guard;
                    }
                    if (guard.GetComponent<GuardSpriteAnimator>() == null)
                    {
                        var animator = guard.gameObject.AddComponent<GuardSpriteAnimator>();
                        animator.guard = guard;
                    }
                }
            }
            BeginCalibration();
        }
        public void BeginCalibration()
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            sensor.BeginCalibration(); State = GameState.Calibrating; StateRemaining = sensor.calibrationTimeout; readyRemaining=.35f;
            MaxGuardSuspicion = MaximumGuardSuspicion = 0f;
        }
        void Update()
        {
            if (Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame) BeginCalibration();
            if (Keyboard.current != null && Keyboard.current.f2Key.wasPressedThisFrame) BeginDebugGuardAlertPreview();
            TickGame(Time.deltaTime);
        }
        public void TickGame(float dt)
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            if (State == GameState.Calibrating)
            {
                if(sensor.CalibrationReady) {readyRemaining-=dt;if(readyRemaining<=0) State=GameState.Playing;}
                else sensor.TickCalibration(dt);
                StateRemaining=Mathf.Max(0,sensor.calibrationTimeout-sensor.CalibrationElapsed);
                return;
            }
            RunTime += dt;
            diamondBannerTime = Mathf.Max(0, diamondBannerTime - dt);
            if (State == GameState.DiamondStolen && diamondBannerTime <= 0) State = GameState.Playing;
            GuardVisibility = false; DistanceToVisibleGuard = float.PositiveInfinity; MaxGuardSuspicion = 0f; SearchingGuardCount = 0;
            if (GlobalAlert) GlobalAlertElapsed += dt;
            foreach (var guard in guards)
            {
                if (guard == null) continue;
                guard.TickAI(dt, this);
                var visible = guard.CanSeePlayer;
                guard.vision.SetDanger(guard.AlertState == GuardState.Alert || guard.AlertState == GuardState.Chase || visible);
                MaxGuardSuspicion = Mathf.Max(MaxGuardSuspicion, guard.Suspicion);
                if (guard.AlertState == GuardState.Search) SearchingGuardCount++;
                if (!visible) continue;
                GuardVisibility = true;
                DistanceToVisibleGuard = Mathf.Min(DistanceToVisibleGuard, guard.DistanceToPlayer);
            }
            MaximumGuardSuspicion = Mathf.Max(MaximumGuardSuspicion, MaxGuardSuspicion);
            SensorMovementScore = sensor.EvaluateDeviceMotion(detection.motionThreshold);
            detection.Tick(SensorMovementScore, GuardVisibility, player.Speed, DistanceToVisibleGuard, dt);
            // DetectionSystem remains as telemetry for the debug panel. A full
            // suspicion bar is an alert, not a game over; CAUGHT is physical.
            MovementScore = MaxGuardSuspicion;
            if (GlobalAlert && !AnyAlertGuards()) GlobalAlert = false;
            TickDebugGuardAlertPreview(dt);
        }

        /// <summary>
        /// Editor-only visual QA: press F2 while playing to show Guard 0 at
        /// ? 50%, ? 90%, then !. This only overrides the indicator presentation;
        /// it does not trigger whistle, chase, or CAUGHT.
        /// </summary>
        public void BeginDebugGuardAlertPreview()
        {
            if (!Application.isEditor || guards == null || guards.Length == 0 || guards[0] == null) return;
            debugAlertPreview = true;
            debugAlertPreviewElapsed = 0f;
            debugAlertPreviewPhase = -1;
        }

        void TickDebugGuardAlertPreview(float dt)
        {
            if (!debugAlertPreview || guards == null || guards.Length == 0 || guards[0] == null) return;
            debugAlertPreviewElapsed += dt;
            GuardState state;
            float suspicion;
            int phase;
            if (debugAlertPreviewElapsed < 1.2f)
            {
                phase = 0; state = GuardState.Suspicious; suspicion = .5f;
            }
            else if (debugAlertPreviewElapsed < 2.4f)
            {
                phase = 1; state = GuardState.Suspicious; suspicion = .9f;
            }
            else if (debugAlertPreviewElapsed < 5f)
            {
                phase = 2; state = GuardState.Alert; suspicion = 1f;
            }
            else
            {
                guards[0].ClearDebugPreview();
                debugAlertPreview = false;
                return;
            }
            guards[0].SetDebugPreview(state, suspicion);
            if (phase != debugAlertPreviewPhase)
            {
                debugAlertPreviewPhase = phase;
            }
        }

        bool AnyAlertGuards()
        {
            if (guards == null) return false;
            foreach (var guard in guards)
                if (guard != null && guard.AlertState != GuardState.Patrol && guard.AlertState != GuardState.Suspicious)
                    return true;
            return false;
        }

        public void BroadcastGlobalAlert(GuardController source, Vector3 lastKnown)
        {
            AlertSource = source;
            GlobalLastKnownPosition = lastKnown;
            GlobalAlert = true;
            GlobalAlertElapsed = 0f;
            AlertCount++;
            if (guards == null) return;
            foreach (var guard in guards)
                if (guard != null && guard != source) guard.ReceiveGlobalAlert(source, lastKnown);
        }

        public void NotifyCaught(GuardController guard)
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            CaughtBy = guard;
            State = GameState.Detected;
            GlobalAlert = true;
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
            float score = MaximumGuardSuspicion * 100f + RunTime * .4f;
            Grade = score < 25 ? "S" : score < 45 ? "A" : score < 70 ? "B" : "C";
        }
        public bool Recenter()
        {
            if(!CanMove || !sensor.Recenter()) return false;
            player.ResetMotion(); return true;
        }
        public void Retry() { SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex); }
    }
}
