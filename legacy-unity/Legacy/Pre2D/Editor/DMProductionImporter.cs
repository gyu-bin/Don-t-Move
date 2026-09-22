using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using Object = UnityEngine.Object;

public static class DMProductionImporter
{
    const string ScenePath = "Assets/Scenes/DM_Museum_ProductionTest.unity";
    const string MaterialPath = "Assets/Art/Materials/Production";
    const string TexturePath = "Assets/Art/Textures/Production";
    const string CharacterPath = "Assets/Art/Characters/Production";
    const string PreviewPath = "ArtProduction/Previews";
    [Serializable] class MaterialSpec { public string name, baseColorTexture, normalTexture, roughnessTexture, metallicSmoothnessTexture; public float[] color, emission; public float roughness, metallic, alpha, emissionStrength; }
    [Serializable] class LightSpec { public string name, type; public float[] position, direction, color; public float power, spotAngle; }
    [Serializable] class CharacterSpec { public string name; public float[] position; public float yaw; }
    [Serializable] class CameraSpec { public float[] position, direction; public float orthographicSize; }
    [Serializable] class Metadata { public MaterialSpec[] materials; public LightSpec[] lights; public CharacterSpec[] characters; public CameraSpec camera; }
    static Vector3 V(float[] v) => new Vector3(v[0],v[1],v[2]);
    static Color C(float[] c) => new Color(c[0],c[1],c[2],c.Length>3?c[3]:1);
    static readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();

