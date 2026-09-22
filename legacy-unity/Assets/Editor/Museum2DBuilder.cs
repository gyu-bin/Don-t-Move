using System;
using System.IO;
using System.Collections.Generic;
using DontMove;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Object=UnityEngine.Object;

public static class Museum2DBuilder
{
    const string Art="Assets/Art2D/";
    const string ScenePath="Assets/Scenes/MuseumStage01.unity";
    static Sprite[] kit,agent,guard;
    static HashSet<Vector2Int> floor;
    const float Cell=1.3f;
    [MenuItem("Don't Move/Build 2D Museum Stage 01")]
    public static void Build()
    {
        Directory.CreateDirectory(Art); AssetDatabase.Refresh();
        kit=Slice("DM_Museum_Atlas.png",4,4);
        agent=Slice("DM_Agent_Directions.png",2,2); guard=Slice("DM_Guard_Directions.png",2,2);
        Scene scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        floor=new HashSet<Vector2Int>();
        Room(0,0,7,6); Room(3,5,8,9); Room(0,10,5,9); Room(0,18,11,6); Room(8,12,5,7);
        foreach(var tile in floor)
        {
            var p=P(tile.x,tile.y);
            var go=Visual("Marble Floor",kit[0],p+Vector3.down*.1f,Cell*1.02f,Cell*1.02f,-100);
            go.GetComponent<SpriteRenderer>().color=((tile.x+tile.y)%2==0)?Color.white:new Color(.88f,.9f,.95f);
        }
        var boundary=new HashSet<Vector2Int>();
        Vector2Int[] dirs={Vector2Int.up,Vector2Int.down,Vector2Int.left,Vector2Int.right};
        foreach(var tile in floor) foreach(var d in dirs) if(!floor.Contains(tile+d)) boundary.Add(tile+d);
        // Continuous wall strips avoid a repeated crate-like silhouette around the museum.
        while(boundary.Count>0)
        {
            Vector2Int start=default; foreach(var v in boundary){start=v;break;}
            bool horizontal=floor.Contains(start+Vector2Int.up)||floor.Contains(start+Vector2Int.down);
            Vector2Int step=horizontal?Vector2Int.right:Vector2Int.up;
            Vector2Int low=start,high=start;
            while(boundary.Contains(low-step))low-=step;
            while(boundary.Contains(high+step))high+=step;
            for(var v=low;v.x<=high.x&&v.y<=high.y;v+=step)boundary.Remove(v);
            float width=(high.x-low.x+1)*Cell,depth=(high.y-low.y+1)*Cell;
            Vector3 p=(P(low.x,low.y)+P(high.x,high.y))*.5f;
            var go=Visual("Wall",kit[1],p+Vector3.up*.5f,width,depth,1200-Mathf.RoundToInt(p.z*10));
            Obstacle(go,width,depth);
        }
        // Openings on both sides of the central island form distinct inbound/outbound routes.
        Prop("Statue Cover",4,5,10,1.7f,1.7f,true);
        Prop("Display Case Cover",5,9,16,1.5f,1.3f,true);
        Prop("Crate Cover",9,9,13,1.2f,1.2f,true);
        Prop("Bench",6,1,13,1.5f,.7f,true);
        Prop("Pillar",3,4,18,1,1,true);
        Prop("Painting",8,10,8,1.1f,.75f,false);
        Prop("Plant",7,0,3,1,1,true); Prop("Plant",7,10,5,1,1,true);
        Prop("Plant",7,12,17,1,1,true); Prop("Plant",7,0,22,1,1,true);
        Prop("CCTV",11,10,22,.6f,.6f,false);
        foreach(var p in new[]{new Vector2Int(1,1),new Vector2Int(6,6),new Vector2Int(3,12),new Vector2Int(9,17),new Vector2Int(2,21),new Vector2Int(9,22)})
        {
            Visual("Warm light pool",kit[14],P(p.x,p.y)+Vector3.up*.04f,3.8f,4.5f,-80).GetComponent<SpriteRenderer>().color=new Color(1,.88f,.65f,.36f);
            Prop("Museum Lamp",10,p.x,p.y,.35f,.5f,false);
        }
        var systems=new GameObject("Game Systems");
        var sensor=systems.AddComponent<SensorManager>(); var detection=systems.AddComponent<DetectionSystem>();
        var mission=systems.AddComponent<MissionController>(); var game=systems.AddComponent<GameStateController>();
        var hud=systems.AddComponent<GameHUD>(); var debug=systems.AddComponent<DebugPanel>();
        var gameSettings=systems.AddComponent<GameSettings>();
        var pauseMenu=systems.AddComponent<PauseMenu>();
        var settingsMenu=systems.AddComponent<SettingsMenu>();
        var releaseHud=systems.AddComponent<ReleaseHUD>();
        var startScreen=systems.AddComponent<StartScreen>();
        var resultScreen=systems.AddComponent<ResultScreen>();
        var player=new GameObject("Player"); player.transform.position=P(3,2)+Vector3.up;
        var cc=player.AddComponent<CharacterController>(); cc.height=1.8f;cc.radius=.28f;cc.skinWidth=.025f;cc.minMoveDistance=0;
        var pc=player.AddComponent<PlayerController>(); Character(player,agent);
        Material safe=Mat("Vision",new Color(.9f,.09f,.08f,.22f));
        Material danger=Mat("Vision Alert",new Color(1,.16f,.12f,.4f));
        var a=Guard("Guard A",new[]{new Vector2Int(5,7),new Vector2Int(9,7),new Vector2Int(9,11),new Vector2Int(5,11)},player.transform,safe,danger);
        a.stopDuration=.9f;a.initialDelay=.3f;a.patrolSpeed=1.35f;
        var b=Guard("Guard B",new[]{new Vector2Int(2,18),new Vector2Int(2,21),new Vector2Int(8,21),new Vector2Int(8,18)},player.transform,safe,danger);
        b.stopDuration=1.6f;b.initialDelay=2.1f;b.patrolSpeed=1.65f;b.pingPong=true;b.rotationSpeed=85;
        var pedestal=Prop("Objective Display",5,10,17,1.4f,1.6f,false);
        var diamond=Visual("Diamond",kit[12],P(10,17)+Vector3.up, .72f,.8f,1100);
        Visual("Diamond Glow",kit[15],P(10,17)+Vector3.up*.06f,4,4,-60).GetComponent<SpriteRenderer>().color=new Color(.7f,.9f,1,.35f);
        Trigger(diamond,mission,false,1.5f);
        var exit=Visual("Exit",kit[13],P(2,22)+Vector3.up,2.1f,2.5f,800);
        Trigger(exit,mission,true,1.5f);
        var cameraObject=new GameObject("Follow Camera");cameraObject.tag="MainCamera";
        var camera=cameraObject.AddComponent<Camera>(); cameraObject.AddComponent<AudioListener>();
        camera.orthographic=true;camera.orthographicSize=10;camera.backgroundColor=new Color(.025f,.038f,.052f);camera.clearFlags=CameraClearFlags.SolidColor;
        camera.nearClipPlane=.1f;camera.farClipPlane=60;
        var follow=cameraObject.AddComponent<CameraController>();follow.target=player.transform;follow.offset=new Vector3(0,25,3);follow.pitch=90;follow.smoothTime=.18f;
        cameraObject.transform.position=player.transform.position+follow.offset;cameraObject.transform.rotation=Quaternion.Euler(90,0,0);
        pc.sensor=sensor;pc.game=game;
        game.sensor=sensor;game.player=pc;game.guards=new[]{a,b};game.detection=detection;game.mission=mission;
        mission.diamond=diamond.transform;mission.exit=exit.transform;mission.game=game;
        hud.game=game;hud.detection=detection;hud.mission=mission;hud.player=pc;hud.debugPanel=debug;
        debug.sensor=sensor;debug.game=game;debug.detection=detection;debug.player=pc;
        gameSettings.sensor=sensor;
        pauseMenu.game=game;pauseMenu.settings=gameSettings;pauseMenu.settingsMenu=settingsMenu;
        settingsMenu.settings=gameSettings;
        releaseHud.game=game;releaseHud.settings=gameSettings;releaseHud.pauseMenu=pauseMenu;
        releaseHud.startScreen=startScreen;releaseHud.resultScreen=resultScreen;
        startScreen.game=game;
        resultScreen.game=game;resultScreen.detection=detection;
        TiltV2Setup.ApplyToScene();
        EditorSceneManager.SaveScene(scene,ScenePath);
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
        AssetDatabase.SaveAssets();
        Debug.Log("2D MUSEUM BUILT: sprite-only art, two routes, independent guards, continuous detection.");
        Capture(camera,"Reports/2DVerticalSlice/Start.png",540,1080);
        cameraObject.transform.position=new Vector3(7,35,15); camera.orthographicSize=18;
        Capture(camera,"Reports/2DVerticalSlice/Map.png",800,1200);
        // Preview-only camera changes are not saved into gameplay.
    }
    static Vector3 P(int x,int z)=>new Vector3(x*Cell,0,z*Cell);
    static void Room(int x,int z,int width,int height) { for(int i=x;i<x+width;i++)for(int j=z;j<z+height;j++)floor.Add(new Vector2Int(i,j)); }
    static Sprite[] Slice(string filename,int cols,int rows)
    {
        string path=Art+filename;
        var importer=(TextureImporter)AssetImporter.GetAtPath(path);
        if(importer==null)throw new Exception("Missing generated sprite atlas: "+path);
        importer.textureType=TextureImporterType.Default;importer.isReadable=true;importer.alphaIsTransparency=true;importer.mipmapEnabled=false;importer.maxTextureSize=2048;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();
        Texture2D texture=AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        Sprite[] sprites=new Sprite[cols*rows];int cw=texture.width/cols,ch=texture.height/rows;
        for(int i=0;i<sprites.Length;i++)
        {
            int x0=(i%cols)*cw,y0=(rows-1-i/cols)*ch;
            int minX=cw,minY=ch,maxX=0,maxY=0;
            for(int y=ch/25;y<ch-ch/25;y++)for(int x=cw/25;x<cw-cw/25;x++) if(texture.GetPixel(x0+x,y0+y).a>.08f) {minX=Math.Min(minX,x);minY=Math.Min(minY,y);maxX=Math.Max(maxX,x);maxY=Math.Max(maxY,y);}
            if(minX>maxX)throw new Exception("Empty sprite cell "+i);
            Rect rect=new Rect(x0+minX,y0+minY,maxX-minX+1,maxY-minY+1);
            if(cols==4 && i==0) { rect.x+=8;rect.y+=8;rect.width-=16;rect.height-=16; }
            Sprite sprite=Sprite.Create(texture,rect,new Vector2(.5f,.5f),100,0,SpriteMeshType.FullRect);
            string asset=Art+Path.GetFileNameWithoutExtension(filename)+"_"+i+".asset";
            var old=AssetDatabase.LoadAssetAtPath<Sprite>(asset);
            if(old!=null) {EditorUtility.CopySerialized(sprite,old);Object.DestroyImmediate(sprite);sprite=old;} else AssetDatabase.CreateAsset(sprite,asset);
            sprites[i]=sprite;
        }
        return sprites;
    }
    static GameObject Visual(string name,Sprite sprite,Vector3 p,float width,float height,int sort)
    {
        var go=new GameObject(name);go.transform.position=p;go.transform.rotation=Quaternion.Euler(90,0,0);
        go.transform.localScale=new Vector3(width/sprite.bounds.size.x,height/sprite.bounds.size.y,1);
        var sr=go.AddComponent<SpriteRenderer>();sr.sprite=sprite;sr.sortingOrder=sort;
        return go;
    }
    static void Obstacle(GameObject visual,float width,float depth)
    {
        // Collider sits on an unrotated root; renderer stays flat on the XZ plane.
        var root=new GameObject(visual.name+" Collision");root.transform.position=new Vector3(visual.transform.position.x,1,visual.transform.position.z);root.layer=8;
        var box=root.AddComponent<BoxCollider>();box.size=new Vector3(width,2,depth);
        if(!visual.name.StartsWith("Wall"))root.AddComponent<CoverMarker>();
    }
    static GameObject Prop(string name,int index,int x,int z,float w,float h,bool collision)
    {
        var p=P(x,z);var go=Visual(name,kit[index],p+Vector3.up*.4f,w,h,1000-Mathf.RoundToInt(p.z*10));
        if(collision)Obstacle(go,w*.8f,h*.65f);return go;
    }
    static void Character(GameObject root,Sprite[] sprites)
    {
        var go=Visual("2D Character",sprites[0],root.transform.position,1,1.45f,1000);
        go.transform.SetParent(root.transform,true);
        var face=go.AddComponent<DirectionalSprite>();face.directions=sprites;face.visual=go.GetComponent<SpriteRenderer>();
    }
    static GuardController Guard(string name,Vector2Int[] route,Transform player,Material safe,Material danger)
    {
        var go=new GameObject(name);go.transform.position=P(route[0].x,route[0].y)+Vector3.up;
        var c=go.AddComponent<GuardController>();c.vision=go.GetComponent<GuardVision>();
        c.vision.player=player;c.vision.distance=5.5f;c.vision.angle=65;c.vision.obstructionMask=1<<8;c.vision.safeMaterial=safe;c.vision.dangerMaterial=danger;c.vision.SetDanger(false);
        c.patrolPoints=new Transform[route.Length];for(int i=0;i<route.Length;i++){var point=new GameObject(name+" Route "+i);point.transform.position=P(route[i].x,route[i].y)+Vector3.up;c.patrolPoints[i]=point.transform;}
        Character(go,guard);
        var indicator=go.AddComponent<GuardAlertIndicator>();indicator.guard=c;
        var animator=go.AddComponent<GuardSpriteAnimator>();animator.guard=c;
        return c;
    }
    static Material Mat(string name,Color color)
    {
        string path=Art+"DM_"+name.Replace(' ','_')+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);
        if(m==null){m=new Material(Shader.Find("Sprites/Default"));AssetDatabase.CreateAsset(m,path);}m.color=color;EditorUtility.SetDirty(m);return m;
    }
    static void Trigger(GameObject visual,MissionController mission,bool exit,float size)
    {
        // A separate trigger avoids the sprite's rotated/scaled transform changing the trigger shape.
        var trigger=new GameObject(visual.name+" Trigger");trigger.transform.SetParent(visual.transform,false);
        trigger.transform.position=new Vector3(visual.transform.position.x,1,visual.transform.position.z);trigger.transform.rotation=Quaternion.identity;
        trigger.transform.localScale=new Vector3(1/visual.transform.lossyScale.x,1/visual.transform.lossyScale.z,1/visual.transform.lossyScale.y);
        var box=trigger.AddComponent<BoxCollider>();box.size=new Vector3(size,2,size);box.isTrigger=true;
        var objective=trigger.AddComponent<ObjectiveTrigger>();objective.mission=mission;objective.isExit=exit;
    }
    public static void Capture(Camera camera,string path,int width,int height)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));var rt=new RenderTexture(width,height,24);camera.targetTexture=rt;camera.Render();
        var previous=RenderTexture.active;RenderTexture.active=rt;var t=new Texture2D(width,height,TextureFormat.RGB24,false);t.ReadPixels(new Rect(0,0,width,height),0,0);t.Apply();File.WriteAllBytes(path,t.EncodeToPNG());
        RenderTexture.active=previous;camera.targetTexture=null;Object.DestroyImmediate(rt);Object.DestroyImmediate(t);
    }
}
