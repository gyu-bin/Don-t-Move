using UnityEngine;

[ExecuteAlways, RequireComponent(typeof(Camera))]
public sealed class DMProductionBloom : MonoBehaviour
{
    public Shader bloomShader;
    [Range(0, 1)] public float intensity = .22f;
    [Range(.5f, 3f)] public float threshold = 1f;
    Material material;
    void OnRenderImage(RenderTexture source, RenderTexture destination)
    {
        if (bloomShader == null || !bloomShader.isSupported) { Graphics.Blit(source, destination); return; }
        if (material == null) material = new Material(bloomShader) { hideFlags = HideFlags.HideAndDontSave };
        int width = Mathf.Max(1, source.width / 4), height = Mathf.Max(1, source.height / 4);
        var a = RenderTexture.GetTemporary(width, height, 0, RenderTextureFormat.DefaultHDR);
        var b = RenderTexture.GetTemporary(width, height, 0, RenderTextureFormat.DefaultHDR);
        a.filterMode = b.filterMode = FilterMode.Bilinear;
        material.SetFloat("_Threshold", threshold); material.SetFloat("_Intensity", intensity);
        Graphics.Blit(source, a, material, 0);
        Graphics.Blit(a, b, material, 1); Graphics.Blit(b, a, material, 1);
        material.SetTexture("_Glow", a); Graphics.Blit(source, destination, material, 2);
        RenderTexture.ReleaseTemporary(a); RenderTexture.ReleaseTemporary(b);
    }
    void OnDisable() { if (material != null) { if (Application.isPlaying) Destroy(material); else DestroyImmediate(material); } }
}
