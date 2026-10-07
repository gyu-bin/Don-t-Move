# DON'T MOVE — bundled audio provenance

## Current BGM — CC0 gameplay replacement (2026-10-07)

Official author pages and their CC0 links verified on 2026-10-07 before downloading. License: https://creativecommons.org/publicdomain/zero/1.0/ . Both gameplay tracks permit commercial use; attribution is not required. Voluntary in-app credits retain provenance. Lobby is unchanged and its license remains unconfirmed: this is a mixed-rights set, not an all-CC0 set.

Lobby: `bgm/lobby.mp3`, user-supplied `로비.mp3`, Matthew Pablo metadata. No new rights claim or audio change.

### Stealth
- Work: Crouch jumping in your walls
- Author: Fupi
- Source: https://opengameart.org/content/crouch-jumping-in-your-walls
- Original download: https://opengameart.org/sites/default/files/crouch-jumping-in-your-walls.flac
- License: CC0 1.0 Universal
- Commercial use: allowed; attribution: not required
- Original SHA-256: `f4ce4f6b97b75616ca789e219e5ca2c51d88370e3748599948c7a3e708c94d79`
- Runtime file: `bgm/stealth.mp3`
- Processing: 2-pass loudness normalization target -16 LUFS, -2 dBTP; 44.1 kHz stereo MP3 192 kbps with Xing gapless metadata; only endpoint silence below -60 dB for >=0.5 sec removed with 20ms margin; 3 ms edge fades; no pitch/tempo changes.
- Retained source range: 0.000000–68.502917 seconds (original duration 69.176479).
- Final decoded loudness: -16.37 LUFS integrated; true peak -2.18 dBTP; clipped samples: 0.
- Decoded end→start sample discontinuity: -61.52 dBFS. This is a signal check, not a listening approval or proof of native gapless playback.
- Final SHA-256: `6718023990d7fe671e1ed2a6b8526cd54a2fb7e5193b7410b80906070603c224`

### Chase
- Work: Chase
- Author: Adiutorium
- Source: https://opengameart.org/content/chase-2
- Original download: https://opengameart.org/sites/default/files/chase.mp3
- License: CC0 1.0 Universal
- Commercial use: allowed; attribution: not required
- Original SHA-256: `f033d26bb2bb2e6b3fb7db60e491b4dbea0c32f3ac92e8c9b18718759410a601`
- Runtime file: `bgm/chase.mp3`
- Processing: 2-pass loudness normalization target -16 LUFS, -2 dBTP; 44.1 kHz stereo MP3 192 kbps with Xing gapless metadata; only endpoint silence below -60 dB for >=0.5 sec removed with 20ms margin; 3 ms edge fades; no pitch/tempo changes.
- Retained source range: 0.000000–261.936000 seconds (original duration 261.936000).
- Final decoded loudness: -16.25 LUFS integrated; true peak -1.95 dBTP; clipped samples: 0.
- Decoded end→start sample discontinuity: -240.00 dBFS. This is a signal check, not a listening approval or proof of native gapless playback.
- Final SHA-256: `2a262055237328367307d494453aab30cb50e7b3bebe4d2d3fad90e02019a1a7`

Runtime mapping: Lobby → `lobby.mp3`; Stealth → `stealth.mp3`; Theft Alert / Player Spotted / Search / Return → `chase.mp3`. Paths, state machine, player lifecycle, track gains and SFX unchanged. Former gameplay MP3 content replaced, no longer referenced by runtime. Historical entries below are provenance only.

Physical-device listening (iOS/Android), musical seam quality and native MP3 loop scheduling remain PENDING. Original files and processing measurements are in local `Reports/AudioCC0/`; no download occurs at runtime.

## Historical — previous licensed shortlist V4 (not bundled)

Status: **REPLACED 2026-09-29** — retained only as provenance for the previous shortlist; none of these files are loaded by the current runtime.

Chosen from the user's own 11-track listening shortlist (`~/Downloads/DontMove_BGM_candidates/`). The agent cannot hear audio: the choice uses author descriptions plus section-by-section signal analysis (start/middle/late, tempo, percussive ratio, spectrum, loop structure); see `../../Reports/AudioV4/selection.md`.

| Slot/file | Work | Author | Source | License | Attribution |
|---|---|---|---|---|---|
| `bgm/lobby.m4a` | Deliciously Sour | Matthew Pablo | https://opengameart.org/content/deliciously-sour (file `Deliciously Sour_0.mp3`) | CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/ | **Required** |
| `bgm/stealth.m4a` | Investigation | Umplix | https://opengameart.org/content/investigation-0 (file `_investigation.wav`, author's seamless-loop version) | CC0 1.0 | Not required (credited anyway) |
| `bgm/theft-alert.m4a` | Man with a Plan | ATMANAN | https://opengameart.org/content/man-with-a-plan (file `manwithaplan.mp3`) | CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ | **Required** |
| `bgm/chase.m4a` | Electrobrass | Emma_MA | https://opengameart.org/content/electrobrass (file `electrobrass.wav`) | CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ | **Required** |

