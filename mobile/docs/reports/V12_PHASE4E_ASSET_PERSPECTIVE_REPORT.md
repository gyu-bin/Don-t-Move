# V12 Phase 4E — Ch1–5 Asset Perspective / Scale / Grounding

Status: **VISUAL QA COMPLETE — PASS 23 / MINOR 2 / MAJOR 0**  
Scope: visual perspective, player-relative scale, grounding, pivots, door readability and environment metadata only.  
Excluded: gameplay/difficulty, physical-iPhone Tilt and Full-Heist acceptance.

## 1–3. DEVICEHUB

- Device Hub: **iPhone 17 Pro Simulator / iOS 27.0**.
- Missions opened in the real DON’T MOVE runtime: **25 / 25** (`01-01`–`05-05`).
- Persisted Phase 4E evidence: **2 fresh before + 75 fresh after** screenshots.
  Every mission has Entry / Objective / Overview after views under
  `Reports/V12Phase4E/after/<mission>/`.
- After the final two Lab source replacements, `04-01`–`04-05` were reopened
  and Entry / Objective / Overview were inspected again: **15 additional live
  Device Hub frames**. The Device Hub API exposed these frames for inspection
  but did not expose a writable export path, so they are not counted as saved
  files.
- Exact prior-state baseline: Phase 4D's **100 historical Device Hub captures**.
  They are not counted as new Phase 4E screenshots.

## 4–7. PERSPECTIVE

Five Lab runtime cutouts were replaced with upright top-down 3/4 sources:

1. `lab_equipment_rack`
2. `lab_sample_storage`
3. `lab_cart`
4. `lab_workstation`
5. `lab_large_table`

All five keep moderate top-face visibility, stronger vertical faces, clean RGBA
transparency and a shared bottom ground line. The workstation/table candidates
with residual halo were rejected; only the cleaned source cutouts were packaged.
No runtime rotate, skew or transform correction was added.

- Lab modified assets: **5**.
- Casino modified assets: **0**; existing Phase 4D role-specific scale was
  rechecked in actual runtime.
- Museum/Gallery/Bank modified assets: **0**; their current runtime sources
  passed the Phase 4E perspective/grounding gate.

## 8–11. SCALE

Review bands are declared in `src/rendering/environment/phase4eStandards.ts`:

| Category | Player-relative review width |
|---|---:|
| SMALL | 24–52 px |
| MEDIUM | 58–112 px |
| LARGE | 112–208 px |
| ARCHITECTURAL | 152–320 px |
| LANDMARK | 196–420 px |

- Global multipliers: **none**.
- Enlarged in Phase 4E: **none**; Casino's Phase 4D per-role scales remain.
- Perspective aspect reduced, without changing authored world width or collision:
  rack `3.512→3.420`, storage `3.453→3.367`, cart `1.087→1.032`,
  workstation `1.440→1.083`, large table `1.604→1.412` draw-height tiles.
- Player comparison: Casino large fixtures remain wider than two Players.
  `05-02` high-roller table renders at 132 px with a 128×76 px footprint;
  `05-04` roulette centerpiece renders at 122.4 px with a 118.8×75.6 px
  footprint. Visual and collision scales are equal.

## 12–15. GROUNDING

- Runtime registry ground pivot: bottom-center `{x: 0.5, y: 1}`.
- Five changed Lab assets received measured alpha bounds and synchronized
  draw aspect/pivot metadata.
- **67** stale Bank/Lab/Casino metadata records were reconciled to the already
  authoritative runtime pivot/bounds; **4** atlas-reuse Museum records received
  missing per-asset metadata. Total metadata files updated/created: **71**.
- Final Lab actual-runtime review: **Floating 0, wall penetration 0**.
- Decorative assets remain non-colliding; collision-bearing world width and
  footprint were not changed.

## 16–21. DOORS

No door gameplay or closure code changed. Actual chapter screens and the current
33-style render contract retain these silhouette families:

- Museum: classical wood/bronze frame and restricted variant.
- Gallery: minimal thin-metal / glass frame.
- Bank: heavy metal / reader / security portal / vault hierarchy.
- Lab: automatic tech/glass sliding frame and restricted indicator.
- Casino: luxury gold, VIP and secure frame.

Door regression: **21 / 21 PASS**. The difference is not color-only: frame
thickness, panel split and leaf proportions vary by family.

## 22–24. MISSION QA

