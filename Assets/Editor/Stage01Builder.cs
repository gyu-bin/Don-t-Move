using System.IO;
using UnityEditor;
using UnityEngine;
[InitializeOnLoad]
public static class Stage01Builder
{
    static Stage01Builder()
    {
        EditorApplication.delayCall += () =>
        {
            if (!Application.isPlaying && !File.Exists("Assets/Scenes/MuseumStage01.unity") && !EditorApplication.isCompiling
                && File.Exists("Assets/Art2D/DM_Museum_Atlas.png")) Build();
        };
    }
    [MenuItem("Don't Move/Rebuild Museum Stage 01")]
    public static void Build() => Museum2DBuilder.Build();
}
