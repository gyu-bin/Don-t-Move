using System;
using System.IO;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

public static class PrototypePlaySmoke
{
    static int step;
    static double stepStarted;
    static double deadline;
    static double launchAt;
    static GameStateController game;
    static PlayerController player;
    static GuardController[] guards;
    static MissionController mission;
    static DetectionSystem detection;
    static Keyboard keyboard;
    static Vector3 playerStart, guardStart;
    static float detectionStart;
    static float maxInput;
    static float maxLegSwing;
    static bool maxKey;
    static int frameAtMove;
    static bool sawMove, sawReady, sawFreeze;
    static bool capturedVision;
    static bool previousOptionsEnabled;
    static EnterPlayModeOptions previousOptions;

    public static void Run()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");
        if (UnityEngine.Object.FindObjectsByType<PlayerController>(FindObjectsSortMode.None).Length != 1 ||
            UnityEngine.Object.FindObjectsByType<GuardController>(FindObjectsSortMode.None).Length != 2 ||
            UnityEngine.Object.FindObjectsByType<GuardVision>(FindObjectsSortMode.None).Length != 2 ||
            UnityEngine.Object.FindObjectsByType<CoverMarker>(FindObjectsSortMode.None).Length < 2 ||
            UnityEngine.Object.FindObjectsByType<DMVisualAnimator>(FindObjectsSortMode.None).Length < 3)
            throw new Exception("SMOKE: missing Player, Guards, or Covers in Stage 01");
        Debug.Log("SMOKE: scene structure PASS");
        previousOptionsEnabled = EditorSettings.enterPlayModeOptionsEnabled;
        previousOptions = EditorSettings.enterPlayModeOptions;
        EditorSettings.enterPlayModeOptionsEnabled = true;
        EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
        launchAt = EditorApplication.timeSinceStartup + 5;
        EditorApplication.playModeStateChanged += OnMode;
        EditorApplication.update += Launch;
    }

    static void Launch()
    {
        if (EditorApplication.timeSinceStartup < launchAt) return;
        EditorApplication.update -= Launch;
        Debug.Log("SMOKE: requesting Editor Play Mode");
        EditorApplication.isPlaying = true;
    }

    static void OnMode(PlayModeStateChange state)
    {
        if (state != PlayModeStateChange.EnteredPlayMode) return;
        deadline = EditorApplication.timeSinceStartup + 35;
        EditorApplication.update += Tick;
        game = UnityEngine.Object.FindFirstObjectByType<GameStateController>();
        player = UnityEngine.Object.FindFirstObjectByType<PlayerController>();
        guards = UnityEngine.Object.FindObjectsByType<GuardController>(FindObjectsSortMode.None);
        mission = UnityEngine.Object.FindFirstObjectByType<MissionController>();
        detection = UnityEngine.Object.FindFirstObjectByType<DetectionSystem>();
        CheckDetectionRules();
        CheckMovementCurve();
        keyboard = InputSystem.AddDevice<Keyboard>("SmokeKeyboard");
        PlaySmokeDriver.keyboard = keyboard;
        PlaySmokeDriver.desiredKeys = Array.Empty<Key>();
        new GameObject("Play Smoke Input Driver").AddComponent<PlaySmokeDriver>();
        game.moveDuration = 1.5f;
        game.getReadyDuration = .45f;
        game.freezeDuration = 3f;
        playerStart = player.transform.position;
        guardStart = guards[0].transform.position;
        Next(0);
        Debug.Log("SMOKE: entered Editor Play Mode");
    }

    static void CheckDetectionRules()
    {
        detection.ResetRun();
        detection.Tick(1f, false, 5f, 1f, 1f);
        Require(detection.Detection == 0f && detection.GainPerSecond == 0f, "outside vision gained detection");
        detection.Tick(0f, true, 0f, 4f, 1f);
        Require(detection.Detection == 0f && detection.GainPerSecond == 0f, "visible stationary player gained detection");
        detection.Tick(.14f, true, 0f, 4f, 1f);
        float slowGain = detection.GainPerSecond;
        Require(slowGain > 0f, "micro movement produced no detection");
        detection.ResetRun();
        detection.Tick(1f, true, 0f, 4f, 1f);
        float fastGain = detection.GainPerSecond;
        Require(fastGain > slowGain, "clear movement is not stronger than micro movement");
        detection.ResetRun();
        detection.Tick(0f, true, player.maxSpeed, 1f, 1f);
        Require(detection.GainPerSecond > fastGain, "actual world speed or guard proximity had no effect");
        float beforeCover = detection.Detection;
        detection.Tick(1f, false, player.maxSpeed, 1f, 1f);
        Require(detection.GainPerSecond == 0f && detection.Detection <= beforeCover, "cover allowed detection gain");
        detection.ResetRun();
        Debug.Log("SMOKE: visibility, stillness, micro/clear motion, world speed, proximity, cover PASS");
    }

    static void CheckMovementCurve()
    {
        SensorManager sensor = player.sensor;
        Require(sensor.TiltToInput(Vector2.zero) == Vector2.zero &&
                sensor.TiltToInput(Vector2.right * sensor.deadZoneDegrees) == Vector2.zero,
            "neutral or dead-zone tilt moved the player");
        float middleTilt = (sensor.deadZoneDegrees + sensor.maxTiltDegrees) * .5f;
        Require(sensor.TiltToInput(Vector2.right * middleTilt).magnitude > 0f &&
                sensor.TiltToInput(Vector2.right * middleTilt).magnitude < 1f &&
                Mathf.Abs(sensor.TiltToInput(Vector2.right * (sensor.maxTiltDegrees + 10f)).magnitude - 1f) < .001f,
            "tilt angle mapping is not proportional or clamped");
        float stopped = player.SpeedForTilt(0f);
        float sneak = player.SpeedForTilt(.15f);
        float normal = player.SpeedForTilt(.5f);
        float fast = player.SpeedForTilt(.85f);
        float maximum = player.SpeedForTilt(1f);
        Require(stopped == 0f && sneak > 0f && sneak < normal && normal < fast && fast < maximum,
            "tilt response is not progressive");
        Require(Mathf.Abs(maximum - player.maxSpeed) < .001f && Mathf.Abs(player.SpeedForTilt(2f) - maximum) < .001f,
            "maximum tilt speed is not clamped");
        float straight = player.DesiredVelocity(Vector2.up).magnitude;
        float diagonal = player.DesiredVelocity(new Vector2(1f, 1f)).magnitude;
        Require(Mathf.Abs(straight - diagonal) < .001f, "diagonal movement is faster than straight movement");
        float originalCurve = player.responseCurve;
        player.responseCurve = 4f;
        Require(player.SpeedForTilt(.5f) < normal, "response curve tuning has no effect");
        player.responseCurve = originalCurve;
        Debug.Log("SMOKE: tilt dead zone, angle mapping, progressive response, maximum clamp, diagonal speed, curve tuning PASS");
    }

    static void Tick()
    {
        if (EditorApplication.timeSinceStartup > deadline)
            Fail("timeout at step " + step + " state=" + (game != null ? game.State.ToString() : "null") +
                " detection=" + (detection != null ? detection.Detection.ToString("F1") : "null") +
                " visible=" + (game != null && game.GuardVisibility) +
                " score=" + (game != null ? game.MovementScore.ToString("F2") : "null"));
        if (!EditorApplication.isPlaying || (game == null && step != 8)) return;
        if (step == 8)
        {
            game = UnityEngine.Object.FindFirstObjectByType<GameStateController>();
            if (game == null) return;
        }
        sawMove |= game.State == GameState.Playing;
        sawReady |= game.State == GameState.GetReady;
        sawFreeze |= game.State == GameState.Freeze;
        double elapsed = EditorApplication.timeSinceStartup - stepStarted;
        switch (step)
        {
            case 0: // Three-second calibration.
                if (game.State != GameState.Calibrating) { Require(game.State == GameState.Playing, "calibration did not finish"); frameAtMove = Time.frameCount; Next(1); }
                break;
            case 1: // Desktop keyboard fallback, patrol, camera.
                Press(Key.W);
                maxInput = Mathf.Max(maxInput, player.sensor.MovementVector.magnitude);
                DMVisualAnimator rig = player.GetComponentInChildren<DMVisualAnimator>();
                if (rig != null && rig.leftLeg != null)
                    maxLegSwing = Mathf.Max(maxLegSwing, Mathf.Abs(Mathf.DeltaAngle(0f, rig.leftLeg.localEulerAngles.x)));
                maxKey |= keyboard.wKey.isPressed;
                if (elapsed < .7) break;
                Press();
                Require(player.transform.position.z > playerStart.z + .15f,
                    "W key did not move player: state=" + game.State +
                    " z=" + player.transform.position.z.ToString("F2") +
                    " start=" + playerStart.z.ToString("F2") +
                    " key=" + keyboard.wKey.isPressed +
                    " input=" + player.sensor.MovementVector +
                    " maxInput=" + maxInput.ToString("F2") +
                    " maxKey=" + maxKey +
                    " frames=" + (Time.frameCount - frameAtMove) +
                    " canMove=" + game.CanMove);
                Require(Vector3.Distance(guards[0].transform.position, guardStart) > .1f, "guard did not patrol");
                Require(maxLegSwing > 2f && guards[0].GetComponentInChildren<DMVisualAnimator>() != null,
                    "agent or guard visual animation did not run");
                var camera = UnityEngine.Object.FindFirstObjectByType<CameraController>();
                Require(camera != null && camera.target == player.transform && camera.GetComponent<UnityEngine.Camera>().orthographic, "camera follow invalid");
                Debug.Log("SMOKE: keyboard movement, patrol, camera PASS");
                Next(2);
                break;
            case 2: // Natural MOVE -> GET READY -> FREEZE cycle.
                if (!sawReady || !sawFreeze) break;
                Debug.Log("SMOKE: MOVE, GET READY, FREEZE PASS");
                Next(3);
                break;
            case 3: // Physics wall and cover occlusion, then visible freeze detection.
                guards[0].transform.position = new Vector3(-6, 1, -6);
                Teleport(new Vector3(-6, 1, -3));
                guards[0].FacePlayer(player.transform, 1);
                Physics.SyncTransforms();
                guards[0].vision.Evaluate();
                Require(!guards[0].vision.SeesPlayer, "wall did not occlude vision");
                guards[0].transform.position = new Vector3(-4, 1, -2);
                Teleport(new Vector3(-4, 1, 3));
                guards[0].FacePlayer(player.transform, 1);
                Physics.SyncTransforms();
                guards[0].vision.Evaluate();
                Require(guards[0].vision.IsFullyCovered && !guards[0].vision.SeesPlayer, "cover did not occlude vision");
                Debug.Log("SMOKE: wall and cover vision PASS");
                Teleport(new Vector3(-4, 1, -.2f));
                guards[0].FacePlayer(player.transform, 1);
                Physics.SyncTransforms();
                guards[0].vision.Evaluate();
                Require(guards[0].vision.SeesPlayer, "guard should see uncovered player");
                if (game.State != GameState.Freeze) Press(Key.F); else Press();
                detectionStart = detection.Detection;
                Next(4);
                break;
            case 4: // Keyboard motion raises detection when visible.
                if (elapsed < .15) { Press(); break; }
                Require(game.State == GameState.Freeze, "could not force FREEZE");
                if (!capturedVision)
                {
                    CaptureVision();
                    capturedVision = true;
                }
                Press(Key.LeftShift, Key.W);
                if (elapsed < .9) break;
                Press();
                Require(detection.Detection > detectionStart + .2f, "visible movement did not raise detection");
                Debug.Log("SMOKE: FREEZE movement detection PASS");
                Next(5);
                break;
            case 5: // Re-enter cover during FREEZE and verify movement permission.
                Teleport(new Vector3(-4, 1, 3));
                guards[0].FacePlayer(player.transform, 1);
                Physics.SyncTransforms();
                if (elapsed < .15) break;
                Require(!game.GuardVisibility && game.CanMove, "covered player cannot move in FREEZE");
                Debug.Log("SMOKE: covered movement permission PASS");
                Next(6);
                break;
            case 6: // Physics trigger collection.
                Teleport(mission.diamond.position + Vector3.up * .1f);
                Physics.SyncTransforms();
                if (elapsed < .3) break;
                Require(mission.HasDiamond, "diamond trigger did not collect");
                Debug.Log("SMOKE: diamond trigger PASS");
                Next(7);
                break;
            case 7:
                Teleport(mission.exit.position + Vector3.up * .8f);
                Physics.SyncTransforms();
                if (elapsed < .3) break;
                Require(game.State == GameState.MissionComplete && !string.IsNullOrEmpty(game.Grade), "exit mission completion failed");
                Debug.Log("SMOKE: mission complete and grade PASS");
                game.Retry();
                Next(8);
                break;
            case 8: // Scene reload and failed run.
                if (elapsed < .2) break;
                game = UnityEngine.Object.FindFirstObjectByType<GameStateController>();
                player = UnityEngine.Object.FindFirstObjectByType<PlayerController>();
                guards = UnityEngine.Object.FindObjectsByType<GuardController>(FindObjectsSortMode.None);
                detection = UnityEngine.Object.FindFirstObjectByType<DetectionSystem>();
                Require(game != null && game.State == GameState.Calibrating, "retry did not reload calibration");
                Debug.Log("SMOKE: retry PASS");
                new GameObject("Play Smoke Input Driver Retry").AddComponent<PlaySmokeDriver>();
                PlaySmokeDriver.keyboard = keyboard;
                detection.multiplier = 5f;
                game.freezeDuration = 5f;
                guards[0].transform.position = new Vector3(-4, 1, -2);
                Teleport(new Vector3(-4, 1, -.2f));
                guards[0].FacePlayer(player.transform, 1);
                Press(Key.F);
                Next(9);
                break;
            case 9:
                if (elapsed < .2) { Press(Key.F); break; }
                Press(Key.LeftShift, Key.W);
                if (game.State != GameState.Detected) break;
                Press();
                Debug.Log("SMOKE: DETECTED PASS");
                Require(sawMove && sawReady && sawFreeze, "phase coverage incomplete");
                Debug.Log("SMOKE: ALL EDITOR PLAY CHECKS PASSED");
                Finish(0);
                break;
        }
    }

    static void Teleport(Vector3 position)
    {
        CharacterController body = player.GetComponent<CharacterController>();
        body.enabled = false;
        player.transform.position = position;
        body.enabled = true;
    }
    static void CaptureVision()
    {
        Camera camera = Camera.main;
        if (camera == null) return;
        const int width = 720, height = 1280;
        RenderTexture target = new RenderTexture(width, height, 24);
        RenderTexture previous = RenderTexture.active;
        camera.targetTexture = target;
        camera.Render();
        RenderTexture.active = target;
        Texture2D image = new Texture2D(width, height, TextureFormat.RGB24, false);
        image.ReadPixels(new Rect(0f, 0f, width, height), 0, 0);
        image.Apply();
        Directory.CreateDirectory("Assets/Art/Previews");
        File.WriteAllBytes("Assets/Art/Previews/DM_Stage01_VisionCone.png", image.EncodeToPNG());
        camera.targetTexture = null;
        RenderTexture.active = previous;
        UnityEngine.Object.DestroyImmediate(image);
        target.Release();
        UnityEngine.Object.DestroyImmediate(target);
    }
    static void Press(params Key[] keys)
    {
        PlaySmokeDriver.desiredKeys = keys;
    }
    static void Next(int value) { step = value; stepStarted = EditorApplication.timeSinceStartup; }
    static void Require(bool condition, string message) { if (!condition) Fail(message); }
    static void Fail(string message)
    {
        Debug.LogError("SMOKE FAILED: " + message);
        Finish(1);
    }
    static void Finish(int code)
    {
        EditorApplication.update -= Tick;
        EditorApplication.playModeStateChanged -= OnMode;
        EditorSettings.enterPlayModeOptions = previousOptions;
        EditorSettings.enterPlayModeOptionsEnabled = previousOptionsEnabled;
        EditorApplication.Exit(code);
    }
}
