# V12 Phase 4E — superseded progress note

Status: **SUPERSEDED** by `V12_PHASE4E_ASSET_PERSPECTIVE_REPORT.md`.

## Preserved baseline

- Started from the uncommitted V12 Phase 4D worktree at 2026-10-04 14:39 KST.
- `campaignStages.json` SHA256 stayed `1ec4467b829176db71e3db3048a9817b21abbcbb3251a9a259d767aeb022f1205`.
- `tilt.ts` SHA256 stayed `75a322fa12b747fd6196751153f8d67e208d0d25baaacd1beeda0eb66f71435e`.
- No `legacy-unity/` change. No topology, Entry/Exit/Objective, Guard/CCTV,
  difficulty, player speed, chase, lockdown or save migration edit.

## Implemented assets

Three Lab runtime cutouts were perspective-normalized and kept as transparent
RGBA sprites. Their bottom-center pivot, measured object bounds and rendered
aspect were synchronized in the registry and per-asset metadata.

| Asset | Resolution | Object bounds | Used by |
|---|---:|---:|---|
| `lab_equipment_rack` | 512×512 | 141,37,230,437 | 04-01, 04-02, 04-04, 04-05 |
| `lab_sample_storage` | 512×512 | 129,47,256,431 | 04-01, 04-03, 04-04, 04-05 |
| `lab_cart` | 384×384 | 53,34,287,329 | 04-01, 04-03, 04-04 |

Rejected candidates: `lab_workstation` and `lab_large_table` were not integrated
because their generated revisions retained visible outer glow. The current
production assets remain in place rather than accepting a lower-quality cutout.

## Scale and validation

- Added player-relative SMALL / MEDIUM / LARGE / ARCHITECTURAL / LANDMARK
  review bands in `phase4eStandards.ts`; these are not global multipliers.
- Added pixel gates for invalid RGBA buffers, fully transparent assets, missing
  transparency, canvas-edge clipping and contaminated corners.
- Existing metadata validation continues to reject invalid pivots, overflowing
  object bounds, zero draw dimensions and invalid collision footprints.

## Actual DeviceHub evidence

- Device: iPhone 17 Pro Simulator, iOS 27.0, Device Hub.
- Fresh Phase 4E before captures: 2 (`04-05`, `05-05`).
- Fresh Phase 4E after captures: 1 (`04-05`).
- `04-05` was opened in the real app, paused through LIVE VISUAL QA and captured
  at Overview before and after. The corrected rack/storage render in runtime.
- Current `04-05` result: **MINOR**. Corrected tall equipment is upright and
  grounded; other Lab source assets still require the complete 25-mission pass.
- Existing Phase 4D 100 captures remain historical baseline evidence and are not
  counted as new Phase 4E captures.

## Remaining gates

- Fresh matching before/after DeviceHub captures for all 25 missions.
- Full Lab source perspective pass, Casino role-specific scale pass and chapter
  comparison board.
- TypeScript: PASS. Expo lint: PASS. Full `npm test`: PASS (existing physical
  iPhone Tilt acceptance remains pending as before).
- Environment Phase 4E contract: 11/11 PASS.
- Phase 4D topology/scope/Guard/CCTV protection batch: 111/112 PASS. The one
  failure is a pre-existing stale catalog-total assertion (`92` expected while
  the current manifest already contains `102`); the 52 Lab/Casino asset,
  topology, Ch6–9 byte equality and protected-system assertions passed.
- Mission totals are not issued from one reviewed mission. No Phase 4E finalized
  or Production Ready declaration is permitted from this partial pass.
