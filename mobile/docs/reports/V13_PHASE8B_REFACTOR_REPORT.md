# V13 Phase 8B — behaviour-preserving refactor (2026-10-06)

Not committed. Verdict: **PASS WITH TECH DEBT** — all 45 runtime snapshots are identical to the Phase 8 baseline
after every step and at the end; the clean-up candidates listed below remain, untouched, by instruction.

```
45 / 45 SNAPSHOT SAME        campaign file sha1 198827a66b66 before and after (byte-identical)
9 chapters × 5 missions = 45
npm test 1018 / 1018         (1007 before + 11 new)
```

No file under `src/` was changed in this phase. `legacy-unity/` untouched. No asset, `_pretune/` folder, historical
script or test was deleted. `secure()` (`tools/campaign/v13Reuse.ts`) was not edited. The two audit findings
(05-02, 05-05) were left exactly as they are.

## Gates

Each step ran: `npm run campaign:bake` → snapshot compare against `Reports/V13_PHASE8/baseline` → `npm test` →
`tsc --noEmit` (app) → `tsc -p tools/campaign/tsconfig.v13.json` (V13 tools) → `expo lint`. The next step started
only after the previous gate passed.

| Step | Snapshot | Campaign file | `npm test` | tsc app / V13 tools | Lint errors |
|---|---|---|---|---|---|
| Baseline | 45 / 45 | 198827a66b66 | 1007 / 1007 | 0 / (not checked by any script) | 0 |
| R1 | 45 / 45 SAME | 198827a66b66 | 1011 / 1011 | 0 / 0 | 0 |
| R2 | 45 / 45 SAME | 198827a66b66 | 1015 / 1015 | 0 / 0 | 0 |
| R3 | 45 / 45 SAME | 198827a66b66 | 1016 / 1016 | 0 / 0 | 0 |
| R4 | 45 / 45 SAME | 198827a66b66 | 1017 / 1017 | 0 / 0 | 0 |
| R5 | 45 / 45 SAME | 198827a66b66 | 1018 / 1018 | 0 / 0 | 0 |
| R6 | 45 / 45 SAME | 198827a66b66 | 1018 / 1018 | 0 / 0 | 0 |
| Final | 45 / 45 SAME | 198827a66b66 | 1018 / 1018 | 0 / 0 | 0 (1 existing warning, `src/ota/applyUpdate.ts`) |

Final gate also: `test:environment` 15 / 15, manifest validation missing 0 / invalid 0, `campaign:audit` exit 0
(45 / 45 clean, 2 known findings), `npm run typecheck` exit 0, legacy tool typecheck exit 0.

## R1 — build and validation foundation

| | |
|---|---|
| Changed | `package.json`; `tools/campaign/v124bBuild.ts`, `v124cBuild.ts`, `v124dBuild.ts`, `v125Build.ts`; `v13Snapshot.ts`, `v13FullAudit.ts` |
| Added | `tools/campaign/tsconfig.v13.json`, `tools/campaign/v13Integrity.test.ts`, `docs/design/v13/PHASE8_SNAPSHOT_HASHES.json` |

- **`npm run campaign:bake`** was `v124dBuild.ts` (it would have written the V12.4d campaign over the current one).
  It now runs `v13Build.ts` then `buildMissionBriefs.ts`. Run after the change: campaign file and briefs
  byte-identical, snapshots 45 / 45 SAME.
- **Historical builders** (`v124b`, `v124c`, `v124d`, `v125`): kept, marked HISTORICAL in their header, and they no
  longer have the production file as their default output. They write only to `QA_CANDIDATE=<file>` and stop with a
  message otherwise (checked: all four refuse, campaign file untouched). `buildV124dCampaign()` and
  `buildV125Campaign()` are unchanged, so the tests that read them still pass.
- **New commands**: `campaign:snapshot` (the live campaign against the tracked baseline hashes; `Reports/` is
  git-ignored, so the 45 hashes now also live in `docs/design/v13/`), `campaign:audit` (exit code 1 on any finding
  outside its `KNOWN` list, which holds the two accepted ones with the reason).
