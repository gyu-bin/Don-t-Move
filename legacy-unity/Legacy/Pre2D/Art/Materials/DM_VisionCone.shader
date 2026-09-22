Shader "DontMove/VisionCone"
{
    Properties
    {
        _Color ("Vision Color", Color) = (1, 0, 0, 0.35)
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" }
        Cull Off
        ZWrite Off
        Blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            fixed4 _Color;
            struct Input { float4 vertex : POSITION; };
            struct Output { float4 position : SV_POSITION; };

            Output vert(Input input)
            {
                Output output;
                output.position = UnityObjectToClipPos(input.vertex);
                return output;
            }

            fixed4 frag(Output input) : SV_Target
            {
                return _Color;
            }
            ENDCG
        }
    }
}
