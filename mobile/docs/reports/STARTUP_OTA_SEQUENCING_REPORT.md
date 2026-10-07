# Startup sequencing and OTA status (2026-10-07)

Not committed. No OTA published. No build started. Campaign, maps, guards, tilt, save, ads, IAP, audio and mission
loading are untouched (campaign snapshot 45 / 45 SAME).

## Root cause

Two separate things were found. Both were reproduced; neither is the "native splash hides the animation" guess.

**1. The Home intro is skipped when iOS "Reduce Motion" is on.** The intro, the splash fade and the menu reveal are
Reanimated `withTiming` animations with the default `ReduceMotion.System`. With Reduce Motion on, each jumps to its
last frame: the 4.5 s intro ended 31 ms after it started. On screen that is exactly the report: logo splash, then
a finished Home.

| Build | Reduce Motion | Before the fix |
|---|---|---|
| Dev client | off | splash → intro 4.5 s → Home |
| Dev client | **on** | splash → **finished Home** (`intro-start` → `intro-end` 31 ms) |
| Release (local simulator build) | off | native splash 0.4–2.0 s → logo splash → intro 3.7–8.0 s → Home |
| Release | **on** | native splash → logo splash → **finished Home** at 3.7 s |

With Reduce Motion off the intro plays in full in a Release build, so the startup order itself was not consuming it.
**Whether the phone that showed the problem has Reduce Motion on was not confirmed** (Settings → Accessibility →
Motion). If it is off there, the cause on that phone is something this investigation did not reproduce.

**2. The JS update flow has never run in a release build.** `updatesModule()` asked
`TurboModuleRegistry.get('ExpoUpdates')`; expo-updates is an Expo module and that call returns null. Measured in a
Release build: `turbo=false`, `requireOptionalNativeModule('ExpoUpdates')=true`, `Updates.isEnabled=true`. So since
commit `5bcfb54` (2026-09-29) `OtaRefresh`, the applying screen, the reload and the applied toast were all switched
off on TestFlight. Updates still arrived because expo-updates downloads at launch and uses the new bundle on a later
cold start by itself — which is also why a fresh install showed the embedded campaign first.

The "native logo splash" is the app's own startup screen: the native splash of the binary is a plain navy colour
with no logo (`Assets.car` holds only `SplashScreenBackground`), and expo-splash-screen removes it when the first
React content appears.

## Before

```
native splash (navy)                    removed at first React content (expo-splash-screen auto-hide)
→ StartupScreen mounts, phase BOOT      logo splash, no text
→ OtaRefresh                            release: updatesModule() == null → onReady at once (no check, no status)
→ SPLASH_MS 1.2 s
→ phase INTRO: BrandingScreen mounts    Home intro starts on mount (after artwork + 2 frames)
→ intro 4.5 s → phase HOME → menu reveal 0.38 s
```

The Home intro started when `BrandingScreen` mounted and its artwork was decoded. Nothing else gated it, and any
app-state change away from `active` ended it at once.

## After

```
native splash (navy)
→ startup screen: logo + status line + "v1.0.0 (2) · Embedded | OTA xxxxxxxx"
     "Checking for updates…"                      while the check runs
     no update  → "Up to date"
     update     → "Downloading update…" → "Applying update…" (drawn, then reload) → new bundle starts from the top
     no network → "Starting offline"      error → "Update check failed"
→ startup ready (never while an update is being applied)
→ startup screen fades, Home intro starts          once: ready + artwork + app in front
→ Home → "Update applied · OTA xxxxxxxx" toast     only on the first launch of a new update
```

- **Explicit signal.** `startupReady = !holdSplash && !applying` in `StartupScreen` is passed to `BrandingScreen` as
  `startReady`; the timeline starts only when `shouldStartHomeIntro({startupReady, artReady, appActive, started,
  finished})` says so, and once. Mounting no longer starts it. The fallback deadline is counted from the real start.
- **Cold launch / resume / reload.** Cold launch plays it. Returning from the background does not (it already ran;
  leaving during the intro ends it). An OTA reload is a new JS runtime and plays it again.
