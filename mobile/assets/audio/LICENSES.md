# DON'T MOVE — bundled audio provenance

## Current BGM — Audio Redirection V2 (2026-09-29)

The four yd music recordings below are **UNUSED / REPLACED**; historical provenance is retained. Current bundled BGM uses SRG774's Dark Sci-Fi Audio Pack. Existing UI and whistle recordings remain unchanged.

| Slot/file | Work | Author | Source and license |
|---|---|---|---|
| `bgm/lobby.m4a` | Sector | SRG774 | [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack), CC0 1.0 |
| `bgm/stealth.m4a` | Airy | SRG774 | Same pack, CC0 1.0 |
| `bgm/theft-alert.m4a` | Pulse | SRG774 | Same pack, CC0 1.0 |
| `bgm/chase.m4a` | Urgent | SRG774 | Same pack, CC0 1.0 |

Original archive: https://opengameart.org/sites/default/files/ogg.zip . Commercial game distribution, copying and edits permitted; attribution **not required**. Optional credit: Music by SRG774, Dark Sci-Fi Audio Pack, CC0. [Source-game creation notes](https://srg774.itch.io/balllogic) describe composing the audio in Ableton Live Suite. This is author-reported provenance, not an independent authorship audit.

Edits: leading low-level intro removed (Sector1.59s/Airy0.49s/Pulse1.19s/Urgent0.89s);0.20s circular tail/head overlap to soften loop seam; EBU loudness matched to approximately −20 LUFS, true-peak ceiling target−5dBTP; AAC encoding yields measured maxima−8.70/−7.37/−4.92/−4.88dBTP, safely below clipping. Sector/Airy use linear gain; Pulse/Urgent require dynamic loudness normalization. No pitch shift, time stretch or synthetic instrumentation.44.1kHz stereo AAC160kbps. Exact file hashes and measured levels: `../../Reports/AudioV2/mastering.json`.

User accepted the new Lobby/Chase preview direction in this task. Long-session listening and physical-device mix acceptance remain pending. Candidate comparisons (at least3 per slot): `../../Reports/AudioV2/candidates.md`.

## Historical initial integration — old BGM unused, UI/whistles still current

