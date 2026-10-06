# V13 Phase 8 — full campaign audit and refactor plan (2026-10-06)

> Follow-up: the refactor steps proposed here were carried out in Phase 8B — see `V13_PHASE8B_REFACTOR_REPORT.md`.
> This report describes the state before them.

Not committed. **No refactor has been applied yet.** This report covers the freeze (8A), the full campaign audit
(§5) and the code-structure audit (§6–§7). The spec says to report before refactoring, and to stop and report if
the audit finds a problem. The audit found two, so the refactor steps wait for a decision.

Game code and the campaign file are untouched in this phase so far. Added: two read-only tools
(`tools/campaign/v13Snapshot.ts`, `tools/campaign/v13FullAudit.ts`) and this report.

## 1. Freeze (8A)

`node --import tsx tools/campaign/v13Snapshot.ts write Reports/V13_PHASE8/baseline`

Per mission, one canonical JSON (keys sorted) holding: the baked definition (layout, entry, objective, exit, doors,
props, guards, patrol routes, cameras, safe / risk / escape routes, security data), the **compiled runtime stage**
(wall rectangles, movement and vision blockers, compiled guards with route, waits and delays, compiled cameras,
doors, spawn, objective, exit rectangle), for every prop the picture the game resolves and its kit entry
(footprint, collision, LOS, draw width), and the mission metadata (brief, area name EN / KO, chapter name, theme).
SHA-256 per mission. Two writes compare `45 / 45 SAME`, so the output is deterministic.

Campaign file: sha1 `198827a66b66`. Baseline hashes (first 12 hex digits):

| | | | | |
|---|---|---|---|---|
| `01-01` 9bfada756e1c | `01-02` 03c83703e885 | `01-03` d7ad95eafa08 | `01-04` efbd6d80d304 | `01-05` 06b0830c5b74 |
| `02-01` 73eaac97e9f4 | `02-02` 1a543bbf7431 | `02-03` d0652549c61e | `02-04` 2ab11b409d6e | `02-05` 8a80c6038290 |
| `03-01` 1bc061e86262 | `03-02` 4cbc6754cda5 | `03-03` 849a19282513 | `03-04` 7d0bea720a30 | `03-05` 5e655cb7c759 |
| `04-01` b19e8d9e5a2b | `04-02` 875ad2192452 | `04-03` 5cda96c8377b | `04-04` 657d585f7784 | `04-05` 8cd1fc8b8fe3 |
| `05-01` b62a11897e50 | `05-02` 066111a76941 | `05-03` 30c748baf674 | `05-04` 1c9ca62cecc6 | `05-05` 98ae45a6370c |
| `06-01` 906c761f7a10 | `06-02` 0b77f3e8e980 | `06-03` b3073f8bec69 | `06-04` a4ece3f1e4bd | `06-05` bf90a884d4bb |
| `07-01` e2549f2ffae9 | `07-02` 60d7197a14ed | `07-03` 061ab4e13fb5 | `07-04` d79d12f35276 | `07-05` 7d63116091c3 |
| `08-01` 278a849e4f1b | `08-02` 6339a9240e35 | `08-03` f8f241e7c4d1 | `08-04` 9a399e91ff9c | `08-05` 6179f778d31e |
| `09-01` d28f236f785d | `09-02` 2a38ad4e37bb | `09-03` 04530851dda8 | `09-04` ed720931fa07 | `09-05` d31da8be6e6e |

`Reports/` is git-ignored, so the baseline files live only on this machine; the table above is the tracked copy.

Gate for every later step: `node --import tsx tools/campaign/v13Snapshot.ts compare Reports/V13_PHASE8/baseline <dir>`
(exit code 1 on any difference, prints the first differing path per mission).

## 2. Full campaign audit (§5)

`OUT=Reports/V13_PHASE8/full-audit.json node --import tsx tools/campaign/v13FullAudit.ts` (54 s)

