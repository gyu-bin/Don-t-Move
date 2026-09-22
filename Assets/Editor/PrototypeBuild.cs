using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class PrototypeBuild
{
    [MenuItem("Don't Move/Build Android APK")]
    public static void Android()
    {
        Build("Builds/Android/DontMove.apk", BuildTarget.Android);
    }
    [MenuItem("Don't Move/Export iOS Xcode Project")]
    public static void Ios()
    {
        Build("Builds/iOS", BuildTarget.iOS);
    }
    [MenuItem("Don't Move/Export Fresh iOS Xcode Project")]
    public static void IosFresh()
    {
        Ios2D();
    }
    public static void IosTilt()
    {
        // Unity 6000.3.24f1 crashes in Xcode's ScriptingBridge when inspecting an
        // existing export on this Mac. A fresh export avoids that native code path.
        string location = "Builds/iOS-Tilt-" + System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        Build(location, BuildTarget.iOS);
        Directory.CreateDirectory("Reports/TiltController");
        File.WriteAllText("Reports/TiltController/LatestIosExport.txt", location);
    }
    public static void Ios2D()
    {
        string location = "Builds/iOS-2D-" + System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        Build(location, BuildTarget.iOS);
        Directory.CreateDirectory("Reports/2DVerticalSlice");
        File.WriteAllText("Reports/2DVerticalSlice/LatestIosExport.txt", location);
    }
    public static void IosTiltV2()
    {
        string location="Builds/iOS-TiltV2-"+System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        Build(location,BuildTarget.iOS);
        Directory.CreateDirectory("Reports/TiltV2");File.WriteAllText("Reports/TiltV2/LatestIosExport.txt",location);
    }
    static void Build(string location, BuildTarget target)
    {
        const string scene = "Assets/Scenes/MuseumStage01.unity";
        if (!File.Exists(scene)) Stage01Builder.Build();
        BuildTargetGroup group = target == BuildTarget.Android ? BuildTargetGroup.Android : BuildTargetGroup.iOS;
        if (EditorUserBuildSettings.activeBuildTarget != target && !EditorUserBuildSettings.SwitchActiveBuildTarget(group, target))
        {
            throw new System.InvalidOperationException("Could not switch to " + target + ". Install its Unity Build Support module first.");
        }
        Directory.CreateDirectory(Path.GetDirectoryName(location));
        var options = new BuildPlayerOptions
        {
            scenes = new[] { scene },
            locationPathName = location,
            target = target,
            options = BuildOptions.None
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
            throw new System.InvalidOperationException(target + " build failed: " + report.summary.result);
        else Debug.Log(target + " build created at " + location);
    }
}
