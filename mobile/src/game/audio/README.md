# Lobby and gameplay audio

Expo 57 `expo-audio` backend with eight bundled assets: four looping music players and four SFX voices (two whistles, UI Select and UI Back). One persistent manager above the menu and mission layers owns all players. Bundled sources and licensing: `assets/audio/LICENSES.md`.

- `LOBBY` → Sector; `STEALTH` → Airy; `THEFT_ALERT` → Pulse; `PLAYER_SPOTTED` → Urgent (SRG774 CC0).
- `LOBBY` continues across Home, Chapter Select, Mission Select and Settings without a track restart. Intro is silent; direct mission transitions never select Lobby.
- SEARCH/RETURN retain prior tension; late theft never downgrades chase or sounds a theft whistle.
- Independent persisted SFX/BGM settings. Background silences all players; pause/result screens retain music and navigation SFX while suspending gameplay SFX. Missed muted events are consumed.
- All sources preload with `downloadFirst`; first whistle briefly waits for native readiness, canceled by session/lifecycle changes. No player allocation per frame.
- Crossfade: one second between Lobby and gameplay, at most 0.8 seconds into alert and 1.2 seconds into Stealth; no seeking/restarting the same music on phase updates.
- Starting track gains: Lobby 0.50, Stealth 0.52, Theft 0.57, Chase 0.63. Native output applies `trackBaseGain × masterBgmVolume` once (master defaults to 1). UI SFX 0.45; Whistle 0.80. Sources are matched near −20 LUFS with recorded linear/dynamic normalization and loop edits. Ducking is intentionally not enabled without listening evidence.
- Main navigation actions request one Select or Back SFX; mount does not play UI sounds. Pending SFX seeks are canceled when muted, backgrounded or disposed.
- Development-only `NATIVE_LOADED`, `NATIVE_ADVANCING`, `NATIVE_ERROR` diagnose actual native state. Advancing time is **not proof of audible speaker output**.

Artistic approval and physical-device listening remain separate QA gates. See `Reports/AudioV2/README.md` for measured evidence and limitations.
