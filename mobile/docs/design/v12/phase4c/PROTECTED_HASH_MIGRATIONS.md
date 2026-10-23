# Protected runtime baseline migrations

`PROTECTED_HASHES.json` is the live runtime baseline consumed by both
`tools/campaign/v124cScope.test.ts` and `v124dScope.test.ts`. Historical stage
snapshots and the original phase request remain unchanged. An accepted runtime
change needs an explicit baseline migration; tests must still check every entry.

## 2026-10-23 — CCTV geometry cache from commit 6e867ba

Only `src/game/security/cctv.ts` is migrated:

- Previous SHA-256: `be91462c65f01ebf5a19108cbaa881b6b9a3fcd5b4ddc62b353cc60ca01098ac`
- Current SHA-256: `a9977b5e04efa6d6d25d32678e876543dd529d7198d2e039d8c6e40fc697ed55`
- Source commit: `6e867ba58948258cf1c1835f858088a7f4dd9b01`
- The previous hash exactly matches `6e867ba^:mobile/src/game/security/cctv.ts`.

The committed diff adds comments and passes a cache flag to `buildVisionFan`.
Sweeping cameras skip cache snapshots; stationary/paused cameras can reuse
unchanged geometry. Every tick still calls `pointVisible` and the same suspicion,
alert, sweep, and decay logic. No camera tuning, map data, or player targeting
rule changes are part of this migration.

Verification before migrating:

- Both scope tests reproduced the same CCTV hash failure (27 pass, 2 fail).
- CCTV behavior and vision-cache tests: 17/17 pass, including sweep endpoint
  pauses, sight loss, suspicion timing, alert clearing, dynamic blockers, and
  cached versus freshly rebuilt polygon equality.
- The original performance report compares the pre-optimization vision kernel
  (`b8e4045`) with the optimized kernel: all nine security replay cases match.
  This runs the same current CCTV caller on both kernels; the old kernel ignores
  the extra cache argument. It is not a separate historical CCTV-source replay.
- The new stability replay compares against `6e867ba`: nine of nine full security
  snapshots match. This verifies subsequent stability work, not the historical
  optimization by itself.

Evidence: `docs/reports/performance/README.md` and
`docs/reports/stability-2026-10-23/performance.md`.
All six other protected hashes and both test loops are preserved.