| Mission | Result | Phase 4E note |
|---|---|---|
| 01-01 | PASS | museum fixtures upright and grounded |
| 01-02 | PASS | statue/column scale reads as structure |
| 01-03 | PASS | desk/display perspective consistent |
| 01-04 | PASS | cases retain grounded architectural weight |
| 01-05 | PASS | finale hierarchy clear |
| 02-01 | PASS | wall/bench/sculpture consistent |
| 02-02 | PASS | installation scale clear |
| 02-03 | PASS | glass remains architectural and grounded |
| 02-04 | PASS | sculpture does not float or lean |
| 02-05 | PASS | minimal Gallery door remains chapter-specific |
| 03-01 | PASS | teller/security/vault weight ordered |
| 03-02 | PASS | deposit wall reads wall-mounted |
| 03-03 | PASS | safes/process equipment grounded |
| 03-04 | PASS | counter/processing scale appropriate |
| 03-05 | PASS | vault remains landmark hierarchy |
| 04-01 | PASS | final five-asset Lab set rechecked live |
| 04-02 | PASS | final workstation/table rechecked live |
| 04-03 | PASS | final workstation/table rechecked live |
| 04-04 | PASS | final rack/storage/table rechecked live |
| 04-05 | PASS | final landmark cluster rechecked live |
| 05-01 | PASS | slot bank/cage read as major structures |
| 05-02 | MINOR | high-roller table is collision-large but still visually light |
| 05-03 | PASS | bar island divides the room |
| 05-04 | MINOR | roulette is large enough to detour but remains close to wall |
| 05-05 | PASS | slot bank/table/vault hierarchy clear |

Totals: **PASS 23 / MINOR 2 / MAJOR 0**.

This is a Phase 4E-specific reclassification, not a claim that all 19 Phase 4D
MINOR notes were directly edited away. Phase 4D also recorded broader layout,
route-readability and room-composition observations outside this visual-only
phase. The direct art fixes are the five Lab source cutouts listed above; the
remaining result changes come from applying the narrower perspective, scale,
grounding and door gate to the new 25-mission runtime evidence.

The two Casino MINORs were not enlarged blindly. Their visual/collision scales
already match, and increasing either footprint would consume the locked 20 px
route envelope verified by topology tests. Resolving them further requires a
separately authorized fixture reposition/topology pass.

## 25–31. CHAPTER COMPARISON

Stored boards:

- `Reports/V12Phase4E/comparison/all-25-overview.png`
- `Reports/V12Phase4E/comparison/representative-01-05-to-05-05.png`
- `Reports/V12Phase4E/comparison/ch01-objective.png` … `ch05-objective.png`

Museum, Gallery, Bank, Lab and Casino remain identifiable with titles hidden.
The camera language is consistent across chapters. The stored board reflects
the first 75-shot Phase 4E pass; final Lab source replacements were separately
rechecked in 15 live Device Hub frames as documented above. Those 15 frames are
not included in the persisted screenshot count and are not double-counted as
new files. The supported Device Hub control exposed them as inspection image
bytes but did not provide a writable screenshot export path; therefore the
stored Ch4 board is explicitly **pre-final-two-Lab-assets** evidence.

## 32–37. REGRESSION

- TypeScript: **PASS**.
- Expo lint: **PASS**.
- Full `npm test`: **PASS**; campaign suite **588 / 588**, environment
  **11 / 11**, doors **21 / 21**.
- Collision / fake-gap / topology / Ch6–9 scope: **PASS** through the full suite.
- Phase 4E environment validation: **102 assets / 0 failures**.
  It checks invalid pivot, bounds overflow, missing/invalid transparency,
  edge/corner contamination, zero draw dimensions, invalid collision footprint,
  measured object-bounds mismatch and registry/per-asset metadata mismatch.

Protected hashes remain unchanged:

- `campaignStages.json`:
  `1ec4467b829176db2f9e25c5b18d9d18c643ba3399e6f02250167ac2fc4e1937`
- `tilt.ts`:
  `75a322fa12b747fd6196751153f8d67e208d0d25baaacd1beeda0eb66f71435e`

`legacy-unity/` has no change. Ch6–9, Entry/Exit/Objective, Guard/CCTV,
difficulty, Tilt, player speed, chase, lockdown and save migration were not
edited in Phase 4E.

## Declaration

**V12 PHASE 4E — CH1–5 ASSET PERSPECTIVE & SCALE FINALIZED WITH 2 BOUNDED CASINO MINORS**

This is not a Production Ready declaration. Physical-iPhone Tilt and Full-Heist
acceptance remain separate required gates.
