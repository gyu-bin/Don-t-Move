using UnityEngine;

namespace DontMove
{
    [DefaultExecutionOrder(1100)]
    public sealed class SettingsMenu : MonoBehaviour
    {
        public GameSettings settings;
        public bool Visible { get; private set; }

        GUIStyle title, section, option, selected, back;
        Texture2D white;
        Texture2D navy;
        Texture2D charcoal;
        Texture2D accent;
        Texture2D muted;

        public void Open() => Visible = true;
        public void Close() => Visible = false;

        void Awake()
        {
            white = Tex(Color.white);
            navy = Tex(new Color(.04f, .07f, .12f, .97f));
            charcoal = Tex(new Color(.12f, .15f, .19f, 1f));
            accent = Tex(new Color(.91f, .2f, .18f, 1f));
            muted = Tex(new Color(.25f, .28f, .32f, 1f));
        }

        void OnGUI()
        {
            if (!Visible || settings == null) return;
            EnsureStyles();

            float scale = Mathf.Min(Screen.width / 400f, Screen.height / 800f);
            Matrix4x4 old = GUI.matrix;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            Rect safe = UiSafeArea(scale);
            float w = safe.width;
            float x = safe.x;
            float y = safe.y;

            GUI.DrawTexture(safe, navy);
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(x, y + 28, w, 42), "SETTINGS", title);

            float row = y + 100;
            section.normal.textColor = new Color(.75f, .8f, .88f);
            GUI.Label(new Rect(x + 28, row, w - 56, 28), "CONTROLS", section);
            row += 36;
            option.alignment = TextAnchor.MiddleLeft;
            option.normal.textColor = Color.white;
            GUI.Label(new Rect(x + 28, row, w - 56, 24), "Tilt Sensitivity", option);
            row += 34;
            row = DrawPresetRow(x + 28, row, w - 56, settings.TiltSensitivity);

            row += 28;
            GUI.Label(new Rect(x + 28, row, w - 56, 28), "AUDIO", section);
            row += 36;
            row = DrawToggle(x + 28, row, w - 56, "Sound", settings.SoundEnabled, v => settings.SetSoundEnabled(v));
            row = DrawToggle(x + 28, row, w - 56, "Music", settings.MusicEnabled, v => settings.SetMusicEnabled(v));

            row += 16;
            GUI.Label(new Rect(x + 28, row, w - 56, 28), "HAPTIC", section);
            row += 36;
            DrawToggle(x + 28, row, w - 56, "Haptic", settings.HapticEnabled, v => settings.SetHapticEnabled(v));

            if (GUI.Button(new Rect(x + w * .2f, safe.yMax - 70, w * .6f, 48), "BACK", back))
                Close();

            GUI.matrix = old;
        }

        float DrawPresetRow(float x, float y, float w, TiltSensitivityPreset current)
        {
            float bw = (w - 16) / 3f;
            DrawPreset(new Rect(x, y, bw, 44), "LOW", TiltSensitivityPreset.Low, current);
            DrawPreset(new Rect(x + bw + 8, y, bw, 44), "NORMAL", TiltSensitivityPreset.Normal, current);
            DrawPreset(new Rect(x + (bw + 8) * 2, y, bw, 44), "HIGH", TiltSensitivityPreset.High, current);
            return y + 52;
        }

        void DrawPreset(Rect rect, string label, TiltSensitivityPreset preset, TiltSensitivityPreset current)
        {
            bool on = preset == current;
            GUI.DrawTexture(rect, on ? accent : charcoal);
            selected.alignment = TextAnchor.MiddleCenter;
            selected.normal.textColor = Color.white;
            if (GUI.Button(rect, label, selected))
                settings.SetTiltSensitivity(preset);
        }

        float DrawToggle(float x, float y, float w, string label, bool value, System.Action<bool> set)
        {
            GUI.DrawTexture(new Rect(x, y, w, 48), charcoal);
            option.alignment = TextAnchor.MiddleLeft;
            option.normal.textColor = Color.white;
            GUI.Label(new Rect(x + 16, y, w * .55f, 48), label, option);
            Rect btn = new Rect(x + w - 110, y + 6, 94, 36);
            GUI.DrawTexture(btn, value ? accent : muted);
            selected.alignment = TextAnchor.MiddleCenter;
            if (GUI.Button(btn, value ? "ON" : "OFF", selected))
                set(!value);
            return y + 58;
        }

        void EnsureStyles()
        {
            if (title != null) return;
            title = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            section = new GUIStyle(GUI.skin.label) { fontSize = 15, fontStyle = FontStyle.Bold };
            option = new GUIStyle(GUI.skin.label) { fontSize = 16, fontStyle = FontStyle.Bold };
            selected = new GUIStyle(GUI.skin.button)
            {
                fontSize = 15,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { background = null, textColor = Color.white },
                active = { background = null, textColor = Color.white },
                hover = { background = null, textColor = Color.white }
            };
            back = new GUIStyle(GUI.skin.button) { fontSize = 18, fontStyle = FontStyle.Bold };
        }

        internal static Rect UiSafeArea(float scale)
        {
            Rect s = Screen.safeArea;
            return new Rect(s.x / scale, (Screen.height - s.yMax) / scale, s.width / scale, s.height / scale);
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
            if (white != null) Destroy(white);
            if (navy != null) Destroy(navy);
            if (charcoal != null) Destroy(charcoal);
            if (accent != null) Destroy(accent);
            if (muted != null) Destroy(muted);
        }
    }
}
