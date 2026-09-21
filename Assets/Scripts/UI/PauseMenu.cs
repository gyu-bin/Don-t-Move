using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace DontMove
{
    [DefaultExecutionOrder(1000)]
    public sealed class PauseMenu : MonoBehaviour
    {
        public GameStateController game;
        public GameSettings settings;
        public SettingsMenu settingsMenu;

        public bool IsPaused { get; private set; }

        float previousTimeScale = 1f;
        GUIStyle title, button, danger;
        Texture2D navy;
        Texture2D charcoal;
        Texture2D accent;

        public void Pause()
        {
            if (IsPaused) return;
            IsPaused = true;
            previousTimeScale = Time.timeScale;
            Time.timeScale = 0f;
        }

        public void Resume()
        {
            if (!IsPaused) return;
            IsPaused = false;
            if (settingsMenu != null) settingsMenu.Close();
            Time.timeScale = previousTimeScale > 0f ? previousTimeScale : 1f;
        }

        public void Toggle()
        {
            if (IsPaused) Resume();
            else Pause();
        }

        void Awake()
        {
            navy = Tex(new Color(.04f, .07f, .12f, .96f));
            charcoal = Tex(new Color(.14f, .17f, .22f, 1f));
            accent = Tex(new Color(.91f, .2f, .18f, 1f));
        }

        void OnDisable()
        {
            if (IsPaused)
            {
                IsPaused = false;
                Time.timeScale = previousTimeScale > 0f ? previousTimeScale : 1f;
            }
        }

        void OnGUI()
        {
            if (!IsPaused) return;
            if (settingsMenu != null && settingsMenu.Visible) return;
            EnsureStyles();

            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            Rect safe = SettingsMenu.UiSafeArea(scale);
            float w = safe.width;
            float x = safe.x;

            GUI.DrawTexture(safe, navy);
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(x, safe.y + 56, w, 48), "PAUSED", title);

            float bw = w * .62f;
            float bx = x + (w - bw) * .5f;
            float by = safe.y + 150;
            float gap = 58f;

            if (MenuButton(new Rect(bx, by, bw, 50), "RESUME", false))
                Resume();
            by += gap;
            if (MenuButton(new Rect(bx, by, bw, 50), "RECENTER", false))
                TryRecenter();
            by += gap;
            if (MenuButton(new Rect(bx, by, bw, 50), "RESTART", false))
                Restart();
            by += gap;
            if (MenuButton(new Rect(bx, by, bw, 50), "SETTINGS", false))
            {
                if (settingsMenu != null) settingsMenu.Open();
            }
            by += gap;
            if (MenuButton(new Rect(bx, by, bw, 50), "QUIT", true))
                QuitGame();

            GUI.matrix = old;
        }

        bool MenuButton(Rect rect, string label, bool quit)
        {
            GUI.DrawTexture(rect, quit ? accent : charcoal);
            GUIStyle style = quit ? danger : button;
            return GUI.Button(rect, label, style);
        }

        void TryRecenter()
        {
            if (game == null) return;
            if (!game.Recenter()) return;
            if (settings != null) settings.TriggerHaptic();
        }

        void Restart()
        {
            Resume();
            if (game != null) game.Retry();
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
            title = new GUIStyle(GUI.skin.label) { fontSize = 40, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 20,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { background = null, textColor = Color.white },
                active = { background = null, textColor = Color.white },
                hover = { background = null, textColor = Color.white }
            };
            danger = new GUIStyle(button);
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
        }
    }
}
