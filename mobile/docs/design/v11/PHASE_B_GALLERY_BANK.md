# V11 Phase B — Gallery / Bank overlay evidence

## Scope and implementation

Owned production change: `tools/campaign/v11GalleryBank.ts`, a pure idempotent overlay after V9/V10. It selects exactly eleven missions. KEEP missions return the input object unchanged. Root owns baking and native verification. No sensor, movement, shared Guard AI, detector, audio, sprite or HUD change is included here.

| Mission | Authored change | Player decision |
|---|---|---|
|02-02|Spine Guard observes north during first pause; lower roaming inspection faces south; semantic patrol anchors mirror serialized stops.|Read a coherent inspection window before crossing the long Portrait Hall.|
|02-03|Fourth Guard inspects the annex and studio junction rather than adding another simultaneous objective shoulder watcher.|Choose sculpture-room approach timing versus the annex crossing.|
|02-06|Fifth Guard walks the east installation and lower gallery.|Glass remains visible, impassable and LOS PASS; use actual opaque architecture for cover.|
|02-07|East installation Guard patrols that exhibition with distinct north/east pauses.|Observe curator/installation inspection direction before crossing.|
|02-08|Central Guard's inspection pause faces north.|Choose the atrium crossing after observing its turn.|
|02-09|Inspection stop faces west.|Read private exhibition patrol rhythm rather than stacked watchers.|
|02-10|Approved opaque white art screen at(23.2,6.7), custodian route avoids its physical footprint, local theft sectors, safe return stops backtracking toward custodian.|Leave masterpiece chamber, break objective LOS, then inspect the separate west return corridor and exit collection.|
|03-01|Preserves compact public lobby/teller objective; adds staff verification elbow below old boundary, moves exit to dispatch bay. Existing second Guard also inspects staff verification.|Objective pickup is followed by real STAFF route verification, not an adjacent free exit.|
|03-05|Verification inspection pause faces west.|Read the counter/gate cross.|
|03-07|Corridor inspection pause faces west.|Use cabinet-backed route; cash-processing tables remain LOS PASS.|
|03-08|Office and security inspection stops face south/east.|Observe security crossover timing; no new bank obstacle spam.|

## Geometry and contract checks

- Eight meaningful overlay tests PASS on final implementation.
- All eleven missions: authored player legs pass radius18 navigation; compiled Guard patrol/search anchors pass radius9.
- Guard/CCTV counts, Guard pace/vision and camera detection/range/angle contracts retained.
- Objective and spawn retained for all selected missions; TUNE geometry/props/exit retained.
- 02-02 effective compiled semantic patrol matches intended stop look and wait.
- 02-10 natural empty-case inspection remains real: explicit east-shoulder custodian pause looks west;45sec live patrol has both visible and blind periods, first visible21.5sec. V3 navigation audit reports no issues.
- 02-06 glass test: physical BLOCK, vision PASS.
- 03-01 staff passage is a physical articulation: closing its gateway disconnects objective from dispatch exit. Objective-to-exit distance exceeds eight tiles; previous adjacent exit was approximately3.16 tiles.
- 02-10 highSecurity remains true. First safe-camera-hidden break is(13.4,6.5), using real opaque architecture; soft plinth/table is not claimed as LOS cover. Screen visual scale and collision scale both2.4.
- Overlay is idempotent; KEEP maps including03-10 and Chapters4–9 retain input identity. Final broad build diff/baked data evidence belongs to root.

## Real TypeScript runtime scripted runs — NOT native verification

`PHASE_B_GALLERY_BANK_SCRIPTED_EVIDENCE.json` records56 runs. Each uses ordinary waypoint target inputs with live movement/collision/Guard/camera/theft logic at60Hz, no forced pickup/CLEAR/AI state. Entry route0/1, Sneak/Walk, initial wait0/2sec, each authored escape. These plans do not observe Guard timing and failures are not automatically game defects.

| Mission | CLEAR | Attempts | Interpretation |
|---|---:|---:|---|
|02-06|5|16|There are full-heist ordinary-input witnesses. Native glass readability/feel remains separate.|
|02-10|0|16|No successful fixed-plan full-heist witness. Keep acceptance open.|
|03-01|2|8|Staff verification full heist has ordinary-input CLEAR witnesses.|
|03-08|3|16|Security-office full heist has ordinary-input CLEAR witnesses.|

### 02-10 concrete failed witness and improvement

Route0, Sneak entry,2sec initial wait, safe escape0:

- Pickup37.77sec.
- Confirmed Theft39.27sec: unchanged1.5sec high-security interval.
- First Spotted46.15sec; captured46.65sec in west return corridor near(5.35,12.35) by g4.
- Before safe-route correction, a needless rightward return toward(23.2,7.8) caused g3 detection40.93/capture41.85sec. Removing this backtrack preserves entry and increases genuine undetected escape time; it does not establish a full-heist PASS.
- A separate fixed3sec hold at(13.4,6.5) reaches lower exit approach but g5 captures at55.68sec near(2.92,28.31).6sec hold is caught earlier. These are explicit failed plans, not a hidden sweep to find a passing bot.
- Moving screen left to(20.4,6.5) was rejected: it displaced the existing approach and caused pickup-before failures. Final screen remains(23.2,6.7).

## Tool verification

- `node --import tsx --test tools/campaign/v11GalleryBank.test.ts`:8PASS/0FAIL.
- ESLint of both owned TypeScript files:PASS.
- Campaign tool TypeScript:FAIL outside owned files at`v10BoundedReplay.ts`, untyped`attempts` array. No owned-file diagnostic in that run. Root was notified.

## Open acceptance issues

- These results do not certify native Simulator or physical iPhone gameplay, visual readability or Tilt feel.
- No02-10 CLEAR witness yet; native acceptance and bounded authored heist review must not be marked complete.
- Root's postbake pressure audit still places Gallery below Museum on sampled guard/safe/objective exposure. A spatial mean is not a measured difficulty score, but this directional discrepancy is also not resolved by these changes. No fabricated EASY/EASY+/MEDIUM ordering claim is made.
- Rehoming Gallery inspections makes exhibition responsibilities and crossing windows coherent. Further changes must be justified by actual player decisions/observed windows rather than multiplying Guard counts/ranges or optimizing a scalar.

## 최종 root 검증 갱신

기존 `v10BoundedReplay.ts` attempts 배열의 타입을 명시하여 implicit-any만 해결했다. Runtime/입력 행동 변경 없이 최종 app 및 campaign-tools TypeScript 모두 PASS. 최종 전체 npm test exit0, campaign213/213PASS. Native8개 시도는 Full-Heist CLEAR증거0/8; 최종 acceptance는 `docs/design/v11/phase-b/RESULTS.md`의 PENDING상태를 따른다.