- **Native splash** is left on its automatic hide: it hands over to the startup screen of the same colour at the
  first frame. No sleep was added.
- **Reduce Motion.** The startup sequence (splash fade, intro, menu reveal) now uses `ReduceMotion.Never`.
  This overrides an accessibility setting for these three animations — see "Decisions".
- An app that only becomes `inactive` (a system sheet over it) no longer loses its intro; `background` still ends it.

## OTA applying — what existed

| | Before |
|---|---|
| Checking / downloading / latest / offline / failed | **did not exist** (no state, no text) |
| Applying | state and a toast existed in the code, held up by a fixed 1.8 s sleep before `reloadAsync()` |
| Could it render? | in the code, yes (because of the 1.8 s) — **in a release build, never**: the whole flow was off (root cause 2) |
| Applied toast | existed, but showed the *applying* text, and was off in release for the same reason |

Now: the status is set, `StartupScreen` reports back two frames after the applying text is in the committed tree,
and only then does the reload start, 0.4 s later (`showApplyingThenReload`; bounded by 1.5 s if the report is lost).
The 1.8 s sleep is gone. In the Release run below the applying text is on screen for about half a second.

## Changes

| File | Change |
|---|---|
| `src/ota/startupFlow.ts` (new) | The decisions as pure functions: statuses, startup-ready, Home-intro gate, check → download → apply, show-then-reload, offline detection, reload-loop guard, toast rule, build label |
| `src/ota/startupFlow.test.ts` (new) | 17 tests (below) |
| `src/ota/applyUpdate.ts` | expo-updates is looked up with `requireOptionalNativeModule` (**this turns the flow on in release**); reload waits for the drawn applying screen; loop guard; update-host probe to tell offline from failed; `runningBundleText()` |
| `src/ota/OtaRefresh.tsx` | reports `checking / downloading / applying / latest / offline / failed`; same gate logic as before |
| `src/ota/otaNotice.ts` | toast rules now come from `startupFlow` |
| `src/ota/OtaQaRunner.tsx` (new, DEV only) | `EXPO_PUBLIC_DM_OTA_QA=latest\|update\|offline\|failed\|reset` plays the statuses in the dev client |
| `App.tsx` | status, build label, drawn signal, applied toast shown when Home is on screen |
| `src/ui/branding/StartupScreen.tsx` | status line and label on the startup screen; drawn signal; `startReady`; Home-visible callback |
| `src/ui/branding/SplashScreen.tsx` | status and label texts; fades not skipped by Reduce Motion |
| `src/ui/branding/BrandingScreen.tsx` | intro gated by `startReady`, app state and "once"; `ReduceMotion.Never`; `inactive` no longer ends it |
| `src/ui/menu/strings.ts` | six status texts and the applied text, EN / KO |
| `package.json` | `test:ota`, added to `npm test` |

Other behaviour that changed with this:

- A failing check is tried twice (was eight times, one second apart): with the server unreachable the startup
  screen is held about 1.5 s instead of about 8 s.
- First install, or the first launch that keeps the "seen" record: no applied toast (it only records what runs).
- Reload-loop guard: before restarting onto an update the attempt is stored; if the next launch finds the same
  update still waiting and not running, it is not restarted onto again and is left to the next cold start.
- The build number in the label is the binary's own (`Constants.platform.ios.buildNumber`), not the manifest's.

## Simulator

| Check | Build | Result |
|---|---|---|
| Cold launch, intro from its first frame | dev, Release | PASS (intro 4.5 s; frames in `Reports/STARTUP/`) |
| Cold launch with Reduce Motion on | dev, Release | PASS — intro plays (was: finished Home) |
| Background → resume | dev | PASS — no `intro-start`, Home as it was |
| No Home before a reload | dev QA, Release | PASS — no intro start in the runtime that is replaced |

## OTA

Verified in a **Release build in the Simulator** with the real expo-updates module, pointed at a local server that
speaks the expo-updates protocol (scratch copy of the project; the project has no `ios/` folder and nothing was
published).

