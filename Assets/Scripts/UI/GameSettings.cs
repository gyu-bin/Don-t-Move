using UnityEngine;

namespace DontMove
{
    public enum TiltSensitivityPreset
    {
        Low = 0,
        Normal = 1,
        High = 2
    }

    /// <summary>
    /// Local player preferences for release UI. Sound/Music are stored only for a future AudioManager.
    /// Sensitivity writes to the already-exposed SensorManager.sensitivity field.
    /// </summary>
    public sealed class GameSettings : MonoBehaviour
    {
        const string KeySensitivity = "dm.settings.tiltSensitivity";
        const string KeySound = "dm.settings.sound";
        const string KeyMusic = "dm.settings.music";
        const string KeyHaptic = "dm.settings.haptic";

        public SensorManager sensor;

        public TiltSensitivityPreset TiltSensitivity { get; private set; } = TiltSensitivityPreset.Normal;
        public bool SoundEnabled { get; private set; } = true;
        public bool MusicEnabled { get; private set; } = true;
        public bool HapticEnabled { get; private set; } = true;

        void Start()
        {
            if (sensor == null)
            {
                var game = GetComponent<GameStateController>();
                if (game != null) sensor = game.sensor;
            }
            Load();
            ApplySensitivity();
        }

        public static float SensitivityValue(TiltSensitivityPreset preset)
        {
            switch (preset)
            {
                case TiltSensitivityPreset.Low: return .85f;
                case TiltSensitivityPreset.High: return 1.15f;
                default: return 1f;
            }
        }

        public void SetTiltSensitivity(TiltSensitivityPreset preset)
        {
            TiltSensitivity = preset;
            PlayerPrefs.SetInt(KeySensitivity, (int)preset);
            PlayerPrefs.Save();
            ApplySensitivity();
        }

        public void SetSoundEnabled(bool enabled)
        {
            SoundEnabled = enabled;
            PlayerPrefs.SetInt(KeySound, enabled ? 1 : 0);
            PlayerPrefs.Save();
        }

        public void SetMusicEnabled(bool enabled)
        {
            MusicEnabled = enabled;
            PlayerPrefs.SetInt(KeyMusic, enabled ? 1 : 0);
            PlayerPrefs.Save();
        }

        public void SetHapticEnabled(bool enabled)
        {
            HapticEnabled = enabled;
            PlayerPrefs.SetInt(KeyHaptic, enabled ? 1 : 0);
            PlayerPrefs.Save();
        }

        public void TriggerHaptic()
        {
            if (!HapticEnabled) return;
            Handheld.Vibrate();
        }

        void Load()
        {
            TiltSensitivity = (TiltSensitivityPreset)PlayerPrefs.GetInt(KeySensitivity, (int)TiltSensitivityPreset.Normal);
            SoundEnabled = PlayerPrefs.GetInt(KeySound, 1) != 0;
            MusicEnabled = PlayerPrefs.GetInt(KeyMusic, 1) != 0;
            HapticEnabled = PlayerPrefs.GetInt(KeyHaptic, 1) != 0;
        }

        void ApplySensitivity()
        {
            if (sensor == null) return;
            sensor.sensitivity = SensitivityValue(TiltSensitivity);
        }
    }
}
