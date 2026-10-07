# Campaign build (V13)

The game ships `src/game/levels/stages/campaignStages.json` (9 chapters × 5 missions = 45) and
`src/game/levels/missionBriefs.ts`. Both are generated. Edit the plans, never the output.

## Commands

| Command | What it does |
|---|---|
| `npm run campaign:bake` | Composes the 45 missions (`v13Build.ts`) and regenerates the briefs (`buildMissionBriefs.ts`). |
| `npm run campaign:snapshot` | Compares the runtime snapshot of every mission with the frozen hashes in `docs/design/v13/PHASE8_SNAPSHOT_HASHES.json`. `45 / 45 SAME` means the game is unchanged. |
| `npm run campaign:audit` | Whole-campaign checks (`v13FullAudit.ts`, about a minute): topology, gaps, cover gap over 8 tiles, patrol collision, cameras, doors, entry / prize / exit. Exit code 1 on anything outside its `KNOWN` list. |
| `npm run campaign:overrides -- 04-05` | Everything that changes one mission after its plan is drawn, in build order, with file and table. |
| `npm run typecheck:campaign` | Type-checks `v13*.ts` and `buildMissionBriefs.ts` (also part of `npm run typecheck`). |

For a full dump to diff: `node --import tsx tools/campaign/v13Snapshot.ts write <dir>`, then
`… compare <dirA> <dirB>` prints the first differing path per mission.

## How a mission is built

```
plan (v13Museum / v13Gallery / v13Bank / v13Lab / v13Vault)       Chapter 1–4, 9: plans of their own
  → phase7()            v13Phase7.ts: LANES → REPLACED → PHASE7   Chapter 1–4
  → derived chapter     base plans chosen in v13Sources.ts
        Chapter 5 ← Bank, Chapter 6 ← Gallery     AFTER phase7(): a fix on 03-0x / 02-0x reaches its twin
        Chapter 7 ← Museum, Chapter 8 ← Lab       FROZEN plans, before phase7(); own patches in LATE
        v13Casino.ts   mirror, SWAP, ROTATE, EXTRA_CAMERA, MOVED, PATROL
        v13Late.ts     mirror, refit, secure(), PINNED, then phase7Late() (LATE)
  → composeV13()        v13Builder.ts
  → campaignStages.json
```

`CHAPTER_SOURCE` in `v13Build.ts` lists the nine chapters in bake order; `DERIVED_FROM` in `v13Sources.ts` is the
only place that decides which plans a derived chapter is built from.

## Rules that keep the output stable

- **`secure()` (`v13Reuse.ts`) is frozen.** It places the Chapter 6–8 guards and cameras from the furniture it finds,
  so their positions depend on the order of the structure list, on footprints and on the refit tables. Do not
  reorder structures, change how it picks a spot, or tidy it. The file is hash-pinned
  (`docs/design/v13/PHASE8_PROTECTED_HASHES.json`, checked by `v13Integrity.test.ts`).
- **Order matters everywhere a list is walked.** `ROTATE` and the Mansion / Warehouse slot cycling pick art by a
  piece's position in the structure list; `composeV13` gives guard `i` the constants of guard `i` in
  `docs/design/v12/phase4d/SOURCE_STAGES.json`. Adding a piece at the end of a list is safe; inserting or
  reordering is a map change.
- **Each override table runs at a fixed stage** (see `v13Overrides.ts`). Moving an entry to another table moves it to
  another stage, and for Chapter 5 / 6 changes whether the twin inherits it.
- The builders named `v124b` – `v125` are historical. They never write the production campaign; set
  `QA_CANDIDATE=<file>` to see their output.

## After an intended map change

`npm run campaign:bake`, `npm run campaign:snapshot` (read the DIFF list: it should name the missions you meant
to change and no others), `npm run campaign:audit`, `npm test`, then refresh
`docs/design/v13/PHASE8_SNAPSHOT_HASHES.json` from a `v13Snapshot.ts write`.