These were previously documented as commercially usable with attribution. They are retained here only as historical provenance and are no longer the current in-app credit. No endorsement is implied. Author notes: Matthew Pablo says the track "doesn't loop"; ATMANAN asks to see projects that use it (courtesy, not a license term).

Edits (script `../../Reports/AudioV4/master.py`, numbers `../../Reports/AudioV4/mastering.json`):

- **Lobby / Deliciously Sour:** starts at first beat 0.329 s (leading silence removed); loop 74.18 s = 136 beats at 110 BPM measured, ending before the composed finale; 80 ms equal-power seam. +4.3 dB.
- **Stealth / Investigation:** author's seamless loop kept whole (56.09 s), no trim needed (sound from 0 s); 4 ms wrap fade. +3.8 dB. The composition contains deliberate stop-time rests (≈12 % of 50 ms windows near-silent) — musical, not dropouts.
- **Theft / Man with a Plan:** starts 0.07 s; loop 96.02 s = 208 beats (52 bars) at 130 BPM measured, before the ending; 80 ms seam. +1.8 dB.
- **Chase / Electrobrass:** measured period is exactly 80 beats = 36.000 s at 133.2 BPM; the file is 36.037 s with a 60 ms silent head. Loop = last 36.000 s of the file, rotated so playback starts on the first attack (22 ms of that silence moved to the loop end); 4 ms wrap fade. −4.9 dB.
- All four: −16 LUFS integrated (±0.3), peak-only limiter at −1.5 dBTP where needed (≤0.08 % of samples), AAC true peak −1.0 to −3.6 dBTP, no clipping. 44.1 kHz stereo AAC-LC 160 kbps. No pitch/tempo change, no re-arrangement, no generated material.

Required credit (as displayed in Settings):

> "Deliciously Sour" by Matthew Pablo (matthewpablo.com) — CC BY 3.0 · "Man with a Plan" by ATMANAN — CC BY 4.0 · "Electrobrass" by Emma_MA — CC BY 4.0 · "Investigation" by Umplix — CC0 · Source: opengameart.org · Licenses: creativecommons.org/licenses/by/3.0/ , creativecommons.org/licenses/by/4.0/ · Edited: trimmed, looped, level-matched.

## REPLACED / UNUSED — Audio Redirection V3 (Kevin MacLeod set), kept for provenance

Status: **REPLACED 2026-09-29** — user listening removed all four from the shortlist. Files no longer bundled; in-app credit removed. Selection is based on composer metadata (feel/instrumentation/tempo) and measured signal analysis; nobody has approved these by ear yet.

