using System;
using System.Collections.Generic;
using System.IO;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object = UnityEngine.Object;

public static class TiltControllerVerification
{
    static bool oldEnabled;
    static EnterPlayModeOptions oldOptions;
    static int exitCode;
    static readonly List<string> results = new List<string>();
    static double sampleTime = 1;
    const float Dt = 1f / 60f;
    public static void Run()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");
        oldEnabled = EditorSettings.enterPlayModeOptionsEnabled; oldOptions = EditorSettings.enterPlayModeOptions;
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
        EditorApplication.playModeStateChanged += OnMode;
        EditorApplication.isPlaying = true;
    }
    static void OnMode(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.EnteredPlayMode)
        {
            try { CheckAll(); Log("ALL TILT PLAY MODE CHECKS PASSED"); exitCode = 0; }
            catch (Exception e) { Debug.LogException(e); results.Add("FAIL " + e); exitCode = 1; }
            Directory.CreateDirectory("Reports/TiltController");
            File.WriteAllLines("Reports/TiltController/EditorVerification.txt", results);
            EditorApplication.isPlaying = false;
        }
        if (state == PlayModeStateChange.EnteredEditMode)
        {
            EditorApplication.playModeStateChanged -= OnMode;
            EditorSettings.enterPlayModeOptionsEnabled = oldEnabled; EditorSettings.enterPlayModeOptions = oldOptions;
            EditorApplication.Exit(exitCode);
        }
    }
    static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    static void Log(string value) { results.Add(value); Debug.Log("TILT TEST: " + value); }
    static void Sample(SensorManager sensor, Quaternion pose, float dt = Dt, float noise = 0)
    {
        sampleTime += dt;
        sensor.ProcessSample(new SensorManager.Sample {
            pose = pose, poseTime = sampleTime, attitudeAvailable = true, motionAvailable = true,
            gravity = Quaternion.Inverse(pose) * Vector3.down,
            acceleration = Quaternion.Inverse(pose) * Vector3.down + Vector3.one * noise,
            linearAcceleration = Vector3.one * noise, gyro = Vector3.one * noise * .1f
        }, dt);
    }
    static void Teleport(PlayerController p, Vector3 position)
    {
        var cc = p.GetComponent<CharacterController>(); cc.enabled = false;
        p.transform.position = position; cc.enabled = true; Physics.SyncTransforms(); p.TickMovement(Vector2.zero, Dt, false);
    }
    static void Calibrate(SensorManager s, Quaternion neutral)
    {
        Sample(s, neutral); s.BeginCalibration();
        for (int i = 0; i < 180; i++)
        {
            Sample(s, neutral * Quaternion.Euler(.08f * Mathf.Sin(i * .4f), .06f * Mathf.Sin(i * .7f), 0), Dt, .004f * Mathf.Sin(i));
            s.SampleCalibration();
        }
        s.EndCalibration();
    }
    static void CheckAll()
    {
        results.Clear();
        var game = Object.FindFirstObjectByType<GameStateController>();
        var player = game.player; game.enabled = player.enabled = game.sensor.enabled = false;
        var s = new GameObject("Tilt replay sensor").AddComponent<SensorManager>(); s.enabled = false;
        foreach (Quaternion neutral in new[] {Quaternion.identity, Quaternion.Euler(70, 10, 0), Quaternion.Euler(120, 30, 20), Quaternion.Euler(170, -45, 75)})
        {
            Calibrate(s, neutral);
            Require(SensorManager.PoseAngle(s.NeutralPose, neutral) < .1f, "Neutral must use averaged calibration pose");
            float maxDrift = 0, maxNoise = 0;
            s.BeginFreezeMotion(s.NeutralPose, s.GravityReference);
            for (int i = 0; i < 600; i++)
            {
                Sample(s, neutral * Quaternion.Euler(.08f * Mathf.Sin(i * .4f), .06f * Mathf.Sin(i * .7f), 0), Dt, .004f * Mathf.Sin(i));
                maxDrift = Mathf.Max(maxDrift, s.MovementVector.magnitude);
                maxNoise = Mathf.Max(maxNoise, s.MotionScore(s.NeutralPose, s.GravityReference, 3.5f));
            }
            Require(maxDrift == 0 && maxNoise <= .06f, "Calibrated tremor drift/detection at pose " + neutral.eulerAngles + " score=" + maxNoise);
            for (int i = 0; i < 90; i++) Sample(s, neutral * Quaternion.Euler(0, 3, 0));
            Require(s.MovementVector.x > .05f && Mathf.Abs(s.MovementVector.y) < .01f, "Relative portrait-right direction failed");
            float sneak = player.SpeedForTilt(s.MovementVector.magnitude);
            Require(sneak > .02f && sneak < .8f, "Micro tilt speed is not precise: " + sneak);
            for (int i = 0; i < 90; i++) Sample(s, neutral * Quaternion.Euler(-s.maxTiltDegrees - 5, 0, 0));
            Require(s.MovementVector.y > .99f && Mathf.Abs(s.MovementVector.x) < .01f, "Comfortable full tilt / portrait-up clamp failed");
            Log("3s calibration + 10s neutral + micro/full tilt PASS at " + neutral.eulerAngles + ", micro speed=" + sneak.ToString("F3"));
        }
        foreach (float sensitivity in new[] {.5f, 1f, 2f})
        {
            s.sensitivity = sensitivity;
            Require(Mathf.Abs(s.TiltToInput(Vector2.right * s.maxTiltDegrees).magnitude - 1f) < .001f, "MaxTilt must remain full scale at every sensitivity");
            Require(s.TiltToInput(Vector2.right * s.EffectiveDeadZone).magnitude == 0, "Sensitivity amplified dead-zone noise");
        }
        s.sensitivity = 1f;
        Log("Sensitivity preserves radial neutral and MaxTilt endpoint PASS");
        float last = 0;
        for (int i = 0; i <= 1000; i++)
        {
            float speed = player.SpeedForTilt(i / 1000f);
            Require(speed >= last - .00001f && speed <= player.maxSpeed, "Non-monotonic or unclamped response"); last = speed;
        }
        Require(player.SpeedForTilt(.0001f) < .001f, "Response jumps at dead zone edge");
        Require(Mathf.Abs(player.DesiredVelocity(Vector2.one).magnitude - player.DesiredVelocity(Vector2.right).magnitude) < .001f, "Diagonal speed boost");
        for (int degrees = 0; degrees < 360; degrees += 15)
        {
            Vector2 direction = new Vector2(Mathf.Cos(degrees * Mathf.Deg2Rad), Mathf.Sin(degrees * Mathf.Deg2Rad));
            Vector2 input = s.TiltToInput(direction * 5);
            Require(Vector2.Angle(direction, input) < .1f, "Radial direction distortion");
        }
        Log("Continuous monotone response, 360-degree radial mapping, diagonal clamp PASS");
        foreach (int fps in new[] {30, 60, 120})
        {
            float dt = 1f / fps;
            Teleport(player, new Vector3(0, 1, -11));
            for (int i = 0; i < fps; i++) player.TickMovement(Vector2.up, dt);
            Require(player.Speed > player.maxSpeed * .99f, "Full speed acceleration failed");
            Vector3 start = player.transform.position; int frames = 0;
            do { player.TickMovement(Vector2.zero, dt); frames++; } while (player.Speed > .001f && frames < fps);
            float distance = Vector3.Distance(start, player.transform.position);
            Require(frames * dt < .3f && distance < .65f, "Excessive braking drift");
            Log(fps + "fps braking PASS: " + (frames * dt).ToString("F3") + "s / " + distance.ToString("F3") + "m");
        }
        Teleport(player, new Vector3(-9, 1, -6));
        for (int i = 0; i < 70; i++) player.TickMovement(new Vector2(.5f, .5f), Dt);
        Require(player.transform.position.x > -7.5f && player.transform.position.z < -5.5f, "Stage 01 wall slide failed: " + player.transform.position);
        Log("Stage 01 diagonal wall slide PASS: " + player.transform.position);
        for (int repeat = 0; repeat < 3; repeat++)
        {
            Teleport(player, new Vector3(-5.2f, 1, -6.1f));
            foreach (Vector3 waypoint in new[] {
                new Vector3(-3.2f,1,-6.1f), new Vector3(-3.2f,1,-3.4f), new Vector3(-1,1,-3.4f),
                new Vector3(-1,1,1.2f), new Vector3(-2.7f,1,1.2f), new Vector3(-2.7f,1,2.4f),
                new Vector3(-5.4f,1,2.4f), new Vector3(-5.4f,1,-.4f)})
            {
                int frames = 0;
                while (Vector3.Distance(player.transform.position, waypoint) > .10f && frames++ < 1200)
                {
                    Vector3 delta = waypoint - player.transform.position;
                    player.TickMovement(new Vector2(delta.x, delta.z).normalized * .3f, Dt);
                }
                Require(frames < 1200, "Stuck at Stage 01 corner/statue waypoint " + waypoint + " actual=" + player.transform.position);
            }
        }
        Log("Stage 01 precision route, partition corner and statue circuit x3 PASS");
        // Exercise actual GameStateController -> Sensor -> Player -> Detection integration.
        game.sensor = player.sensor = s;
        Calibrate(s, Quaternion.Euler(135, 0, 0));
        Quaternion held = s.NeutralPose * Quaternion.Euler(0, 20, 0);
        for (int i = 0; i < 60; i++) Sample(s, held);
        Teleport(player, new Vector3(-4, 1, -.2f));
        for (int i = 0; i < 30; i++) player.TickMovement(Vector2.right, Dt);
        game.guards[0].transform.position = player.transform.position + new Vector3(0, 0, -1.8f);
        game.guards[0].transform.forward = Vector3.forward; Physics.SyncTransforms();
        game.SendMessage("StartFreeze");
        Require(SensorManager.PoseAngle(s.FreezeReferencePose, held) < .001f, "Freeze did not capture current pose");
        Sample(s, held); game.detection.ResetRun(); game.SendMessage("Update"); player.SendMessage("Update");
        Require(player.SmoothedVelocity.magnitude > 0, "Freeze artificially zeroed velocity");
        Require(game.GuardVisibility && game.SensorMovementScore < .06f && game.detection.GainPerSecond == 0, "Still hand penalized for braking inertia");
        // A small real hand movement must not inherit fast controller-braking speed.
        sampleTime += Dt;
        s.ProcessSample(new SensorManager.Sample { pose=held, poseTime=sampleTime, attitudeAvailable=true, motionAvailable=true,
            gravity=Quaternion.Inverse(held)*Vector3.down, acceleration=Quaternion.Inverse(held)*Vector3.down,
            gyro=new Vector3(0,.12f,0) }, Dt);
        game.SendMessage("Update");
        Require(game.SensorMovementScore > .06f && game.detection.GainPerSecond < 15f, "Micro motion inherited fast braking detection");
        Log("Micro hand movement is not amplified by previous fast velocity PASS");
        Sample(s, held * Quaternion.Euler(0, 5, 0)); game.SendMessage("Update");
        Require(game.SensorMovementScore > .5f && game.detection.GainPerSecond > 0, "Real device motion failed to raise detection");
        float first = s.MotionScore(held, s.GravityReference, 3.5f), second = s.MotionScore(held, s.GravityReference, 3.5f);
        Require(first == second, "Repeated score query changed motion evidence");
        for (int i = 0; i < 90; i++) Sample(s, held * Quaternion.Euler(0, 5, 0));
        Require(s.MotionScore(held, s.GravityReference, 3.5f) <= .06f, "Stationary changed pose created endless motion");
        Log("Sudden FREEZE: current pose reference, retained braking, zero inertia penalty, actual motion detection PASS");
    }
}
