using UnityEngine;

namespace DontMove
{
    /// <summary>
    /// Pre-play start overlay. Does not change calibration or stage logic — only gates the release UI.
    /// </summary>
    [DefaultExecutionOrder(900)]
    public sealed class StartScreen : MonoBehaviour
    {
        public GameStateController game;

        public bool IsBlocking => game != null && !dismissed && game.State == GameState.Calibrating;

        bool dismissed;
        GUIStyle title, subtitle, body, button;
        Texture2D navy;
        Texture2D accent;

        void Awake()
        {
            navy = Tex(new Color(.04f, .07f, .12f, .98f));
            accent = Tex(new Color(.91f, .2f, .18f, 1f));
        }

        void OnEnable()
        {
            dismissed = false;
        }

        void OnGUI()
        {
            if (!IsBlocking) return;

            EnsureStyles();
            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            Rect safe = SettingsMenu.UiSafeArea(scale);
            float w = safe.width;
            float x = safe.x;

            GUI.DrawTexture(safe, navy);

            title.normal.textColor = Color.white;
            GUI.Label(new Rect(x, safe.y + 90, w, 48), "STAGE 01 — MUSEUM", title);

            subtitle.normal.textColor = new Color(.91f, .2f, .18f);
            GUI.Label(new Rect(x + 24, safe.y + 160, w - 48, 40), "STEAL THE DIAMOND", subtitle);

            body.normal.textColor = new Color(.78f, .82f, .88f);
            GUI.Label(
                new Rect(x + 36, safe.y + 230, w - 72, 160),
                "Calibration tip\n\nHold the phone in a comfortable pose.\nAfter Start, stay still until READY.",
                body);

            Rect start = new Rect(x + w * .18f, safe.yMax - 120, w * .64f, 54);
            GUI.DrawTexture(start, accent);
            button.normal.textColor = Color.white;
            if (GUI.Button(start, "START", button))
                dismissed = true;

            GUI.matrix = old;
        }

        void EnsureStyles()
        {
            if (title != null) return;
            title = new GUIStyle(GUI.skin.label) { fontSize = 28, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            subtitle = new GUIStyle(GUI.skin.label) { fontSize = 22, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            body = new GUIStyle(GUI.skin.label) { fontSize = 16, alignment = TextAnchor.UpperCenter, wordWrap = true };
            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 20,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { background = null, textColor = Color.white },
                active = { background = null, textColor = Color.white },
                hover = { background = null, textColor = Color.white }
            };
        }

        static Texture2D Tex(Color color)
        {
            var t = new Texture2D(1, 1);
            t.SetPixel(0, 0, color);
            t.Apply();
            return t;
        }

        void OnDestroy()
        {
            if (navy != null) Destroy(navy);
            if (accent != null) Destroy(accent);
        }
    }
}
