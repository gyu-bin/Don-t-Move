# V13 Phase 10 — RC build 2 (2026-10-06)

Not committed. No OTA published. Nothing submitted for review.

**Verdict: none of the four yet.** Build 2 is built and verified, but it is **not uploaded to TestFlight**: the
upload needs an Apple sign-in, which has to be done by the account owner (one command, below). After that upload
the state is RC BUILD READY, with the device QA still to do.

## Build

| | |
|---|---|
| App | Don't Move |
| Version / build number | 1.0.0 / **2** |
| Bundle ID | `com.dontmove.prototype` (unchanged) |
| runtimeVersion | `1.0.0` (policy `appVersion`, unchanged) |
| EAS profile | `production` (existing profile, store distribution, channel `production`) |
| Build | `c5273853-4926-4715-b25b-ed5741f9e010` — FINISHED, about 5 min |
| Logs | https://expo.dev/accounts/rbqls6651/projects/dont-move/builds/c5273853-4926-4715-b25b-ed5741f9e010 |
| Source | commit `9184d0e` **plus the uncommitted working tree** (see "Working tree") |
| TestFlight | **not uploaded** |

Existing builds on EAS before this one: iOS 0.1.0 (1) and iOS 1.0.0 (1), both 2026-09-29. Whether App Store Connect
holds any other build could not be checked (not signed in); if build 2 were already taken there, the upload
would be rejected and the number would have to go to 3.

### To upload (needs your Apple sign-in)

`eas submit --non-interactive` stops with "Set ascAppId in the submit profile or re-run in interactive mode". The
app's App Store Connect id is not recorded anywhere in the project, and the interactive mode asks for the Apple
account, which I do not enter. From `mobile/`:

```bash
npx eas-cli@latest submit --platform ios --id c5273853-4926-4715-b25b-ed5741f9e010
```

This only sends the build to App Store Connect / TestFlight. It does not submit for review.

## Embedded campaign (checked in the downloaded binary)

The `.ipa` was downloaded and opened.

```
9 chapters · 5 missions per chapter · 45 missions
```

- `Info.plist`: `com.dontmove.prototype`, 1.0.0, build 2, display name "Don't Move".
- `main.jsbundle` (Hermes, 4.79 MB): every floor-plan row of all 45 current missions is present, including the
  rows that tell this campaign from the older ones — 02-02, 04-01, 04-05, 06-02, 08-01, 08-05 (Phase 7B / 7C).
  Those rows are in neither the last commit nor the production update, so their presence also shows the build
  took the working tree. 45 / 45 mission ids and titles present.
- No old campaign: the plain-JS export of the same tree has exactly one campaign module, 45 missions, 5 per
  chapter, no id above `-05`, and it is identical, value for value, to `campaignStages.json` (which holds the
  05-05 planter at y 17.223). `CHAPTER_MISSION_COUNTS` in the bundle is `[5,5,5,5,5,5,5,5,5]`; `[10,5,…]` is absent.
  The strings `02-06`, `02-10` and `01-08` do occur in the bundle: they are the old-mission literals in
  `compileStage.ts`, `playgroundState.ts` and the lockdown code, not campaign data.
- Update settings in the binary: enabled, URL of this project, channel `production`, runtime `1.0.0`, check on
  launch, launch wait 0 ms.

**First launch without any update shows 9 × 5 = 45.** That is the embedded bundle.

## OTA

| | |
|---|---|
| Channel → branch | `production` → `production`, runtime `1.0.0` |
| Latest update | group `a21a7422-332b-4104-aaf7-8770a0c03f85`, 2026-10-06 03:48:55 UTC, "Apply the update during the first splash", from commit `9184d0e` with a dirty tree |
| Same as this RC? | **No** — older (no Phase 7B / 7C walls, nothing from Phases 8B–10) |
| Published in this phase | nothing |

Build 2 will not fall back to that older update: expo-updates loads an update only if its commit time is later
than the bundle that is running (`LoaderSelectionPolicyFilterAware`), and Build 2's embedded bundle is stamped
2026-10-06 10:24:32 UTC, after the update's 03:48:55. So Build 2 and the channel do not disagree in practice.
Build 1 installs keep receiving the older update.

Two things to keep in mind:

- Any update published to `production` from now on is newer than Build 2 and will replace its embedded campaign
  on both builds. Publish only from the tree the build was made from (or later, verified).
- To bring Build 1 testers to the RC as well, after committing: `npm run update:production -- --message "RC"`.
  Not done; it needs your approval.

## Working tree (the build was made from a dirty tree)

Nothing is committed since `9184d0e`. What the build contains beyond that commit:

| Group | Files |
|---|---|
| Campaign data (Phases 7B–9) | `src/game/levels/stages/campaignStages.json` |
| Startup / OTA handling (already in the tree before these phases; the same work that was published as the 03:48 update) | `App.tsx`, `src/ota/OtaRefresh.tsx`, `applyUpdate.ts`, `otaNotice.ts`, `otaNotice.test.ts`, `src/ui/branding/StartupScreen.tsx` |
| Release config (this phase) | `app.json` — build number 2, Android `RECORD_AUDIO` removed |
| Tooling, tests, docs (no effect on the app) | `package.json` scripts, `tools/campaign/*`, `tools/environment/catalogKit.test.ts`, `docs/design/v13/*`, `docs/reports/*` |

The startup / OTA changes were not written or reviewed in these phases; they pass their tests (`otaNotice` 4 / 4)
and the type-check. Recommended before any further build or update: commit this tree, so that the binary can be
traced to a commit.

## Release hygiene