- **Type-check**: `typecheck:campaign` now covers `v13*.ts` + `buildMissionBriefs.ts` (0 errors); `npm run
  typecheck` runs the app check and this one. The old `v124b–d` config is kept as `typecheck:campaign:legacy`.
  Older tools were not pulled in.
- **4 tests**: campaign is 9 × 5 = 45 counted from `CHAPTER_MISSION_COUNTS`, ids unique and in catalog order; the old
  10-mission counts exist in `campaignProgress.ts` (save migration) and nowhere else in `src/`; `campaign:bake` is the
  V13 bake and no script or historical builder names the production file; entry / prize / exit apart, patrol points,
  cameras and route anchors on open floor, guard and camera ids unique.

## R2 — environment and prop validation

| | |
|---|---|
| Changed | `package.json` (`test:environment`, new `environment:validate`) |
| Added | `tools/environment/catalogKit.test.ts` |

No metadata value was edited. The game reads collision, sight and footprint from `PROP_KIT` only (no runtime code
reads those fields from the catalog), so `PROP_KIT` stays the source of truth and the catalog copy is now held to it
by test rather than merged into it (merging would have meant rewriting the catalog tools).

4 tests: catalog, kit image table and files name the same 180 pictures once each, same path; every entry has
footprint, collision, LOS and a known physical kind; catalog footprint / collision / LOS / collision parts equal the
`PROP_KIT` entry of that kind (`BLOCK` and `BREAKER` ↔ blocks sight, `PASS` ↔ does not), draw width equal except six
wall portraits listed by name; every campaign prop is a known kind with complete physics and a known picture.

Result today: missing asset 0, unknown id 0, duplicate id 0, missing footprint 0, missing collision 0, missing LOS 0.

## R3 — campaign build structure

| | |
|---|---|
| Changed | `tools/campaign/v13Build.ts`, `v13Casino.ts`, `v13Late.ts`; `v13Integrity.test.ts` |
| Added | `tools/campaign/v13Sources.ts` |

- `buildV13Campaign()` no longer builds the whole V12.5 campaign and replaces all 45 entries; it composes the 45
  missions directly. Output byte-identical.
- `v13Sources.ts` → `DERIVED_FROM` is now the wiring itself: the Casino and the three late chapters take their base
  plans from it and from nowhere else.

  | Chapter | Built from | Phase 7 layer | Mission order |
  |---|---|---|---|
  | 5 Casino | Bank, **after** Phase 7 | inherited | 03-01, 03-02, **03-04, 03-03**, 03-05 |
  | 6 Mansion | Gallery, **after** Phase 7 | inherited | 02-01 … 02-05 |
  | 7 Warehouse | Museum, **frozen** | own patches (`LATE`) | 01-01 … 01-05 |
  | 8 Security HQ | Lab, **frozen** | own patches (`LATE`) | 04-01 … 04-05 |

  Semantics, patch order and source order are unchanged; the same calls run in the same order.
- `CHAPTER_SOURCE` in `v13Build.ts` lists the nine chapters in bake order.
- 1 test: nine chapters in order; each derived mission is the mirror of the base plan the table names (exactly for
  Chapter 5 / 6, up to its own wall patches for 7 / 8); 5 / 6 take the plans with the Phase 7 layer, 7 / 8 the
  frozen ones.

## R4 — override index

| | |
|---|---|
| Changed | `tools/campaign/v13Phase7.ts` (exports; lane patches as data), `v13Late.ts` (`PINNED` exported), `v13Casino.ts` (`ROTATE`, `EXTRA_CAMERA` exported), `package.json`, `v13Integrity.test.ts` |
| Added | `tools/campaign/v13Overrides.ts` |

- `LANES` and `LATE` were functions (`m => anchor(wall(m,9,15),…)`); they are now ordered lists of four kinds of
  op (`wall`, `anchor`, `stop`, `add`) with the reason, run in the listed order. Same ops, same order, same
  coordinates; when and where they are applied did not move.
