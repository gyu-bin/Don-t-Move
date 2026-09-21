using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace DontMove
{
    /// <summary>
    /// Stage clear / game over release panels. Reads public game APIs only.
    /// Times Spotted is omitted — no public counter exists yet (TODO).
    /// </summary>
    [DefaultExecutionOrder(950)]
    public sealed class ResultScreen : MonoBehaviour
    {
        public GameStateController game;
        public DetectionSystem detection;

        public bool IsVisible =>
            game != null && (game.State == GameState.MissionComplete || game.State == GameState.Detected);

        GUIStyle title, row, button, muted;
        Texture2D navy;
        Texture2D charcoal;
        Texture2D accent;
        Texture2D mutedBg;

        void Awake()
        {
            navy = Tex(new Color(.04f, .07f, .12f, .97f));
            charcoal = Tex(new Color(.14f, .17f, .22f, 1f));
            accent = Tex(new Color(.91f, .2f, .18f, 1f));
            mutedBg = Tex(new Color(.22f, .24f, .28f, 1f));
        }

        void OnGUI()
        {
            if (!IsVisible) return;
            EnsureStyles();

            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            Rect safe = SettingsMenu.UiSafeArea(scale);

            if (game.State == GameState.MissionComplete)
                DrawClear(safe);
            else
                DrawCaught(safe);

            GUI.matrix = old;
        }

        void DrawClear(Rect safe)
        {
            float w = safe.width;
            float x = safe.x;
            GUI.DrawTexture(safe, navy);

            title.normal.textColor = Color.white;
            GUI.Label(new Rect(x, safe.y + 70, w, 48), "MISSION COMPLETE", title);

            float y = safe.y + 150;
            DrawStat(x, ref y, w, "Clear Time", game.RunTime.ToString("F1") + "s");
            // MaximumDetection is the existing public max-suspicion meter.
            DrawStat(x, ref y, w, "Max Suspicion", detection != null ? detection.MaximumDetection.ToString("F0") + "%" : "--");
            // TODO: Times Spotted — no public spotted counter on GameStateController / Detection yet. Hide until API exists.

            float bw = w * .64f;
            float bx = x + (w - bw) * .5f;
            float by = safe.yMax - 160;
            if (ActionButton(new Rect(bx, by, bw, 50), "RETRY", true))
                game.Retry();
            by += 60;
            ActionButton(new Rect(bx, by, bw, 50), "NEXT STAGE", false);
        }

        void DrawCaught(Rect safe)
        {
            float w = safe.width;
            float x = safe.x;
            GUI.DrawTexture(safe, navy);

            title.normal.textColor = new Color(.95f, .28f, .24f);
            GUI.Label(new Rect(x, safe.y + 90, w, 48), "CAUGHT", title);

            float y = safe.y + 180;
            DrawStat(x, ref y, w, "Survival Time", game.RunTime.ToString("F1") + "s");

            float bw = w * .64f;
            float bx = x + (w - bw) * .5f;
            float by = safe.yMax - 160;
            if (ActionButton(new Rect(bx, by, bw, 50), "RETRY", true))
                game.Retry();
            by += 60;
            if (ActionButton(new Rect(bx, by, bw, 50), "QUIT", true))
                QuitGame();
        }

        void DrawStat(float x, ref float y, float w, string name, string value)
        {
            row.normal.textColor = new Color(.72f, .76f, .82f);
            GUI.Label(new Rect(x + 40, y, w * .45f, 28), name, row);
            row.normal.textColor = Color.white;
            GUI.Label(new Rect(x + w * .45f, y, w * .45f - 40, 28), value, row);
            y += 36;
        }

        bool ActionButton(Rect rect, string label, bool enabled)
        {
            GUI.DrawTexture(rect, enabled ? charcoal : mutedBg);
            GUIStyle style = enabled ? button : muted;
            if (!enabled)
            {
                GUI.Label(rect, label + "  ·  SOON", style);
                return false;
            }
            return GUI.Button(rect, label, style);
        }

        static void QuitGame()
        {
            Time.timeScale = 1f;
#if UNITY_EDITOR
            EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }

        void EnsureStyles()
        {
            if (title != null) return;
            title = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            row = new GUIStyle(GUI.skin.label) { fontSize = 18, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleLeft };
            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 18,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { background = null, textColor = Color.white },
                active = { background = null, textColor = Color.white },
                hover = { background = null, textColor = Color.white }
            };
            muted = new GUIStyle(button) { fontSize = 15 };
            muted.normal.textColor = new Color(.55f, .58f, .62f);
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
            if (charcoal != null) Destroy(charcoal);
            if (accent != null) Destroy(accent);
            if (mutedBg != null) Destroy(mutedBg);
        }
    }
}
