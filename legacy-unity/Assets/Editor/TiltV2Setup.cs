using System.IO;
using DontMove;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;
public static class TiltV2Setup
{
    const string Folder="Assets/Art2D/Animations/TiltV2";
    public static void Apply()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");ApplyToScene();
        EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene());AssetDatabase.SaveAssets();
        Debug.Log("TILT V2 CONFIGURED");
    }
    public static void ApplyToScene()
    {
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        var player=Object.FindFirstObjectByType<PlayerController>();var sensor=player.sensor;
        sensor.deadZoneDegrees=3;sensor.maxTiltDegrees=25;sensor.sensitivity=1;sensor.smoothing=.06f;player.deceleration=32;
        var old=player.GetComponentInChildren<DirectionalSprite>();
        Sprite[] originals=new Sprite[4];
        for(int i=0;i<4;i++)originals[i]=AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Art2D/DM_Agent_Directions_"+i+".asset");
        if(old!=null)Object.DestroyImmediate(old.gameObject);
        var previous=player.GetComponentInChildren<PlayerSpriteAnimator>();if(previous!=null)Object.DestroyImmediate(previous.gameObject);
        var root=new GameObject("Player 2D Animator");root.transform.SetParent(player.transform,false);root.transform.rotation=Quaternion.Euler(90,0,0);
        var driver=root.AddComponent<PlayerSpriteAnimator>();driver.player=player;driver.animator=root.AddComponent<Animator>();
        driver.directions=new Sprite[4];
        for(int i=0;i<4;i++)
        {
            // Native sprite subrect crops existing boots; temporary articulated soles replace them.
            Rect rect=originals[i].rect;float trim=rect.height*.18f;rect.y+=trim;rect.height-=trim;
            var sprite=Sprite.Create(originals[i].texture,rect,new Vector2(.5f,.5f),100,0,SpriteMeshType.FullRect);
            driver.directions[i]=Save(sprite,Folder+"/Body_"+i+".asset");
        }
        var body=new GameObject("Body");body.transform.SetParent(root.transform,false);body.transform.localPosition=new Vector3(0,.14f,0);
        driver.body=body.AddComponent<SpriteRenderer>();driver.body.sprite=driver.directions[0];
        body.transform.localScale=Vector3.one*(1.16f/driver.body.sprite.bounds.size.y);
        var feet=new GameObject("Gait");feet.transform.SetParent(root.transform,false);feet.transform.localPosition=new Vector3(0,-.47f,0);
        Texture2D texture=new Texture2D(16,24,TextureFormat.RGBA32,false);texture.name="Placeholder sole";
        for(int y=0;y<24;y++)for(int x=0;x<16;x++)
        {float r=Mathf.Pow((x-7.5f)/7.5f,2)+Mathf.Pow((y-11.5f)/11.5f,2);texture.SetPixel(x,y,r<1?new Color(.035f,.045f,.06f):Color.clear);}
        texture.Apply();texture=Save(texture,Folder+"/SoleTexture.asset");
        var sole=Save(Sprite.Create(texture,new Rect(0,0,16,24),new Vector2(.5f,.5f),80),Folder+"/Sole.asset");
        driver.leftFoot=Foot(feet.transform,"Left",-.14f,sole);driver.rightFoot=Foot(feet.transform,"Right",.14f,sole);
        string path=Folder+"/Player.controller";var controller=AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
        if(controller==null)controller=AnimatorController.CreateAnimatorControllerAtPath(path);
        foreach(var state in controller.layers[0].stateMachine.states)controller.layers[0].stateMachine.RemoveState(state.state);
        controller.parameters=new[]{new AnimatorControllerParameter{name="Speed",type=AnimatorControllerParameterType.Float},new AnimatorControllerParameter{name="PlaybackSpeed",type=AnimatorControllerParameterType.Float},new AnimatorControllerParameter{name="MovementState",type=AnimatorControllerParameterType.Int},new AnimatorControllerParameter{name="Facing",type=AnimatorControllerParameterType.Int},new AnimatorControllerParameter{name="FacingX",type=AnimatorControllerParameterType.Float},new AnimatorControllerParameter{name="FacingY",type=AnimatorControllerParameterType.Float}};
        for(int i=0;i<4;i++)
        {
            string name=((MovementState)i).ToString();var clip=new AnimationClip{name=name,frameRate=30};
            float stride=i==1?driver.sneakStride:i==2?driver.walkStride:driver.runStride;
            float a=i==0?0:stride*.25f;
            clip.SetCurve("Gait/Left",typeof(Transform),"localPosition.y",Curve(a,-a,a));
            clip.SetCurve("Gait/Right",typeof(Transform),"localPosition.y",Curve(-a,a,-a));
            clip.SetCurve("Body",typeof(Transform),"localPosition.y",Curve(.14f,.14f+(i==0?0:.025f),.14f));
            var settings=AnimationUtility.GetAnimationClipSettings(clip);settings.loopTime=true;AnimationUtility.SetAnimationClipSettings(clip,settings);
            clip=Save(clip,Folder+"/"+name+".anim");
            var state=controller.layers[0].stateMachine.AddState(name);state.motion=clip;
            if(i==0)controller.layers[0].stateMachine.defaultState=state;
        }
        driver.animator.runtimeAnimatorController=controller;driver.animator.applyRootMotion=false;driver.animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;
        EditorUtility.SetDirty(controller);EditorUtility.SetDirty(sensor);EditorUtility.SetDirty(player);
    }
    static AnimationCurve Curve(float a,float b,float c)
    {
        var curve=new AnimationCurve(new Keyframe(0,a),new Keyframe(.5f,b),new Keyframe(1,c));
        for(int i=0;i<3;i++){AnimationUtility.SetKeyLeftTangentMode(curve,i,AnimationUtility.TangentMode.Linear);AnimationUtility.SetKeyRightTangentMode(curve,i,AnimationUtility.TangentMode.Linear);}return curve;
    }
    static SpriteRenderer Foot(Transform root,string name,float x,Sprite sprite)
    {
        var go=new GameObject(name);go.transform.SetParent(root,false);go.transform.localPosition=new Vector3(x,0,0);var sr=go.AddComponent<SpriteRenderer>();sr.sprite=sprite;return sr;
    }
    static T Save<T>(T obj,string path) where T:Object
    {
        var old=AssetDatabase.LoadAssetAtPath<T>(path);if(old!=null){EditorUtility.CopySerialized(obj,old);Object.DestroyImmediate(obj);return old;}
        AssetDatabase.CreateAsset(obj,path);return obj;
    }
}