- `npm run campaign:overrides -- 04-05` prints everything that touches a mission in build order, read from the real
  tables, with file, table, stage and reason, including what a derived mission inherits:

  ```
  04-05   [1 plan] Control Fume Hood (24.4,3.4); Control Cable moved        v13Lab.ts · plan
          [2 phase7 lanes] floor cell (9,15) becomes wall                   v13Phase7.ts · LANES
          [2 phase7 lanes] route anchor (8.25,15) → (8.25,14.4)             v13Phase7.ts · LANES
          [4 phase7 cover] + Glass Lab Sample Fridge at (10,7.293)          v13Phase7.ts · PHASE7
  05-03 ← 03-04 (inherits Phase 7)
          [2 phase7 lanes] floor cell (16,4) becomes wall                   inherited from 03-04
          [5 derive] second camera, zone passage                            v13Casino.ts · EXTRA_CAMERA
  08-04 ← 04-04 (own patches)
          [1 plan] Passage Gas Rack                                         inherited from 04-04
          [6 pin] camera of zone storage held at (5.5,7.4)                  v13Late.ts · PINNED
          [7 late] + Passage Security Desk, + Intake Server Row             v13Phase7.ts · LATE
  ```

  29 of 45 missions carry a per-mission override. Edits made inside a plan file (three Lab islands, the Lab cable,
  the 09-05 blast screen) are listed by hand and checked against the plans by test.
- 1 test: every key of every table appears in the index and names a real mission; the Phase 7 layer only names
  Chapter 1–4 and the late layer only Chapter 7–8; stage order holds; 04-05 / 08-05 / 05-03 read as above.

Not done on purpose: the always-true `MANSION_ART` / `HQ_ART` sets and the refit tables were left alone, because
they feed `secure()`.

## R5 — no structural change

| | |
|---|---|
| Changed | `v13Integrity.test.ts` |
| Added | `tools/campaign/README.md`, `docs/design/v13/PHASE8_PROTECTED_HASHES.json` |

`v13Reuse.ts` (`mirrorX`, `refit`, `secure()`) is byte-identical to the last commit and is now hash-pinned: a test
fails if it changes. The README describes the commands, the build order and the rules that keep the output stable
(list order, the by-index guard constants from `SOURCE_STAGES.json`, the stage of each override table).
Nothing in the composer, the guard / CCTV placement or the stage compiler was edited.

## R6 — QA tooling

| | |
|---|---|
| Changed | `v13FullAudit.ts`, `v13Snapshot.ts`, `v13Audit.ts`, `v13PatrolProbe.ts`, `v13Corridor.ts`, `v13ArtOnlyDiff.ts`, `v13Density.ts` |
| Added | `tools/campaign/v13QaLib.ts` |

`v13QaLib.ts` holds what the tools repeated: loading the campaign, selecting missions by id or chapter prefix,
writing a report, canonical JSON and hashing, the 120 s patrol walk and the camera coverage measure. `v13Corridor.ts`
no longer reads `process.argv` when imported (it made the full audit crash on its own argument); the audit takes
its output file as an argument now.

The output of every V13 QA tool was captured before and after (15 outputs: corridor ×3, audit ×2, patrol probe,
full audit text + JSON, density, security dump, show, art-only diff, snapshot files, snapshot check, cover search):
all identical. Nothing under `src/` imports the library.

## Campaign count and save

`CHAPTER_COUNT` 9, `CHAPTER_MISSION_COUNTS` `[5,5,5,5,5,5,5,5,5]`, `MISSION_COUNT` 45 derived from it; the baked
file has 45 missions with ids in catalog order. The old `[10,10,10,5,…]` counts and the destination table exist
only in `src/game/progress/campaignProgress.ts` (save migration), which is unchanged and is one of the
hash-protected files. Both facts are now tests. Save and progression code was not touched; its tests
(`campaignMigration.test.ts`) pass inside the 1018.

## Simulator

Whole map (QA camera), `Reports/V13_PHASE8/sim/view-<id>.png`: 01-05, 02-05, 03-05, 04-05, 05-05, 06-05, 07-05,
08-05, 09-05 — all nine load and draw as before (walls, pieces, guards, cameras, prize, exit).

Normal zoom, `Reports/V13_PHASE8/sim/zoom-<id>.png`, with the live state read from the running app:

