using UnityEngine;

namespace DontMove
{
    /// <summary>Screen-space alert readout anchored to a guard in the 2D top-down Game View.</summary>
    [DefaultExecutionOrder(500)]
    public sealed class GuardAlertIndicator : MonoBehaviour
    {
        public GuardController guard;
        [Tooltip("Vertical screen-space gap above the guard sprite, in pixels.")]
        public float screenOffset = 42f;
        Texture2D white;
        GUIStyle icon;
        GUIStyle search;
        GameStateController game;

        void Awake()
        {
            if (guard == null) guard = GetComponent<GuardController>();
            white = new Texture2D(1, 1);
            white.SetPixel(0, 0, Color.white);
            white.Apply();
        }

        void Start() => game = FindFirstObjectByType<GameStateController>();

        void OnGUI()
        {
            if (guard == null || game == null || !game.CanMove || game.State == GameState.Detected || game.State == GameState.MissionComplete) return;
            GuardState state = guard.DisplayState;
            if (state != GuardState.Suspicious && state != GuardState.Alert && state != GuardState.Chase && state != GuardState.Search) return;
            Camera camera = Camera.main;
            if (camera == null) return;
            // MuseumStage01 is a flat XZ playfield viewed from above. A world +Y
            // offset changes depth, rather than moving the label above the sprite.
            // Project the guard first, then apply a screen-space offset so the
            // indicator stays attached under camera follow and every aspect ratio.
            Vector3 screen = camera.WorldToScreenPoint(guard.transform.position);
            if (screen.z <= 0f || screen.x < -50f || screen.x > Screen.width + 50f || screen.y < -50f || screen.y > Screen.height + 50f) return;
            Vector2 center = new Vector2(screen.x, Screen.height - screen.y - screenOffset);
            float size = Mathf.Clamp(Screen.width / 28f, 22f, 34f);
            if (state == GuardState.Suspicious)
            {
                float suspicion = guard.DisplaySuspicion;
                DrawRing(center, size * .62f, suspicion, SuspicionColor(suspicion));
                DrawIcon(center, "?", SuspicionColor(suspicion), size);
            }
            else if (state == GuardState.Alert || state == GuardState.Chase)
            {
                float pulse = state == GuardState.Alert ? 1f + Mathf.Sin(Time.unscaledTime * 15f) * .1f : 1f;
                DrawIcon(center, "!", new Color(1f, .18f, .12f, .98f), size * pulse);
            }
            else
            {
                DrawIcon(center + new Vector2(0f, 2f), "?", new Color(1f, .78f, .24f, .82f), size * .7f);
                DrawLabel(center + new Vector2(size * .9f, -size * .25f), "SEARCH");
            }
        }

        void DrawIcon(Vector2 center, string value, Color color, float size)
        {
            EnsureStyles();
            icon.fontSize = Mathf.RoundToInt(size);
            // A dark shadow keeps the glyph readable over lamps, vision cones,
            // and light marble while retaining the bright state color.
            icon.normal.textColor = new Color(0f, 0f, 0f, .9f);
            GUI.Label(new Rect(center.x - size + 2f, center.y - size * .65f + 2f, size * 2f, size * 1.3f), value, icon);
            icon.normal.textColor = color;
            GUI.Label(new Rect(center.x - size, center.y - size * .65f, size * 2f, size * 1.3f), value, icon);
        }

        void DrawLabel(Vector2 center, string value)
        {
            EnsureStyles();
            search.normal.textColor = new Color(1f, .78f, .3f, .85f);
            GUI.Label(new Rect(center.x - 3f, center.y - 8f, 70f, 18f), value, search);
        }

        void DrawRing(Vector2 center, float radius, float fill, Color color)
        {
            int segments = 20;
            int lit = Mathf.RoundToInt(Mathf.Clamp01(fill) * segments);
            for (int i = 0; i < segments; i++)
            {
                float a0 = (i / (float)segments) * Mathf.PI * 2f - Mathf.PI * .5f;
                float a1 = ((i + .82f) / segments) * Mathf.PI * 2f - Mathf.PI * .5f;
                DrawLine(center + new Vector2(Mathf.Cos(a0), Mathf.Sin(a0)) * radius,
                    center + new Vector2(Mathf.Cos(a1), Mathf.Sin(a1)) * radius, 3f,
                    i < lit ? color : new Color(color.r, color.g, color.b, .16f));
            }
        }

        void DrawLine(Vector2 a, Vector2 b, float width, Color color)
        {
            Vector2 delta = b - a;
            float angle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;
            Matrix4x4 old = GUI.matrix;
            Color oldColor = GUI.color;
            GUI.color = color;
            GUIUtility.RotateAroundPivot(angle, a);
            GUI.DrawTexture(new Rect(a.x, a.y - width * .5f, delta.magnitude, width), white);
            GUI.matrix = old;
            GUI.color = oldColor;
        }

        static Color SuspicionColor(float value)
        {
            if (value < .5f) return new Color(1f, .82f, .18f, .96f);
            if (value < .8f) return new Color(1f, .48f, .12f, .98f);
            return new Color(1f, .18f, .12f, .98f);
        }

        void EnsureStyles()
        {
            if (icon != null) return;
            icon = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, fontSize = 28 };
            search = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleLeft, fontStyle = FontStyle.Bold, fontSize = 10 };
        }

        void OnDestroy()
        {
            if (white != null) Destroy(white);
        }
    }
}
