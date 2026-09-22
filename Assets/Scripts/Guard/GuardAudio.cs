using System;
using UnityEngine;

namespace DontMove
{
    /// <summary>
    /// Small generated feedback clips keep the prototype self contained. They are
    /// deliberately short and throttled so a busy room does not create an audio
    /// voice for every frame of suspicion.
    /// </summary>
    public sealed class GuardAudio : MonoBehaviour
    {
        public AudioSource source;
        static AudioClip whistle;
        static AudioClip alert;
        static AudioClip suspicionTick;
        static AudioClip search;
        static AudioClip runLoop;
        float nextTick;
        bool fullPlayed;
        GameSettings settings;

        void Awake()
        {
            EnsureSource();
            settings = UnityEngine.Object.FindFirstObjectByType<GameSettings>();
            BuildClips();
        }

        bool SoundEnabled => settings == null || settings.SoundEnabled;

        /// <summary>
        /// Audio lives on a dedicated child.  Guard roots are rebuilt by the
        /// 2D stage builder and may have their components replaced while the
        /// scene is entering Play Mode; keeping the source on a stable child
        /// avoids a stale serialized AudioSource reference.
        /// </summary>
        public AudioSource EnsureSource()
        {
            // A scene saved before the audio child existed can still contain a
            // serialized root AudioSource reference. Never reuse that reference:
            // the child is the stable owner for generated clips.
            if (source != null && source.transform.parent != transform) source = null;
            if (source == null)
            {
                Transform child = transform.Find("Guard Audio");
                if (child == null)
                {
                    var childObject = new GameObject("Guard Audio");
                    child = childObject.transform;
                    child.SetParent(transform, false);
                }
                source = child.GetComponent<AudioSource>();
                if (source == null) source = child.gameObject.AddComponent<AudioSource>();
            }
            if (source == null) return null;
            source.playOnAwake = false;
            source.spatialBlend = 0f;
            return source;
        }

        public void PlayAlert()
        {
            AudioSource output = EnsureSource();
            if (output == null || !SoundEnabled) return;
            output.loop = false;
            output.PlayOneShot(whistle, .95f);
        }

        public void TickSuspicion(float amount)
        {
            AudioSource output = EnsureSource();
            if (output == null || !SoundEnabled || Time.unscaledTime < nextTick) return;
            nextTick = Time.unscaledTime + .28f;
            output.PlayOneShot(suspicionTick, Mathf.Lerp(.08f, .2f, amount));
            if (amount < .72f) fullPlayed = false;
            else if (!fullPlayed) { fullPlayed = true; output.PlayOneShot(alert, .22f); }
        }

        public void PlaySearch()
        {
            AudioSource output = EnsureSource();
            if (output == null || !SoundEnabled) return;
            output.loop = false;
            output.PlayOneShot(search, .28f);
        }

        public void SetRunning(bool running)
        {
            AudioSource output = EnsureSource();
            if (output == null || !SoundEnabled) return;
            if (running)
            {
                if (output.clip != runLoop || !output.isPlaying)
                {
                    output.clip = runLoop;
                    output.loop = true;
                    output.volume = .16f;
                    output.Play();
                }
            }
            else if (output.clip == runLoop)
            {
                output.Stop();
                output.clip = null;
            }
        }

        static void BuildClips()
        {
            if (whistle != null) return;
            const int rate = 22050;
            whistle = Make("DM_whistle_alert", .58f, rate, (t, d) =>
            {
                float env = Mathf.Clamp01(Mathf.Min(t * 28f, (d - t) * 7f));
                float f = Mathf.Lerp(2350f, 1780f, t / d);
                return env * (Mathf.Sin(t * f * Mathf.PI * 2f) * .72f + Mathf.Sin(t * f * Mathf.PI * 4f) * .16f);
            });
            alert = Make("DM_suspicion_full", .12f, rate, (t, d) =>
            {
                float env = Mathf.Clamp01(Mathf.Min(t * 80f, (d - t) * 18f));
                return env * Mathf.Sin(t * 880f * Mathf.PI * 2f) * .45f;
            });
            suspicionTick = Make("DM_suspicion_tick", .045f, rate, (t, d) =>
            {
                float env = Mathf.Clamp01(Mathf.Min(t * 120f, (d - t) * 40f));
                return env * Mathf.Sin(t * 1250f * Mathf.PI * 2f) * .3f;
            });
            search = Make("DM_search", .24f, rate, (t, d) =>
            {
                float env = Mathf.Clamp01(Mathf.Min(t * 20f, (d - t) * 8f));
                return env * Mathf.Sin(t * Mathf.Lerp(480f, 360f, t / d) * Mathf.PI * 2f) * .22f;
            });
            runLoop = Make("DM_guard_run", .32f, rate, (t, d) =>
            {
                float hit = Mathf.Exp(-Mathf.Pow(Mathf.Repeat(t, .16f) - .035f, 2f) * 2600f);
                return hit * Mathf.Sin(t * 95f * Mathf.PI * 2f) * .25f;
            });
        }

        static AudioClip Make(string name, float duration, int rate, Func<float, float, float> sample)
        {
            int count = Mathf.Max(1, Mathf.RoundToInt(duration * rate));
            var clip = AudioClip.Create(name, count, 1, rate, false);
            var data = new float[count];
            for (int i = 0; i < count; i++) data[i] = sample(i / (float)rate, duration);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