    [MenuItem("Don't Move/Art/Build Production Test Room")]
    public static void Build()
    {
        Directory.CreateDirectory(MaterialPath); Directory.CreateDirectory(PreviewPath);
        Directory.CreateDirectory("Assets/Art/Animations/Production");
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var data = JsonUtility.FromJson<Metadata>(File.ReadAllText("ArtProduction/Exports/DM_UnityScene.json"));
        foreach (string texture in Directory.GetFiles(TexturePath,"*.png"))
        {
            var ti = (TextureImporter)AssetImporter.GetAtPath(texture);
            ti.textureType = texture.Contains("_Normal") ? TextureImporterType.NormalMap : TextureImporterType.Default;
            ti.sRGBTexture = texture.Contains("BaseColor");
            ti.alphaSource = TextureImporterAlphaSource.FromInput;
            ti.maxTextureSize = 512; ti.mipmapEnabled = true; ti.isReadable = texture.Contains("Roughness");
            ti.SaveAndReimport();
        }
        materials.Clear();
        foreach (var spec in data.materials) CreateMaterial(spec);
        foreach (string path in Directory.GetFiles("Assets/Art","*.fbx",SearchOption.AllDirectories).Where(p=>p.Contains("/Production/")))
        {
            var importer=(ModelImporter)AssetImporter.GetAtPath(path);
            importer.importCameras=false; importer.importLights=false; importer.addCollider=false;
            importer.preserveHierarchy=true;
            importer.materialImportMode=ModelImporterMaterialImportMode.ImportStandard;
            importer.importNormals=ModelImporterNormals.Import;
            importer.importTangents=ModelImporterTangents.CalculateMikk;
            importer.meshCompression=ModelImporterMeshCompression.Off;
            importer.isReadable=false;
            if(path.Contains("DM_Character_"))
            {
                importer.animationType=ModelImporterAnimationType.Generic;
                importer.avatarSetup=ModelImporterAvatarSetup.CreateFromThisModel;
                importer.importAnimation=path.Contains("@");
                var clips=importer.defaultClipAnimations;
                foreach(var clip in clips)
                {
                    string name=Path.GetFileNameWithoutExtension(path).Split('@').Last();
                    clip.name=name;clip.loopTime=name=="Idle"||name=="Walk"||name=="Run"||name=="Freeze"||name=="Alert";
                }
                if(clips.Length>0)importer.clipAnimations=clips;
            }
            importer.SaveAndReimport();
            foreach(var imported in AssetDatabase.LoadAllAssetsAtPath(path).OfType<Material>())
                if(materials.TryGetValue(imported.name,out Material external))
                    importer.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material),imported.name),external);
            importer.SaveAndReimport();
        }
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        RenderSettings.ambientMode=AmbientMode.Flat;
        RenderSettings.ambientLight=new Color(.035f,.055f,.105f);
        RenderSettings.reflectionIntensity=.55f;
        QualitySettings.pixelLightCount=8;
        QualitySettings.shadows=ShadowQuality.All;QualitySettings.shadowResolution=ShadowResolution.High;
        QualitySettings.shadowDistance=30;QualitySettings.antiAliasing=4;
        GameObject room=InstantiateModel("Assets/Art/Environment/Museum/Production/DM_Museum_TestRoom.fbx");
        room.name="DM_Museum_ProductionTest_Environment";
        foreach(var ch in data.characters)
        {
            var go=InstantiateModel(CharacterPath+"/"+ch.name+".fbx");
            go.name=ch.name;go.transform.position=V(ch.position);go.transform.rotation=Quaternion.Euler(0,ch.yaw,0);
            Animator animator=go.GetComponent<Animator>()??go.AddComponent<Animator>();
            animator.applyRootMotion=false;
            string controllerPath="Assets/Art/Animations/Production/"+ch.name+".controller";
            var controller=AssetDatabase.LoadAssetAtPath<AnimatorController>(controllerPath);
            if(controller==null)controller=AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var machine=controller.layers[0].stateMachine;
            foreach(var state in machine.states)machine.RemoveState(state.state);
            foreach(string path in Directory.GetFiles(CharacterPath,ch.name+"@*.fbx"))
            {
                var clip=AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(x=>!x.name.StartsWith("__preview__"));
                if(clip==null)throw new Exception("Missing animation in "+path);
                var state=machine.AddState(clip.name);state.motion=clip;
                if(clip.name=="Idle")machine.defaultState=state;
            }
            animator.runtimeAnimatorController=controller;
            PrefabUtility.SaveAsPrefabAsset(go,CharacterPath+"/"+ch.name+".prefab");
        }
        foreach(var spec in data.lights)
        {
            var go=new GameObject(spec.name);var light=go.AddComponent<Light>();
            go.transform.position=V(spec.position);go.transform.rotation=Quaternion.LookRotation(V(spec.direction));
            light.type=spec.type=="SUN"?LightType.Directional:spec.type=="SPOT"?LightType.Spot:LightType.Point;
            light.color=C(spec.color);light.intensity=spec.type=="SUN"?spec.power:spec.power/100f;
            light.range=8;light.spotAngle=spec.spotAngle;light.innerSpotAngle=spec.spotAngle*.45f;
            light.renderMode=LightRenderMode.ForcePixel;
            light.shadows=LightShadows.Soft;light.shadowStrength=.95f;light.shadowBias=.012f;light.shadowNormalBias=.025f;
        }
        var cameraObject=new GameObject("DM_Camera_ProductionGameplay");cameraObject.tag="MainCamera";
        var camera=cameraObject.AddComponent<Camera>();cameraObject.AddComponent<AudioListener>();
        cameraObject.transform.position=V(data.camera.position);cameraObject.transform.rotation=Quaternion.LookRotation(V(data.camera.direction));
        camera.orthographic=true;camera.orthographicSize=data.camera.orthographicSize;
        camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.018f,.026f,.045f);
        camera.nearClipPlane=.1f;camera.farClipPlane=60;camera.allowHDR=true;camera.allowMSAA=true;
        var bloom=cameraObject.AddComponent<DMProductionBloom>();bloom.bloomShader=Shader.Find("DontMove/ProductionBloom");bloom.intensity=.32f;bloom.threshold=.9f;
        CreateReflection();
        EditorSceneManager.SaveScene(scene,ScenePath);AssetDatabase.SaveAssets();
        Capture(camera,1400,1100,PreviewPath+"/DM_Unity_TestRoom.png");
        camera.orthographicSize=4.7f;
        Capture(camera,720,1280,PreviewPath+"/DM_Unity_Gameplay_Portrait.png");
        camera.orthographicSize=data.camera.orthographicSize;
        // A/B comparison holds camera, geometry and material revisions fixed.
        Capture(camera,1400,1100,PreviewPath+"/DM_Lighting_After.png");
        var comparisonLights=Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
        var savedIntensity=comparisonLights.Select(l=>l.intensity).ToArray();
        var savedAngles=comparisonLights.Select(l=>l.spotAngle).ToArray();
        var savedColors=comparisonLights.Select(l=>l.color).ToArray();
        var savedRotations=comparisonLights.Select(l=>l.transform.rotation).ToArray();
        var ambient=RenderSettings.ambientLight;
        RenderSettings.ambientLight=new Color(.08f,.105f,.17f);
        foreach(var l in comparisonLights)
        {
            if(l.name.Contains("MoonFill")){l.intensity=.32f;l.color=new Color(.32f,.46f,.80f);l.transform.rotation=Quaternion.LookRotation(new Vector3(0,-8,-1));}
            else if(l.name.Contains("StatueExhibit")){l.intensity=6.5f;l.spotAngle=57;}
            else if(l.name.Contains("DiamondExhibit")){l.intensity=6.5f;l.spotAngle=54;}
            else if(l.name.Contains("AgentPath")){l.intensity=4.5f;l.spotAngle=63;}
            else if(l.name.Contains("GuardPath")){l.intensity=4.5f;l.spotAngle=65;}
            else if(l.name.Contains("DiamondCyan"))l.intensity=.09f;
            else if(l.name.Contains("WallPractical"))l.intensity=.42f;
        }
        Capture(camera,1400,1100,PreviewPath+"/DM_Lighting_Before.png");
        for(int i=0;i<comparisonLights.Length;i++){comparisonLights[i].intensity=savedIntensity[i];comparisonLights[i].spotAngle=savedAngles[i];comparisonLights[i].color=savedColors[i];comparisonLights[i].transform.rotation=savedRotations[i];}
        RenderSettings.ambientLight=ambient;
        Audit();
        AssetDatabase.ExportPackage(new[]{ScenePath,CharacterPath,"Assets/Art/Environment/Museum/Production","Assets/Art/Props/Museum/Production",MaterialPath,TexturePath,"Assets/Art/Animations/Production"},"ArtProduction/Exports/DM_Museum_FiveAsset_TestKit.unitypackage",ExportPackageOptions.Recurse|ExportPackageOptions.IncludeDependencies);
        Debug.Log("DM PRODUCTION: Unity import, test scene, animation controllers and render complete");
    }

    static Texture2D Tex(string name) => string.IsNullOrEmpty(name)?null:AssetDatabase.LoadAssetAtPath<Texture2D>(TexturePath+"/"+name);
    static void CreateMaterial(MaterialSpec s)
    {
        string path=MaterialPath+"/"+s.name+".mat";
        var m=AssetDatabase.LoadAssetAtPath<Material>(path);
        if(m==null){m=new Material(Shader.Find("Standard"));AssetDatabase.CreateAsset(m,path);}
        m.color=string.IsNullOrEmpty(s.baseColorTexture)?C(s.color):Color.white;
        m.mainTexture=Tex(s.baseColorTexture);m.SetFloat("_Metallic",s.metallic);m.SetFloat("_Glossiness",1-s.roughness);
        if(Tex(s.normalTexture)!=null){m.SetTexture("_BumpMap",Tex(s.normalTexture));m.EnableKeyword("_NORMALMAP");m.SetFloat("_BumpScale",.3f);}
        var packed=Tex(s.metallicSmoothnessTexture);
        if(packed==null&&Tex(s.roughnessTexture)!=null)
        {
            var rough=Tex(s.roughnessTexture);var tex=new Texture2D(rough.width,rough.height,TextureFormat.RGBA32,false,true);
            Color[] pixels=rough.GetPixels();for(int i=0;i<pixels.Length;i++)pixels[i]=new Color(s.metallic,0,0,1-pixels[i].r);
            tex.SetPixels(pixels);tex.Apply();string texturePath=TexturePath+"/"+s.name+"_MetallicSmoothness.png";
            File.WriteAllBytes(texturePath,tex.EncodeToPNG());Object.DestroyImmediate(tex);AssetDatabase.ImportAsset(texturePath);
            var ti=(TextureImporter)AssetImporter.GetAtPath(texturePath);ti.sRGBTexture=false;ti.alphaSource=TextureImporterAlphaSource.FromInput;ti.SaveAndReimport();packed=AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);
        }
        if(packed!=null){m.SetTexture("_MetallicGlossMap",packed);m.EnableKeyword("_METALLICGLOSSMAP");m.SetFloat("_GlossMapScale",1);}
        if(s.alpha<.99f)
        {
            Color col=m.color;col.a=s.alpha;m.color=col;m.SetFloat("_Mode",3);
            m.SetOverrideTag("RenderType","Transparent");m.SetInt("_SrcBlend",(int)BlendMode.One);m.SetInt("_DstBlend",(int)BlendMode.OneMinusSrcAlpha);m.SetInt("_ZWrite",0);m.DisableKeyword("_ALPHABLEND_ON");m.EnableKeyword("_ALPHAPREMULTIPLY_ON");m.renderQueue=3000;
        }
        if(s.emissionStrength>0){m.SetColor("_EmissionColor",C(s.emission)*s.emissionStrength);m.globalIlluminationFlags=MaterialGlobalIlluminationFlags.BakedEmissive;m.EnableKeyword("_EMISSION");}
        materials[s.name]=m;EditorUtility.SetDirty(m);
    }

    static GameObject InstantiateModel(string path)
    {
        var asset=AssetDatabase.LoadAssetAtPath<GameObject>(path);if(asset==null)throw new Exception("Missing model "+path);
        var go=(GameObject)PrefabUtility.InstantiatePrefab(asset);
        foreach(var renderer in go.GetComponentsInChildren<Renderer>())
        {
            var mapped=renderer.sharedMaterials;
            for(int i=0;i<mapped.Length;i++)if(mapped[i]!=null&&materials.TryGetValue(mapped[i].name,out Material m))mapped[i]=m;
            renderer.sharedMaterials=mapped;
            if(mapped.Any(m=>m!=null&&m.HasProperty("_Mode")&&m.GetFloat("_Mode")>=2))renderer.shadowCastingMode=ShadowCastingMode.Off;
        }
        return go;
    }

    static void CreateReflection()
    {
        var go=new GameObject("DM_ReflectionCapture");var camera=go.AddComponent<Camera>();
        go.transform.position=new Vector3(0,1.4f,0);camera.farClipPlane=30;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.04f,.06f,.10f);
        string path=MaterialPath+"/DM_Museum_Reflection.cubemap";
        var cube=AssetDatabase.LoadAssetAtPath<Cubemap>(path);if(cube==null){cube=new Cubemap(128,TextureFormat.RGBAHalf,true);AssetDatabase.CreateAsset(cube,path);}
        camera.RenderToCubemap(cube);RenderSettings.defaultReflectionMode=DefaultReflectionMode.Custom;RenderSettings.customReflectionTexture=cube;EditorUtility.SetDirty(cube);Object.DestroyImmediate(go);
    }

    static void Capture(Camera camera,int width,int height,string path)
    {
        var target=new RenderTexture(width,height,24,RenderTextureFormat.ARGBHalf);target.antiAliasing=4;var old=RenderTexture.active;
        camera.targetTexture=target;camera.Render();RenderTexture.active=target;
        var texture=new Texture2D(width,height,TextureFormat.RGB24,false);texture.ReadPixels(new Rect(0,0,width,height),0,0);texture.Apply();File.WriteAllBytes(path,texture.EncodeToPNG());
        camera.targetTexture=null;RenderTexture.active=old;target.Release();Object.DestroyImmediate(target);Object.DestroyImmediate(texture);
    }

    static void Audit()
    {
        var lines=new List<string>{"Unity "+Application.unityVersion,"Scene: "+ScenePath};
        foreach(var animator in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None))
        {
            var renderers=animator.GetComponentsInChildren<Renderer>();var bounds=renderers[0].bounds;foreach(var r in renderers)bounds.Encapsulate(r.bounds);
            lines.Add(animator.name+" height="+bounds.size.y.ToString("F3")+"m clips="+animator.runtimeAnimatorController.animationClips.Length);
            if(bounds.size.y<1.6f||bounds.size.y>2.1f)throw new Exception("Unexpected character scale "+animator.name+" "+bounds.size);
            var bones=animator.GetComponentsInChildren<Transform>();
            var positions=bones.Select(t=>t.localPosition).ToArray();var rotations=bones.Select(t=>t.localRotation).ToArray();var scales=bones.Select(t=>t.localScale).ToArray();
            foreach(var clip in animator.runtimeAnimatorController.animationClips)
            {
                clip.SampleAnimation(animator.gameObject,0);var start=bones.Select(t=>t.localRotation).ToArray();
                clip.SampleAnimation(animator.gameObject,.25f);
                float motion=0;for(int i=0;i<bones.Length;i++)motion+=Quaternion.Angle(start[i],bones[i].localRotation);
                lines.Add(animator.name+" / "+clip.name+" duration="+clip.length.ToString("F2")+" rotationChange="+motion.ToString("F2"));
                if(clip.name!="Freeze"&&motion<.05f)throw new Exception("Animation has no sampled movement: "+clip.name);
                for(int i=0;i<bones.Length;i++){bones[i].localPosition=positions[i];bones[i].localRotation=rotations[i];bones[i].localScale=scales[i];}
            }
        }
        int triangles=0;foreach(var mf in Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))triangles+=mf.sharedMesh.triangles.Length/3;
        foreach(var sk in Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None))triangles+=sk.sharedMesh.triangles.Length/3;
        lines.Add("Scene triangles="+triangles);File.WriteAllLines("ArtProduction/Exports/DM_UnityImportAudit.txt",lines);
        Debug.Log(string.Join("\n",lines));
    }

    public static void InspectImportedMaterials()
    {
        EditorSceneManager.OpenScene(ScenePath);
        foreach(var sk in Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None))
            Debug.Log("DM MATERIAL AUDIT "+sk.name+" materials="+string.Join(",",sk.sharedMaterials.Select(m=>m.name+" @ "+AssetDatabase.GetAssetPath(m)+" tex="+(m.mainTexture==null?"NULL":m.mainTexture.name)))+" UV="+string.Join(",",sk.sharedMesh.uv.Distinct().Take(12)));
    }
    public static void InspectAnimationBindings()
    {
        EditorSceneManager.OpenScene(ScenePath);
        foreach(var animator in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None))
        {
            Debug.Log("DM HIERARCHY "+animator.name+" "+string.Join(" | ",animator.GetComponentsInChildren<Transform>().Select(t=>AnimationUtility.CalculateTransformPath(t,animator.transform))));
            foreach(var clip in animator.runtimeAnimatorController.animationClips)
                Debug.Log("DM BINDINGS "+clip.name+" length="+clip.length+" "+string.Join(" | ",AnimationUtility.GetCurveBindings(clip).Take(10).Select(b=>b.path+":"+b.propertyName)));
        }
    }
}
