Shader "DontMove/ProductionBloom"
{
    Properties { _MainTex ("Source", 2D) = "white" {} }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        CGINCLUDE
        #include "UnityCG.cginc"
        sampler2D _MainTex, _Glow;
        float4 _MainTex_TexelSize;
        float _Threshold, _Intensity;
        half4 extract(v2f_img i) : SV_Target
        {
            half3 c = tex2D(_MainTex, i.uv).rgb;
            return half4(max(c - _Threshold, 0), 1);
        }
        half4 blur(v2f_img i) : SV_Target
        {
            float2 d = _MainTex_TexelSize.xy * 2;
            half3 c = tex2D(_MainTex, i.uv).rgb * .2;
            c += tex2D(_MainTex, i.uv + float2(d.x, d.y)).rgb * .2;
            c += tex2D(_MainTex, i.uv + float2(-d.x, d.y)).rgb * .2;
            c += tex2D(_MainTex, i.uv + float2(d.x, -d.y)).rgb * .2;
            c += tex2D(_MainTex, i.uv - d).rgb * .2;
            return half4(c, 1);
        }
        half4 composite(v2f_img i) : SV_Target
        {
            return half4(tex2D(_MainTex, i.uv).rgb + tex2D(_Glow, i.uv).rgb * _Intensity, 1);
        }
        ENDCG
        Pass { CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment extract
            ENDCG }
        Pass { CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment blur
            ENDCG }
        Pass { CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment composite
            ENDCG }
    }
}
