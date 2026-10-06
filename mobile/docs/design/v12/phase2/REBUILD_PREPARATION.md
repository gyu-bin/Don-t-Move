# V12 Phase 2 — Chapter 1–3 rebuild preparation

**Preparation only. B is selected after brief physical comparison and an observed 01-01 objective-to-clear run. Current campaign remains 60 missions; no map rebuild has been applied.**

## Proposed 15 destinations

| New ID | Title | Existing sources | Tier |
|---|---|---|---|
| 01-01 | Entrance Hall | 01-01 | Tier 1 — VERY EASY / EASY |
| 01-02 | Rotunda Collection | 01-02, 01-07 | Tier 1 — VERY EASY / EASY |
| 01-03 | Archive & Conservation | 01-03, 01-06 | Tier 1 — VERY EASY / EASY |
| 01-04 | Restricted Wing | 01-04 | Tier 1 — VERY EASY / EASY |
| 01-05 | Grand Museum Heist | 01-05, 01-09, 01-10 | Tier 1 — VERY EASY / EASY |
| 02-01 | Sculpture Court | 02-01, 02-03 | Tier 2 — EASY+ |
| 02-02 | Portrait Hall | 02-02 | Tier 2 — EASY+ |
| 02-03 | Modern Wing | 02-04, 02-07 | Tier 2 — EASY+ |
| 02-04 | Glass Gallery | 02-06 | Tier 2 — EASY+ |
| 02-05 | Masterpiece Chamber | 02-08, 02-10 | Tier 2 — EASY+ |
| 03-01 | Teller Access | 03-01, 03-02 | Tier 3 — MEDIUM |
| 03-02 | Staff Records | 03-03, 03-04 | Tier 3 — MEDIUM |
| 03-03 | Deposit Boxes | 03-05 | Tier 3 — MEDIUM |
| 03-04 | Checkpoint Command | 03-06, 03-08 | Tier 3 — MEDIUM |
| 03-05 | Main Vault | 03-07, 03-09, 03-10 | Tier 3 — MEDIUM |

## Progress migration contract (implementation pending)

Current campaign progress version 4 validates records against the current catalog and stores highestUnlocked as a flat index. Do not change the mission counts before introducing migration. The proposed version 5 must recognize the old 60-map catalog explicitly, migrate before normalization, then save once atomically through the existing storage path. Repeated migration must be idempotent.

1. Preserve the complete original v4 campaign in a versioned legacy archive. Preserve unrelated settings, monetization and purchase fields untouched.
2. Convert lastMission using PROGRESS_MIGRATION_PLAN.json. Removed01-08 redirects to new01-04; removed02-05 to new02-02; removed02-09 to new02-05. These are progress redirects, not reinstating removed map content. Keep original completion records archived.
3. Convert highestUnlocked by enumerating the entire formerly unlocked prefix with the OLD counts and taking the maximum NEW destination index. Never interpret a v4 flat index using new counts. All previously reached chapters remain reachable.
4. Transfer completion entitlement to mapped destinations: if any mapped source was cleared, preserve its completion as legacy. Do not carry old bestTime/alerts into a rebuilt-map competitive record; retain them in archive with sourceID. New clears replace the legacy comparable result using the existing legacy semantics.
5. Validate Continue against new catalog and unlocks; malformed or unknown old IDs fall back to the highest valid unlocked mapped destination, retaining the corrupt original in archive for recovery. Do not silently delete a valid06–10 record.
6. A fresh save starts01-01 with no migrated completion. An already-v5 save must not apply v4 remapping again. Older versions1–3 need their existing historical expansions interpreted under the OLD v4 catalog before the v4→v5 step.

### Required migration fixtures after implementation

| Old v4 state | Required V12 outcome |
|---|---|
| last01-08, highestUnlocked7 | Continue01-04; oldrecord archived; unlocked at least mapped prefix, no reset |
| last01-10, highestUnlocked9 | Continue01-05; mapped Museum entitlement preserved |
| last02-01, highestUnlocked10 | Continue02-01; new index5, not03-01 |
| last02-06, highestUnlocked15 | Continue02-04; mapped earlier Gallery destinations remain unlocked |
| last03-10, highestUnlocked29, clear03-10 | Continue03-05; legacycompletion; oldbenchmark retained in archive |
| last04-01, highestUnlocked30 | Continue04-01; new index15; Lab unlock preserved |
| last09-05, highestUnlocked59 | Continue09-05; new index44 |
| repeated migration/newv5 | Byte-stable entitlements; no duplicate archive/remapping |

## Rebuild gates

After profile selection and a real Museum Full-Heist on that profile: rebuild the15 destinations from the approved blueprint. Do not concatenate every merged source room or guard. Preserve useful fantasy; author clean readable routes, objective refuge and first opaque LOS break.

Museum: separate objective coverage in time/space; no exitguardcluster orGuard+CCTVtriple overlap. Gallery: open-crossing timing and glass/partition choices withinEASY+. Bank: PUBLIC→STAFF→SECURITY→VAULT securitydepth with old03-10manageable benchmark. Mission5combines mechanics without a pressure spike.

Keep confirmedTheft28s, search/spottedtimercontinuity, hiddenLKP, V9CCTVtiming, sharedchasespeed, playermaxspeed, wallslide, navigation/loading, audio, Ads/IAP. Chapter4–9runtime unchanged in this phase.

After baking: migratecatalog/localization/briefs/QAselectIDs together, typecheck/lint and run campaign/collision/wallslide/CCTV/theft/search/timer tests. Verify actual renderer and representative physicalFull-Heists: two perCh1–3, six total. No productionready claim from simulator.

## Current gate status

- Actual A/B/C comparison: brief physical trials observed; all acceptable per user. Long fatigue/drift validation remains pending.
- Finalprofile: B — 1.75° / 10° / 0.07s; default applied
- SelectedprofileMuseumFull-Heist: B 01-01 pickup → CLEAR observed; no theft-alert coverage inferred
- Runtime15maprebuild: NOT STARTED
- Savemigrationcode: NOT IMPLEMENTED; design and fixture expectations ready
- Preparation gate: READY for the following rebuild phase; this phase did not change maps or saves
