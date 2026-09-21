using UnityEngine;

namespace DontMove
{
    public sealed class ReleaseHUD : MonoBehaviour
    {
        public GameStateController game;
        public GameSettings settings;
        public PauseMenu pauseMenu;
        public StartScreen startScreen;
        public ResultScreen resultScreen;

        const float FeedbackSeconds = .85f;

        float feedbackUntilUnscaled = -1f;
        GUIStyle button, feedback;
        Texture2D charcoal;
        Texture2D accent;
        Texture2D navy;

        void Awake()
        {
            charcoal = Tex(new Color(.14f, .17f, .22f, .92f));
            accent = Tex(new Color(.91f, .2f, .18f, .95f));
            navy = Tex(new Color(.04f, .07f, .12f, .88f));
        }

        void OnGUI()
        {
            if (game == null || pauseMenu == null) return;
            if (pauseMenu.IsPaused) return;
            if (startScreen != null && startScreen.IsBlocking) return;
            if (resultScreen != null && resultScreen.IsVisible) return;
            if (game.State == GameState.Detected || game.State == GameState.MissionComplete) return;

            EnsureStyles();
            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            Rect safe = SettingsMenu.UiSafeArea(scale);

            Rect pauseRect = new Rect(safe.xMax - 78, safe.y + 12, 66, 40);
            GUI.DrawTexture(pauseRect, charcoal);
            button.normal.textColor = Color.white;
            if (GUI.Button(pauseRect, "PAUSE", button))
                pauseMenu.Pause();

            if (game.CanMove)
            {
                Rect recenterRect = new Rect(safe.x + 12, safe.y + 12, 78, 40);
                GUI.DrawTexture(recenterRect, navy);
                if (GUI.Button(recenterRect, "RECENTER", button))
                    TryRecenter();
            }
            if (Time.unscaledTime < feedbackUntilUnscaled)
            {
                feedback.normal.textColor = Color.white;
                Rect tip = new Rect(safe.x + safe.width * .2f, safe.y + 60, safe.width * .6f, 34);
                GUI.DrawTexture(tip, accent);
                GUI.Label(tip, "CENTER RESET", feedback);
            }

            GUI.matrix = old;
        }

        void TryRecenter()
        {
            if (game == null || !game.CanMove) return;
            if (!game.Recenter()) return;
            feedbackUntilUnscaled = Time.unscaledTime + FeedbackSeconds;
            if (settings != null) settings.TriggerHaptic();
        }

        void EnsureStyles()
        {
            if (button != null) return;
            button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 12,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { background = null, textColor = Color.white },
                active = { background = null, textColor = Color.white },
                hover = { background = null, textColor = Color.white }
            };
            feedback = new GUIStyle(GUI.skin.label)
            {
                fontSize = 16,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
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
            if (charcoal != null) Destroy(charcoal);
            if (accent != null) Destroy(accent);
            if (navy != null) Destroy(navy);
        }
    }
}
