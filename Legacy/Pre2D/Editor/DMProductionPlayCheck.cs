using System;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

public static class DMProductionPlayCheck
{
    static bool priorEnabled;
    static EnterPlayModeOptions priorOptions;
    static int exitCode;
    public static void Run()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/DM_Museum_ProductionTest.unity");
        priorEnabled=EditorSettings.enterPlayModeOptionsEnabled;priorOptions=EditorSettings.enterPlayModeOptions;
        EditorSettings.enterPlayModeOptionsEnabled=true;EditorSettings.enterPlayModeOptions=EnterPlayModeOptions.DisableDomainReload;
        EditorApplication.playModeStateChanged+=OnMode;
        EditorApplication.isPlaying=true;
    }
    static void OnMode(PlayModeStateChange state)
    {
        if(state==PlayModeStateChange.EnteredPlayMode)
        {
            try
            {
                int checkedClips=0;
                foreach(var animator in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None))
                {
                    animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;
                    animator.Rebind();animator.Update(0);
                    Debug.Log("DM ANIMATOR initialized="+animator.isInitialized+" avatar="+(animator.avatar==null?"NULL":animator.avatar.name+" valid="+animator.avatar.isValid));
                    var bones=animator.GetComponentsInChildren<Transform>();
                    foreach(var clip in animator.runtimeAnimatorController.animationClips)
                    {
                        animator.Play(clip.name,0,0);animator.Update(0);
                        var start=bones.Select(t=>t.localRotation).ToArray();
                        animator.Update(.25f);
                        Debug.Log("DM STATE "+clip.name+" normalizedTime="+animator.GetCurrentAnimatorStateInfo(0).normalizedTime+" hasState="+animator.HasState(0,Animator.StringToHash("Base Layer."+clip.name)));
                        float movement=0;for(int i=0;i<bones.Length;i++)movement+=Quaternion.Angle(start[i],bones[i].localRotation);
                        if(clip.name!="Freeze"&&movement<.05f)throw new Exception("Runtime animation static: "+clip.name);
                        foreach(var renderer in animator.GetComponentsInChildren<SkinnedMeshRenderer>())
                        {
                            var mesh=new Mesh();renderer.BakeMesh(mesh);
                            if(mesh.vertexCount==0||float.IsNaN(mesh.bounds.size.y)||mesh.bounds.size.y>3f)throw new Exception("Invalid skinned mesh in "+clip.name);
                            Object.Destroy(mesh);
                        }
                        checkedClips++;Debug.Log("DM PLAY PASS "+animator.name+" / "+clip.name+" movement="+movement);
                    }
                }
                if(checkedClips!=9)throw new Exception("Expected nine animation clips, got "+checkedClips);
                Debug.Log("DM PRODUCTION PLAY: ALL 9 ANIMATIONS AND SKIN DEFORMATION PASSED");
                exitCode=0;
            }
            catch(Exception exception){Debug.LogException(exception);exitCode=1;}
            EditorApplication.isPlaying=false;
        }
        if(state==PlayModeStateChange.EnteredEditMode)
        {
            EditorApplication.playModeStateChanged-=OnMode;
            EditorSettings.enterPlayModeOptionsEnabled=priorEnabled;EditorSettings.enterPlayModeOptions=priorOptions;
            EditorApplication.Exit(exitCode);
        }
    }
}
