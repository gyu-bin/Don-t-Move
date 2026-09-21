using System.IO;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

[InitializeOnLoad]
public static class Stage01Builder
{
    const string ScenePath = "Assets/Scenes/MuseumStage01.unity";
    static Stage01Builder()
    {
        EditorApplication.delayCall += () =>
        {
            if (!Application.isPlaying && !File.Exists(ScenePath) && !EditorApplication.isCompiling) Build();
        };
    }

    [MenuItem("Don't Move/Rebuild Museum Stage 01")]
    public static void Build()
    {
        Directory.CreateDirectory("Assets/Scenes");
        Directory.CreateDirectory("Assets/Prefabs");
        AssetDatabase.Refresh();
        Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var floor = Make(PrimitiveType.Cube, "Museum Floor", new Vector3(0, -.18f, 0), new Vector3(25, .3f, 31), Color.gray, true);
        floor.layer = 8;
        Wall("North", 0, 15.5f, 25, .5f);
        Wall("South", 0, -15.5f, 25, .5f);
        Wall("West", -12.5f, 0, .5f, 31);
        Wall("East", 12.5f, 0, .5f, 31);
        // Offset passages create a corner and a choice of routes through the museum.
        Wall("South west partition", -8, -5, 8, .5f);
        Wall("South east partition", 7.7f, -5, 9.5f, .5f);
        Wall("Central east divider", 2.5f, -.5f, .5f, 8);
        Wall("North west partition", -8, 4, 8, .5f);
        Wall("North east partition", 8, 4, 8, .5f);
        Wall("North divider", -2, 9.5f, .5f, 8);
        Cover("Statue Cover", new Vector3(-4, .8f, 1), new Vector3(1.5f, 1.6f, 1.5f));
        Cover("Display Case Cover", new Vector3(5, .65f, 8), new Vector3(2.2f, 1.3f, 1.3f));

        var systems = new GameObject("Game Systems");
        var sensor = systems.AddComponent<SensorManager>();
        var detection = systems.AddComponent<DetectionSystem>();
        var mission = systems.AddComponent<MissionController>();
        var game = systems.AddComponent<GameStateController>();
        var hud = systems.AddComponent<GameHUD>();
        var debug = systems.AddComponent<DebugPanel>();

        var player = Make(PrimitiveType.Capsule, "Player", new Vector3(-9, 1, -11), Vector3.one, new Color(.2f, .75f, 1f), true);
        Object.DestroyImmediate(player.GetComponent<CapsuleCollider>());
        var character = player.AddComponent<CharacterController>();
        character.height = 2;
        character.radius = .42f;
        var playerScript = player.AddComponent<PlayerController>();
        SavePrefab(player, "Player");

        Material safe = MaterialAsset("Vision Safe", new Color(.45f, .7f, .65f, .35f));
        Material danger = MaterialAsset("Vision Danger", new Color(1f, .15f, .12f, .55f));
        var guardA = Guard("Guard A", new Vector3(-4, 1, -2), new [] { new Vector3(-4, 1, -2), new Vector3(0, 1, -2) }, player.transform, safe, danger);
        var guardB = Guard("Guard B", new Vector3(6, 1, 7), new [] { new Vector3(6, 1, 7), new Vector3(9, 1, 10), new Vector3(3.8f, 1, 11) }, player.transform, safe, danger);
        SavePrefab(guardA.gameObject, "Guard");

        var diamond = Make(PrimitiveType.Cube, "Diamond", new Vector3(9, .9f, 12), new Vector3(.75f, .75f, .75f), Color.cyan, true);
        diamond.transform.rotation = Quaternion.Euler(20, 45, 20);
        diamond.GetComponent<Collider>().isTrigger = true;
        var diamondTrigger = diamond.AddComponent<ObjectiveTrigger>();
        SavePrefab(diamond, "Diamond");
        var exit = Make(PrimitiveType.Cube, "Exit", new Vector3(-9, .2f, 12), new Vector3(2.2f, .3f, 2.2f), new Color(.25f, 1f, .5f), true);
        exit.GetComponent<Collider>().isTrigger = true;
        var exitTrigger = exit.AddComponent<ObjectiveTrigger>();
        SavePrefab(exit, "Exit");

        var cameraObject = new GameObject("Follow Camera");
        cameraObject.tag = "MainCamera";
        var camera = cameraObject.AddComponent<UnityEngine.Camera>();
        cameraObject.AddComponent<AudioListener>();
        camera.orthographic = true;
        camera.orthographicSize = 9f;
        camera.backgroundColor = new Color(.09f, .12f, .17f);
        camera.clearFlags = CameraClearFlags.SolidColor;
        var cameraScript = cameraObject.AddComponent<CameraController>();
        cameraScript.target = player.transform;
        cameraObject.transform.position = player.transform.position + cameraScript.offset;
        cameraObject.transform.rotation = Quaternion.Euler(65, 0, 0);
        var lightObject = new GameObject("Graybox Light");
        var light = lightObject.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.3f;
        lightObject.transform.rotation = Quaternion.Euler(55, -35, 0);

        playerScript.sensor = sensor; playerScript.game = game;
        game.sensor = sensor; game.player = playerScript; game.guards = new[] { guardA, guardB }; game.detection = detection; game.mission = mission;
        mission.diamond = diamond.transform; mission.exit = exit.transform; mission.game = game;
        diamondTrigger.mission = mission; exitTrigger.mission = mission; exitTrigger.isExit = true;
        hud.game = game; hud.detection = detection; hud.mission = mission; hud.player = playerScript; hud.debugPanel = debug;
        debug.sensor = sensor; debug.game = game; debug.detection = detection; debug.player = playerScript;
        PlayerSettings.companyName = "Dont Move Prototype";
        PlayerSettings.productName = "DON'T MOVE";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "com.dontmove.prototype");
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.iOS, "com.dontmove.prototype");
        var settingsAssets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
        if (settingsAssets.Length > 0)
        {
            var settings = new SerializedObject(settingsAssets[0]);
            var inputHandler = settings.FindProperty("activeInputHandler");
            if (inputHandler != null) { inputHandler.intValue = 1; settings.ApplyModifiedProperties(); }
        }
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
        Debug.Log("Museum Stage 01 created. Open Assets/Scenes/MuseumStage01.unity and press Play.");
        if (AssetDatabase.IsValidFolder("Assets/Art/Characters")) DMVisualArtBuilder.ApplyStage01();
    }

    static GuardController Guard(string name, Vector3 position, Vector3[] positions, Transform player, Material safe, Material danger)
    {
        var body = Make(PrimitiveType.Capsule, name, position, Vector3.one, new Color(1, .65f, .2f), true);
        Object.DestroyImmediate(body.GetComponent<CapsuleCollider>());
        var controller = body.AddComponent<GuardController>();
        // GuardController requires GuardVision, so AddComponent<GuardController>() already created it.
        var vision = body.GetComponent<GuardVision>();
        controller.vision = vision;
        vision.player = player;
        vision.safeMaterial = safe;
        vision.dangerMaterial = danger;
        vision.obstructionMask = 1 << 8;
        controller.patrolPoints = new Transform[positions.Length];
        for (int i = 0; i < positions.Length; i++)
        {
            var point = new GameObject(name + " Patrol " + i);
            point.transform.position = positions[i];
            controller.patrolPoints[i] = point.transform;
        }
        return controller;
    }
    static void Wall(string name, float x, float z, float width, float depth)
    {
        var wall = Make(PrimitiveType.Cube, name, new Vector3(x, 1, z), new Vector3(width, 2, depth), new Color(.34f, .37f, .43f), true);
        wall.layer = 8;
    }
    static void Cover(string name, Vector3 position, Vector3 scale)
    {
        var cover = Make(PrimitiveType.Cube, name, position, scale, new Color(.52f, .48f, .39f), true);
        cover.layer = 8;
        cover.AddComponent<CoverMarker>();
        SavePrefab(cover, "Cover");
    }
    static GameObject Make(PrimitiveType type, string name, Vector3 position, Vector3 scale, Color color, bool collider)
    {
        var obj = GameObject.CreatePrimitive(type);
        obj.name = name;
        obj.transform.position = position;
        obj.transform.localScale = scale;
        obj.GetComponent<Renderer>().sharedMaterial = MaterialAsset(name.Replace(' ', '_'), color);
        if (!collider) Object.DestroyImmediate(obj.GetComponent<Collider>());
        return obj;
    }
    static Material MaterialAsset(string name, Color color)
    {
        string path = "Assets/Prefabs/" + name + ".mat";
        Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material != null) return material;
        material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
        material.color = color;
        if (color.a < 1f)
        {
            material.SetFloat("_Mode", 3f);
            material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            material.SetInt("_ZWrite", 0);
            material.DisableKeyword("_ALPHATEST_ON");
            material.EnableKeyword("_ALPHABLEND_ON");
            material.renderQueue = 3000;
        }
        AssetDatabase.CreateAsset(material, path);
        return material;
    }
    static void SavePrefab(GameObject source, string name)
    {
        string path = "Assets/Prefabs/" + name + ".prefab";
        PrefabUtility.SaveAsPrefabAsset(source, path);
    }
}
