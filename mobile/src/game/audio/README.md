# Lobby and gameplay audio

The Expo 57 `expo-audio` backend owns thirteen reusable native players. One persistent manager above the menu and mission layers owns three loops and ten one-shot voices for whistles, navigation, objective pickup and footsteps. The bundled source details are in `assets/audio/LICENSES.md`.

- `LOBBY` → user supplied `로비.mp3`; `STEALTH` → Fupi, “Crouch jumping in your walls” (CC0); `THEFT_ALERT`, `PLAYER_SPOTTED`, `SEARCH`, and `RETURN` → Adiutorium, “Chase” (CC0). The same `stealth.mp3` / `chase.mp3` require paths remain. Lobby rights remain unconfirmed; the set is not entirely CC0.
- `LOBBY` continues across Home, Chapter Select, Mission Select and Settings without a track restart. Intro is silent; direct mission transitions never select Lobby.
- SEARCH/RETURN retain prior tension; late theft never downgrades chase or sounds a theft whistle.
- Independent persisted SFX/BGM settings. Background silences all players; pause/result screens retain music and navigation SFX while suspending gameplay SFX. Missed muted events are consumed.
- All sources preload with `downloadFirst`; first whistle briefly waits for native readiness, canceled by session/lifecycle changes. No player allocation per frame.
- Crossfade: 0.9 seconds between Lobby, Stealth, and Chase; no seeking/restarting the same music when Theft Alert becomes Player Spotted or Search.
- Track gains unchanged: Lobby 0.50, Stealth 0.61, Chase 0.63; UI SFX 0.45; Whistle 0.80. New gameplay masters target −16 LUFS integrated and −2 dBTP before MP3 encoding. Final decoded measurements, processing and hashes are in `assets/audio/LICENSES.md`. Native output applies `trackBaseGain × masterBgmVolume` once (master defaults to 1). No pitch/tempo changes. Ducking remains unchanged.
- Main navigation actions request one Select or Back SFX; mount does not play UI sounds. Pending SFX seeks are canceled when muted, backgrounded or disposed.
- Player footfalls choose a named one-shot for stone/tile, wood, concrete, metal or carpet. Sneak, Walk and Run use gains of 0.13, 0.30 and 0.49. One footstep plays at a time. Steps older than 150 ms or emitted before the active session opened are dropped. Sounds missed during loading or suspension are never replayed.
- Development-only `NATIVE_LOADED`, `NATIVE_ADVANCING`, `NATIVE_ERROR` diagnose actual native state. Advancing time is **not proof of audible speaker output**.

Artistic approval and physical-device listening remain separate QA gates. See `Reports/AudioV2/README.md` for measured evidence and limitations.
