# V13 Phase 9 — release candidate QA (2026-10-06)

Not committed, nothing published, no build started.

**Verdict: not declared.** Nothing found here is a P0 or P1 in the game itself, but four of the conditions the spec
requires for an RC PASS can only be met on the phone and in TestFlight, and were not: real iPhone Tilt,
save / progression on a release build, ad cadence, Remove Ads. Two release facts below also have to be acted on
before that device QA means anything.

## What has to happen before device QA

1. **TestFlight does not run this release candidate.** The production channel's latest update (group `a21a7422`,
   published 2026-10-06 03:48 UTC from commit `9184d0e` with a dirty tree) holds a 45-mission V13 campaign, but an
   earlier one: the floor plans of 02-02, 04-01, 04-05, 06-02, 08-01 and 08-05 differ from the current ones (the
   Phase 7B / 7C wall piers are missing), and everything done after that time is missing with them. Checked by
   downloading the iOS and Android update bundles and looking for each current floor-plan row in them.
2. **The only store binary embeds the old campaign.** There is one iOS build (1.0.0 build 1, 2026-09-29, commit
   `ca403be`) and no Android build. Its embedded bundle has 50 missions with **Chapter 1 = 10 missions**, and
   `fallbackToCacheTimeout` is 0, so a fresh install starts on that embedded bundle and only moves to the update
   afterwards. This is the "Chapter 1 shows ten missions" seen on TestFlight. An update cannot fix a first launch:
   **the release needs a new binary** with the current campaign embedded.

Native dependencies and config plugins are identical between that binary and the current source (expo 57.0.24,
react-native 0.86.3, expo-iap, google-mobile-ads, expo-updates, skia, reanimated, worklets all unchanged), so an
update published now is compatible with build 1 for testing.

Both steps are deploy actions and were not taken. With approval: either `eas update` to production for a quick
Tilt pass on the existing TestFlight build, or (needed for release anyway) a new iOS build with a new build number.

## Known issue 1 — 05-05 camera and planter: fixed

At gameplay zoom the camera dome stood directly behind the planter and was half hidden by the leaves; it read as a
camera stuck in the plant (`Reports/V13_PHASE9/zoom/crop-05-05-cam2.png`). The planter was moved; the camera, its
angle, range and sweep, the guards and the routes are untouched.

- `Exit Plant`: plan y 16.315 → 16.915, **0.6 tile south**. New table `MOVED` in `tools/campaign/v13Casino.ts`
  (Casino only; the Bank plan it comes from is not changed), listed by `npm run campaign:overrides -- 05-05`.
- **This is 0.1 tile more than the 0.25–0.5 the spec allows.** Inside that range there is no clean position:
  below 0.4 the camera is still inside the planter's footprint, and from 0.4 to 0.55 the strip between the wall and
  the planter is floor the thief cannot stand on (a fake gap; the audit and `npm test` reject it). 0.6 is the
  smallest move that passes. To undo: delete the one `MOVED` entry and re-bake.
- After: camera fully visible, plant below it with a gap (`crop-05-05-cam2-060.png`).
- Snapshot: 44 / 45 SAME against the Phase 8 baseline. 05-05 differs in exactly six values: the planter's `y`
  in the definition and in the topology plan (16.623 → 17.223), its two collision-box edges, and its runtime `y` /
  `sortY`. The tracked hash of 05-05 was refreshed (`98ae45a6370c` → `d251d83b5493`); `campaign:snapshot` 45 / 45.
- Audit: 45 / 45 clean; the 05-05 entry left the `KNOWN` list.

## Known issue 2 — 05-02 patrol tangent: no change

Not reproduced, so nothing was changed.

- Real guard code, 360 s, 12 passes of the leg (4.25, 15.75) → (2.75, 17.25): at most 0.045 px off the straight
  line, speed constant at 41.6 px/s, no facing change, no frame standing still.
- Running app in the Simulator, 100 s of play, 3 passes sampled from live telemetry: at most 0.04 px off the line,
  41–43 px/s, no facing change, progress monotonic (`live-05-02-g4-at-corner.png`).

Stays in the audit's `KNOWN` list.

## Release build audit (read only, nothing changed)

