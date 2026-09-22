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
        void Awake()
        {
            white = new Texture2D(1, 1); white.SetPixel(0, 0, Color.white); white.Apply();
        }
        void OnGUI()
        {
            if (game == null) return;
            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1));
            float w = Screen.width / scale, h = Screen.height / scale;
            if (title == null)
            {
                title = new GUIStyle(GUI.skin.label) { fontSize = 38, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
                label = new GUIStyle(GUI.skin.label) { fontSize = 19, fontStyle = FontStyle.Bold };
                small = new GUIStyle(GUI.skin.label) { fontSize = 17 };
                center = new GUIStyle(small) { alignment = TextAnchor.MiddleCenter };
            }
            Color stateColor = game.State == GameState.Detected ? new Color(1,.25f,.24f) : new Color(.35f,.8f,1f);
            DrawBox(new Rect(0, 0, w, 105), new Color(.06f, .09f, .14f, .92f));
            label.normal.textColor = Color.white;
            GUI.Label(new Rect(20, 13, w - 40, 32), mission.HasDiamond ? "STAGE 01  /  EXIT" : "STAGE 01  /  THE MUSEUM", label);
            small.normal.textColor = Color.white;
            GUI.Label(new Rect(20, 55, w - 40, 28), "Time " + game.RunTime.ToString("F1") + "s", small);
            title.normal.textColor = stateColor;
            if (game.GuardVisibility && game.CanMove) { center.normal.textColor = new Color(1,.4f,.3f); GUI.Label(new Rect(w-60,115,40,40),"!",center); }
            string status = game.State == GameState.MissionComplete ? "MISSION COMPLETE" : game.State == GameState.Detected ? "DETECTED" : game.DiamondBannerVisible ? "DIAMOND ACQUIRED" : game.State == GameState.Calibrating ? "HOLD COMFORTABLY" : "";
            GUI.Label(new Rect(0, h * .14f, w, 60), status, title);
            if (game.State == GameState.Calibrating) GUI.Label(new Rect(0, h * .22f, w, 38), "CALIBRATING  " + Mathf.CeilToInt(game.StateRemaining), center);
            DrawBox(new Rect(0, h - 105, w, 105), new Color(.06f, .09f, .14f, .92f));
            GUI.Label(new Rect(20, h - 100, w - 40, 26), "DETECTION  " + Mathf.RoundToInt(detection.Detection) + "%", small);
            DrawBox(new Rect(20, h - 62, w - 40, 22), new Color(.2f, .23f, .27f));
            DrawBox(new Rect(20, h - 62, (w - 40) * detection.Detection / 100f, 22), new Color(.95f, .2f, .18f));
            if (game.State == GameState.Detected || game.State == GameState.MissionComplete)
            {
                DrawBox(new Rect(24, h * .29f, w - 48, 260), new Color(.04f, .06f, .1f, .96f));
                string result = game.State == GameState.MissionComplete
                    ? "GRADE " + game.Grade + "\nClear Time  " + game.RunTime.ToString("F1") + "s\nMax Detection  " + detection.MaximumDetection.ToString("F0") + "%"
                    : "DETECTED\nSurvival Time  " + game.RunTime.ToString("F1") + "s\nDistance to Objective  " + mission.DistanceToObjective(player.transform).ToString("F1") + "m\nMax Speed  " + player.MaxSpeed.ToString("F1");
                GUI.Label(new Rect(42, h * .32f, w - 84, 210), result, small);
                if (GUI.Button(new Rect(w * .25f, h * .68f, w * .5f, 50), "RETRY")) game.Retry();
            }
            if (GUI.Button(new Rect(w - 65, 10, 55, 43), "DBG")) debugPanel.visible = !debugPanel.visible;
            GUI.matrix = old;
        }
        void DrawBox(Rect rect, Color color)
        {
            Color before = GUI.color; GUI.color = color; GUI.DrawTexture(rect, white); GUI.color = before;
        }
        void OnDestroy() { if (white != null) Destroy(white); }
    }
}