**Android `RECORD_AUDIO` — removed.** No code records audio (no recorder, no microphone API; the only "record"
matches are Skia picture recorders and the clear counter). The permission came from `app.json` and from the
expo-audio plugin's default. Changed in `app.json`: removed from `permissions`, plugin option
`recordAudioAndroid: false`, and `blockedPermissions` so that no library can merge it back. Generated Android
config after the change: package `com.dontmove.prototype`; permissions INTERNET, VIBRATE, MODIFY_AUDIO_SETTINGS,
FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, BILLING (+ the SDK defaults); `RECORD_AUDIO` marked
`tools:node="remove"`. iOS config is unchanged by this.

**iOS ATT / SKAdNetwork — nothing added.** What is there today:

- The app never asks for tracking permission: no `requestTrackingAuthorization` in the app or in the ads library's
  iOS code, no tracking-transparency package. Without that permission the IDFA is not available.
- `Info.plist` of Build 2 has no `NSUserTrackingUsageDescription` and no `SKAdNetworkItems`. The ads plugin writes
  them only when `userTrackingUsageDescription` / `skAdNetworkItems` are given in `app.json`; neither is.
- Consent: `AdsConsent.gatherConsent()` (UMP) runs at start. If an IDFA message is configured in AdMob's
  "Privacy & messaging", it cannot be shown without the usage text.

Proposal, for you to decide (both mean another binary):
1. Add Google's `skAdNetworkItems` list to the ads plugin config. No prompt, no privacy-label change; ad
   attribution and fill improve. Low risk.
2. Add `userTrackingUsageDescription` only if you want the tracking prompt and personalised ads; the App Privacy
   answers in App Store Connect then have to declare tracking.

Also seen in Build 2's `Info.plist`, unchanged from Build 1 and left alone: a microphone usage text (expo-audio
default) and background mode `audio`. Neither is used by the game; App Review sometimes asks about background
audio. Both can be switched off in the same plugin options at the next binary.

## IAP

| | |
|---|---|
| Product ID in code | `remove_ads` (`adsConfig.ts`), requested as a non-consumable (`type: 'in-app'`, `isConsumable: false`) |
| Product ID in App Store Connect | **PENDING — APP STORE CONNECT PRODUCT ID VERIFICATION** (sign-in required; not guessed, not changed) |
| Match | unknown |
| TestFlight purchase | not tested |

To check in App Store Connect → the app → In-App Purchases: the id is exactly `remove_ads`, type Non-Consumable,
status Ready to Submit or Approved, at least one localisation, and it is attached to the version for first review.

Code paths, read only: purchase → grant + `finishTransaction`; already owned → button replaced, purchase call
ignored; restore → `restorePurchases` + `getAvailablePurchases` → grant; persistence → `removeAdsOwned` in
AsyncStorage and re-granted from the store on every connect; cancel → no message; failure → message shown.
One thing to watch on the device: after a successful **restore** the "No purchases to restore" text may flash,
because the grant lands one render after the check. Not confirmed; if it shows, it is a P2 / P3 display issue.

## Ads (code read; device pending)

Cadence 2 clears, counted only on mission complete; no call from retry, caught, pause or start; an ad that is not
loaded is skipped and the game continues; the counter resets only after an ad was actually shown. Release builds
use the production interstitial unit; TestFlight shows real ads unless the device is a registered test device.

## Tests (after the `app.json` change, before the build)

| Check | Result |
|---|---|
| `npm test` | 1018 / 1018 |
| `npm run typecheck` (app + V13 tools) | 0 errors |
| lint | 0 errors (1 existing warning) |
| `campaign:audit` | exit 0 — 45 / 45 clean, 1 known finding (05-02) |
| `campaign:snapshot` | 45 / 45 SAME (Phase 9 baseline, 05-05 at 0.6 tile) |
| `test:environment` | 15 / 15 |
| manifest validation | missing 0, invalid 0 |
| `test:stability` | 37 / 37 |
| Release bundle campaign | identical to `campaignStages.json`, 45 missions |

No gameplay file was changed in this phase.

## Device QA — to do on Build 2

All of this is **PENDING — USER IPHONE**. Nothing below was replaced by a Simulator result.

**First launch (before anything else, ideally in airplane mode after install)**
- Chapter 1 shows 5 missions; nine chapters.

**Tilt — PENDING — USER IPHONE TILT QA**: 01-02, 02-02, 03-03, 03-04, 04-01, 04-05, 05-02, 05-05, 06-04, 07-02,
08-04, 09-05. Per mission: sneak / walk / run by tilt angle, wall slide, no sticking at corners, 1.8–2 tile
lanes, recenter; the Phase 7 piers, pockets and cover islands are usable; guards face where they look; 05-02
guard 4 walks past the cashier cage without a hitch; 05-05 camera and planter read as separate.

**Progression**: clear → next mission unlocked → chapter unlocked → quit → relaunch → progress and last mission
kept → Chapter 7 / 8 / 9 reachable.

**Ads**: clear #1 no ad · clear #2 interstitial attempt · retry no ad · caught no ad · pause no ad · with no
network at clear #2 the game goes on. An ad that blocks the result screen or progression is P1.

**Remove Ads**: buy · ads gone · quit and relaunch, still gone · Restore Purchases · already-owned state · cancel ·
failure.

**Performance** on 07-05, 08-05, 09-05: frame drops, camera stutter, late art, memory warnings, crashes.

**Android**: PENDING — REAL ANDROID DEVICE. Config is valid and the JS bundle compiles; no Android build exists.

## Files of this phase

Changed: `app.json`. Added: this report. Evidence: build artifact (EAS), `Reports/V13_PHASE9/`.
