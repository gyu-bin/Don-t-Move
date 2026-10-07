# BGM REPLACEMENT REPORT

Date: 2026-10-07

## Stealth
- Track: Crouch jumping in your walls
- Author: Fupi
- Source: https://opengameart.org/content/crouch-jumping-in-your-walls
- License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Original file: `crouch-jumping-in-your-walls.flac` (downloaded directly from linked official OGA attachment)
- Runtime file: `assets/audio/bgm/stealth.mp3`
- Processing: 2-pass loudness normalization target -16 LUFS, -2 dBTP; 44.1 kHz stereo MP3 192 kbps with Xing gapless metadata; only endpoint silence below -60 dB for >=0.5 sec removed with 20ms margin; 3 ms edge fades; no pitch/tempo changes
- LUFS: -16.37 integrated, decoded final MP3
- Peak: -2.18 dBTP; 0 clipped samples
- Hash (SHA-256): `6718023990d7fe671e1ed2a6b8526cd54a2fb7e5193b7410b80906070603c224`
- Duration: 68.503s; original 69.176s
- Retained source range: 0.000000–68.502917s
- Boundary sample discontinuity: -61.52 dBFS. Numeric signal check only; audible musical/native loop seam PENDING.

## Chase
- Track: Chase
- Author: Adiutorium
- Source: https://opengameart.org/content/chase-2
- License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Original file: `chase.mp3` (downloaded directly from linked official OGA attachment)
- Runtime file: `assets/audio/bgm/chase.mp3`
- Processing: 2-pass loudness normalization target -16 LUFS, -2 dBTP; 44.1 kHz stereo MP3 192 kbps with Xing gapless metadata; only endpoint silence below -60 dB for >=0.5 sec removed with 20ms margin; 3 ms edge fades; no pitch/tempo changes
- LUFS: -16.25 integrated, decoded final MP3
- Peak: -1.95 dBTP; 0 clipped samples
- Hash (SHA-256): `2a262055237328367307d494453aab30cb50e7b3bebe4d2d3fad90e02019a1a7`
- Duration: 261.936s; original 261.936s
- Retained source range: 0.000000–261.936000s
- Boundary sample discontinuity: -240.00 dBFS. Numeric signal check only; audible musical/native loop seam PENDING.

## Runtime mapping
- Lobby → existing `lobby.mp3` (unchanged; rights remain pending)
- Stealth → Fupi / Crouch jumping in your walls
- Alert/Chase → Adiutorium / Chase (existing THEFT_ALERT/SPOTTED/SEARCH/RETURN rules)

## Changed files (this task)
- `assets/audio/bgm/stealth.mp3`
- `assets/audio/bgm/chase.mp3`
- `assets/audio/LICENSES.md`
- `src/game/audio/audioCredits.ts`
- `src/game/audio/audioAssets.ts` (status metadata only; requires unchanged)
- `src/game/audio/README.md`
- `src/ui/branding/audioCleanup.test.ts` (obsolete credit assertions updated)
- This report

Existing uncommitted `eas.json` / `MenuScreens.tsx` Settings work predates this task and is preserved.

## Tests
- TypeScript: PASS
- Lint: PASS, 0 errors / 1 existing `src/ota/applyUpdate.ts` require warning
- Audio state/lifecycle + credit tests: 25/25 PASS. Includes mocked Lobby/Stealth/Chase fades, mute, pause/background suppression, resume, pending seeks, reuse/disposal; not physical speaker evidence.
- Full `npm test`: FAIL — preexisting `src/ui/branding/introTimeline.test.ts:49`, assertion that app.json must not include splash-mark conflicts with existing Android splash setting. This was reproduced before the audio change. Unrelated branding configuration not modified.
- Suites after the stop were run individually: campaign614, theft-support31, monetization51, crash22, environment15, doors21, OTA21: all PASS.
- iOS export: PASS (`/private/tmp/dm-cc0-ios`)
- Android export: PASS (`/private/tmp/dm-cc0-android`)
- Both exported asset sets contain exact SHA-256 of each new runtime MP3; neither contains the old runtime MP3 hashes. Actual require paths remain unchanged.
- Lobby SHA-256 unchanged: `74eb232b4b7e1603379f9e055e07e1fc3a8b84fc89e0085bdfa4ac36f769f1b5`
- GameAudioManager.ts and audioState.ts unchanged by git diff; no AI/gameplay edits.

## License verification
- Stealth: PASS — Fupi, CC0 explicitly linked on official page.
- Chase: PASS — Adiutorium, CC0 linked; page explicitly permits commercial use without attribution.
- Lobby: unchanged, license not verified by this task. No blanket all-music CC0 claim.

## Device playback
- iOS: PENDING — no physical-device listening performed.
- Android: PENDING — no physical-device listening performed.
- Musical loop seam / perceived transition volume: PENDING listening. Final MP3 decoded boundary checks show no clipping and very small discontinuity; this does not certify device decoder gaplessness.
- No OTA, store upload or release delivery performed.

Raw measurements, original downloads, mastering script and bundle hash verification: local `Reports/AudioCC0/` (ignored working evidence).
