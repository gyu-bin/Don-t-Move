using System;
using System.Collections.Generic;
using System.IO;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using Object=UnityEngine.Object;
public static class Stealth2DVerification
{
    static List<string> results=new List<string>();static int exitCode;
    static bool oldEnabled;static EnterPlayModeOptions oldOptions;
    static GameStateController game; static float started; static int phase;
    static Keyboard keyboard;static PlaySmokeDriver driver;
    [MenuItem("Don't Move/QA/Run Stage 01 Play Verification")]
    public static void Run()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");
        oldEnabled=EditorSettings.enterPlayModeOptionsEnabled;oldOptions=EditorSettings.enterPlayModeOptions;
        EditorSettings.enterPlayModeOptionsEnabled=true;EditorSettings.enterPlayModeOptions=EnterPlayModeOptions.DisableDomainReload;
        EditorApplication.playModeStateChanged+=Mode;EditorApplication.isPlaying=true;
    }
    static void Mode(PlayModeStateChange state)
    {
        if(state==PlayModeStateChange.EnteredPlayMode) {started=Time.realtimeSinceStartup;EditorApplication.update+=Update;}
        if(state==PlayModeStateChange.EnteredEditMode)
        {
            EditorApplication.update-=Update;EditorApplication.playModeStateChanged-=Mode;
            EditorSettings.enterPlayModeOptionsEnabled=oldEnabled;EditorSettings.enterPlayModeOptions=oldOptions;
            EditorApplication.Exit(exitCode);
        }
    }
    static void Log(string s){results.Add(s);Debug.Log("2D TEST: "+s);}
    static void Require(bool condition,string message){if(!condition)throw new Exception(message);}
    static void Done(Exception e=null)
    {
        if(e!=null){exitCode=1;Log("FAIL "+e);}
        if(keyboard!=null)InputSystem.RemoveDevice(keyboard);
        PlaySmokeDriver.keyboard=null;PlaySmokeDriver.desiredKeys=Array.Empty<Key>();
        Directory.CreateDirectory("Reports/2DVerticalSlice");File.WriteAllLines("Reports/2DVerticalSlice/EditorTests.txt",results);
        EditorApplication.update-=Update;EditorApplication.isPlaying=false;
    }
    static void Update()
    {
        try
        {
            if(Time.realtimeSinceStartup-started>70)throw new Exception("Play verification timeout");
            if(phase==0)
            {
                game=Object.FindFirstObjectByType<GameStateController>();
                if(game==null||!game.CanMove)return;
                Log("Stable calibration + READY -> Playing PASS; no global FREEZE/GET READY states");
                keyboard=InputSystem.AddDevice<Keyboard>();PlaySmokeDriver.keyboard=keyboard;
                driver=new GameObject("2D Keyboard Test").AddComponent<PlaySmokeDriver>();
                PlaySmokeDriver.desiredKeys=new[]{Key.D};phase=1;started=Time.realtimeSinceStartup;return;
            }
            if(phase==1)
            {
                if(Time.realtimeSinceStartup-started<.35f)return;
                Require(game.player.Speed>.2f,"Keyboard movement failed");
                Require(game.player.transform.position.x>3*1.3f+.2f,"Keyboard direction failed");
                Log("Actual Play Mode keyboard movement + camera follow PASS");
                PlaySmokeDriver.desiredKeys=Array.Empty<Key>();
                game.enabled=false;game.sensor.enabled=false;game.player.enabled=false;
                Checks();
                // Actual trigger entry is evaluated over subsequent physics frames.
                game.mission.ResetMission();Teleport(game.player,game.mission.exit.position+Vector3.right*2);
                phase=2;started=Time.realtimeSinceStartup;return;
            }
            if(phase==2)
            {
                MoveTo(game.mission.exit.position);
                if(Time.realtimeSinceStartup-started<1)return;
                Require(game.State!=GameState.MissionComplete,"Exit allowed without diamond");
                Log("Exit rejects missing diamond PASS");
                Teleport(game.player,game.mission.diamond.position+Vector3.right*2);phase=3;started=Time.realtimeSinceStartup;return;
            }
            if(phase==3)
            {
                MoveTo(game.mission.diamond.position);
                if(!game.mission.HasDiamond)return;
                Log("Actual CharacterController trigger collected diamond PASS");
                Teleport(game.player,game.mission.exit.position+Vector3.right*2);phase=4;started=Time.realtimeSinceStartup;return;
            }
            if(phase==4)
            {
                MoveTo(game.mission.exit.position);
                if(game.State!=GameState.MissionComplete)return;
                Log("Actual Exit trigger -> MISSION COMPLETE PASS");
                game.Retry();phase=5;started=Time.realtimeSinceStartup;return;
            }
            if(phase==5)
            {
                game=Object.FindFirstObjectByType<GameStateController>();if(game==null||!game.CanMove)return;
                Require(!game.mission.HasDiamond&&game.detection.Detection==0,"Retry didn't reset run");
                Log("Retry reloads new 2D scene, mission and detection PASS");
                game.enabled=false;game.sensor.enabled=false;game.player.enabled=false;
                var g=game.guards[0];Teleport(game.player,g.transform.position);
                game.TickGame(.01f);
                Require(game.State==GameState.Detected,"CAUGHT transition failed");Log("Guard contact radius -> CAUGHT PASS");
                Log("ALL 2D PLAY MODE CHECKS PASSED");Done();
            }
        } catch(Exception e){Done(e);}
    }
    static void MoveTo(Vector3 goal)
    {
        Vector3 delta=goal-game.player.transform.position;delta.y=0;
        game.player.TickMovement(new Vector2(delta.x,delta.z).normalized*.6f,Time.deltaTime);
    }
    static void Teleport(PlayerController p,Vector3 pos)
    {
        var cc=p.GetComponent<CharacterController>();cc.enabled=false;p.transform.position=new Vector3(pos.x,1,pos.z);cc.enabled=true;Physics.SyncTransforms();p.TickMovement(Vector2.zero,.016f,false);
    }
    static void RouteCheck()
    {
        var cells=new HashSet<Vector2Int>();
        foreach(var sr in Object.FindObjectsByType<SpriteRenderer>(FindObjectsSortMode.None))
            if(sr.name=="Marble Floor")
            {
                Vector3 p=sr.transform.position;p.y=1;
                if(!Physics.CheckCapsule(p-Vector3.up*.5f,p+Vector3.up*.5f,.31f,1<<8,QueryTriggerInteraction.Ignore))
                    cells.Add(new Vector2Int(Mathf.RoundToInt(p.x/1.3f),Mathf.RoundToInt(p.z/1.3f)));
            }
        var checkpoints=new[]{new Vector2Int(3,2),new Vector2Int(8,12),new Vector2Int(10,17),new Vector2Int(10,20),new Vector2Int(2,22)};
        Teleport(game.player,new Vector3(3.9f,1,2.6f));int total=0;
        for(int section=1;section<checkpoints.Length;section++)
        {
            var start=checkpoints[section-1];var end=checkpoints[section];
            var queue=new Queue<Vector2Int>();var parent=new Dictionary<Vector2Int,Vector2Int>();queue.Enqueue(start);parent[start]=start;
            while(queue.Count>0&&!parent.ContainsKey(end))
            {
                var cell=queue.Dequeue();foreach(var step in new[]{Vector2Int.right,Vector2Int.up,Vector2Int.left,Vector2Int.down})
                { var next=cell+step;if(cells.Contains(next)&&!parent.ContainsKey(next)){parent[next]=cell;queue.Enqueue(next);} }
            }
            Require(parent.ContainsKey(end),"Route unreachable "+end);
            var route=new List<Vector2Int>();for(var cell=end;cell!=start;cell=parent[cell])route.Add(cell);route.Reverse();
            foreach(var cell in route)
            {
                var goal=new Vector3(cell.x*1.3f,1,cell.y*1.3f);int ticks=0;
                while(Vector3.Distance(game.player.transform.position,goal)>.055f&&ticks++<500)
                {
                    Vector3 delta=goal-game.player.transform.position;
                    game.player.TickMovement(Vector2.ClampMagnitude(new Vector2(delta.x,delta.z)*2,.6f),.016f);
                }
                Require(ticks<500,"Character stuck on route at "+cell+" position "+game.player.transform.position);total++;
            }
        }
        Log("Full collision-resolved start -> east approach -> Diamond -> alternate north route -> Exit ("+total+" cells) PASS");
    }
    static void Checks()
    {
        Require(Object.FindObjectsByType<DirectionalSprite>(FindObjectsSortMode.None).Length==2,"Wrong sprite actor count");
        Require(Object.FindObjectsByType<PlayerSpriteAnimator>(FindObjectsSortMode.None).Length==1,"Player 2D Animator missing");
        TiltV2Verification.Check(game);
        var d=game.detection;
        d.ResetRun();d.Tick(1,false,5,1,1);Require(d.Detection==0,"Outside vision gains");
        d.Tick(0,true,0,1,1);Require(d.Detection==0,"Idle gains");
        float[] gains=new float[3];float[] speeds={.3f,2.6f,5.2f};
        for(int i=0;i<3;i++){d.ResetRun();d.Tick(0,true,speeds[i],6,1);gains[i]=d.GainPerSecond;}
        Require(gains[0]>0&&gains[0]<gains[1]&&gains[1]<gains[2],"Speed risk not monotone");
        d.ResetRun();d.Tick(0,true,5.2f,.5f,1);Require(d.GainPerSecond>gains[2],"No proximity risk");
        float before=d.Detection;d.Tick(1,false,5,.5f,1);Require(d.GainPerSecond==0&&Mathf.Approximately(before,d.Detection),"Safety delay failed");
        d.Tick(0,false,0,100,1);Require(d.Detection<before,"Safe decay failed");
        Log("Outside/idle=0; Sneak "+gains[0].ToString("F2")+", Walk "+gains[1].ToString("F2")+", Run "+gains[2].ToString("F2")+" gain/sec; proximity + delayed decay PASS");
        var a=game.guards[0];var b=game.guards[1];var statesA=new HashSet<PatrolState>();var statesB=new HashSet<PatrolState>();bool independent=false;
        for(int i=0;i<800;i++){a.TickPatrol(.05f);b.TickPatrol(.05f);statesA.Add(a.State);statesB.Add(b.State);independent|=a.State!=b.State;}
        Require(statesA.Count==3&&statesB.Count==3&&independent,"Independent patrol states missing");Log("Both independent Patrol/Stop/Turn patterns PASS");
        a.transform.position=new Vector3(6.5f,1,10.4f);a.transform.rotation=Quaternion.identity;
        Teleport(game.player,new Vector3(6.5f,1,11.7f));a.vision.Evaluate();Require(a.vision.SeesPlayer,"Open vision failed");
        Teleport(game.player,new Vector3(6.5f,1,14.3f));a.vision.Evaluate();Require(!a.vision.SeesPlayer&&a.vision.IsFullyCovered,"Statue cover failed");
        Log("Open vision + statue occlusion PASS");
        GuardAlertFlowCheck(game,a,b);
        Teleport(game.player,new Vector3(3.9f,1,2.6f));
        for(int i=0;i<100;i++)game.player.TickMovement(new Vector2(1,-1).normalized,.016f);
        Require(game.player.transform.position.z>-.65f,"Wall collision failed");Log("Wall collision / diagonal slide PASS");
        RouteCheck();
        // Relative sensor replay retains prior calibration and radial curve mechanics.
        var s=game.sensor;Quaternion neutral=Quaternion.Euler(135,20,5);double stamp=100;
        Action<Quaternion> sample=q=>s.ProcessSample(new SensorManager.Sample{pose=q,poseTime=stamp+=.016,attitudeAvailable=true,motionAvailable=true,gravity=Quaternion.Inverse(q)*Vector3.down,acceleration=Quaternion.Inverse(q)*Vector3.down},.016f);
        sample(neutral);s.BeginCalibration();for(int i=0;i<180;i++){sample(neutral);s.SampleCalibration();}s.EndCalibration();
        for(int i=0;i<600;i++)sample(neutral);Require(s.MovementVector==Vector2.zero,"Neutral drift");
        for(int i=0;i<100;i++)sample(neutral*Quaternion.Euler(0,5,0));float micro=game.player.SpeedForTilt(s.MovementVector.magnitude);
        Require(micro>0&&micro<1,"Precision response failed");
        for(int i=0;i<100;i++)sample(neutral*Quaternion.Euler(0,25,0));Require(s.MovementVector.magnitude>.99f,"Max tilt clamp failed");
        Require(s.EvaluateDeviceMotion(d.motionThreshold)<.001f,"Held tilted device has motion");
        Require(game.player.SpeedForTilt(s.MovementVector.magnitude)>5,"Held tilt stopped movement");
        Log("Lying calibration, 10s neutral, micro tilt, held-tilt movement, max clamp PASS");
        d.ResetRun();Teleport(game.player,new Vector3(7.8f,1,11.7f));a.transform.position=new Vector3(9.1f,1,11.7f);a.transform.rotation=Quaternion.Euler(0,270,0);a.vision.Evaluate();
        foreach(var visual in Object.FindObjectsByType<DirectionalSprite>(FindObjectsSortMode.None)) visual.SendMessage("LateUpdate");
        foreach(var visual in Object.FindObjectsByType<PlayerSpriteAnimator>(FindObjectsSortMode.None)) visual.Sync(1f/60f);
        var camera=Camera.main;var follow=camera.GetComponent<CameraController>();follow.enabled=false;
        camera.transform.position=new Vector3(8.1f,26,14);camera.orthographicSize=9;
        Museum2DBuilder.Capture(camera,"Reports/2DVerticalSlice/Gameplay.png",540,1080);
        camera.transform.position=new Vector3(7,35,15);camera.orthographicSize=18;
        Museum2DBuilder.Capture(camera,"Reports/2DVerticalSlice/MapPlay.png",800,1200);
    }
    static void GuardAlertFlowCheck(GameStateController game,GuardController source,GuardController responder)
    {
        source.transform.position=new Vector3(6.5f,1,10.4f);source.transform.rotation=Quaternion.identity;
        responder.transform.position=new Vector3(2.6f,1,18.2f);responder.transform.rotation=Quaternion.identity;
        Teleport(game.player,new Vector3(6.5f,1,11.7f));
        source.suspiciousMovementScale=40f;
        for(int i=0;i<140&&source.AlertState!=GuardState.Alert;i++)source.TickAI(.1f,game);
        Require(source.AlertState==GuardState.Alert,"Suspicion did not reach ALERT");
        Require(game.GlobalAlert&&game.AlertSource==source,"Whistle did not broadcast global alert");
        Require(responder.AlertState==GuardState.Alert&&responder.AlertSource==source,"Responder missed global snapshot");
        Vector3 snapshot=game.GlobalLastKnownPosition;responder.TickAI(.1f,game);
        Require(Vector3.Distance(responder.CurrentTarget,snapshot)<.01f,"Responder target is not whistle-time LKP");
        source.TickAI(.6f,game);
        Require(source.AlertState==GuardState.Chase&&!source.IsWhistling,"Whistle did not transition source to CHASE");
        Teleport(game.player,new Vector3(3.9f,1,2.6f));source.TickAI(.9f,game);
        Require(source.AlertState==GuardState.Search,"Lost sight did not enter SEARCH");
        source.searchDuration=.2f;source.TickAI(5f,game);
        Require(source.AlertState==GuardState.Return,"Search timeout did not enter RETURN");
        responder.searchDuration=.2f;responder.ForceSearch(snapshot,game);
        Require(responder.AlertState==GuardState.Search,"Responder did not enter SEARCH");
        responder.TickAI(.25f,game);
        Require(responder.AlertState==GuardState.Return,"Responder search did not return");
        Log("PATROL -> SUSPICIOUS -> ALERT -> whistle/global snapshot -> CHASE -> SEARCH -> RETURN PASS");
    }
}
