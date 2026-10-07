# RC IAP — Remove Ads purchase, restore and suppression

Status: **IMPLEMENTED / PENDING TESTFLIGHT DEVICE VALIDATION**. No OTA, build upload, App Store changes or purchase was performed.

## Audit before changes

Existing implementation uses **expo-iap 5.8.1** with useIAP and non-consumable finishTransaction. Ad entitlement/counter persist in AsyncStorage key `dont-move.monetization.v1`, Settings uses MonetizationContext, and the shared interstitialController suppresses ads. Problems found:

- Both platforms used `remove_ads`, which does not match the supplied iOS product.
- Purchase function allowed requests without a loaded product.
- Ownership was granted before transaction finishing.
- Restore awaited a hook method/state update, then inspected an older ref, allowing the wrong “no purchases” message.
- Startup only granted positive ownership; successful empty Store results did not reconcile false.
- Slow cache hydration could overwrite a newer Store result.
- Failed initial connection had no functional reconnect path.
- Native purchase failure emits an error event and rejects its promise; independent handlers could reconcile twice and interfere with a later operation.

## Product contract

| Platform | Product | Type / availability |
|---|---|---|
| iOS | `com.dontmove.removeads` | Non-consumable; exact ID supplied by user |
| Android | none (`null`) | **PENDING — PLAY CONSOLE PRODUCT** |

Android does not reuse the Apple ID or issue SKU queries/purchases. Release Settings displays unavailable purchase status and disables purchase/restore for an unconfigured product. Existing Android ads and gameplay continue.

## Changes

- Platform-specific product resolver and actual Store-fetched localized price.
- Product-ready and connection checks in both UI and purchase function.
- Non-consumable finish resolves before ownership is applied.
- Serialized hydration, Store reconciliation and transaction completion.
- Successful active-entitlement result sets true or false; a failed request preserves cached ownership. Cache is startup UX, not the final ownership authority.
- Foreground reconciliation, explicit Store reconnection and retry (also visible to cached owners).
- Direct Store results determine restored / empty / failed messages; success never transiently reports empty.
- Cancellation, already-owned, pending and failed transaction outcomes receive distinct messages. Operation tokens deduplicate native event + promise errors and prevent stale rejection from ending newer restore work.
- Revoked transactions cannot grant ownership; active Store state is reconciled.
- Shared controller rejects preload/show for owners, removes loaded ads/retry timers and ignores stale callbacks. High clear counts and delayed calls cannot bypass ownership. Clear trigger remains every two successful clears for non-owners; Caught/Retry unchanged.
- Optional `EXPO_PUBLIC_ADS_TEST_MODE=true` uses official test ad units in a release JS bundle. Default production behavior is unchanged; setting must be supplied to the actual approved export/delivery. Never click live ads during QA.

## Verification

| Gate | Actual result |
|---|---|
| IAP/provider/ad/CCTV monetization suite | **51 PASS / 0 FAIL** |
| New pure entitlement tests | 11 PASS |
| New production-provider harness tests | 10 PASS; uses real TSX with mocked Store/React boundaries, not a device |
| Ads controller | 7 PASS, including 2 new ownership/delayed preload/show cases |
| TypeScript application + campaign | PASS |
| ESLint | 0 errors / 1 existing warning (`src/ota/applyUpdate.ts:36`) |
| iOS production Hermes export with test-ad opt-in | PASS (`/private/tmp/dontmove-rc-iap-ios`) |
| Campaign snapshot before and after | **45 / 45 SAME** |
| Campaign tests | 614 PASS |
| Campaign audit | 45/45 clean under existing allowlist; existing `05-02-g4` collision at 3.94,16.06 t=26.3s retained |
| Environment / manifest validation | missing 0 / invalid 0; environment contract tests 15 PASS |
| Theft support / crash hotfix / doors / OTA | 31 / 22 / 21 / 21 PASS |
| `npm test` | **FAIL — 1 preexisting branding assertion**, details below |
| Real TestFlight purchase / restore / restart | **PENDING DEVICE** |

`npm test` stops at `src/ui/branding/introTimeline.test.ts:49`: `native splash has no diamond mark`. The pre-task HEAD already has Android `splash-mark.png` from the prior Android resource-link fix. This work does not change app.json, startup art, or that test; the failing condition is confirmed in HEAD. Subsequent suites were run separately, including the new monetization tests. Do not label the full npm gate PASS.

The first sandbox test launch failed with tsx IPC EPERM; rerunning with permitted local IPC reached the real branding assertion above.

## Actual native binary evidence and delivery

Actual saved `build2.ipa` was inspected, not inferred from package.json:

- Bundle `com.dontmove.prototype`, version **1.0.0 (2)**.
- Native executable contains `ExpoIapModule`, `PodsDummy_ExpoIap`, OpenIAP classes; extracted executable matches IPA content.
- IPA SHA256 `28a6d413516903e2f118e1314dd4abd76a8f5b97de085150ef9035653b2298c6`.
- EAS build `c5273853-4926-4715-b25b-ed5741f9e010`, FINISHED production iOS; runtime `1.0.0`, production update channel.
- Saved IPA: `/private/tmp/claude-501/-Users-mungyubin-Desktop-Coding-Don-t-Move/275dd86a-96bc-4124-994f-33c4925acae2/scratchpad/ipa/build2.ipa`.

**IAP-native module is already present. These IAP changes do not require adding a native dependency.** A JS-only IAP patch based on Build 2's matching dependencies is an OTA candidate. However, the prior Android work upgraded Expo/Constants/Updates/Asset and added dev-client compared with the Build 2 dependency snapshot. The same runtime string does not establish compatibility of the entire latest tree. For delivery of the entire current tree, use a new matching iOS build; do not publish it to Build 2 blindly. No new build or OTA was submitted in this task.

## App Store Connect

**PENDING — APP STORE CONNECT PRODUCT STATUS**. Browser service was not running; no authenticated product page could be inspected. Actual product status, localized price, localization completeness and Agreements/Tax/Banking remain unverified. The specified ID and intended non-consumable type are user-supplied facts, not an ASC verification result.

## TestFlight checklist after approved delivery

1. Use a test-ad-enabled approved build/update and a Sandbox/TestFlight tester. Verify the Settings price comes from Store.
2. Non-owner: successful Clear #1 skips ad, Clear #2 attempts an available test interstitial. Caught/Retry shows none.
3. Purchase: StoreKit sheet → success → Ads removed. Clear repeatedly with a previously loaded ad; no ads.
4. Fully terminate/relaunch: cached suppression, Store ownership confirmed, no ads.
5. Reinstall/reset only with tester consent, then Restore: only “Purchases restored”, no empty message; restart persists.
6. Fresh non-owner Restore: “No purchases to restore”. Cancel: no grant/error screen. Offline: retry works and prior owner's cache is retained.
7. Already-owned Store response restores ownership; test a revoked/refunded entitlement with Sandbox tooling separately if available.

Do not declare RC IAP PASS until the real TestFlight sequence is observed. Logs: `Reports/RcIap/`.

References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt). API behavior was checked against installed expo-iap/OpenIAP source and native Build 2 evidence.