| Mission | Thief at spawn | Guards | Cameras | Phase |
|---|---|---|---|---|
| 03-04 | (2.2, 16.5) ✓ | 4 / 4 | 1 / 1 | STEALTH |
| 04-05 | (2.2, 11.5) ✓ | 4 / 4 | 1 / 1 | STEALTH |
| 07-02 | (12, 18.8) ✓ | 4 / 4 | 2 / 2 | STEALTH |
| 08-04 | (12, 2.2) ✓ | 4 / 4 | 3 / 3 | STEALTH |
| 09-05 | (14.5, 24.8) ✓ | 6 / 6 | 3 / 3 | STEALTH |

Loading only; no design judgement and no tuning. Metro is back on the normal camera. Tilt was not exercised.

## Performance

| Measure | Before | After |
|---|---|---|
| `npm run campaign:bake` (V13 bake + briefs) | 1.36 s | 0.87 – 1.00 s |
| Build 45 missions (`buildV13Campaign()`) | 0.33 s discarded base + ≈ 0.5 s | 0.49 s (10.8 ms per mission) |
| Snapshot of 45 missions | 0.17 s | 0.12 – 0.14 s |
| Full audit of 45 missions | not measured on an idle machine (54 s under load) | 6.4 s |
| Files on the bake chain | 27 | 20 |

## Tests outside `npm test` (list only, nothing changed)

| Class | File | State and reason |
|---|---|---|
| CURRENT | `src/ota/otaNotice.test.ts` | 4 / 4 pass |
| CURRENT | `src/game/security/__tests__/theftSearch.test.ts` | 3 / 3 pass |
| CURRENT | `src/game/security/__tests__/securityWorklet.test.cjs` | 3 / 3 pass |
| CURRENT | `test:stability` script (collision worklet, collision stability, wall slide, tap-to-move, interstitial, ads controller) | 37 / 37 pass |
| HISTORICAL | `tools/campaign/v5VisualHotfix.test.ts` | 4 / 4 pass (V5 generation) |
| HISTORICAL | `tools/campaign/bankProduction.test.ts` | 5 / 6 — expects the Bank to use exactly twenty assets |
| HISTORICAL | `tools/campaign/museumTargetedAudit.test.ts` | 2 / 3 — measures the old Museum 05 |
| HISTORICAL | `tools/campaign/securityCoreRoleFirst.test.ts` | 1 / 2 — old Security Core escape witness |
| HISTORICAL | `tools/environment/bankKit.test.ts` | 4 / 5 — fixed count of twenty Bank catalog paths |
| HISTORICAL | `tools/environment/labCasinoKit.test.ts` | 5 / 6 — fixed Lab 26 / Casino 26 category counts |
| OBSOLETE CANDIDATE | `src/game/guards/__tests__/galleryChaseSpeed.test.ts` | 3 / 4 — "Missing baked runtime stage 02-06" |
| OBSOLETE CANDIDATE | `tools/environment/chaptersFinalContracts.test.ts` | 1 / 3 — mission 02-10 no longer exists |
| OBSOLETE CANDIDATE | `tools/environment/galleryFinalRoleTiming.test.ts` | 1 / 4 — mission 02-10 no longer exists |
| OBSOLETE CANDIDATE | `tools/environment/bankPilot.test.ts` | 0 / 1 — pilot stage outside the campaign; fails after 58 s |
| HANGING | `tools/environment/labCasinoPilots.test.ts` | Not finished after 30 min. It runs `labCasinoPilotQA()` (full-AI replay witnesses against a 55-mission campaign contract) for each pilot at import time, before any test is registered. Cause not analysed further. |

The four CURRENT entries could join `npm test` as they are; not done here.

## Technical debt remaining

- **Historical campaign scripts** — 57 unreferenced files in `tools/campaign/`, plus the files reached only by tests
  (93, most of them designs and checks of older generations).
- **Old tests** — the table above.
- **Dead code candidates** — below.
- **Old mission branches in `src/`** (not touched: they sit in runtime-sensitive files and the DEV test maps are
  outside the snapshot): `compileStage.ts:150` (`02-06`), `compileStage.ts:202` and `playgroundState.ts:124` (`02-10`),
  `semanticPatrol.ts:33` (`01-01` fallback), `buildStageArt.ts:243, 252, 253, 337` (`02-02` without a topology plan),
  `VisualPlaygroundScreen.tsx:260` (`visualRevision === 'v12-4c'`), `environmentKit.ts:217–228`
  (`VAULT_REPLACEMENTS`, 0 uses in the campaign), `MUSEUM_REPLACEMENTS` (0 uses), `Chapter.names` / `namesKo` (unread).
