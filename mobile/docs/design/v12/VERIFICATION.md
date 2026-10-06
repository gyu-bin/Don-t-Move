# V12 Phase 1 — Verification

Date: 2026-10-03 (Asia/Seoul).

## Document/accounting checks — PASS

- Runtime inventory: 60 missions, counts 10/10/10/5/5/5/5/5/5.
- Audit: exactly 60 unique source IDs, every current mission accounted for once.
- Dispositions: KEEP 4 / MERGE 16 / REBUILD 37 / REMOVE 3.
- Blueprint: exactly 45 unique destination IDs, exactly 5 per chapter, IDs 01-01…09-05.
- Every plan has title, fantasy, architecture, main/safe/risk routes, objective, exit, security identity, difficulty tier and valid source references.
- All destinations in audit mappings exist in the blueprint. All source references exist in the current campaign.
- Each chapter's five plans have one shared tier, including finale. This checks the design contract, not actual equal human difficulty.
- Consolidated machine-readable proposal: `CAMPAIGN_BLUEPRINT.json`. It is a design artifact, not imported by the app.

## Runtime preservation — PASS for checked sources

Compared SHA-256 against `SOURCE_INVENTORY.json`: campaignStages.json, campaignCatalog.ts, chapterDifficulty.ts, tilt.ts, tiltMovement.ts, useTiltControl.ts, guardPhase.ts — all seven unchanged during V12 Phase 1. All 60 per-mission data records therefore remain unchanged. Existing pre-V12 working-tree edits were preserved; comparing to Git HEAD would wrongly attribute those older changes to V12.

No runtime map, input preset, sensor API, game rule, asset, audio, or legacy Unity edit was made in this phase. Current app remains the 60-map version.

## Baseline checks

- `npm run typecheck`: PASS, exit 0.
- `npm run lint`: PASS with 0 errors and 2 existing `@typescript-eslint/no-require-imports` warnings in `src/ota/applyUpdate.ts` at lines 23 and 75.
- Full campaign/gameplay regression was not rerun for documents-only work. Required after runtime rebuild.
- No V12 simulator screenshot gate, collision proof, physical A/B/C tuning, or new 45-mission playtest was performed. These are pending, not PASS.

## Independent review

Chapter audit specialists reviewed source-based counts, original/new ID separation, curve values and phase boundaries. Early audit review found that inventory's “Walkable tiles” was actually a count of '.' floor cells before prop collision and body clearance. Corrected the Markdown heading and JSON key to `floorCellsBeforePropCollision`; no navigability claim is made from that count. A second independent review confirmed all seven source hashes, all 60 inventory records, all 45 plan references and the Tilt formulas. Its requested correction marks the proposed 25% variance trigger as an unvalidated placeholder. Both documentation corrections are applied.

## Remaining implementation gates

Physical A/B/C tuning selection; known 01-08 hitch investigation; versioned progress migration for reused/removed IDs and shifted flat indexes; runtime 45-map rebuild; actual glass/network camera definitions in later chapters; automated gameplay regressions; live rendering and actual Chapter 1–3 physical Tilt playtests; representative human testing across all nine chapters.

Status: **V12 — 45 MISSION CAMPAIGN BLUEPRINT READY FOR REVIEW**.

This is not `TILT FEEL CANDIDATE READY FOR DEVICE TEST`, not runtime rebuild completion, and not Production Ready.