| Item | Value | Note |
|---|---|---|
| App name / slug | Don't Move / `dont-move` | |
| iOS bundle identifier | `com.dontmove.prototype` | kept |
| Android package | `com.dontmove.prototype` | kept |
| Version / iOS build / Android versionCode | 1.0.0 / 1 / 1 | `appVersionSource: local`, `autoIncrement: false` — **build 1 is already used; the next upload needs build 2** |
| runtimeVersion | policy `appVersion` → `1.0.0` | every update on 1.0.0 reaches every 1.0.0 binary |
| Update URL / project | `u.expo.dev/57cbe370-…` | `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0` |
| Channels | development / preview / production | production channel → branch `production`, unprotected |
| AdMob app ids | iOS `…~4428994235`, Android `…~9781589386` | same in `app.json` and `adsConfig.ts` |
| Interstitial units | iOS `…/9574714983`, Android `…/3822685694` | used when `!__DEV__`; Google test unit in dev |
| IAP product | `remove_ads`, non-consumable (`expo-iap`) | existence in App Store Connect **not verified from here** |
| iOS permissions | motion (tilt) usage text; `ITSAppUsesNonExemptEncryption: false` | no tracking (ATT) text, no SKAdNetwork list |
| Android permissions | `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | see below |

Notes for the release, none changed here:

- **P2 — Android `RECORD_AUDIO`.** No code records audio; the permission is listed in `app.json`. Play Console asks
  for a declaration and a privacy policy for it.
- **P2 — iOS ads.** No App Tracking Transparency prompt text and no `skAdNetworkItems` in the AdMob plugin config.
  Ads still serve (UMP consent is gathered in `ads.ts`), without personalisation and with weaker attribution.
- **P3 — `expo-doctor`**: 2 of its checks fail — `expo-asset` is not a direct dependency (it is installed
  transitively, and build 1 runs the same way), and three Expo packages are one patch behind.
- Release JS bundles export cleanly for **both** platforms from the current tree (`expo export`, scratch folder,
  not published): 45 floor plans and 45 titles present in each, no old mission id, 216 assets each.

## Ads and IAP (code read, tests; device pending)

| Intent | In code | Verified on device |
|---|---|---|
| Interstitial after every 2 successful clears | `CLEARS_PER_INTERSTITIAL = 2`; counted only in `recordMissionClear` (mission complete), shown on Next | PENDING |
| None on retry, caught, pause, start | no call from those paths | PENDING |
| Load failure never blocks | `showIfReady()` returns `skipped` unless an ad is already loaded; counter is reset only after an ad was shown, so the next clear tries again | PENDING |
| Remove Ads is permanent | `markRemoveAdsOwned` persisted; controller disabled and disposed; restored from `getAvailablePurchases` on connect | PENDING |
| Purchase cancel / failure | `isUserCancelledError` and `onPurchaseError` handled | PENDING |

`test:monetization` 15 / 15, `test:stability` (interstitial presentation, ads controller) 37 / 37.

## Simulator (dev build, touch fallback — not Tilt)

- Cold launch to home 9.2 s (dev client + Metro; not a release number). Home, chapter list and mission lists draw.
- Chapter 1 lists 5 missions; chapters 1–9 present; Chapter 7 and 9 lists show 5 missions each.
- Records and last mission survive an app relaunch (best times shown; "continue 05-02" after a cold launch).
- Missions open without blank screen or stale loading: first after launch about 0.95–1.0 s, then 90–165 ms
  (07-02 0.94 s first, 08-04 90 ms, 09-05 131 ms).
- Metro log of the session: no error, exception or redbox line.
- Whole-map and normal-zoom loading of the representative missions: Phase 8B report.

Unlock order, the old-save migration and Chapter 7–9 unlock on a release build are covered by tests only
(`campaignMigration.test.ts`, inside the 1018), not by a device run.

## Automated

After the 05-05 change: `npm run campaign:bake`, then

| Check | Result |
|---|---|
| `npm test` | 1018 / 1018 |
| `npm run typecheck` (app + V13 tools) | 0 errors |
| lint | 0 errors (1 existing warning) |
| `campaign:audit` | exit 0 — 45 / 45 clean, 1 known finding (05-02) |
| `campaign:snapshot` | 45 / 45 SAME (05-05 refreshed, see above) |
| `test:environment` | 15 / 15 |
| manifest validation | missing 0, invalid 0 |
| Campaign | 9 × 5 = 45 |

## Pending — real device (the user's hands)

| Area | State |
|---|---|
| iPhone Tilt on 01-02, 02-02, 03-03, 03-04, 04-01, 04-05, 05-02, 05-05, 06-04, 07-02, 08-04, 09-05 | PENDING — an iPhone 14 Pro is paired with this Mac but tilt cannot be driven from here |
| Save / unlock / Chapter 7–9 on a release build | PENDING |
| Ad cadence, load-failure fallback | PENDING |
| Remove Ads purchase, restore, persistence; product id in App Store Connect | PENDING |
| FPS, stutter, memory on Ch7 / Ch8 / Ch9 | PENDING |
| Android | PENDING — REAL DEVICE (no Android build exists yet; the JS bundle compiles) |

## Issues by priority

| | Issue | State |
|---|---|---|
| Release blocker | Store binary embeds the 50-mission campaign; production update is older than the RC | needs a new build / update, with approval |
| P2 | Android `RECORD_AUDIO` declared, unused | recorded |
| P2 | iOS: no ATT text, no SKAdNetwork list | recorded |
| P3 | `expo-doctor` peer dependency and patch versions | recorded |
| P3 | 05-02 patrol tangent | kept, not reproducible in play |
| Fixed | 05-05 camera in planter | planter moved 0.6 tile |

## Files of this phase

Changed: `tools/campaign/v13Casino.ts` (`MOVED`), `v13Overrides.ts`, `v13FullAudit.ts` (`KNOWN`),
`v13Integrity.test.ts`, `tools/campaign/README.md`, `docs/design/v13/PHASE8_SNAPSHOT_HASHES.json` (05-05).
Generated: `src/game/levels/stages/campaignStages.json` (sha1 `ed7e6401c733`; 05-05 planter only).
Evidence: `Reports/V13_PHASE9/zoom/`, `Reports/V13_PHASE9/sim/`.
