using System.IO;
using System.Text;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

public static class DMVisualArtBuilder
{
    const string Art = "Assets/Art";
    const string PreviewScene = "Assets/Scenes/DM_Museum_VisualTest.unity";
    static Material marble, grout, brass, wall, black, charcoal, shirt, skin, hair, shades, blue, navy, stone, glass, diamond, cyanGlow, goldGlow, warmPool, contactShadow;
    static Material wood, foliage, redRope, greenGlow, greenPool, paintingA, paintingB;

    [MenuItem("Don't Move/Art/Build Five Asset Visual Test")]
    public static void BuildTest()
    {
        EnsureFolders();
        CreateMaterials();
        CreateCharacter(false);
        CreateCharacter(true);
        CreateFloorTile();
        CreateStatue();
        CreateDisplayCase();

        Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        scene.name = "DM Museum Visual Test";
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = Hex("#162237");
        RenderSettings.fog = false;
        for (int x = -4; x <= 4; x++)
            for (int z = -3; z <= 3; z++)
                Instance("Environment/Museum/DM_Environment_Museum_MarbleFloor_A.prefab", new Vector3(x, 0f, z), Quaternion.identity);
        Pool("DM_VFX_StatueWarmPool", new Vector3(-2.1f, .032f, 1.25f), new Vector2(4.3f, 4f), warmPool);
        Pool("DM_VFX_DisplayWarmPool", new Vector3(1.7f, .033f, 1.2f), new Vector2(4.2f, 4f), warmPool);
        Pool("DM_VFX_AgentWarmPool", new Vector3(-2.3f, .034f, -1.55f), new Vector2(2.6f, 2.6f), warmPool);
        Pool("DM_VFX_GuardWarmPool", new Vector3(1.9f, .035f, -1.4f), new Vector2(2.6f, 2.6f), warmPool);
        MakeBox("DM_Environment_Museum_Backdrop", null, new Vector3(0f, 1.25f, 3.6f), new Vector3(9.2f, 2.5f, .35f), wall);
        MakeBox("DM_Environment_Museum_BackdropTrim", null, new Vector3(0f, .16f, 3.36f), new Vector3(9.2f, .18f, .12f), brass);
        MakeBox("DM_Environment_Museum_BackdropTopTrim", null, new Vector3(0f, 2.42f, 3.36f), new Vector3(9.2f, .13f, .18f), brass);
        MakeBox("DM_Environment_Museum_LeftWall", null, new Vector3(-4.55f, 1.25f, 0f), new Vector3(.35f, 2.5f, 7.3f), wall);
        for (int i = -1; i <= 1; i++)
        {
            float x = i * 2.45f;
            MakeBox("DM_Environment_Museum_WallPilaster", null, new Vector3(x, 1.3f, 3.31f), new Vector3(.21f, 2.38f, .22f), stone);
            MakeBox("DM_Environment_Museum_PilasterCap", null, new Vector3(x, 2.36f, 3.22f), new Vector3(.35f, .15f, .36f), brass);
        }
        WallLamp(new Vector3(-2.1f, 1.74f, 3.28f));
        WallLamp(new Vector3(1.8f, 1.74f, 3.28f));
        Instance("Characters/DM_Character_AgentZero.prefab", new Vector3(-2.35f, .08f, -1.4f), Quaternion.Euler(0f, 160f, 0f));
        Instance("Characters/DM_Character_MuseumGuard.prefab", new Vector3(1.95f, .08f, -1.35f), Quaternion.Euler(0f, 160f, 0f));
        Instance("Props/Museum/DM_Prop_Statue_A.prefab", new Vector3(-2.15f, .08f, 1.45f), Quaternion.Euler(0f, 25f, 0f));
        Instance("Props/Museum/DM_Prop_DisplayCase_A.prefab", new Vector3(1.65f, .08f, 1.35f), Quaternion.identity);
        var cameraObject = new GameObject("DM_VisualTest_Camera");
        cameraObject.tag = "MainCamera";
        Camera camera = cameraObject.AddComponent<Camera>();
        camera.orthographic = true;
        camera.orthographicSize = 4.75f;
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = Hex("#0F172A");
        camera.allowHDR = true;
        cameraObject.AddComponent<AudioListener>();
        cameraObject.transform.position = new Vector3(6.1f, 9.3f, -7.2f);
        cameraObject.transform.LookAt(new Vector3(0f, .6f, .2f));
        MakeLight("DM_Light_CoolFill", LightType.Directional, Hex("#91AED8"), .25f, new Vector3(0f, 6f, 0f), Quaternion.Euler(52f, -28f, 0f), true, 0f);
        Spot("DM_Light_Statue", new Vector3(-2.45f, 4.1f, -.2f), new Vector3(-2.1f, .7f, 1.4f), Hex("#FFD295"), 9f, 7f, 72f).renderMode = LightRenderMode.ForcePixel;
        Spot("DM_Light_Display", new Vector3(1.9f, 4.1f, -.15f), new Vector3(1.65f, 1.1f, 1.35f), Hex("#FFD295"), 9f, 7f, 72f).renderMode = LightRenderMode.ForcePixel;
        Spot("DM_Light_Agent", new Vector3(-2.9f, 4.4f, -2.9f), new Vector3(-2.3f, .8f, -1.4f), Hex("#E4C18C"), 5f, 6f, 60f);
        Spot("DM_Light_Guard", new Vector3(2.8f, 4.4f, -2.9f), new Vector3(1.9f, .8f, -1.4f), Hex("#D5B784"), 5f, 6f, 60f);
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, PreviewScene);
        AssetDatabase.SaveAssets();
        Debug.Log("DM ART: five-asset Visual Test Scene saved at " + PreviewScene);
    }

    [MenuItem("Don't Move/Art/Capture Visual Test")]
    public static void CaptureTest()
    {
        EditorSceneManager.OpenScene(PreviewScene);
        Camera camera = Object.FindFirstObjectByType<Camera>();
        if (camera == null) throw new System.Exception("DM ART: test camera missing");
        Directory.CreateDirectory(Art + "/Previews");
        Capture(camera, 1280, 720, Art + "/Previews/DM_VisualTest_Landscape.png");
        camera.orthographicSize = 5.1f;
        Capture(camera, 720, 1280, Art + "/Previews/DM_VisualTest_Portrait.png");
        AssetDatabase.Refresh();
        Debug.Log("DM ART: captured landscape and portrait previews");
    }

    [MenuItem("Don't Move/Art/Capture Stage 01 Preview")]
    public static void CaptureStage()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");
        Camera camera = Object.FindFirstObjectByType<Camera>();
        CameraController follow = camera.GetComponent<CameraController>();
        Transform player = GameObject.Find("Player").transform;
        Directory.CreateDirectory(Art + "/Previews");
        camera.transform.position = player.position + follow.offset;
        camera.transform.rotation = Quaternion.Euler(follow.pitch, 0f, 0f);
        Capture(camera, 720, 1280, Art + "/Previews/DM_Stage01_Start_Portrait.png");
        camera.transform.position = new Vector3(0f, 26f, -14f);
        camera.transform.rotation = Quaternion.Euler(60f, 0f, 0f);
        camera.orthographicSize = 18f;
        Capture(camera, 1280, 960, Art + "/Previews/DM_Stage01_Overview.png");
        AssetDatabase.Refresh();
        Debug.Log("DM ART: captured Stage 01 start and overview previews");
    }

    [MenuItem("Don't Move/Art/Audit Stage 01 Assets")]
    public static void AuditStage()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/MuseumStage01.unity");
        int renderers = 0, sceneTriangles = 0, colliderCount = 0;
        foreach (MeshFilter filter in Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))
        {
            MeshRenderer renderer = filter.GetComponent<MeshRenderer>();
            if (renderer == null || !renderer.enabled || filter.sharedMesh == null) continue;
            renderers++;
            sceneTriangles += filter.sharedMesh.triangles.Length / 3;
        }
        colliderCount = Object.FindObjectsByType<Collider>(FindObjectsSortMode.None).Length;
        Transform artRoot = GameObject.Find("DM_Stage01_Art").transform;
        int artColliders = artRoot.GetComponentsInChildren<Collider>(true).Length;
        StringBuilder report = new StringBuilder();
        report.AppendLine("DON'T MOVE Stage 01 Art Audit");
        report.AppendLine("Visible mesh renderers: " + renderers);
        report.AppendLine("Visible scene triangles (instanced count): " + sceneTriangles);
        report.AppendLine("All scene colliders: " + colliderCount);
        report.AppendLine("Colliders under visual art root: " + artColliders);
        foreach (string relative in new[] { "Characters/DM_Character_AgentZero.prefab", "Characters/DM_Character_MuseumGuard.prefab", "Props/Museum/DM_Prop_Statue_A.prefab", "Props/Museum/DM_Prop_DisplayCase_A.prefab" })
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/" + relative);
            int triangles = 0;
            foreach (MeshFilter filter in prefab.GetComponentsInChildren<MeshFilter>(true))
                if (filter.sharedMesh != null) triangles += filter.sharedMesh.triangles.Length / 3;
            report.AppendLine(relative + ": " + triangles + " triangles");
        }
        string[] textures = Directory.GetFiles(Art + "/Textures", "*.png");
        foreach (string texturePath in textures)
        {
            Texture2D texture = AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);
            report.AppendLine(Path.GetFileName(texturePath) + ": " + texture.width + "x" + texture.height);
        }
        string output = Art + "/DM_Stage01_ArtAudit.txt";
        File.WriteAllText(output, report.ToString());
        AssetDatabase.Refresh();
        Debug.Log("DM ART AUDIT\n" + report);
    }

    [MenuItem("Don't Move/Art/Apply Museum Stage 01 Art")]
    public static void ApplyStage01()
    {
        EnsureFolders();
        CreateMaterials();
        if (AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Characters/DM_Character_AgentZero.prefab") == null) CreateCharacter(false);
        if (AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Characters/DM_Character_MuseumGuard.prefab") == null) CreateCharacter(true);
        if (AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Props/Museum/DM_Prop_Statue_A.prefab") == null) CreateStatue();
        if (AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Props/Museum/DM_Prop_DisplayCase_A.prefab") == null) CreateDisplayCase();
        CreateStageAssets();
        const string stagePath = "Assets/Scenes/MuseumStage01.unity";
        Scene scene = EditorSceneManager.OpenScene(stagePath);
        GameObject previous = GameObject.Find("DM_Stage01_Art");
        if (previous != null) Object.DestroyImmediate(previous);
        Transform art = new GameObject("DM_Stage01_Art").transform;
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = Hex("#1A2940");
        RenderSettings.fog = false;

        GameObject floor = GameObject.Find("Museum Floor");
        if (floor == null) throw new System.Exception("DM ART: Stage 01 floor missing");
        floor.GetComponent<Renderer>().enabled = false; // Keep the original floor collider.
        GameObject floorVisual = new GameObject("DM_Environment_Museum_CombinedMarbleFloor");
        floorVisual.transform.SetParent(art, false);
        floorVisual.transform.localPosition = new Vector3(0f, .012f, 0f);
        floorVisual.AddComponent<MeshFilter>().sharedMesh = StageFloorMesh();
        floorVisual.AddComponent<MeshRenderer>().sharedMaterial = marble;
        // Thin inlays guide the original route without adding collision.
        MakeBox("DM_Environment_Museum_StartInlay", art, new Vector3(-6.6f, .020f, -10.7f), new Vector3(5.6f, .014f, 1.25f), charcoal);
        MakeBox("DM_Environment_Museum_StartInlayGold", art, new Vector3(-6.6f, .030f, -10.7f), new Vector3(5.7f, .012f, .045f), brass);
        MakeBox("DM_Environment_Museum_TurnInlay", art, new Vector3(-2.5f, .020f, -8.2f), new Vector3(1.25f, .014f, 4.0f), charcoal);
        MakeBox("DM_Environment_Museum_TurnInlayGold", art, new Vector3(-2.5f, .030f, -8.2f), new Vector3(.045f, .012f, 4.1f), brass);

        string[] wallNames = { "North", "South", "West", "East", "South west partition", "South east partition", "Central east divider", "North west partition", "North east partition", "North divider" };
        foreach (string wallName in wallNames)
        {
            GameObject section = GameObject.Find(wallName);
            if (section == null) continue;
            section.GetComponent<Renderer>().sharedMaterial = wall;
            Vector3 p = section.transform.position, s = section.transform.localScale;
            bool alongX = s.x > s.z;
            Vector3 baseSize = alongX ? new Vector3(s.x, .16f, s.z + .13f) : new Vector3(s.x + .13f, .16f, s.z);
            MakeBox("DM_Environment_Museum_Baseboard_" + wallName, art, new Vector3(p.x, .15f, p.z), baseSize, stone);
            MakeBox("DM_Environment_Museum_GoldTrim_" + wallName, art, new Vector3(p.x, 2.04f, p.z), new Vector3(baseSize.x, .065f, baseSize.z), brass);
        }
        foreach (Vector3 position in new[] { new Vector3(-4f, 0f, -5f), new Vector3(2.5f, 0f, -4.5f), new Vector3(-4f, 0f, 4f), new Vector3(4f, 0f, 4f) })
            InstanceUnder("Environment/Museum/DM_Environment_Museum_Pillar_A.prefab", art, position, Quaternion.identity);
        InstanceUnder("Environment/Museum/DM_Environment_Museum_Arch_A.prefab", art, new Vector3(0f, 0f, 4f), Quaternion.identity);

        GameObject player = GameObject.Find("Player");
        AttachCharacter(player, "Characters/DM_Character_AgentZero.prefab");
        AttachCharacter(GameObject.Find("Guard A"), "Characters/DM_Character_MuseumGuard.prefab");
        AttachCharacter(GameObject.Find("Guard B"), "Characters/DM_Character_MuseumGuard.prefab");
        GameObject statueCover = GameObject.Find("Statue Cover");
        if (statueCover != null)
        {
            statueCover.GetComponent<Renderer>().enabled = false;
            InstanceUnder("Props/Museum/DM_Prop_Statue_A.prefab", art, new Vector3(-4f, 0f, 1f), Quaternion.Euler(0f, 23f, 0f));
        }
        GameObject caseCover = GameObject.Find("Display Case Cover");
        if (caseCover != null)
        {
            caseCover.GetComponent<Renderer>().enabled = false;
            GameObject display = InstanceUnder("Props/Museum/DM_Prop_DisplayCase_B.prefab", art, new Vector3(5f, 0f, 8f), Quaternion.Euler(0f, -20f, 0f));
            display.transform.localScale = new Vector3(1.25f, 1f, 1.05f);
        }
        GameObject diamondObject = GameObject.Find("Diamond");
        if (diamondObject != null)
        {
            diamondObject.GetComponent<Renderer>().enabled = false;
            InstanceUnder("Props/Museum/DM_Prop_DisplayCase_A.prefab", art, new Vector3(9f, 0f, 12f), Quaternion.Euler(0f, -15f, 0f));
        }
        GameObject exitObject = GameObject.Find("Exit");
        if (exitObject != null) exitObject.GetComponent<Renderer>().enabled = false;
        InstanceUnder("Environment/Museum/DM_Environment_Museum_DoorFrame_A.prefab", art, new Vector3(-9f, 0f, 14.9f), Quaternion.identity);
        InstanceUnder("Items/DM_Item_ExitDoor_A.prefab", art, new Vector3(-9f, 0f, 14.7f), Quaternion.identity);
        Pool("DM_VFX_ExitGlow", new Vector3(-9f, .035f, 12f), new Vector2(2.8f, 2.8f), greenPool, art);

        InstanceUnder("Props/Museum/DM_Prop_Statue_B.prefab", art, new Vector3(10.9f, 0f, -10f), Quaternion.Euler(0f, -38f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_Bust_A.prefab", art, new Vector3(-10.8f, 0f, 9f), Quaternion.Euler(0f, 30f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_Bust_A.prefab", art, new Vector3(-11.0f, 0f, -8.6f), Quaternion.Euler(0f, 65f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_Bench_A.prefab", art, new Vector3(-10.8f, 0f, -1.5f), Quaternion.Euler(0f, 90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_Bench_A.prefab", art, new Vector3(10.8f, 0f, 1.5f), Quaternion.Euler(0f, -90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_Plant_A.prefab", art, new Vector3(-11f, 0f, -13.5f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_Plant_B.prefab", art, new Vector3(11f, 0f, -13.5f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_Plant_A.prefab", art, new Vector3(-11f, 0f, 13.6f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_Plant_B.prefab", art, new Vector3(11f, 0f, 13.6f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_RopeBarrier_A.prefab", art, new Vector3(10.8f, 0f, -8.5f), Quaternion.Euler(0f, 90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_RopeBarrier_A.prefab", art, new Vector3(-10.7f, 0f, 10.3f), Quaternion.Euler(0f, 90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_PaintingFrame_A.prefab", art, new Vector3(-7f, 1.45f, 15.09f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_PaintingFrame_B.prefab", art, new Vector3(5.8f, 1.45f, 15.09f), Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_PaintingFrame_A.prefab", art, new Vector3(6f, 1.45f, -15.09f), Quaternion.Euler(0f, 180f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_PaintingFrame_B.prefab", art, new Vector3(-12.07f, 1.45f, -10f), Quaternion.Euler(0f, -90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_PaintingFrame_A.prefab", art, new Vector3(12.07f, 1.45f, -10f), Quaternion.Euler(0f, 90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_CCTV_A.prefab", art, new Vector3(-11.9f, 2.4f, -6.8f), Quaternion.Euler(0f, -90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_CCTV_A.prefab", art, new Vector3(11.9f, 2.4f, 6.8f), Quaternion.Euler(0f, 90f, 0f));
        foreach (Vector3 lampPosition in new[] { new Vector3(-7f, 1.67f, 15.07f), new Vector3(5.8f, 1.67f, 15.07f) })
            InstanceUnder("Props/Museum/DM_Prop_MuseumLamp_A.prefab", art, lampPosition, Quaternion.identity);
        InstanceUnder("Props/Museum/DM_Prop_MuseumLamp_A.prefab", art, new Vector3(-11.95f, 1.67f, -8f), Quaternion.Euler(0f, -90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_MuseumLamp_A.prefab", art, new Vector3(11.95f, 1.67f, 7f), Quaternion.Euler(0f, 90f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_MuseumLamp_A.prefab", art, new Vector3(-8.5f, 1.67f, -15.07f), Quaternion.Euler(0f, 180f, 0f));
        InstanceUnder("Props/Museum/DM_Prop_MuseumLamp_A.prefab", art, new Vector3(5.5f, 1.67f, -15.07f), Quaternion.Euler(0f, 180f, 0f));

        foreach (Vector3 poolPosition in new[] { new Vector3(-4f, .034f, 1f), new Vector3(5f, .035f, 8f), new Vector3(9f, .036f, 12f), new Vector3(-9f, .037f, 12f), new Vector3(-3f, .038f, -8f), new Vector3(-8.5f, .039f, -11f) })
            Pool("DM_VFX_WarmPathLight", poolPosition, new Vector2(5.5f, 5.1f), warmPool, art);
        GameObject oldLight = GameObject.Find("Graybox Light");
        if (oldLight != null)
        {
            oldLight.name = "DM_Light_CoolMoonFill";
            Light fill = oldLight.GetComponent<Light>();
            fill.color = Hex("#9BBBE9");
            fill.intensity = .38f;
            fill.shadows = LightShadows.Soft;
            fill.shadowStrength = .55f;
        }
        Light startLight = Spot("DM_Light_Start", new Vector3(-8.5f, 4.8f, -13f), new Vector3(-8.5f, .8f, -11f), Hex("#FFBE79"), 4.5f, 7f, 75f);
        startLight.renderMode = LightRenderMode.ForcePixel;
        startLight.transform.SetParent(art, true);
        Spot("DM_Light_StatueExhibit", new Vector3(-4f, 5f, -.4f), new Vector3(-4f, .9f, 1f), Hex("#FFBE79"), 5f, 7f, 72f).transform.SetParent(art, true);
        Spot("DM_Light_DisplayExhibit", new Vector3(5f, 4.8f, 6.3f), new Vector3(5f, .9f, 8f), Hex("#FFBE79"), 5f, 7f, 72f).transform.SetParent(art, true);
        Light diamondLight = Spot("DM_Light_Diamond", new Vector3(9f, 4.8f, 10.5f), new Vector3(9f, 1.0f, 12f), Hex("#FFBE79"), 5f, 7f, 72f);
        diamondLight.renderMode = LightRenderMode.ForcePixel;
        diamondLight.transform.SetParent(art, true);
        Camera camera = Object.FindFirstObjectByType<Camera>();
        if (camera != null)
        {
            camera.backgroundColor = Hex("#0F172A");
            camera.orthographicSize = 7.8f;
            CameraController follow = camera.GetComponent<CameraController>();
            if (follow != null) { follow.offset = new Vector3(0f, 15f, -8f); follow.pitch = 53f; }
        }
        FixVisionMaterials();
        foreach (MeshRenderer renderer in art.GetComponentsInChildren<MeshRenderer>(true))
            renderer.gameObject.isStatic = true;
        EditorSceneManager.SaveScene(scene, stagePath);
        AssetDatabase.SaveAssets();
        Debug.Log("DM ART: Stage 01 visual art applied without changing gameplay components or colliders");
    }

    [MenuItem("Don't Move/Art/Fix Vision Materials")]
    public static void FixVisionMaterials()
    {
        Shader transparent = Shader.Find("DontMove/VisionCone");
        if (transparent == null) throw new System.Exception("DM ART: vision shader unavailable");
        Material safe = AssetDatabase.LoadAssetAtPath<Material>("Assets/Prefabs/Vision Safe.mat");
        Material danger = AssetDatabase.LoadAssetAtPath<Material>("Assets/Prefabs/Vision Danger.mat");
        if (safe == null || danger == null) throw new System.Exception("DM ART: vision materials missing");
        safe.shader = transparent;
        safe.color = new Color(.20f, .72f, .74f, .13f);
        danger.shader = transparent;
        danger.color = new Color(1f, .19f, .13f, .38f);
        EditorUtility.SetDirty(safe);
        EditorUtility.SetDirty(danger);
        AssetDatabase.SaveAssets();
        const string stagePath = "Assets/Scenes/MuseumStage01.unity";
        if (File.Exists(stagePath))
        {
            Scene stage = EditorSceneManager.OpenScene(stagePath);
            foreach (GuardController controller in Object.FindObjectsByType<GuardController>(FindObjectsSortMode.None))
            {
                GuardVision[] visions = controller.GetComponents<GuardVision>();
                GuardVision configured = controller.vision;
                if (configured == null || configured.safeMaterial == null || configured.dangerMaterial == null)
                    foreach (GuardVision candidate in visions)
                        if (candidate.safeMaterial != null && candidate.dangerMaterial != null)
                            configured = candidate;
                if (configured == null) throw new System.Exception("DM ART: configured guard vision missing");
                controller.vision = configured;
                foreach (GuardVision candidate in visions)
                    if (candidate != configured) Object.DestroyImmediate(candidate);
            }
            EditorSceneManager.SaveScene(stage, stagePath);
        }
    }

    static void AttachCharacter(GameObject gameplayRoot, string prefabPath)
    {
        if (gameplayRoot == null) throw new System.Exception("DM ART: missing player or guard root");
        Transform prior = gameplayRoot.transform.Find("DM_Character_AgentZero");
        if (prior == null) prior = gameplayRoot.transform.Find("DM_Character_MuseumGuard");
        if (prior != null) Object.DestroyImmediate(prior.gameObject);
        gameplayRoot.GetComponent<Renderer>().enabled = false;
        GameObject visual = InstanceUnder(prefabPath, gameplayRoot.transform, Vector3.zero, Quaternion.identity);
        visual.transform.localPosition = new Vector3(0f, -1f, 0f);
        visual.transform.localRotation = Quaternion.identity;
    }

    static GameObject InstanceUnder(string relativePath, Transform parent, Vector3 position, Quaternion rotation)
    {
        GameObject instance = Instance(relativePath, position, rotation);
        instance.transform.SetParent(parent, true);
        return instance;
    }

    static Mesh StageFloorMesh()
    {
        const string path = Art + "/Environment/Museum/DM_Mesh_MuseumFloor_25x31.asset";
        Mesh saved = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (saved != null) return saved;
        const int width = 25, depth = 31;
        Vector3[] vertices = new Vector3[width * depth * 4];
        Vector2[] uv = new Vector2[vertices.Length];
        int[] triangles = new int[width * depth * 6];
        for (int z = 0; z < depth; z++)
        for (int x = 0; x < width; x++)
        {
            int v = (z * width + x) * 4, t = (z * width + x) * 6;
            float left = x - width * .5f, front = z - depth * .5f;
            vertices[v] = new Vector3(left, 0f, front);
            vertices[v + 1] = new Vector3(left + 1f, 0f, front);
            vertices[v + 2] = new Vector3(left, 0f, front + 1f);
            vertices[v + 3] = new Vector3(left + 1f, 0f, front + 1f);
            uv[v] = Vector2.zero; uv[v + 1] = Vector2.right; uv[v + 2] = Vector2.up; uv[v + 3] = Vector2.one;
            triangles[t] = v; triangles[t + 1] = v + 2; triangles[t + 2] = v + 1;
            triangles[t + 3] = v + 1; triangles[t + 4] = v + 2; triangles[t + 5] = v + 3;
        }
        Mesh mesh = new Mesh { name = "DM_Mesh_MuseumFloor_25x31", vertices = vertices, uv = uv, triangles = triangles };
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        AssetDatabase.CreateAsset(mesh, path);
        return mesh;
    }

    static void Capture(Camera camera, int width, int height, string path)
    {
        RenderTexture target = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
        RenderTexture old = RenderTexture.active;
        camera.targetTexture = target;
        camera.Render();
        RenderTexture.active = target;
        Texture2D image = new Texture2D(width, height, TextureFormat.RGB24, false);
        image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        image.Apply();
        File.WriteAllBytes(path, image.EncodeToPNG());
        camera.targetTexture = null;
        RenderTexture.active = old;
        Object.DestroyImmediate(image);
        target.Release();
        Object.DestroyImmediate(target);
    }

    static void EnsureFolders()
    {
        string[] folders = { "Characters", "Environment/Museum", "Props/Museum", "Items", "Materials", "Textures", "Animations", "VFX", "Previews" };
        foreach (string folder in folders) Directory.CreateDirectory(Art + "/" + folder);
    }

    static void CreateMaterials()
    {
        CreateMarbleTexture();
        CreateMarbleNormal();
        marble = Mat("DM_Material_Marble", Hex("#AAB0AF"), 0f, .76f);
        marble.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/DM_Texture_Marble_BaseColor.png");
        marble.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/DM_Texture_Marble_Normal.png"));
        marble.SetFloat("_BumpScale", .24f);
        marble.EnableKeyword("_NORMALMAP");
        marble.SetTextureScale("_MainTex", Vector2.one);
        EditorUtility.SetDirty(marble);
        grout = Mat("DM_Material_Grout", Hex("#202936"), 0f, .18f);
        brass = Mat("DM_Material_BrushedGold", Hex("#C9A96A"), .72f, .72f);
        wall = Mat("DM_Material_NavyStone", Hex("#334155"), .02f, .27f);
        black = Mat("DM_Material_BlackSuit", Hex("#171C23"), .02f, .35f);
        charcoal = Mat("DM_Material_Charcoal", Hex("#252B34"), .08f, .39f);
        shirt = Mat("DM_Material_IvoryShirt", Hex("#E8DED0"), 0f, .28f);
        skin = Mat("DM_Material_WarmSkin", Hex("#B98965"), 0f, .3f);
        hair = Mat("DM_Material_BrownHair", Hex("#4C3527"), 0f, .27f);
        shades = Mat("DM_Material_Sunglasses", Hex("#080D14"), .35f, .86f);
        blue = Mat("DM_Material_GuardBlue", Hex("#6382A2"), 0f, .3f);
        navy = Mat("DM_Material_GuardNavy", Hex("#202D40"), .06f, .35f);
        stone = Mat("DM_Material_IvoryStatue", Hex("#D4C9A8"), .0f, .57f);
        glass = Mat("DM_Material_CaseGlass", new Color(.44f, .67f, .76f, .17f), 0f, .96f, true);
        diamond = Mat("DM_Material_BlueDiamond", Hex("#3882F6"), .05f, .94f, false, Hex("#1746A0") * .62f);
        cyanGlow = Mat("DM_Material_DiamondGlow", Hex("#58B9FF"), .0f, .68f, false, Hex("#3882F6") * 1.6f);
        goldGlow = Mat("DM_Material_WarmLamp", Hex("#F9D6A1"), .0f, .3f, false, Hex("#FFC57B") * 2f);
        wood = Mat("DM_Material_DarkWood", Hex("#49362C"), .04f, .35f);
        foliage = Mat("DM_Material_Foliage", Hex("#225246"), 0f, .28f);
        redRope = Mat("DM_Material_RedVelvet", Hex("#71252E"), 0f, .42f);
        greenGlow = Mat("DM_Material_ExitGlow", Hex("#22C55E"), 0f, .35f, false, Hex("#22C55E") * 1.5f);
        CreatePaintingTexture("A", Hex("#B99568"), Hex("#25344A"));
        CreatePaintingTexture("B", Hex("#9B7754"), Hex("#49556A"));
        paintingA = Mat("DM_Material_Painting_A", Color.white, 0f, .28f);
        paintingB = Mat("DM_Material_Painting_B", Color.white, 0f, .28f);
        paintingA.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/DM_Texture_Painting_A.png");
        paintingB.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/DM_Texture_Painting_B.png");
        EditorUtility.SetDirty(paintingA);
        EditorUtility.SetDirty(paintingB);
        CreateRadialTexture();
        Texture2D radial = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "/Textures/DM_Texture_SoftRadial.png");
        warmPool = TransparentUnlit("DM_Material_WarmLightPool", new Color(1f, .49f, .20f, .42f), radial);
        contactShadow = TransparentUnlit("DM_Material_ContactShadow", new Color(.025f, .04f, .08f, .62f), radial);
        greenPool = TransparentUnlit("DM_Material_ExitLightPool", new Color(.12f, 1f, .38f, .38f), radial);
    }

    static Material TransparentUnlit(string name, Color color, Texture2D texture)
    {
        string path = Art + "/Materials/" + name + ".mat";
        Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("Unlit/Transparent"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.color = color;
        material.mainTexture = texture;
        EditorUtility.SetDirty(material);
        return material;
    }

    static void CreateRadialTexture()
    {
        string path = Art + "/Textures/DM_Texture_SoftRadial.png";
        const int size = 128;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float dx = (x + .5f) / size * 2f - 1f;
            float dy = (y + .5f) / size * 2f - 1f;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            float a = Mathf.Pow(Mathf.Clamp01(1f - d), 2f);
            texture.SetPixel(x, y, new Color(1f, 1f, 1f, a));
        }
        texture.Apply();
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path);
        TextureImporter importer = (TextureImporter)AssetImporter.GetAtPath(path);
        importer.maxTextureSize = 128;
        importer.textureCompression = TextureImporterCompression.Compressed;
        importer.alphaIsTransparency = true;
        importer.SaveAndReimport();
    }

    static void CreatePaintingTexture(string variant, Color warm, Color cool)
    {
        string path = Art + "/Textures/DM_Texture_Painting_" + variant + ".png";
        const int width = 256, height = 192;
        Texture2D texture = new Texture2D(width, height, TextureFormat.RGB24, false);
        for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
        {
            float u = x / (float)width, v = y / (float)height;
            float horizon = .43f + .08f * Mathf.PerlinNoise(u * 5f, 1.8f);
            float noise = Mathf.PerlinNoise(u * 12f + (variant == "A" ? 1f : 5f), v * 12f) * .12f;
            Color color = v > horizon ? Color.Lerp(cool, warm, Mathf.Clamp01((v - horizon) * .52f)) : Color.Lerp(warm * .42f, cool * .56f, v);
            float silhouette = Mathf.Abs(u - .52f) < .075f + .06f * v && v < .72f ? .62f : 1f;
            color = color * (silhouette + noise);
            texture.SetPixel(x, y, color);
        }
        texture.Apply();
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path);
        TextureImporter importer = (TextureImporter)AssetImporter.GetAtPath(path);
        importer.maxTextureSize = 256;
        importer.textureCompression = TextureImporterCompression.Compressed;
        importer.SaveAndReimport();
    }

    static Material Mat(string name, Color color, float metallic, float smoothness, bool transparent = false, Color emission = default)
    {
        string path = Art + "/Materials/" + name + ".mat";
        Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("Standard"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.color = color;
        material.SetFloat("_Metallic", metallic);
        material.SetFloat("_Glossiness", smoothness);
        if (transparent)
        {
            material.SetFloat("_Mode", 3f);
            material.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            material.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            material.SetInt("_ZWrite", 0);
            material.EnableKeyword("_ALPHABLEND_ON");
            material.renderQueue = 3000;
        }
        if (emission.maxColorComponent > 0f)
        {
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", emission);
        }
        EditorUtility.SetDirty(material);
        return material;
    }

    static void CreateMarbleTexture()
    {
        string path = Art + "/Textures/DM_Texture_Marble_BaseColor.png";
        const int size = 256;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGB24, false);
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float u = x / (float)size, v = y / (float)size;
            float turbulence = Mathf.PerlinNoise(u * 7f, v * 7f) * .45f + Mathf.PerlinNoise(u * 16f + 3f, v * 16f + 5f) * .14f;
            float vein = Mathf.Pow(Mathf.Abs(Mathf.Sin((u * 2f + v * 2.7f + turbulence) * Mathf.PI * 2.4f)), 28f);
            float edge = x < 3 || y < 3 || x >= size - 3 || y >= size - 3 ? .55f : 1f;
            float shade = (.83f + turbulence * .12f - vein * .08f) * edge;
            texture.SetPixel(x, y, new Color(shade * .83f, shade * .82f, shade * .80f));
        }
        texture.Apply();
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path);
        TextureImporter importer = (TextureImporter)AssetImporter.GetAtPath(path);
        importer.maxTextureSize = 256;
        importer.textureCompression = TextureImporterCompression.Compressed;
        importer.wrapMode = TextureWrapMode.Repeat;
        importer.SaveAndReimport();
    }

    static void CreateMarbleNormal()
    {
        string path = Art + "/Textures/DM_Texture_Marble_Normal.png";
        const int size = 256;
        Texture2D texture = new Texture2D(size, size, TextureFormat.RGB24, false);
        for (int y = 0; y < size; y++)
        for (int x = 0; x < size; x++)
        {
            float u = x / (float)size, v = y / (float)size;
            float dx = Mathf.PerlinNoise((u + .004f) * 7f, v * 7f) - Mathf.PerlinNoise((u - .004f) * 7f, v * 7f);
            float dy = Mathf.PerlinNoise(u * 7f, (v + .004f) * 7f) - Mathf.PerlinNoise(u * 7f, (v - .004f) * 7f);
            Vector3 normal = new Vector3(-dx * 5f, -dy * 5f, 1f).normalized;
            texture.SetPixel(x, y, new Color(normal.x * .5f + .5f, normal.y * .5f + .5f, normal.z * .5f + .5f));
        }
        texture.Apply();
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path);
        TextureImporter importer = (TextureImporter)AssetImporter.GetAtPath(path);
        importer.textureType = TextureImporterType.NormalMap;
        importer.maxTextureSize = 256;
        importer.textureCompression = TextureImporterCompression.Compressed;
        importer.SaveAndReimport();
    }

    static void CreateFloorTile()
    {
        GameObject root = new GameObject("DM_Environment_Museum_MarbleFloor_A");
        MakeBox("DM_Environment_Museum_MarbleInset", root.transform, new Vector3(0f, -.045f, 0f), new Vector3(.98f, .09f, .98f), marble);
        MakeBox("DM_Environment_Museum_Grout", root.transform, new Vector3(0f, -.095f, 0f), new Vector3(1f, .02f, 1f), grout);
        Save(root, "Environment/Museum/DM_Environment_Museum_MarbleFloor_A.prefab");
    }

    static void CreateCharacter(bool isGuard)
    {
        string name = isGuard ? "DM_Character_MuseumGuard" : "DM_Character_AgentZero";
        GameObject root = new GameObject(name);
        Material coat = isGuard ? blue : black;
        Material pants = isGuard ? navy : charcoal;
        Material trim = isGuard ? brass : shirt;
        DMVisualAnimator animator = root.AddComponent<DMVisualAnimator>();
        animator.guard = isGuard;
        Pool("Contact Shadow", new Vector3(0f, .027f, 0f), new Vector2(.85f, .72f), contactShadow, root.transform);
        MakeBox("Torso", root.transform, new Vector3(0f, 1.13f, 0f), new Vector3(.55f, .73f, .29f), coat);
        MakeBox("Waist", root.transform, new Vector3(0f, .82f, 0f), new Vector3(.48f, .16f, .27f), pants);
        MakeBox("Belt", root.transform, new Vector3(0f, .79f, -.005f), new Vector3(.49f, .06f, .30f), black);
        MakeBox("Buckle", root.transform, new Vector3(0f, .8f, .16f), new Vector3(.09f, .06f, .018f), brass);
        if (isGuard)
        {
            MakeBox("Collar", root.transform, new Vector3(0f, 1.38f, .155f), new Vector3(.19f, .12f, .022f), navy);
            MakeBox("Badge", root.transform, new Vector3(-.14f, 1.25f, .158f), new Vector3(.06f, .08f, .018f), brass);
            MakeBox("Pocket", root.transform, new Vector3(.14f, 1.22f, .16f), new Vector3(.15f, .10f, .018f), navy);
            MakeBox("Shoulder L", root.transform, new Vector3(-.29f, 1.38f, 0f), new Vector3(.11f, .06f, .31f), navy);
            MakeBox("Shoulder R", root.transform, new Vector3(.29f, 1.38f, 0f), new Vector3(.11f, .06f, .31f), navy);
        }
        else
        {
            MakeBox("Shirt", root.transform, new Vector3(0f, 1.25f, .158f), new Vector3(.18f, .35f, .025f), shirt);
            MakeBox("Tie", root.transform, new Vector3(0f, 1.24f, .18f), new Vector3(.065f, .31f, .015f), navy);
            MakeBox("Lapel L", root.transform, new Vector3(-.14f, 1.33f, .16f), new Vector3(.10f, .31f, .024f), charcoal).transform.localRotation = Quaternion.Euler(0f, 0f, -18f);
            MakeBox("Lapel R", root.transform, new Vector3(.14f, 1.33f, .16f), new Vector3(.10f, .31f, .024f), charcoal).transform.localRotation = Quaternion.Euler(0f, 0f, 18f);
        }
        Transform headPivot = new GameObject("Head Pivot").transform;
        headPivot.SetParent(root.transform, false);
        headPivot.localPosition = new Vector3(0f, 1.55f, 0f);
        animator.head = headPivot;
        MakeSphere("Face", headPivot, new Vector3(0f, .065f, 0f), new Vector3(.36f, .41f, .33f), skin);
        MakeSphere("Hair", headPivot, new Vector3(0f, .25f, -.02f), new Vector3(.37f, .18f, .34f), hair);
        MakeBox("Nose", headPivot, new Vector3(0f, .055f, .175f), new Vector3(.055f, .09f, .065f), skin);
        if (isGuard)
        {
            MakeBox("Cap Crown", headPivot, new Vector3(0f, .32f, 0f), new Vector3(.43f, .19f, .38f), navy);
            MakeBox("Cap Brim", headPivot, new Vector3(0f, .245f, .20f), new Vector3(.46f, .035f, .28f), navy);
            MakeBox("Cap Band", headPivot, new Vector3(0f, .25f, .20f), new Vector3(.41f, .025f, .025f), brass);
        }
        else
        {
            MakeBox("Sunglasses Bridge", headPivot, new Vector3(0f, .13f, .174f), new Vector3(.39f, .085f, .045f), shades);
            MakeBox("Sunglasses Left", headPivot, new Vector3(-.09f, .13f, .193f), new Vector3(.16f, .085f, .025f), shades);
            MakeBox("Sunglasses Right", headPivot, new Vector3(.09f, .13f, .193f), new Vector3(.16f, .085f, .025f), shades);
        }
        animator.leftArm = Limb(root.transform, "Left Arm", -.34f, 1.37f, coat, pants, true, -1f);
        animator.rightArm = Limb(root.transform, "Right Arm", .34f, 1.37f, coat, pants, true, 1f);
        animator.leftLeg = Limb(root.transform, "Left Leg", -.15f, .81f, coat, pants, false, -1f);
        animator.rightLeg = Limb(root.transform, "Right Leg", .15f, .81f, coat, pants, false, 1f);
        Save(root, "Characters/" + name + ".prefab");
    }

    static Transform Limb(Transform parent, string name, float x, float y, Material coat, Material pants, bool arm, float side)
    {
        Transform pivot = new GameObject(name).transform;
        pivot.SetParent(parent, false);
        pivot.localPosition = new Vector3(x, y, 0f);
        if (arm)
        {
            MakeSphere("Sleeve", pivot, new Vector3(0f, -.17f, 0f), new Vector3(.19f, .43f, .19f), coat);
            MakeSphere("Glove", pivot, new Vector3(0f, -.44f, .02f), new Vector3(.13f, .17f, .13f), pants);
            if (coat == blue) MakeBox("Patch", pivot, new Vector3(side * .095f, -.12f, 0f), new Vector3(.02f, .10f, .13f), brass);
        }
        else
        {
            MakeBox("Trouser", pivot, new Vector3(0f, -.31f, 0f), new Vector3(.22f, .65f, .23f), pants);
            MakeBox("Shoe", pivot, new Vector3(0f, -.70f, .07f), new Vector3(.24f, .18f, .36f), black);
        }
        return pivot;
    }

    static void CreateStatue()
    {
        GameObject root = new GameObject("DM_Prop_Statue_A");
        Pool("Contact Shadow", new Vector3(0f, .027f, 0f), new Vector2(1.3f, 1.1f), contactShadow, root.transform);
        MakeBox("Plinth", root.transform, new Vector3(0f, .25f, 0f), new Vector3(.9f, .50f, .9f), wall);
        MakeBox("Plinth Gold Edge", root.transform, new Vector3(0f, .49f, 0f), new Vector3(.94f, .06f, .94f), brass);
        MakeBox("Statue Base", root.transform, new Vector3(0f, .58f, 0f), new Vector3(.55f, .14f, .52f), stone);
        MeshFilter robe = new GameObject("Sculpted Draped Robe").AddComponent<MeshFilter>();
        robe.transform.SetParent(root.transform, false);
        robe.sharedMesh = StatueRobeMesh();
        robe.gameObject.AddComponent<MeshRenderer>().sharedMaterial = stone;
        MakeSphere("Upper Body", root.transform, new Vector3(0f, 1.52f, 0f), new Vector3(.40f, .45f, .30f), stone);
        MakeSphere("Neck", root.transform, new Vector3(0f, 1.78f, 0f), new Vector3(.14f, .19f, .14f), stone);
        MakeSphere("Head", root.transform, new Vector3(0f, 1.98f, 0f), new Vector3(.26f, .34f, .27f), stone);
        MakeSphere("Hair Shape", root.transform, new Vector3(0f, 2.12f, -.045f), new Vector3(.28f, .16f, .28f), stone);
        MakeSphere("Hair Bun", root.transform, new Vector3(0f, 2.10f, -.20f), new Vector3(.20f, .20f, .18f), stone);
        MakeBox("Nose Ridge", root.transform, new Vector3(0f, 1.98f, .145f), new Vector3(.055f, .15f, .10f), stone);
        Rod("Left Arm", root.transform, new Vector3(-.18f, 1.72f, 0f), new Vector3(-.43f, 1.30f, .05f), .095f, stone);
        Rod("Right Arm", root.transform, new Vector3(.19f, 1.73f, 0f), new Vector3(.47f, 1.44f, .18f), .095f, stone);
        Rod("Right Forearm", root.transform, new Vector3(.47f, 1.44f, .18f), new Vector3(.28f, 1.23f, .35f), .07f, stone);
        MakeBox("Toga Sash", root.transform, new Vector3(-.10f, 1.48f, -.155f), new Vector3(.12f, .48f, .038f), shirt).transform.localRotation = Quaternion.Euler(0f, 0f, 25f);
        Save(root, "Props/Museum/DM_Prop_Statue_A.prefab");
    }

    static void CreateDisplayCase()
    {
        GameObject root = new GameObject("DM_Prop_DisplayCase_A");
        Pool("Contact Shadow", new Vector3(0f, .027f, 0f), new Vector2(1.75f, 1.45f), contactShadow, root.transform);
        MakeBox("Pedestal", root.transform, new Vector3(0f, .42f, 0f), new Vector3(1.45f, .84f, 1.12f), charcoal);
        MakeBox("Pedestal Base Trim", root.transform, new Vector3(0f, .09f, 0f), new Vector3(1.53f, .10f, 1.2f), brass);
        MakeBox("Pedestal Top", root.transform, new Vector3(0f, .84f, 0f), new Vector3(1.54f, .09f, 1.20f), brass);
        MakeBox("Display Velvet", root.transform, new Vector3(0f, .91f, 0f), new Vector3(1.34f, .06f, 1.0f), navy);
        MakeBox("Diamond Pedestal", root.transform, new Vector3(0f, 1.03f, 0f), new Vector3(.52f, .18f, .45f), stone);
        GameObject jewel = new GameObject("DM_Item_BlueDiamond");
        jewel.transform.SetParent(root.transform, false);
        jewel.transform.localPosition = new Vector3(0f, 1.28f, 0f);
        MeshFilter filter = jewel.AddComponent<MeshFilter>();
        filter.sharedMesh = DiamondMesh();
        jewel.AddComponent<MeshRenderer>().sharedMaterial = diamond;
        MakeSphere("Diamond Highlight", jewel.transform, new Vector3(-.07f, .16f, -.12f), new Vector3(.055f, .055f, .055f), cyanGlow);
        MakeBox("Glass Front", root.transform, new Vector3(0f, 1.34f, -.52f), new Vector3(1.42f, .9f, .018f), glass);
        MakeBox("Glass Back", root.transform, new Vector3(0f, 1.34f, .52f), new Vector3(1.42f, .9f, .018f), glass);
        MakeBox("Glass Left", root.transform, new Vector3(-.71f, 1.34f, 0f), new Vector3(.018f, .9f, 1.04f), glass);
        MakeBox("Glass Right", root.transform, new Vector3(.71f, 1.34f, 0f), new Vector3(.018f, .9f, 1.04f), glass);
        MakeBox("Glass Top", root.transform, new Vector3(0f, 1.79f, 0f), new Vector3(1.42f, .018f, 1.04f), glass);
        for (int sx = -1; sx <= 1; sx += 2)
        for (int sz = -1; sz <= 1; sz += 2)
            MakeBox("Gold Frame", root.transform, new Vector3(sx * .72f, 1.34f, sz * .53f), new Vector3(.035f, .95f, .035f), brass);
        MakeBox("Top Gold Frame", root.transform, new Vector3(0f, 1.79f, -.53f), new Vector3(1.48f, .04f, .04f), brass);
        MakeBox("Top Gold Frame", root.transform, new Vector3(0f, 1.79f, .53f), new Vector3(1.48f, .04f, .04f), brass);
        MakeBox("Top Gold Frame", root.transform, new Vector3(-.72f, 1.79f, 0f), new Vector3(.04f, .04f, 1.08f), brass);
        MakeBox("Top Gold Frame", root.transform, new Vector3(.72f, 1.79f, 0f), new Vector3(.04f, .04f, 1.08f), brass);
        Save(root, "Props/Museum/DM_Prop_DisplayCase_A.prefab");
    }

    static void CreateStageAssets()
    {
        GameObject root;
        root = new GameObject("DM_Environment_Museum_Pillar_A");
        MakeBox("Foot", root.transform, new Vector3(0f, .13f, 0f), new Vector3(.78f, .26f, .78f), stone);
        MakeBox("Shaft", root.transform, new Vector3(0f, 1.3f, 0f), new Vector3(.52f, 2.2f, .52f), wall);
        MakeBox("Capital", root.transform, new Vector3(0f, 2.48f, 0f), new Vector3(.76f, .24f, .76f), stone);
        MakeBox("Capital Gold Band", root.transform, new Vector3(0f, 2.38f, 0f), new Vector3(.79f, .04f, .79f), brass);
        Save(root, "Environment/Museum/DM_Environment_Museum_Pillar_A.prefab");

        root = new GameObject("DM_Environment_Museum_WallStraight_A");
        MakeBox("Wall Panel", root.transform, new Vector3(0f, 1.25f, 0f), new Vector3(2f, 2.5f, .28f), wall);
        MakeBox("Baseboard", root.transform, new Vector3(0f, .16f, -.16f), new Vector3(2f, .24f, .10f), stone);
        MakeBox("Top Trim", root.transform, new Vector3(0f, 2.42f, -.16f), new Vector3(2f, .11f, .13f), brass);
        Save(root, "Environment/Museum/DM_Environment_Museum_WallStraight_A.prefab");

        root = new GameObject("DM_Environment_Museum_WallCorner_A");
        MakeBox("Corner Face A", root.transform, new Vector3(-.5f, 1.25f, 0f), new Vector3(1.3f, 2.5f, .28f), wall);
        MakeBox("Corner Face B", root.transform, new Vector3(0f, 1.25f, -.5f), new Vector3(.28f, 2.5f, 1.3f), wall);
        MakeBox("Corner Stone", root.transform, new Vector3(0f, 1.28f, 0f), new Vector3(.34f, 2.4f, .34f), stone);
        Save(root, "Environment/Museum/DM_Environment_Museum_WallCorner_A.prefab");

        root = new GameObject("DM_Environment_Museum_Arch_A");
        MakeBox("Left Pier", root.transform, new Vector3(-1.47f, 1.28f, 0f), new Vector3(.42f, 2.56f, .55f), stone);
        MakeBox("Right Pier", root.transform, new Vector3(1.47f, 1.28f, 0f), new Vector3(.42f, 2.56f, .55f), stone);
        MakeBox("Lintel", root.transform, new Vector3(0f, 2.48f, 0f), new Vector3(3.4f, .27f, .59f), stone);
        MakeBox("Gold Inlay", root.transform, new Vector3(0f, 2.34f, -.31f), new Vector3(3.4f, .04f, .04f), brass);
        Save(root, "Environment/Museum/DM_Environment_Museum_Arch_A.prefab");

        root = new GameObject("DM_Environment_Museum_DoorFrame_A");
        MakeBox("Left Jamb", root.transform, new Vector3(-.98f, 1.2f, 0f), new Vector3(.25f, 2.4f, .35f), stone);
        MakeBox("Right Jamb", root.transform, new Vector3(.98f, 1.2f, 0f), new Vector3(.25f, 2.4f, .35f), stone);
        MakeBox("Lintel", root.transform, new Vector3(0f, 2.32f, 0f), new Vector3(2.15f, .25f, .38f), stone);
        MakeBox("Gold Edge", root.transform, new Vector3(0f, 2.18f, -.19f), new Vector3(2.15f, .04f, .04f), brass);
        Save(root, "Environment/Museum/DM_Environment_Museum_DoorFrame_A.prefab");

        root = new GameObject("DM_Prop_Bust_A");
        MakeBox("Plinth", root.transform, new Vector3(0f, .43f, 0f), new Vector3(.62f, .86f, .62f), wall);
        MakeBox("Gold Edge", root.transform, new Vector3(0f, .86f, 0f), new Vector3(.68f, .05f, .68f), brass);
        MakeSphere("Shoulders", root.transform, new Vector3(0f, 1.12f, 0f), new Vector3(.45f, .37f, .29f), stone);
        MakeSphere("Head", root.transform, new Vector3(0f, 1.49f, 0f), new Vector3(.28f, .38f, .28f), stone);
        MakeSphere("Hair", root.transform, new Vector3(0f, 1.66f, -.03f), new Vector3(.31f, .15f, .30f), stone);
        Save(root, "Props/Museum/DM_Prop_Bust_A.prefab");

        GameObject statueA = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/Props/Museum/DM_Prop_Statue_A.prefab");
        root = (GameObject)PrefabUtility.InstantiatePrefab(statueA);
        PrefabUtility.UnpackPrefabInstance(root, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);
        root.name = "DM_Prop_Statue_B";
        root.transform.localScale = Vector3.one * .91f;
        Transform raisedArm = root.transform.Find("Right Arm");
        if (raisedArm != null) raisedArm.localRotation = Quaternion.Euler(-25f, 0f, -18f);
        Save(root, "Props/Museum/DM_Prop_Statue_B.prefab");

        root = new GameObject("DM_Prop_DisplayCase_B");
        Pool("Contact Shadow", new Vector3(0f, .027f, 0f), new Vector2(1.8f, 1.2f), contactShadow, root.transform);
        MakeBox("Base", root.transform, new Vector3(0f, .39f, 0f), new Vector3(1.65f, .78f, 1.05f), wood);
        MakeBox("Base Gold Trim", root.transform, new Vector3(0f, .75f, 0f), new Vector3(1.72f, .07f, 1.12f), brass);
        MakeBox("Velvet", root.transform, new Vector3(0f, .82f, 0f), new Vector3(1.5f, .06f, .9f), navy);
        MakeBox("Artifact Base", root.transform, new Vector3(0f, .91f, 0f), new Vector3(.52f, .14f, .44f), stone);
        MakeSphere("Golden Relic", root.transform, new Vector3(0f, 1.17f, 0f), new Vector3(.28f, .40f, .28f), brass);
        MakeBox("Glass Front", root.transform, new Vector3(0f, 1.25f, -.49f), new Vector3(1.58f, .84f, .015f), glass);
        MakeBox("Glass Back", root.transform, new Vector3(0f, 1.25f, .49f), new Vector3(1.58f, .84f, .015f), glass);
        MakeBox("Glass Left", root.transform, new Vector3(-.79f, 1.25f, 0f), new Vector3(.015f, .84f, .98f), glass);
        MakeBox("Glass Right", root.transform, new Vector3(.79f, 1.25f, 0f), new Vector3(.015f, .84f, .98f), glass);
        MakeBox("Glass Top", root.transform, new Vector3(0f, 1.67f, 0f), new Vector3(1.58f, .015f, .98f), glass);
        for (int sx = -1; sx <= 1; sx += 2)
            for (int sz = -1; sz <= 1; sz += 2)
                MakeBox("Gold Frame", root.transform, new Vector3(sx * .80f, 1.25f, sz * .50f), new Vector3(.035f, .88f, .035f), brass);
        Save(root, "Props/Museum/DM_Prop_DisplayCase_B.prefab");

        CreatePainting("A", paintingA);
        CreatePainting("B", paintingB);
        root = new GameObject("DM_Prop_Bench_A");
        MakeBox("Seat", root.transform, new Vector3(0f, .46f, 0f), new Vector3(1.6f, .12f, .48f), wood);
        MakeBox("Back", root.transform, new Vector3(0f, .76f, .20f), new Vector3(1.6f, .54f, .10f), wood);
        MakeBox("Left Leg", root.transform, new Vector3(-.65f, .24f, 0f), new Vector3(.10f, .48f, .40f), brass);
        MakeBox("Right Leg", root.transform, new Vector3(.65f, .24f, 0f), new Vector3(.10f, .48f, .40f), brass);
        Save(root, "Props/Museum/DM_Prop_Bench_A.prefab");

        CreatePlant("A", 0f);
        CreatePlant("B", 35f);
        root = new GameObject("DM_Prop_RopeBarrier_A");
        for (int side = -1; side <= 1; side += 2)
        {
            float x = side * .85f;
            MakeBox("Foot", root.transform, new Vector3(x, .04f, 0f), new Vector3(.26f, .08f, .26f), brass);
            Rod("Post", root.transform, new Vector3(x, .08f, 0f), new Vector3(x, .82f, 0f), .045f, brass);
            MakeSphere("Top", root.transform, new Vector3(x, .86f, 0f), new Vector3(.14f, .14f, .14f), brass);
        }
        for (int i = 0; i < 8; i++)
        {
            float x0 = -.82f + i * .205f, x1 = x0 + .205f;
            float y0 = .73f - .16f * Mathf.Sin(Mathf.PI * i / 8f);
            float y1 = .73f - .16f * Mathf.Sin(Mathf.PI * (i + 1) / 8f);
            Rod("Velvet Rope", root.transform, new Vector3(x0, y0, 0f), new Vector3(x1, y1, 0f), .035f, redRope);
        }
        Save(root, "Props/Museum/DM_Prop_RopeBarrier_A.prefab");

        root = new GameObject("DM_Prop_MuseumLamp_A");
        MakeBox("Backplate", root.transform, Vector3.zero, new Vector3(.34f, .52f, .10f), brass);
        MakeBox("Warm Sconce", root.transform, new Vector3(0f, 0f, -.09f), new Vector3(.22f, .34f, .09f), goldGlow);
        Save(root, "Props/Museum/DM_Prop_MuseumLamp_A.prefab");

        root = new GameObject("DM_Prop_CCTV_A");
        MakeBox("Mount", root.transform, Vector3.zero, new Vector3(.24f, .24f, .24f), charcoal);
        Rod("Arm", root.transform, new Vector3(0f, 0f, 0f), new Vector3(0f, -.18f, -.25f), .06f, brass);
        MakeBox("Camera Body", root.transform, new Vector3(0f, -.23f, -.41f), new Vector3(.42f, .24f, .50f), stone);
        MakeBox("Lens", root.transform, new Vector3(0f, -.23f, -.675f), new Vector3(.18f, .14f, .03f), shades);
        Save(root, "Props/Museum/DM_Prop_CCTV_A.prefab");

        root = new GameObject("DM_Item_ExitDoor_A");
        MakeBox("Door Recess", root.transform, new Vector3(0f, 1.13f, .07f), new Vector3(1.85f, 2.26f, .16f), black);
        MakeBox("Left Door", root.transform, new Vector3(-.45f, 1.12f, -.03f), new Vector3(.82f, 2.15f, .11f), wood);
        MakeBox("Right Door", root.transform, new Vector3(.45f, 1.12f, -.03f), new Vector3(.82f, 2.15f, .11f), wood);
        MakeBox("Door Seam", root.transform, new Vector3(0f, 1.12f, -.10f), new Vector3(.055f, 2.15f, .03f), brass);
        MakeBox("Left Handle", root.transform, new Vector3(-.17f, 1.04f, -.13f), new Vector3(.04f, .17f, .06f), brass);
        MakeBox("Right Handle", root.transform, new Vector3(.17f, 1.04f, -.13f), new Vector3(.04f, .17f, .06f), brass);
        MakeBox("EXIT Sign", root.transform, new Vector3(0f, 2.50f, -.11f), new Vector3(1.08f, .24f, .10f), greenGlow);
        Save(root, "Items/DM_Item_ExitDoor_A.prefab");
    }

    static void CreatePainting(string variant, Material artMaterial)
    {
        GameObject root = new GameObject("DM_Prop_PaintingFrame_" + variant);
        MakeBox("Back", root.transform, Vector3.zero, new Vector3(1.12f, .85f, .07f), wood);
        MakeBox("Canvas", root.transform, new Vector3(0f, 0f, -.05f), new Vector3(.92f, .65f, .02f), artMaterial);
        MakeBox("Top Gold", root.transform, new Vector3(0f, .39f, -.08f), new Vector3(1.18f, .09f, .07f), brass);
        MakeBox("Bottom Gold", root.transform, new Vector3(0f, -.39f, -.08f), new Vector3(1.18f, .09f, .07f), brass);
        MakeBox("Left Gold", root.transform, new Vector3(-.55f, 0f, -.08f), new Vector3(.09f, .77f, .07f), brass);
        MakeBox("Right Gold", root.transform, new Vector3(.55f, 0f, -.08f), new Vector3(.09f, .77f, .07f), brass);
        Save(root, "Props/Museum/DM_Prop_PaintingFrame_" + variant + ".prefab");
    }

    static void CreatePlant(string variant, float turn)
    {
        GameObject root = new GameObject("DM_Prop_Plant_" + variant);
        MakeBox("Planter", root.transform, new Vector3(0f, .24f, 0f), new Vector3(.47f, .48f, .47f), stone);
        MakeBox("Planter Rim", root.transform, new Vector3(0f, .48f, 0f), new Vector3(.53f, .07f, .53f), brass);
        Rod("Stem", root.transform, new Vector3(0f, .48f, 0f), new Vector3(0f, 1.2f, 0f), .025f, foliage);
        for (int i = 0; i < 7; i++)
        {
            float a = (i * 360f / 7f + turn) * Mathf.Deg2Rad;
            Vector3 end = new Vector3(Mathf.Cos(a) * .38f, .86f + (i % 2) * .16f, Mathf.Sin(a) * .38f);
            GameObject leaf = MakeSphere("Leaf", root.transform, new Vector3(end.x * .6f, end.y, end.z * .6f), new Vector3(.16f, .48f, .08f), foliage);
            leaf.transform.localRotation = Quaternion.LookRotation(new Vector3(Mathf.Cos(a), -.35f, Mathf.Sin(a))) * Quaternion.Euler(40f, 0f, 0f);
        }
        Save(root, "Props/Museum/DM_Prop_Plant_" + variant + ".prefab");
    }

    static Mesh StatueRobeMesh()
    {
        string path = Art + "/Props/Museum/DM_Mesh_StatueRobe_A.asset";
        Mesh saved = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (saved != null) return saved;
        const int sides = 12;
        float[] heights = { .64f, .76f, 1.02f, 1.29f, 1.56f, 1.72f };
        float[] radii = { .40f, .39f, .31f, .23f, .24f, .14f };
        Vector3[] vertices = new Vector3[heights.Length * sides];
        int[] triangles = new int[(heights.Length - 1) * sides * 6];
        for (int ring = 0; ring < heights.Length; ring++)
        for (int side = 0; side < sides; side++)
        {
            float angle = 2f * Mathf.PI * side / sides;
            float fold = 1f + .045f * Mathf.Sin(side * Mathf.PI * .86f + ring * .4f);
            vertices[ring * sides + side] = new Vector3(Mathf.Cos(angle) * radii[ring] * fold,
                heights[ring] + .014f * Mathf.Sin(side * 2.3f), Mathf.Sin(angle) * radii[ring] * .84f * fold);
        }
        int t = 0;
        for (int ring = 0; ring < heights.Length - 1; ring++)
        for (int side = 0; side < sides; side++)
        {
            int a = ring * sides + side, b = ring * sides + (side + 1) % sides;
            int c = (ring + 1) * sides + side, d = (ring + 1) * sides + (side + 1) % sides;
            triangles[t++] = a; triangles[t++] = c; triangles[t++] = b;
            triangles[t++] = b; triangles[t++] = c; triangles[t++] = d;
        }
        Mesh mesh = new Mesh { name = "DM_Mesh_StatueRobe_A", vertices = vertices, triangles = triangles };
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        AssetDatabase.CreateAsset(mesh, path);
        return mesh;
    }

    static Mesh DiamondMesh()
    {
        string path = Art + "/Items/DM_Mesh_BlueDiamond.asset";
        Mesh saved = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (saved != null) return saved;
        const int sides = 8;
        Vector3 top = new Vector3(0f, .27f, 0f), bottom = new Vector3(0f, -.28f, 0f);
        Vector3[] vertices = new Vector3[sides * 6];
        int[] triangles = new int[vertices.Length];
        for (int i = 0; i < sides; i++)
        {
            float a = Mathf.PI * 2f * i / sides, b = Mathf.PI * 2f * (i + 1) / sides;
            Vector3 p = new Vector3(Mathf.Cos(a) * .31f, .07f, Mathf.Sin(a) * .31f);
            Vector3 q = new Vector3(Mathf.Cos(b) * .31f, .07f, Mathf.Sin(b) * .31f);
            int at = i * 6;
            vertices[at] = top; vertices[at + 1] = p; vertices[at + 2] = q;
            vertices[at + 3] = p; vertices[at + 4] = bottom; vertices[at + 5] = q;
            for (int k = 0; k < 6; k++) triangles[at + k] = at + k;
        }
        Mesh mesh = new Mesh { name = "DM_Mesh_BlueDiamond", vertices = vertices, triangles = triangles };
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        AssetDatabase.CreateAsset(mesh, path);
        return mesh;
    }

    static GameObject MakeBox(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
    {
        return Primitive(PrimitiveType.Cube, name, parent, position, scale, material);
    }
    static GameObject MakeSphere(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
    {
        return Primitive(PrimitiveType.Sphere, name, parent, position, scale, material);
    }
    static GameObject Primitive(PrimitiveType type, string name, Transform parent, Vector3 position, Vector3 scale, Material material)
    {
        GameObject go;
        if (type == PrimitiveType.Sphere)
        {
            go = new GameObject(name);
            go.AddComponent<MeshFilter>().sharedMesh = LowPolySphereMesh();
            go.AddComponent<MeshRenderer>();
        }
        else go = GameObject.CreatePrimitive(type);
        go.name = name;
        if (parent != null) go.transform.SetParent(parent, false);
        go.transform.localPosition = position;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().sharedMaterial = material;
        if (material == glass || material == warmPool || material == contactShadow || material == greenPool)
        {
            go.GetComponent<Renderer>().shadowCastingMode = ShadowCastingMode.Off;
            go.GetComponent<Renderer>().receiveShadows = false;
        }
        Collider collider = go.GetComponent<Collider>();
        if (collider != null) Object.DestroyImmediate(collider);
        return go;
    }

    static Mesh LowPolySphereMesh()
    {
        string path = Art + "/Environment/Museum/DM_Mesh_LowPolySphere.asset";
        Mesh saved = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (saved != null) return saved;
        const int slices = 12, stacks = 7;
        Vector3[] vertices = new Vector3[(stacks + 1) * (slices + 1)];
        Vector2[] uv = new Vector2[vertices.Length];
        int[] triangles = new int[stacks * slices * 6];
        for (int y = 0; y <= stacks; y++)
        for (int x = 0; x <= slices; x++)
        {
            float v = y / (float)stacks, u = x / (float)slices;
            float phi = v * Mathf.PI, theta = u * Mathf.PI * 2f;
            int i = y * (slices + 1) + x;
            vertices[i] = new Vector3(Mathf.Sin(phi) * Mathf.Cos(theta), Mathf.Cos(phi), Mathf.Sin(phi) * Mathf.Sin(theta)) * .5f;
            uv[i] = new Vector2(u, v);
        }
        int t = 0;
        for (int y = 0; y < stacks; y++)
        for (int x = 0; x < slices; x++)
        {
            int a = y * (slices + 1) + x, b = a + 1, c = a + slices + 1, d = c + 1;
            triangles[t++] = a; triangles[t++] = b; triangles[t++] = c;
            triangles[t++] = b; triangles[t++] = d; triangles[t++] = c;
        }
        Mesh mesh = new Mesh { name = "DM_Mesh_LowPolySphere", vertices = vertices, uv = uv, triangles = triangles };
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        AssetDatabase.CreateAsset(mesh, path);
        return mesh;
    }
    static void Rod(string name, Transform parent, Vector3 start, Vector3 end, float radius, Material material)
    {
        GameObject rod = Primitive(PrimitiveType.Cylinder, name, parent, (start + end) * .5f, new Vector3(radius, Vector3.Distance(start, end) * .5f, radius), material);
        rod.transform.localRotation = Quaternion.FromToRotation(Vector3.up, end - start);
    }
    static GameObject Pool(string name, Vector3 position, Vector2 size, Material material, Transform parent = null)
    {
        GameObject pool = Primitive(PrimitiveType.Quad, name, parent, position, new Vector3(size.x, size.y, 1f), material);
        pool.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);
        return pool;
    }
    static void WallLamp(Vector3 position)
    {
        MakeBox("DM_Prop_MuseumLamp_Backplate", null, position, new Vector3(.32f, .46f, .12f), brass);
        MakeBox("DM_Prop_MuseumLamp_Glow", null, position + new Vector3(0f, 0f, -.085f), new Vector3(.19f, .29f, .06f), goldGlow);
    }
    static void Save(GameObject root, string relativePath)
    {
        PrefabUtility.SaveAsPrefabAsset(root, Art + "/" + relativePath);
        Object.DestroyImmediate(root);
    }
    static GameObject Instance(string relativePath, Vector3 position, Quaternion rotation)
    {
        GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "/" + relativePath);
        if (prefab == null) throw new System.Exception("DM ART: missing " + relativePath);
        GameObject go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        go.transform.position = position;
        go.transform.rotation = rotation;
        return go;
    }
    static Color Hex(string text) { ColorUtility.TryParseHtmlString(text, out Color color); return color; }
    static Light MakeLight(string name, LightType type, Color color, float intensity, Vector3 position, Quaternion rotation, bool shadows, float range)
    {
        GameObject go = new GameObject(name);
        go.transform.position = position;
        go.transform.rotation = rotation;
        Light light = go.AddComponent<Light>();
        light.type = type;
        light.color = color;
        light.intensity = intensity;
        if (range > 0f) light.range = range;
        light.shadows = shadows ? LightShadows.Soft : LightShadows.None;
        light.shadowStrength = .65f;
        light.renderMode = LightRenderMode.Auto;
        return light;
    }
    static Light Spot(string name, Vector3 position, Vector3 target, Color color, float intensity, float range, float angle)
    {
        Light light = MakeLight(name, LightType.Spot, color, intensity, position, Quaternion.LookRotation(target - position), false, range);
        light.spotAngle = angle;
        return light;
    }
}
