using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace DontMove
{
    public enum GameState { Calibrating, Playing, GetReady, Freeze, DiamondStolen, Detected, MissionComplete }

    [DefaultExecutionOrder(-100)]
    public sealed class GameStateController : MonoBehaviour
    {
        public SensorManager sensor;
        public PlayerController player;
        public GuardController[] guards;
        public DetectionSystem detection;
        public MissionController mission;
        [Range(0.35f, 3f)] public float getReadyDuration = 1.1f;
        [Range(1f, 8f)] public float freezeDuration = 3.2f;
        public float moveDuration = 4.5f;
        public GameState State { get; private set; }
        public float StateRemaining { get; private set; }
        public float RunTime { get; private set; }
        public float MovementScore { get; private set; }
        public float SensorMovementScore { get; private set; }
        public bool GuardVisibility { get; private set; }
        public float DistanceToVisibleGuard { get; private set; } = float.PositiveInfinity;
        public bool DiamondBannerVisible => diamondBannerTime > 0;
        public bool CanMove => State == GameState.Playing || State == GameState.GetReady || State == GameState.DiamondStolen || State == GameState.Freeze;
        public string Grade { get; private set; }
        Quaternion freezePose;
        Vector3 freezeGravity;
        float diamondBannerTime;
        AudioSource cue;

        void Start()
        {
            Application.targetFrameRate = 60;
            cue = gameObject.AddComponent<AudioSource>();
            cue.playOnAwake = false;
            cue.volume = 0.45f;
            BeginCalibration();
        }
        public void BeginCalibration()
        {
            sensor.BeginCalibration();
            State = GameState.Calibrating;
            StateRemaining = 3f;
        }
        void Update()
        {
            Keyboard k = Keyboard.current;
            if (k != null)
            {
                if (k.rKey.wasPressedThisFrame) BeginCalibration();
                if (k.fKey.wasPressedThisFrame) StartFreeze();
                if (k.mKey.wasPressedThisFrame) StartMove();
            }
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            float dt = Time.deltaTime;
            StateRemaining -= dt;
            if (State == GameState.Calibrating)
            {
                sensor.SampleCalibration();
                if (StateRemaining <= 0) { sensor.EndCalibration(); StartMove(); }
                return;
            }
            RunTime += dt;
            diamondBannerTime = Mathf.Max(0, diamondBannerTime - dt);
            bool anyVisible = false;
            float nearestVisibleDistance = float.PositiveInfinity;
            for (int i = 0; i < guards.Length; i++)
            {
                GuardController guard = guards[i];
                if (State == GameState.Playing || State == GameState.DiamondStolen) guard.TickPatrol(dt);
                else if (State == GameState.Freeze) guard.FacePlayer(player.transform, dt);
                guard.vision.Evaluate();
                guard.vision.SetDanger(State == GameState.Freeze);
                anyVisible |= guard.vision.SeesPlayer;
                if (guard.vision.SeesPlayer)
                    nearestVisibleDistance = Mathf.Min(nearestVisibleDistance, Vector3.Distance(guard.transform.position, player.transform.position));
            }
            GuardVisibility = anyVisible;
            DistanceToVisibleGuard = nearestVisibleDistance;
            if (State == GameState.DiamondStolen)
            {
                if (diamondBannerTime <= 0) State = GameState.Playing;
            }
            if (State == GameState.Playing && StateRemaining <= 0) StartWarning();
            else if (State == GameState.GetReady && StateRemaining <= 0) StartFreeze();
            else if (State == GameState.Freeze)
            {
                SensorMovementScore = sensor.MotionScore(freezePose, freezeGravity, detection.freezeThreshold);
                // Only device-driven speed contributes; residual controller braking must not punish a still hand.
                float deviceDrivenSpeed = SensorMovementScore > detection.movementDeadZone
                    ? Mathf.Min(player.Speed, player.SpeedForTilt(sensor.FreezeMovementVector.magnitude)) : 0f;
                detection.Tick(SensorMovementScore, GuardVisibility, deviceDrivenSpeed, DistanceToVisibleGuard, dt);
                MovementScore = detection.MovementScore;
                if (detection.Detection >= 100) { State = GameState.Detected; return; }
                if (StateRemaining <= 0) { detection.EndFreeze(); StartMove(); }
            }
        }
        void StartMove()
        {
            State = GameState.Playing;
            StateRemaining = moveDuration;
            MovementScore = SensorMovementScore = 0;
            sensor.EndFreezeMotion();
        }
        void StartWarning()
        {
            State = GameState.GetReady;
            StateRemaining = getReadyDuration;
            PlayCue();
        }
        void StartFreeze()
        {
            if (State == GameState.Freeze) return;
            State = GameState.Freeze;
            StateRemaining = freezeDuration;
            freezePose = sensor.Pose;
            freezeGravity = sensor.GravityReference;
            sensor.BeginFreezeMotion(freezePose, freezeGravity);
            detection.BeginFreeze();
        }
        void PlayCue()
        {
            const int sampleRate = 22050;
            const int count = 2205;
            AudioClip clip = AudioClip.Create("Get Ready Beep", count, 1, sampleRate, false);
            float[] samples = new float[count];
            for (int i = 0; i < count; i++) samples[i] = Mathf.Sin(2f * Mathf.PI * 880f * i / sampleRate) * (1f - i / (float)count);
            clip.SetData(samples, 0);
            cue.PlayOneShot(clip);
            Destroy(clip, 1f);
        }
        public void OnDiamondStolen()
        {
            if (State == GameState.Detected || State == GameState.MissionComplete) return;
            diamondBannerTime = 1.5f;
            if (State == GameState.Playing) { State = GameState.DiamondStolen; diamondBannerTime = 1.5f; }
        }
        public void CompleteMission()
        {
            if (State == GameState.Detected) return;
            State = GameState.MissionComplete;
            float score = detection.MaximumDetection + RunTime * 0.4f - detection.PerfectFreezes * 6f;
            Grade = score < 25 ? "S" : score < 45 ? "A" : score < 70 ? "B" : "C";
        }
        public void Retry() { SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex); }
    }
}