Downloaded and source/license checked: **2026-09-29**. All eight bundled slots use **CC0 1.0 Universal**: commercial game distribution, copying and modification permitted; attribution not required. [License deed](https://creativecommons.org/publicdomain/zero/1.0/) · [Legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

These are existing authored recordings/music, not generated placeholder sounds. Integration is complete only when runtime playback passes; artistic/mix approval remains a separate listening gate.

| Slot / local file | Original work | Author | Source / asset-specific license | Download |
|---|---|---|---|---|
| `sfx/whistle-theft.wav` | metal whistle.wav | strongbot | [Freesound, CC0](https://freesound.org/people/strongbot/sounds/568995/) | [Public HQ MP3](https://cdn.freesound.org/previews/568/568995_313970-hq.mp3) |
| `sfx/whistle-spotted.wav` | metal whistle.wav | strongbot | [Freesound, CC0](https://freesound.org/people/strongbot/sounds/568995/) | Same recording |
| `bgm/stealth.m4a` | Pressure | yd | [OpenGameArt, CC0](https://opengameart.org/content/pressure) | [Original Ogg](https://opengameart.org/sites/default/files/Pressure.ogg) |
| `bgm/theft-alert.m4a` | Menace | yd | [OpenGameArt, CC0](https://opengameart.org/content/menace) | [Original Ogg](https://opengameart.org/sites/default/files/Menace.ogg) |
| `bgm/chase.m4a` | Zombies' March | yd | [OpenGameArt, CC0](https://opengameart.org/content/zombies-march) | [Original Ogg](https://opengameart.org/sites/default/files/ZombiesAreComing.ogg) |

## Edits and encoding

- Whistles: real metal whistle recorded with Zoom H5. Public HQ MP3 source is compressed, **not the login-gated lossless original**. Converted to44.1kHz mono16-bit PCM WAV after editing; this does not restore lost fidelity.
- Theft: source12.70–13.62s, natural long blast,0.92s;5ms attack/35ms release fade, peak normalized−3.5dBFS.
- Spotted: source15.60–15.78s and18.46–18.62s, two real short blasts separated by80ms silence;0.42s; same fades and peak. No tone synthesis.
- Music: full authored compositions retained with0.6s tail/head overlap to soften loop seam; no pitch/tempo change.44.1kHz stereo AAC-LC160kbps in M4A for native mobile playback.
- Fixed gain before encode: Pressure−8.5515dB, Menace−11.5842dB, Zombies' March−2.1370dB. RMS targets−22/−21/−20dBFS. These are measured starting levels, **not human listening approval**.
- Exact processing/lengths/checksums: `../../Reports/ProductionAudio/asset-processing.json` and `file-specs.json`.

Optional credits (no legal attribution obligation under CC0):

> Whistle recording: “metal whistle.wav” by strongbot (Freesound), CC0. Edited excerpts.
> Music: “Pressure”, “Menace”, and “Zombies' March” by yd (OpenGameArt.org), CC0. Level adjustment, loop overlap and format conversion.

## Candidate comparison (at least3 per slot)

Comparisons below are **source metadata/design-fit screening**, not a claim that every candidate was auditioned. Final selection shares one instrument for two signals and one composer for all music. Instrumentation, seam quality and fatigue still need listening acceptance.

| Slot | Candidate1 | Candidate2 | Candidate3 | Selection / tradeoff |
|---|---|---|---|---|
| Theft whistle | strongbot metal whistle —CC0 | [Police–whistle, La Fonderie](https://www.soundsofchanges.eu/sound/police-wistle/) —CC BY4.0 | [referee_whistle_01, joedeshon](https://freesound.org/people/joedeshon/sounds/78508/) —CC BY4.0 | strongbot: several natural lengths, coherent pair; compressed HQ caveat. Police has field ambience; referee has sporting association. |
| Spotted whistle | strongbot metal whistle —CC0 | [gym whistle, SpliceSound](https://freesound.org/people/SpliceSound/sounds/218318/) —CC0 | La Fonderie Police–whistle —CC BY4.0 | strongbot: two brief real attacks. Gym room tail would require trim. |
| Stealth | yd Pressure —CC0 | [Espionage, brandon75689](https://opengameart.org/content/espionage) —CC0 option | [Infiltration, Adiutorium](https://opengameart.org/content/infiltration) —CC0 | Pressure: same composer; later action passages require audition against quiet-stealth brief. Espionage expressly stealth loop; Infiltration sci-fi association. |
| Theft BGM | yd Menace —CC0 | [Evasion, Matthew Pablo](https://opengameart.org/content/evasion) —CC BY3.0 | [Anticipation, yd](https://opengameart.org/content/loop-anticipation) —CC0 | Menace author ties its mood to Zombies' March. Evasion strings/electronics; Anticipation author notes imperfect loop. |
| Chase | yd Zombies' March —CC0 | [Tactical Pursuit, Matthew Pablo](https://opengameart.org/content/tactical-pursuit) —CC BY3.0 | [Tension Based Loops, VividReality](https://opengameart.org/content/tension-based-loops-6-loops-full-mix) —CC BY3.0 | Zombies same family/loop tag. Tactical may be too orchestral/rock; Tension has6C-minor intensity loops but potential MIDI/repetition tradeoff. |

No non-commercial license, YouTube extraction, unknown-origin asset or generated beep is bundled. Unselected assets are not redistributed in the app.

# Lobby + menu additions — 2026-09-29

All three additions are **CC0 1.0 Universal**: commercial game use/distribution and editing allowed; attribution optional. These are existing authored assets, not generated synth/beep placeholders.

| Slot/file | Work / original filename | Author | Source and license | Original download |
|---|---|---|---|---|
| `bgm/lobby.m4a` | Searching / Searching.ogg | yd | [Searching, CC0](https://opengameart.org/content/searching) | [Ogg](https://opengameart.org/sites/default/files/Searching.ogg) |
| `sfx/ui-select.wav` | 51 UI sound effects / switch26.wav | Kenney Vleugels | [51 UI sound effects, CC0](https://opengameart.org/node/12394) | [Original WAV pack](https://opengameart.org/sites/default/files/UI_SFX_Set.zip) |
| `sfx/ui-back.wav` | 51 UI sound effects / rollover6.wav | Kenney Vleugels | [Same pack, CC0](https://opengameart.org/node/12394) | Same pack |

The pack describes its sounds as organic; its included readme expressly permits commercial projects and says credit is optional. Optional credit: **UI sounds by Kenney.nl (CC0), edited excerpts. Lobby music “Searching” by yd (CC0), loop overlap/level/encoding edits.**

## Added asset edits

- Lobby: original104.577s;0.6s circular tail/head overlap, fixed−7.5401dB gain,44.1kHz stereo AAC-LC160kbps. Result103.977s container length. No pitch/tempo changes. Native loop listening remains separate from level measurements.
- Select: source switch26.wav at0.04–0.19s, mono16-bit44.1kHz WAV, peak−7dBFS,2ms attack/12ms release fade. Original leading silence reduced. Result0.15s.
- Back: source rollover6.wav at0.01–0.16s, same format/fades, peak−10dBFS. Result approximately0.15s. The lower-frequency source was selected instead of merely reducing the select sound's pitch.
- Full source/edit/file hashes: `../../Reports/LobbyAudio/asset-processing.json`.
- Existing five audio files were not reprocessed. Requested gain changes are applied once in the native mixer.

## Three candidates per added slot

This table is metadata/measurement screening; **it is not a claim of human listening approval**. Durations below are original files.

| Slot | Candidate | License | Evaluation |
|---|---|---|---|
| Lobby | Searching —yd | CC0 | Selected:104.577s; dark/warm drone/electronic/loop metadata. Same composer as gameplay. More ambient bed than memorable theme; artistic acceptance pending. |
| Lobby | [EmptyCity —yd](https://opengameart.org/content/emptycity-background-music) | CC0 |100.003s; calm/spy/infiltration and loopable, but stronger ruined-city/horror association. |
| Lobby | [Insistent —yd](https://opengameart.org/content/insistent-background-loop) | CC0 |128.693s; quiet dark loop, stronger fear/horror association. |
| Select | switch26.wav —Kenney | CC0 |Selected:0.2305s source, brief mechanical transient; trim leading silence for prompt response. |
| Select | switch7.wav —Kenney | CC0 |0.1923s; higher zero-crossing frequency proxy than switch26, potentially brighter. |
| Select | switch28.wav —Kenney | CC0 |0.2049s; similar switch family, close to select's measured frequency profile. |
| Back | rollover6.wav —Kenney | CC0 |Selected:0.1745s; substantially lower frequency proxy, longer soft texture; peak trimmed lower than select. |
| Back | switch28.wav —Kenney | CC0 |0.2049s; coherent mechanical family but smaller contrast to switch26. |
| Back | rollover1.wav —Kenney | CC0 |0.2273s; very low RMS, would require more gain and noise scrutiny. |

Searching / EmptyCity / Insistent originals and UI candidate files were downloaded for inspection. Only the three selected derivatives are bundled. Final preference for the music and select/back distinction remains a listening gate.