- **Unused assets** — below.
- Also: `StageDefinition.ts` imports a type from `tools/campaign/v124bTypes`; `SOURCE_STAGES.json`, a build input,
  lives under `docs/`; QA-only fields (`topologyPlan`, `functionalZones`, `testRoutes`, `escapeRoutes`, about half of
  the 769 KB) ship in the campaign file; `MANSION_ART` / `HQ_ART` are always-true sets; lint covers `src/` only;
  the V13 plan files keep their dense one-line style.

## Delete candidates (nothing deleted)

Full list with references per file: `Reports/V13_PHASE8/dead-code-candidates.json`. References were searched in
imports and dynamic imports (`.ts .tsx .cjs .mjs .js`), shell and Python scripts, `package.json`, and docs.

**Code — `src/`** (0 importers): `game/audio/usePickupAudio.ts`, `game/audio/useWhistleAudio.ts`,
`rendering/environment/phase4cScale.ts`, `rendering/environment/phase4eStandards.ts`. The two audio hooks are
named in `docs/design/v12/phase3/PROTECTED_HASHES.json` and `docs/design/v11/RUNTIME_BASELINE.json`, which no
current test reads.

**Code — `tools/campaign/`**, 71 files reached by neither the app, the bake nor `npm test`:

| Class | Count | |
|---|---|---|
| KEEP | 14 | current V13 QA tools and `v13QaLib.ts` |
| ARCHIVE | 18 | named or imported by another archived tool (for example `renderMuseumQA.ts` ← `tools/environment/render*.ts`, `museumFinalPlayQA.ts` ← six QA scripts) |
| DELETE CANDIDATE | 39 | no import, dynamic import, script or `package.json` reference |

Of the candidates, these can still write the production campaign when asked to: `v5Bake.ts` and `furnishingBake.ts`
(`PROMOTE_RUNTIME=1`), `bankProductionBake.ts` (`--apply`); `v3Bake.ts` writes a `.v3.tmp` beside it.

**Assets** — 25 kit images no campaign prop resolves to and no code names (4.2 MB): gallery 2, bank 4, lab 3,
casino 10, warehouse 5, vault 1 (`Reports/V13_PHASE8/unused-asset-candidates.json`).

**Reports / temporary** — `Reports/` (2.9 GB, git-ignored).

**`_pretune/`** — 64 files, 20.3 MB. Source for `tools/environment/labTune.cjs`. Keep.

## Known existing issues (kept as they are)

- **05-02** — guard 4's patrol leg is tangent to the cashier cage's collision corner (3.3 px real clearance, no
  overlap, walked straight in the game). In the baseline; listed in the audit's `KNOWN`.
- **05-05** — camera 2 is mounted inside the planter's footprint (the planter blocks movement only; coverage 84 %).
  Visible in the whole-map capture as the camera drawn over the plant, lower left. In the baseline; listed in `KNOWN`.

## Files of this phase

Changed: `package.json`; `tools/campaign/` `v124bBuild.ts`, `v124cBuild.ts`, `v124dBuild.ts`, `v125Build.ts`,
`v13ArtOnlyDiff.ts`, `v13Audit.ts`, `v13Build.ts`, `v13Casino.ts`, `v13Corridor.ts`, `v13Density.ts`,
`v13FullAudit.ts`, `v13Late.ts`, `v13PatrolProbe.ts`, `v13Phase7.ts`, `v13Snapshot.ts`.

Added: `tools/campaign/` `v13Sources.ts`, `v13Overrides.ts`, `v13QaLib.ts`, `v13Integrity.test.ts`,
`tsconfig.v13.json`, `README.md`; `tools/environment/catalogKit.test.ts`;
`docs/design/v13/PHASE8_SNAPSHOT_HASHES.json`, `docs/design/v13/PHASE8_PROTECTED_HASHES.json`.

Generated and unchanged: `src/game/levels/stages/campaignStages.json`, `src/game/levels/missionBriefs.ts`.
