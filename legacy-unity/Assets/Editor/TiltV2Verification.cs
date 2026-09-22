using System;
using System.Collections.Generic;
using System.IO;
using DontMove;
using UnityEngine;
using Object=UnityEngine.Object;
public static class TiltV2Verification
{
    static List<string> log=new List<string>();static double stamp;
    static void Require(bool b,string m){if(!b)throw new Exception("Tilt V2: "+m);}
    static void Note(string s){log.Add(s);Debug.Log("TILT V2 TEST: "+s);}
    static void Sample(SensorManager sensor,Quaternion pose,float dt=1f/60f,bool attitude=true)
    {
        stamp+=dt;sensor.ProcessSample(new SensorManager.Sample{pose=pose,poseTime=stamp,attitudeAvailable=attitude,motionAvailable=true,gravity=Quaternion.Inverse(pose)*Vector3.down,acceleration=Quaternion.Inverse(pose)*Vector3.down},dt);
    }
    public static void Check(GameStateController game)
    {
        log.Clear();var go=new GameObject("Tilt V2 isolated sensor replay");var s=go.AddComponent<SensorManager>();s.enabled=false;
        try
        {
            foreach(var neutral in new[]{Quaternion.identity,Quaternion.Euler(70,10,0),Quaternion.Euler(135,30,20),Quaternion.Euler(175,-45,75)})
            {
                s.BeginCalibration();int frames=0;
                while(!s.CalibrationReady&&frames++<90){Sample(s,neutral);s.TickCalibration(1f/60f);}
                Require(s.CalibrationReady&&frames<=33,"Stable calibration not ~0.5s");
                Require(SensorManager.PoseAngle(s.NeutralPose,neutral)<.001f,"Neutral not accepted current pose");
                Quaternion saved=s.NeutralPose;
                for(int i=0;i<600;i++)Sample(s,neutral);
                Require(s.MovementVector==Vector2.zero,"10-second neutral drift");
                for(int i=0;i<3600;i++)Sample(s,neutral*Quaternion.Euler(0,15,0));
                Require(SensorManager.PoseAngle(saved,s.NeutralPose)<.001f,"Neutral auto recentered");
                Require(s.MovementVector.x>0&&s.EvaluateDeviceMotion(3.5f)<.001f,"Held tilt counted as device motion");
                Sample(s,neutral);Require(s.MovementVector==Vector2.zero,"Return not centered");
                for(int i=0;i<60;i++)Sample(s,neutral*Quaternion.AngleAxis(75,Vector3.forward));
                Require(s.MovementVector.magnitude<.001f,"Yaw leaks into movement");
                Vector2 plain=SensorManager.RelativeAngles(neutral,neutral*Quaternion.Euler(-10,15,0));
                Vector2 twisted=SensorManager.RelativeAngles(neutral,neutral*Quaternion.Euler(-10,15,0)*Quaternion.AngleAxis(80,Vector3.forward));
                Require(Vector2.Distance(plain,twisted)<.001f,"Twist changes pitch/roll");
                Quaternion changed=neutral*Quaternion.Euler(-12,18,20);Sample(s,changed);Require(s.Recenter(),"Manual recenter rejected");
                Require(s.MovementVector==Vector2.zero&&SensorManager.PoseAngle(changed,s.NeutralPose)<.001f,"Recenter not immediate");
            }
            Note("Four start postures: ~0.5s calibration, 10s neutral, 60s held tilt/return, yaw rejection, manual recenter PASS");
            Require(SensorManager.RelativeAngles(Quaternion.identity,Quaternion.Euler(-10,0,0)).y>9,"Forward pitch sign");
            Require(SensorManager.RelativeAngles(Quaternion.identity,Quaternion.Euler(0,10,0)).x>9,"Right roll sign");
            Require(s.TiltToInput(new Vector2(2,0))==Vector2.zero,"3-degree dead zone");
            Require(s.TiltToInput(new Vector2(3.01f,0)).magnitude<.001f,"Dead zone discontinuity");
            Require(Mathf.Abs(s.TiltToInput(new Vector2(25,25)).magnitude-1)<.001f,"Diagonal clamp");
            s.BeginCalibration();for(int i=0;i<510;i++){Sample(s,Quaternion.Euler(i,0,0));s.TickCalibration(1f/60f);}
            Require(s.CalibrationFailed&&!s.CalibrationReady,"Unstable calibration did not time out");
            s.BeginCalibration();for(int i=0;i<40;i++){Sample(s,Quaternion.identity);s.TickCalibration(1f/60f);}
            Require(s.CalibrationReady,"Calibration retry failed");
            s.BeginCalibration();for(int i=0;i<510;i++){Sample(s,Quaternion.Euler(30,30,0),1f/60f,false);s.TickCalibration(1f/60f);}
            Require(s.CalibrationFailed&&s.MovementVector==Vector2.zero,"Raw acceleration used as direction fallback");
            Note("Direction signs, radial onset/clamp, unstable/missing-attitude timeout and explicit retry PASS");
            var player=game.player;var animation=player.GetComponentInChildren<PlayerSpriteAnimator>();
            var cc=player.GetComponent<CharacterController>();cc.enabled=false;player.transform.position=new Vector3(3.9f,1,2.6f);cc.enabled=true;Physics.SyncTransforms();
            foreach(float input in new[]{.1f,.5f,1f})
            {
                player.ResetMotion();float speed=0;float maxFoot=-100,minFoot=100;
                for(int i=0;i<18;i++)
                {
                    player.TickMovement(Vector2.right*input,1f/60);animation.Sync(1f/60);
                    speed=player.Speed;maxFoot=Mathf.Max(maxFoot,animation.leftFoot.transform.localPosition.y);minFoot=Mathf.Min(minFoot,animation.leftFoot.transform.localPosition.y);
                }
                Require(speed>0&&animation.AnimationState!=MovementState.Idle,"Moving player has idle animation");
                Require(animation.PlaybackSpeed>0&&maxFoot-minFoot>.0001f,"Placeholder feet do not cycle");
                Require(animation.animator.GetCurrentAnimatorStateInfo(0).IsName(player.MovementState.ToString()),"Animator state mismatches actual speed");
            }
            player.ResetMotion();animation.Sync(1f/60);Require(animation.AnimationState==MovementState.Idle&&animation.PlaybackSpeed==0,"Idle does not stop gait");
            foreach(var direction in new[]{Vector2.up,Vector2.down,Vector2.left,Vector2.right})
            {
                player.ResetMotion();player.TickMovement(direction*.2f,1f/60);animation.Sync(1f/60);
                int expected=direction==Vector2.up?1:direction==Vector2.down?0:direction==Vector2.left?2:3;
                Require(animation.Facing==expected,"4-direction facing incorrect");
            }
            Note("Actual Animator states Idle/Sneak/Walk/Run, articulated placeholder foot motion, distance-driven playback, stop and four facings PASS");
            Note("Guard/Detection untouched; full 2D regression follows in EditorTests.txt");
        }
        finally {Object.DestroyImmediate(go);Directory.CreateDirectory("Reports/TiltV2");File.WriteAllLines("Reports/TiltV2/EditorTests.txt",log);}
    }
}