| Check | Result |
|---|---|
| 45 / 45 missions generate; the bake reproduces the campaign file byte for byte | pass |
| Topology errors | 0 |
| Blocked gaps (authored route segment the thief's body cannot walk) | 0 |
| Narrow gaps (reachable only through a sub-tile squeeze) | 0 |
| Fake gaps (floor drawn open that can never be stood on) | 0 |
| Cover gap over 8 tiles | 0 (longest 7.9: 01-02, 09-05) |
| Guard patrol collision (120 s of the real patrol code, all guards) | **1** — 05-02 |
| Patrol waypoint inside a prop | 0 |
| CCTV inside a prop | **1** — 05-05 |
| CCTV front completely blocked | 0 (lowest coverage 63 %: 02-04, 09-02; shortest clear view ahead 2.0 of 5 tiles: 02-04, 04-01, 08-01) |
| Door obstruction | 0 |
| Entry clear | 45 / 45 |
| Objective reachable / exit reachable | 45 / 45 |

### Finding A — 05-02, guard 4 touches a collision corner

His leg (4.25, 15.75) → (2.75, 17.25) runs exactly through the corner of the cashier cage's collision box once
that box is widened by his body radius: the contact point is (3.94, 16.06), the cage corner is (3.74, 15.86). It is
a tangent, not an overlap. With his round body the real clearance to the corner is 3.3 px. The game's own check
calls the leg clear, so he walks it straight and never deflects; nothing is visible in play. Present since before
Phase 7B (the Bank source of this mission, 03-02, has a different patrol and does not show it).

Removing it means moving one patrol stop by about 0.05 tile. That is a guard patrol change, which Phase 8 forbids.

### Finding B — 05-05, camera 2 is mounted inside a planter's footprint

Camera at (1.5, 16.4); `casino_planter` at (1.35, 16.62), scale 0.77, footprint x 1.0–1.7, y 16.0–16.6. The
planter blocks movement only, not sight, so detection is unaffected (the camera sees 84 % of its floor, 5 of 5
tiles ahead). The effect is visual: the camera is drawn on top of the planter. The camera is one of the Casino
extra cameras (`EXTRA_CAMERA` in `v13Casino.ts`).

Removing it means moving the planter (the standing rule is that a camera is never moved to suit a prop). That is a
level art layout change, which Phase 8 forbids.

Neither finding is a hazard for a behaviour-preserving refactor: both are frozen into the baseline and would be
kept exactly. They are listed because the spec asks for zero.

## 3. Code structure

Files inspected: 188 in `src/`, 182 in `tools/campaign/`, 61 in `tools/environment/`, 12 in `tools/native/`, plus
`package.json`, both tsconfigs, `app.json`, `eas.json`. An import graph from three roots (the app, the bake, the
tests run by `npm test`) classifies `tools/campaign/`:

| Reached from | Files |
|---|---|
| The app (`App.tsx`) | 1 — `v124bTypes.ts` (a type) |
| The bake (`v13Build.ts`, `buildMissionBriefs.ts`) | 27 |
| Only the tests in `npm test` | 83 |
| Nothing | 70 (13 are the current V13 QA tools, 57 are older generations) |

### How a mission is built today

```
ASCII plan (v13Museum / v13Gallery / v13Bank / v13Lab / v13Vault)
  → phase7()                 LANES, PHASE7, REPLACED             (Ch1–4)
  → derived chapter          Ch5 = mirror(Bank) + SWAP + ROTATE + EXTRA_CAMERA
                             Ch6 = mirror(Gallery) + MANSION refit + mansionArt + secure()
                             Ch7 = mirror(Museum, frozen) + WAREHOUSE refit + secure() + phase7Late
                             Ch8 = mirror(Lab, frozen) + HQ refit + HQ_PICTURE + secure() + PINNED + phase7Late
  → composeV13()             v13Builder → composeV124bPlan (v124bBuilder) + straightLegs (v125Tuning)
                             guard and camera constants copied from docs/design/v12/phase4d/SOURCE_STAGES.json
  → campaignStages.json      then buildMissionBriefs.ts → missionBriefs.ts
```

### Duplication

1. **Inheritance boundary is not the same for every derived chapter.** Ch5 derives from `V13_BANK` and Ch6 from
   `V13_GALLERY` *after* the Phase 7 layer, so a lane patch on 03-04 or 02-04 silently reaches 05-04 / 06-04
   (this is how the "twins" moved in 7B). Ch7 and Ch8 derive from the *frozen* plans and carry their own `LATE`
   patches. Both are intended, but nothing in the code says which is which; it is the import that decides.
2. **`buildV13Campaign()` builds the whole V12.5 campaign first and throws it away.** All 45 ids are replaced by
   V13 missions. Composing the 45 missions directly gives a byte-identical campaign (measured). Cost of the
   discarded base: 0.33 s, plus it keeps `v125Build`, `v124dBuild` and their plan files on the live bake chain.
3. **Mission-specific changes live in six places:** `v13Phase7.ts` (`PHASE7`, `REPLACED`, `LANES`, `LATE`),
   `v13Late.ts` (`PINNED`), `v13Casino.ts` (`SWAP`, `ROTATE`, `EXTRA_CAMERA`), and edits made inside the plan files
   themselves (Phase 4 islands in `v13Lab.ts`, the 09-05 blast screen in `v13Vault.ts`).
4. **QA geometry is re-implemented per tool.** Camera cone sampling in 3 V13 tools, the 120 s patrol walk in 2
   (28 across all generations), prop footprint boxes in 4 (16), room lookup in 6 (23). Eleven V13 tools each read
   the campaign file their own way.
5. **Footprint, collision and LOS exist twice:** `propKit.ts` (`PROP_KIT`, what the game uses) and
   `environment-assets.json` (the catalog). 179 catalog entries carry both; today 0 differ, but nothing fails if
   one is edited alone.
6. **`campaignCatalog.ts` carries two sets of mission names.** `Chapter.names` / `namesKo` (for example
   'COLD ENTRY', 'OUTER SEAL') are read nowhere; the game shows `CHAPTER_AREAS` from `chapterArt.ts`.
7. `MANSION_ART` and `HQ_ART` are sets of all five missions, so the "is this mission restyled" branch is always
   true. `SIDE` (mirror table) is defined in both `v13Reuse.ts` and `v13Casino.ts`.

### Technical debt

| Item | Where | Note |
|---|---|---|
| **`npm run campaign:bake` runs `v124dBuild.ts`** | `package.json` | It writes the V12.4d campaign over `campaignStages.json`. The real bake is `v13Build.ts` + `buildMissionBriefs.ts`. `v125Build.ts` and `v124cBuild.ts` do the same when run; `v124bBuild.ts` writes with no guard at all. |
| V13 tools are type-checked by no script | `tsconfig.json` excludes `tools`; `typecheck:campaign` covers only `v124b*`–`v124d*` | Checked ad hoc with a temporary config: `v13*.ts` + `buildMissionBriefs.ts` → 0 errors. |
| Lint covers `src/` only | `expo lint` | — |
| `src/` imports a type from `tools/` | `StageDefinition.ts:152` → `tools/campaign/v124bTypes` | Dependency points the wrong way. |
| A live build input sits under `docs/` | `docs/design/v12/phase4d/SOURCE_STAGES.json` (1.09 MB) | Guard perception, pace and camera constants of all 45 missions come from it. |
| Hardcoded mission ids for missions that no longer exist | `compileStage.ts:150` (`02-06`), `:202` and `playgroundState.ts:124` (`02-10`) | Ch2 has five missions. |
| Branches that no campaign mission can reach | `semanticPatrol.ts:33` (`01-01` fallback; all 45 carry a `patrolPlan`), `buildStageArt.ts:243,252,253,337` (`!topologyPlan && 02-02`; all 45 carry a plan, dressing clusters 0), `VisualPlaygroundScreen.tsx:260` (`visualRevision === 'v12-4c'`, true for all 45) | Still reachable from the DEV test maps, see Risk. |
| `VAULT_REPLACEMENTS` and the `chapter === 9` branch | `environmentKit.ts:217–228` | 0 of the Ch9 props use it: every Ch9 prop names its picture. `MUSEUM_REPLACEMENTS` likewise 0 uses in the campaign. |
| Tools that act on import | `v13Corridor.ts`, `v13Audit.ts`, `v13Density.ts`, `v13CoverSearch.ts`, `v13Trace.ts`, `v13ArtOnlyDiff.ts` read `process.argv` at module top | Importing `corridorAudit` made `v13FullAudit.ts` crash on its own argument. |
| Repeated magic values | body radius 8 / 9 px written as `8`, `.2`, `.3*TILE`; cover reach `2`; patrol frames `7200`; gap limit `8` | In QA tools only; the game reads `BODY` from `guardTuning.ts`. |
| Test files outside `npm test` | 14, plus the `test:stability` script | 4 pass (`otaNotice`, `theftSearch`, `securityWorklet`, `v5VisualHotfix`); 9 have failing cases against the current campaign (`galleryChaseSpeed`, `bankProduction`, `museumTargetedAudit`, `securityCoreRoleFirst`, `bankKit`, `bankPilot`, `chaptersFinalContracts`, `galleryFinalRoleTiming`, `labCasinoKit`); `labCasinoPilots.test.ts` does not finish (stopped after 30 min). `test:stability` (37 tests: collision, wall slide, tap-to-move, ads) passes but is not part of `npm test`. |
| QA-only data ships in the app bundle | `campaignStages.json` | 769 KB minified; `topologyPlan` 280 KB, `functionalZones` 65 KB, `testRoutes` 30 KB, `escapeRoutes` 29 KB are read by no runtime code (`topologyPlan` only for "is it there"). |
| Dense one-line code style in `tools/campaign/v13*.ts` | — | Hard to diff; reformatting is cheap and snapshot-safe but makes a very large diff. |

QA camera (§17): `EXPO_PUBLIC_DM_QA_VIEW_TILES` is read in one place, `VisualPlaygroundScreen.tsx:253`, behind
`__DEV__`. The other switches (`DM_QA_VIRTUAL_TILT`, `DM_FORCE_TOUCH`, `DM_TILT_COMPARE`, `OPENING_ART_TEST`) are
each read once behind `__DEV__`; `DM_QA_LOG` sits inside `NativeQAObserver`, which is mounted only under `__DEV__`.
Six switches in four files, no release-build effect. Nothing to fix; optionally one `qaSwitches.ts`.

Routes (§15): the campaign's `testRoutes` / `escapeRoutes` are read by tools and tests only. No QA route changes
gameplay.

OTA / campaign count (§30–§31, read only): mission count has one source, `CHAPTER_MISSION_COUNTS = [5×9]` →
`MISSION_COUNT` 45; the baked ids match the catalog order; 0 duplicate ids. The old counts `[10,10,10,5,…]` exist
only inside the save migration. `runtimeVersion` policy is `appVersion` (1.0.0) and the campaign is part of the JS
bundle, so a build that showed ten Museum missions was running an older bundle, not this source. No setting was
changed.

Asset validation (§13): catalog 180 = kit 180 = files 180; duplicate id 0; unknown prop kind 0; unknown asset id 0;
missing footprint / collision / LOS metadata 0. There is no hardcoded asset count in the tests.

### Risk — where a refactor could change the game

1. **`secure()` (`v13Reuse.ts`).** It *generates* the Ch6–8 guards and cameras from the furniture it finds. Any
   change to structure order, a footprint or a refit table can re-seat a camera or a stop (this happened in
   Phase 4 and is why `PINNED` exists). Highest risk; best left alone.
2. **Order of the layers.** `phase7` runs before mirroring for Ch5 / Ch6 and `phase7Late` after `secure()` for
   Ch7 / Ch8. Merging the override tables into one must keep each entry at its current stage.
3. **`composeV13` reads guard and camera constants by index** from `SOURCE_STAGES.json`
   (`s.guards[Math.min(i, s.guards.length-1)]`). Reordering guards in a plan changes which constants each one gets.
4. **Position-keyed picture choices.** `ROTATE` and the Mansion / Warehouse slot cycling pick art by index within
   the structure list; `VAULT_REPLACEMENTS` picks by position. Reordering structures changes pictures.
5. **The `src/` dead branches are shared with collision code.** `compileStage.ts` is the collision compiler; the
   DEV test maps (`tiltTestMaps`, `visualPlayground`, `stealthPolish`) and `npm test` still run through the
   `chapter === 1` and id branches. The 45 snapshots do not cover those maps.
6. **Save migration** (`campaignProgress.ts`: `OLD_COUNTS`, `EARLY_DESTINATIONS`). Looks like dead history, is
   live behaviour for old saves. Not to be touched.

## 4. Proposed refactor steps

Each step: change → `v13Snapshot compare` 45 / 45 SAME → `npm test` → tsc → lint → diff review.

| Step | Change | Risk | Evidence so far |
|---|---|---|---|
| R1 Validation / snapshot | Done: `v13Snapshot.ts`, `v13FullAudit.ts`. Proposed: point `campaign:bake` at the V13 bake; add `campaign:snapshot`, `campaign:audit`; extend `typecheck:campaign` to `v13*.ts`; add tests — bake reproduces the file, 45 ids unique and in catalog order, catalog footprint = `PROP_KIT`, camera not inside a wall, route anchors on walkable floor | none (tools, scripts, tests) | V13 tools already type-check clean |
| R2 Environment metadata | Add the catalog ↔ `PROP_KIT` equality test (above). Remove `VAULT_REPLACEMENTS` only with approval, since it lives in `src/` | low | 0 campaign uses; snapshot records every resolved picture |
| R3 Shared structures | `buildV13Campaign()` composes the 45 missions directly; name the four inheritance sources in one place (`Ch5 ← Bank after Phase 7`, `Ch6 ← Gallery after Phase 7`, `Ch7 ← Museum frozen`, `Ch8 ← Lab frozen`) | low | direct compose is byte-identical to the campaign file |
| R4 Mission overrides | One index, `missionOverrides`, that lists per mission every table that touches it and at which stage, without moving the entries to a different stage; drop the always-true `MANSION_ART` / `HQ_ART` sets; one `SIDE` | low–medium | — |
| R5 Guard / CCTV data | No structural change proposed. Only: move `SOURCE_STAGES.json` next to the tools and document the by-index rule | medium if more is attempted | — |
| R6 QA tooling | One shared geometry module for the V13 tools; move argv handling inside the main guard; sort the 70 unreferenced files into KEEP / ARCHIVE / DELETE CANDIDATE (list only) | none for the game | — |

Deliberately not proposed: stripping QA data from the shipped campaign file (changes what the tests read), touching
the `src/` dead branches or the unreachable `src/` files without approval, reformatting the plan files, anything in
`secure()`.

## 5. Candidate lists (nothing deleted)

**Code — `src/`, reachable from nothing:** `game/audio/usePickupAudio.ts`, `game/audio/useWhistleAudio.ts`,
`rendering/environment/phase4cScale.ts`, `rendering/environment/phase4eStandards.ts` (0 importers anywhere).
Reached only by tests or tools: `whistleAudio.ts`, `rightWalkTrial.ts`, `stages/guardDeployment.ts`,
`stages/stealthPolish.ts`, `stages/tiltTestMaps.ts`, `stages/visualPlayground.ts`, `playground/alertReplay.ts`,
`ui/branding/brandAudioSession.ts`. Unused fields: `Chapter.names`, `Chapter.namesKo`.

**Code — `tools/campaign/`, 70 unreferenced files:**
- KEEP (current V13 QA, 13): `v13ArtOnlyDiff`, `v13AssetSheet`, `v13Audit`, `v13Corridor`, `v13CoverSearch`,
  `v13Density`, `v13FullAudit`, `v13PatrolProbe`, `v13Report`, `v13SecurityDump`, `v13Show`, `v13Snapshot`, `v13Trace`.
- ARCHIVE (older generations, 57): the `v3*`, `v5*`, `v10*`, `v101*`, `v124b/c*`, `v125*Search`, `v12Phase5Audit`,
  `museum*`, `bank*`, `security*`, `render*` scripts and `applyV9CoreMaps`, `mapAudit`, `printCampaign`, …
- Of those, **can overwrite the campaign file when run:** `v124bBuild.ts` (always), `v124cBuild.ts`, and on the
  bake chain `v124dBuild.ts` (the current `campaign:bake`), `v125Build.ts`; with a flag `v5Bake.ts`,
  `furnishingBake.ts` (`PROMOTE_RUNTIME=1`), `bankProductionBake.ts` (`--apply`).
- The 83 files reached only by tests are old-generation designs kept alive by the tests that check them. Whether
  those tests still earn their place is a separate decision; they are part of the 1007.

**Assets — 25 kit images that no campaign prop resolves to and no other code names** (4.2 MB):
gallery 2, bank 4, lab 3, casino 10, warehouse 5, vault 1. List: `Reports/V13_PHASE8/unused-asset-candidates.json`.
A further 17 are not on a prop but are named in code or data (doors, wall art, dressing) and are in use.

**`_pretune/`** — 64 files, 20.3 MB: bank 15 (3.5 MB), gallery 3 (0.8 MB), casino 20 (5.9 MB), lab 18 (8.5 MB),
museum 8 (1.6 MB). They are the untuned originals that `tools/environment/labTune.cjs` reads to re-derive the
tuned pictures; that is their only reference. They are source material, not runtime: keep unless the tuning is
declared final.

**Reports / temporary** — `Reports/` is 2.9 GB in 92 folders, git-ignored.

## 6. Performance baseline

| Measure | Before |
|---|---|
| `compileStage`, all 45 | 1.8 ms total (median 0.04 ms, max 0.19 ms) |
| `buildNavigation`, all 45 | 18.3 ms total (median 0.36 ms, max 0.85 ms) |
| Compose 45 missions, incl. module load | 0.64 s |
| Discarded V12.5 base inside `buildV13Campaign()` | 0.33 s |
| Snapshot of 45 missions | 0.17 s |
| Full audit of 45 missions | 54 s |
| `campaignStages.json` | 1.65 MB on disk, 769 KB minified |

## 7. State

- `npm test` 1007 / 1007, `tsc --noEmit` pass, lint 0 errors (1 existing warning, `src/ota/applyUpdate.ts`).
- Campaign unchanged: current snapshots compare `45 / 45 SAME` against the baseline.
- Not done, because no refactor has been applied: the Simulator whole-map check of 01-05 … 09-05, the normal-zoom
  loading check of 03-04, 04-05, 07-02, 08-04, 09-05, the final before / after hash table, the verdict.