All four tracks: composer **Kevin MacLeod**, source **incompetech.com**, license **Creative Commons Attribution 4.0** ([deed](https://creativecommons.org/licenses/by/4.0/)). Commercial game use, copying and editing permitted. **Attribution required** — shown in-app in Settings (`src/game/audio/audioCredits.ts`), wording from the composer's own credit generator at https://incompetech.com/music/royalty-free/licenses/ . Downloaded 2026-09-29 from `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<title>.mp3`.

| Slot/file | Work | ISRC | Composer tags (feel / instruments / BPM) | Source page |
|---|---|---|---|---|
| `bgm/lobby.m4a` | Spy Glass | USUAN1500058 | Grooving, Mysterious / piano, bass, drums, vibraphone, saxes, trumpet, flute / 110 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500058 |
| `bgm/stealth.m4a` | Investigations | USUAN1100646 | Humorous, Mysterious / pizzicato strings, English horn, bassoon, marimba, glockenspiel, cowbells / 94 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100646 |
| `bgm/theft-alert.m4a` | Hidden Agenda | USUAN1200102 | Humorous, Suspenseful / cellos, violas, bassoon, xylophone, glockenspiel, oboe, percussion / 132 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200102 |
| `bgm/chase.m4a` | Run Amok | USUAN1400024 | Action, Bouncy, Bright, Humorous / strings, tuba, trumpet, trombones, marimba, clarinet, bassoon, oboe, percussion / 148 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400024 |

Required credit (as displayed):

> "Spy Glass", "Investigations", "Hidden Agenda", "Run Amok" — Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 — http://creativecommons.org/licenses/by/4.0/ . Edited: trimmed, looped, level-matched.

Edits (script `../../Reports/AudioV3/master.py`, exact numbers `../../Reports/AudioV3/mastering.json`):

- Leading silence removed: loop starts at the first beat (Spy Glass 0.422 s, Investigations 0.093 s, Hidden Agenda 0.511 s, Run Amok 0.886 s). Final endings/fade-outs cut.
- Loop: beat-grid–aligned loop end chosen by chroma/MFCC similarity to the loop start (≥0.96), 80 ms equal-power circular seam. Loop lengths 122.9 / 80.8 / 80.0 / 78.2 s.
- Loudness: all four normalized to **−16 LUFS integrated** (previous set −20 LUFS, judged too quiet). Peak-only limiter at −1.5 dBTP where needed (≤0.12 % of samples affected). Measured AAC true peak −1.0 to −1.5 dBTP; no clipping.
- No pitch shift, time stretch, re-arrangement or synthetic material. 44.1 kHz stereo AAC-LC 160 kbps (.m4a).

Selection rationale and rejected candidates: `../../Reports/AudioV3/candidates.md`.

## REPLACED / UNUSED — Audio Redirection V2 (SRG774), kept for provenance

Replaced 2026-09-29 after user listening: "너무 음산함, 약간 캐주얼하게". Measured spectral centroid 390–630 Hz (very dark timbre) supports that judgment. Files no longer bundled.

The SRG774 set below (V2) and the yd set further below (V1) are both **UNUSED / REPLACED**. Same slot file names were reused, so the paths in these historical tables now hold the V3 tracks above.

| Slot/file | Work | Author | Source and license |
|---|---|---|---|
| `bgm/lobby.m4a` | Sector | SRG774 | [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack), CC0 1.0 |
| `bgm/stealth.m4a` | Airy | SRG774 | Same pack, CC0 1.0 |
| `bgm/theft-alert.m4a` | Pulse | SRG774 | Same pack, CC0 1.0 |
| `bgm/chase.m4a` | Urgent | SRG774 | Same pack, CC0 1.0 |

Original archive: https://opengameart.org/sites/default/files/ogg.zip . Commercial game distribution, copying and edits permitted; attribution **not required**. Optional credit: Music by SRG774, Dark Sci-Fi Audio Pack, CC0. [Source-game creation notes](https://srg774.itch.io/balllogic) describe composing the audio in Ableton Live Suite. This is author-reported provenance, not an independent authorship audit.

Edits: leading low-level intro removed (Sector1.59s/Airy0.49s/Pulse1.19s/Urgent0.89s);0.20s circular tail/head overlap to soften loop seam; EBU loudness matched to approximately −20 LUFS, true-peak ceiling target−5dBTP; AAC encoding yields measured maxima−8.70/−7.37/−4.92/−4.88dBTP, safely below clipping. Sector/Airy use linear gain; Pulse/Urgent require dynamic loudness normalization. No pitch shift, time stretch or synthetic instrumentation.44.1kHz stereo AAC160kbps. Exact file hashes and measured levels: `../../Reports/AudioV2/mastering.json`.

User first accepted the Lobby/Chase preview direction, then rejected the set on longer listening (too gloomy). Long-session listening and physical-device mix acceptance remain pending. Candidate comparisons (at least3 per slot): `../../Reports/AudioV2/candidates.md`.

## Historical initial integration — old yd BGM REPLACED/UNUSED; UI and whistle files below are still CURRENT

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

## Objective pickup — 2026-09-30 (CURRENT)

- Runtime: `sfx/objective-pickup.wav`, event `objective_pickup`, gain **0.60**. Existing UI **0.45**, whistle **0.80**, Stealth **0.61**, Chase **0.63** unchanged.
- Work: **Xylophone crystal chimes**, author **lori.mortimer**. Source/license verified: https://freesound.org/people/lori.mortimer/sounds/707618/ . Source states CC0 and permits copying, modification and commercial use without permission. CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/ . Attribution optional; credited here.
- Provenance: actual crystal glasses tapped with a wooden chopstick, recorded on Zoom H5, author-applied convolution reverb. Existing authored recording, no generated beep.
- Public download: https://cdn.freesound.org/previews/707/707618_9190375-hq.mp3 . This is the compressed HQ preview, **not** the login-gated original WAV. PCM conversion does not restore lost source fidelity.
- Edits: source 11.435–11.985 seconds; 0.55-second isolated glass attack/tail, mono 44.1kHz 16-bit PCM WAV; 3ms attack/90ms release fade; peak −5dBFS. No synthesis, pitch shift or fanfare layering.
- Reproduction script and hashes: `../../Reports/ObjectivePickup/process.py` and `processing.json`.
- Selection is based on author provenance and transient/duration analysis. **Human artistic/mix audition and device playback remain pending**, not claimed approved.
- Acquisition emits once per revision in the current mission. Pickup does not change BGM; Stealth persists until Theft Alert or Player Spotted. Paused/muted/background events are consumed, never replayed on resume.
