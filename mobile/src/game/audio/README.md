# Lobby and gameplay audio

Expo 57 `expo-audio` backend with seven bundled assets: three looping music players and four SFX voices (two whistles, UI Select and UI Back). One persistent manager above the menu and mission layers owns all players. Bundled sources and licensing: `assets/audio/LICENSES.md`.

- `LOBBY` → user supplied `로비.mp3`; `STEALTH` → user supplied `stealth.mp3`; `THEFT_ALERT`, `PLAYER_SPOTTED`, `SEARCH`, and `RETURN` → user supplied `chase.mp3`.
- `LOBBY` continues across Home, Chapter Select, Mission Select and Settings without a track restart. Intro is silent; direct mission transitions never select Lobby.
- SEARCH/RETURN retain prior tension; late theft never downgrades chase or sounds a theft whistle.
- Independent persisted SFX/BGM settings. Background silences all players; pause/result screens retain music and navigation SFX while suspending gameplay SFX. Missed muted events are consumed.
- All sources preload with `downloadFirst`; first whistle briefly waits for native readiness, canceled by session/lifecycle changes. No player allocation per frame.
- Crossfade: 0.9 seconds between Lobby, Stealth, and Chase; no seeking/restarting the same music when Theft Alert becomes Player Spotted or Search.
- Track gains: Lobby 0.50, Stealth 0.61 (was 0.52; raised after play feedback), Chase 0.63. Measured file loudness: stealth.mp3 −16.3 LUFS (true peak −1.8 dBFS), chase.mp3 −16.0 LUFS, whistle-theft −9.7, whistle-spotted −13.6 LUFS → at gain: Stealth ≈ −20.6, Chase ≈ −20.0, whistles ≈ −11.6 / −15.5 LUFS. Native output applies `trackBaseGain × masterBgmVolume` once (master defaults to 1). UI SFX 0.45; Whistle 0.80. User-provided files are loudness-normalized for mobile playback. Ducking is intentionally not enabled without listening evidence.
- Main navigation actions request one Select or Back SFX; mount does not play UI sounds. Pending SFX seeks are canceled when muted, backgrounded or disposed.
- Development-only `NATIVE_LOADED`, `NATIVE_ADVANCING`, `NATIVE_ERROR` diagnose actual native state. Advancing time is **not proof of audible speaker output**.

Artistic approval and physical-device listening remain separate QA gates. See `Reports/AudioV2/README.md` for measured evidence and limitations.