| Status | Dev (simulated) | Release, real expo-updates, local server | TestFlight / EAS |
|---|---|---|---|
| Checking | PASS | PASS (seen while the server did not answer) | PENDING — TESTFLIGHT OTA |
| Downloading | PASS | PASS | PENDING — TESTFLIGHT OTA |
| Applying, drawn before reload | PASS | PASS (video `Reports/STARTUP/rel-ota-update.mov`) | PENDING — TESTFLIGHT OTA |
| Reload → intro on the new bundle | PASS | PASS (label changes to `OTA 2c646a56`) | PENDING — TESTFLIGHT OTA |
| Applied toast, once | PASS | PASS ("업데이트 적용 완료 · OTA 2c646a56") | PENDING — TESTFLIGHT OTA |
| Same update relaunched: no toast | PASS | PASS | PENDING — TESTFLIGHT OTA |
| Up to date | PASS | PASS | PENDING — TESTFLIGHT OTA |
| Offline / failed: app still starts | PASS (offline) | PASS (both; about 1.5 s on the startup screen) | PENDING — TESTFLIGHT OTA |
| Update found while on Home | — | PASS (startup screen → reload → intro → toast; `rel-ota-menu.mov`) | PENDING — TESTFLIGHT OTA |
| Reload loop | — | none: one apply per update, then a check every 15 s | PENDING — TESTFLIGHT OTA |

Not verified anywhere: a real airplane-mode launch on a phone (the Simulator shares the Mac's network).

## Regression

| Check | Result |
|---|---|
| `npm test` | 1040 / 1040 (1018 + 22 OTA: 17 new, 5 existing now part of `npm test`) |
| `npm run typecheck` | 0 errors |
| lint | 0 errors (1 existing warning) |
| `campaign:snapshot` | 45 / 45 SAME |
| `campaign:audit` | 45 / 45 clean, 1 known finding (05-02) |
| `test:environment` / manifest | 15 / 15, missing 0 / invalid 0 |

Tests added (`startupFlow.test.ts`): no intro before startup is ready · starts exactly once · background resume does
not replay · OTA reload plays it in the new bundle · no update → latest · update → downloading → applying in order ·
nothing applied during a mission · applying is drawn before reload · a lost drawn signal cannot block · offline or
failing check still starts · offline wording in English and Korean · every status has its own text · first install no
toast · same OTA no toast · new OTA toast once · build label · reload-loop guard.

## Decisions for you

1. **Reduce Motion.** The startup sequence now ignores it. That is what makes the intro visible on a phone with the
   setting on, and it is also an accessibility override. The alternative is to keep honouring it and show a short
   cross-fade instead of the intro. It is one option on four `withTiming` calls (two in `SplashScreen.tsx`, two in
   `BrandingScreen.tsx`) if you want it back.
2. **The update flow is now live in release for the first time.** A cold start waits on the startup screen for the
   check, and an update found at start or on the menu restarts the app onto it immediately. It was built for that,
   but it has only run in the Simulator. Check it on TestFlight before a wide release.
3. This reaches Build 2 only through a new binary or an OTA. The JS in Build 2 still has the old lookup, so the
   update carrying this fix will itself arrive the old way: downloaded at one launch, used at the next.

## How to check on TestFlight

**Cold launch**
1. Quit the app completely. 2. Open it. 3. Navy screen, then the logo. 4. Under the logo: "업데이트 확인 중…" then
"최신 버전입니다", and `v1.0.0 (2) · Embedded` or `· OTA xxxxxxxx`. 5. The Home intro plays from its first frame.
Then send the app to the background and bring it back: the intro must not play again.

**OTA** (after an update containing this fix is already running)
1. Publish a new update. 2. Quit the app completely. 3. Open it. 4. "업데이트 확인 중…" 5. "업데이트 다운로드 중…"
6. "업데이트 적용 중…" visible. 7. The screen goes dark for about a second (reload). 8. The Home intro plays.
9. Toast "업데이트 적용 완료 · OTA XXXXXXXX", once; the eight characters match the group id `eas update` printed.
10. Quit and open again. 11. No toast.

**Offline**: airplane mode, open the app: "오프라인으로 시작합니다", then Home within a few seconds.
