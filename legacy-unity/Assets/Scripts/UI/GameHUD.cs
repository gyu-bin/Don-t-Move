using UnityEngine;

namespace DontMove
{
    public sealed class GameHUD : MonoBehaviour
    {
        public GameStateController game;
        public DetectionSystem detection;
        public MissionController mission;
        public PlayerController player;
        public DebugPanel debugPanel;

        GUIStyle title, label, small, center;
        Texture2D white;
        GameSettings gameSettings;
        PauseMenu pauseMenu;
        SettingsMenu settingsMenu;
        ReleaseHUD releaseHud;
        StartScreen startScreen;
        ResultScreen resultScreen;

        void Awake()
        {
            white = new Texture2D(1, 1);
            white.SetPixel(0, 0, Color.white);
            white.Apply();
            EnsureReleaseUi();
        }

        void Start()
        {
            WireReleaseUi();
        }

        void EnsureReleaseUi()
        {
            gameSettings = GetComponent<GameSettings>() ?? gameObject.AddComponent<GameSettings>();
            pauseMenu = GetComponent<PauseMenu>() ?? gameObject.AddComponent<PauseMenu>();
            settingsMenu = GetComponent<SettingsMenu>() ?? gameObject.AddComponent<SettingsMenu>();
            releaseHud = GetComponent<ReleaseHUD>() ?? gameObject.AddComponent<ReleaseHUD>();
            startScreen = GetComponent<StartScreen>() ?? gameObject.AddComponent<StartScreen>();
            resultScreen = GetComponent<ResultScreen>() ?? gameObject.AddComponent<ResultScreen>();
        }

        void WireReleaseUi()
        {
            if (gameSettings == null) EnsureReleaseUi();
            if (game != null) gameSettings.sensor = game.sensor;
            pauseMenu.game = game;
            pauseMenu.settings = gameSettings;
            pauseMenu.settingsMenu = settingsMenu;
            settingsMenu.settings = gameSettings;
            releaseHud.game = game;
            releaseHud.settings = gameSettings;
            releaseHud.pauseMenu = pauseMenu;
            releaseHud.startScreen = startScreen;
            releaseHud.resultScreen = resultScreen;
            startScreen.game = game;
            resultScreen.game = game;
            resultScreen.detection = detection;
        }

        void OnGUI()
        {
            if (game == null) return;
            if (pauseMenu != null && pauseMenu.IsPaused) return;
            if (startScreen != null && startScreen.IsBlocking) return;
            if (resultScreen != null && resultScreen.IsVisible) return;

            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1));
            Rect safe = SettingsMenu.UiSafeArea(scale);
            float w = safe.width;
            float h = safe.height;
            float x = safe.x;
            float y = safe.y;

            EnsureStyles();

            Color stateColor = new Color(.35f, .8f, 1f);
            DrawBox(new Rect(x, y, w, 96), new Color(.06f, .09f, .14f, .92f));
            label.normal.textColor = Color.white;
            GUI.Label(new Rect(x + 20, y + 14, w - 40, 30), mission.HasDiamond ? "STAGE 01  /  EXIT" : "STAGE 01  /  MUSEUM", label);
            small.normal.textColor = Color.white;
            GUI.Label(new Rect(x + 20, y + 52, w - 40, 26), "Time " + game.RunTime.ToString("F1") + "s", small);

            title.normal.textColor = stateColor;
            if (game.GlobalAlert && game.CanMove)
            {
                center.normal.textColor = new Color(1, .4f, .3f);
                GUI.Label(new Rect(x + w - 56, y + 104, 40, 40), "!", center);
            }

            if (game.DiamondBannerVisible)
            {
                title.normal.textColor = Color.white;
                GUI.Label(new Rect(x, y + h * .14f, w, 50), "DIAMOND ACQUIRED", title);
            }

            if (game.State == GameState.Calibrating)
            {
                title.normal.textColor = Color.white;
                GUI.Label(new Rect(x, y + h * .16f, w, 48), game.ShowingReady ? "READY" : "HOLD COMFORTABLY", title);
                if (!game.ShowingReady)
                {
                    center.normal.textColor = new Color(.8f, .84f, .9f);
                    string message = game.sensor.CalibrationFailed
                        ? "Hold still, then retry calibration"
                        : "Hold steady  " + game.sensor.CalibrationStableTime.ToString("F1") + " / " + game.sensor.stableHoldDuration.ToString("F1") + "s";
                    if (!Application.isEditor && !game.sensor.HasAttitude)
                        message = "Waiting for device attitude sensor";
                    GUI.Label(new Rect(x, y + h * .24f, w, 36), message, center);
                    if (game.sensor.CalibrationFailed && GUI.Button(new Rect(x + w * .2f, y + h * .31f, w * .6f, 44), "RETRY CALIBRATION"))
                        game.BeginCalibration();
                }
            }

            DrawBox(new Rect(x, y + h - 100, w, 100), new Color(.06f, .09f, .14f, .92f));
            string alertText = game.GlobalAlert ? "GLOBAL ALERT  ACTIVE" : "GLOBAL ALERT  CLEAR";
            GUI.Label(new Rect(x + 20, y + h - 92, w - 40, 24), alertText, small);
            GUI.Label(new Rect(x + 20, y + h - 62, w - 40, 24),
                "MAX SUSPICION  " + Mathf.RoundToInt(game.MaximumGuardSuspicion * 100f) + "%   SEARCH  " + game.SearchingGuardCount, small);

            if (GUI.Button(new Rect(x + 16, y + h - 150, 55, 36), "DBG"))
                debugPanel.visible = !debugPanel.visible;

            if (game.GlobalAlert && game.GlobalAlertElapsed < .22f)
                DrawBox(new Rect(0, 0, Screen.width / scale, Screen.height / scale), new Color(1f, .05f, .02f, .08f));

            GUI.matrix = old;
        }

        void EnsureStyles()
        {
            if (title != null) return;
            title = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            label = new GUIStyle(GUI.skin.label) { fontSize = 18, fontStyle = FontStyle.Bold };
            small = new GUIStyle(GUI.skin.label) { fontSize = 16 };
            center = new GUIStyle(small) { alignment = TextAnchor.MiddleCenter };
        }

        void DrawBox(Rect rect, Color color)
        {
            Color before = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, white);
            GUI.color = before;
        }

        void OnDestroy()
        {
            if (white != null) Destroy(white);
        }
    }
}
