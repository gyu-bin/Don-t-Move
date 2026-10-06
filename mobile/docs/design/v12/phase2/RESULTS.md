# V12 Phase 2 — Tilt selection and rebuild preparation

Status: **V12 PHASE 2 — TILT LOCKED, CHAPTER 1–3 REBUILD READY**

## Tilt implementation

- Previous default: Dead Zone2° / Max Tilt16° / Smoothing0.06s.
- Selected default **B: Dead Zone1.75° / Max Tilt10° / Smoothing0.07s / Sensitivity1**.
- A remains2°/12°/0.07s; C remains1.5°/9°/0.07s, accessible only with DEV comparison enabled.
- OS-fused quaternion, fixed neutral, radial dead zone, smoothing and nonlinear response unchanged. No adaptive neutral.
- Player max150units/s, acceleration320/deceleration1400, wallslide unchanged.
- B steady-state anchors:3.625°→38,6.25°→72,10°→150; larger inputs clamp150.
- Calibration stable0.5s + READY0.35s, existing recent-median fallback2500ms and manual Recenter preserved.

## Actual iPhone 14 Pro evidence

| Profile | Observation | Limits |
|---|---|---|
| B | User: “어어 B나쁘지 않은데 괜찮음”; actual01-01 Tilt, Idle/Sneak/Walk/Run, max sampled149.98; objective pickup → mission clear →01-02 prepared | Individual feel criteria not separately certified |
| A | Actual01-01 profile and gait samples;45.406s sampled span, max146.99 | Brief comparison, not2–3minute fatigue test |
| C | Actual01-01/01-02 samples;34.144s sampled span, max150 | Brief comparison, not2–3minute fatigue test |

User final feedback: “다 괜찮은데 정확한 차이는 잘 모르겠음.” Select B as the balanced middle candidate. B clear is supported by OBJECTIVE_PICKUP, recordMissionClear and next01-02 preparation logs. No theft-alert coverage inferred from that clear segment.

Actual `[INPUT] TILT — IOS` and A/B/C profile logs confirmed. No simulator result is used as physical sensitivity evidence. Long fatigue, controlled10-second neutral/drift, full directional precision and per-profile wall/corner comfort remain **not separately verified**. Android uses the same selected B mapping but physical Android test remains pending.

## Chapter 1–3 preparation

- Museum: Entrance Hall; Rotunda Collection; Archive & Conservation; Restricted Wing; Grand Museum Heist.
- Gallery: Sculpture Court; Portrait Hall; Modern Wing; Glass Gallery; Masterpiece Chamber.
- Bank: Teller Access; Staff Records; Deposit Boxes; Checkpoint Command; Main Vault.
- Progress migration design maps60old IDs to45valid destinations, interprets oldv4 flat indices underOLDcounts, archives original records and retains completion/unlocks. Removed mission redirects and idempotent proposedv5 fixtures are documented.
- Migration code and15rebuilt maps are **not implemented** in this preparation phase. Runtime remains60missions; saves unchanged.
- Following rebuild phase can use this preparation. Chapter4–9, Guard, Chase, CCTV, audio and Ads were not modified by this task.

## Verification

- Tilt tests: **54PASS /0FAIL** after B promotion.
- Stability/collision/wallslide tests: **23PASS /0FAIL**.
- TypeScript: **PASS** after B promotion.
- Final lint: **0errors**,2existing require-import warnings in `src/ota/applyUpdate.ts`23/75.
- Independent final code review: **PASS**. tilt.ts only changes default parameters and anchor comments; algorithms unchanged.
- Eight protected map/catalog/movement/lifecycle/guard/difficulty/progress source hashes unchanged from Phase2 baseline. tilt.ts is the intentional B default change.
- Full campaign not rerun: map data unchanged.

## Controls and artifacts

- DEV `EXPO_PUBLIC_DM_TILT_COMPARE=1`: pause → B/A/C → Resume. Selection preserves Neutral, clears filtered input and stops current velocity; selection survives mission changes within session.
- Production/unflaggedDEV now use the locked B default.
- Scalar-only `[TILT SAMPLE]` telemetry at most1Hz; explicit frame activation follows debug enablement. Result/pause state may retain speed, so sparse samples do not certify active movement at every timestamp.
- Actual device logs: `Reports/V12Phase2/metro.log`, `device-console-b.log`. Virtual Tilt and forcedTouch disabled; high-frequency QA logging disabled.

This is a profile-selection and rebuild-preparation result, **not a Production Ready declaration**.
