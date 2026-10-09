# Mission Complete → Next Stage release hotfix (2026-10-09)

Not committed. No OTA published. JS only: no native module, config or asset changed, so this can ship as an OTA.
Scope kept: campaign, guards, CCTV, difficulty, tilt, touch, BGM, IAP and progression rules are untouched
(campaign snapshot 45 / 45 SAME).

## Root cause

1. **"Next Stage" waited for an ad to load.** `showWhenDue()` polled for up to 12 s (`INTERSTITIAL_LOAD_WAIT_MS`)
   when an interstitial was due but not loaded. During that time `adPresenting` was true with no ad on screen, so a
   second press was swallowed as "confirm ad dismissed". With a slow or empty ad network the button looked dead.
   Confirmed in code; removed.
2. **Two full game screens were alive during every transition.** The slide rendered the outgoing and the incoming
   `StageGame` together (`[index, pending]`): two Skia canvases, two sets of render resources, two frame loops.
   Confirmed in code; removed. That this is what crashed on the phone is **not proven** — no device crash log was
   available.
3. **A fully covered Skia canvas blocks the UI thread for one second per draw.** Found while validating the new
   transition: a main-thread stack sample showed `RNSkPictureRenderer::performDraw → MetalWindowContext::getSurface
   → -[CAMetalLayer nextDrawable]` waiting on its one-second timeout whenever the canvas was under a completely
   opaque view. My first cover was opaque and produced exactly this; the cover is now 98.5 % (no stall in 20+ runs).
   Whether the old build hit the same wait on a phone — the full-screen interstitial also covers the canvas while
   the finished scene kept being simulated and redrawn — was **not verified**. The scene is no longer simulated or
   redrawn while an ad is presenting.
4. **Analytics rewrote its whole log on every event.** Each `track()` JSON-encoded and stored up to 4000 events on
   the JS thread, several times in a row at mission clear. Events recorded in the same tick also overwrote each
   other (only the last survived locally). Writes are now coalesced (one per burst, 1.5 s later) and the loss is fixed.

## Ad navigation

| | |
|---|---|
| Waits for an unloaded ad | **NO** |
| Max navigation delay caused by ad loading | **0** — resolved in the same task, no timer (tested) |
| Due and already loaded | shown; the transition starts when it closes |
| Due and not loaded / load error / no network | skipped at once; loading continues in the background; shown at the first later clear with a loaded ad |
| Close callback lost | existing recoveries kept: SDK "no longer loaded" poll, and a touch on the app's own UI |

Not changed: once `show()` has been called on a loaded ad that then neither opens nor reports an error, the
existing 8 s start deadline applies before the game continues.

## Stage rendering

| | Before | After |
|---|---|---|
| `StageGame` mounted at once | 2 during the slide | **1** (0 for about two frames between missions) |
| Skia canvases at once | 2 | **1** |
| Audio inputs at once | 2 components pushing | 1 |
| Prepared missions cached | 3 | 2 (current + next); older entries are dropped, nothing is disposed by hand |

## Transition

`idle → ad → fadeOut → empty → mounting → fadeIn → idle` (`src/ui/missionSwap.ts`, no React in it).

Result → Next → already-loaded ad (optional) → fade to black 160 ms → old mission unmounted → two frames →
next mission mounted under the cover → it reports ready from its own UI-thread frames (3) → fade in 160 ms → play.
The lock is held from the press until the fade-in has finished; touches are blocked by the cover meanwhile.

**Fallbacks.** Every step is left once, by its signal or its watchdog: fade end 700 ms, frames 500 ms, mission
ready 4 s. A step that throws recovers into the next mission with the cover cleared and the lock released. Leaving
for Home / chapter list cancels the run. Worst case with every signal lost: 5.9 s, then playable.

Next-mission preparation still runs while the result screen is up, after the popup is committed, now as three
separate tasks (floor plan, navigation, art) instead of one block.

## Breadcrumbs (existing analytics, release too)

`mission_clear`, `next_stage_pressed`, `interstitial_due / _ready / _shown / _closed / _skipped{reason}`,
`mission_transition_begin`, `mission_old_unmounted`, `mission_new_ready{ready}`,
`mission_transition_complete{recovered?, fadeReported?}` with `from` / `to` mission ids. One event per step, none
per frame. A stalled or crashed transition shows where it stopped: the last breadcrumb uploaded.

## Progress persistence — PASS (tests and simulator)

The clear, best time and unlock are stored at Mission Complete, before any button acts; the transition only adds
`lastMission`. Test: storage holds the clear when the app "dies" mid-transition. Simulator Release run: after eight
transitions the save had 05-05 … 06-04 cleared and `lastMission 06-05`. Phone: PENDING.

## Tests

| | |
|---|---|
| TypeScript (app + V13 tools) | 0 errors |
| lint | 0 errors (1 existing warning) |
| monetization | 70 / 70 (ad navigation 7 new, controller tests rewritten for already-loaded-only) |
| transition | 11 / 11 new — all 44 consecutive transitions, repeated presses, lost signals, throwing steps, cancel, crash-safe save, clean start of all 45 missions, audio session, cache, screen structure |
| result navigation | 6 / 6 (unchanged) |
| analytics | 6 / 6 (1 new) |
| full suite | 1137 / 1138 node tests + 48 / 48 script tests; `test:stability` 41 / 41 |
| campaign | snapshot 45 / 45 SAME; audit 45 / 45 clean (05-02 known) |

The one failure is `introTimeline.test.ts` ("native splash has no diamond mark"): `app.json` at HEAD contains
`splash-mark`. It failed before this work and is unrelated; not touched. It stops `npm test` at the branding
suite, so the suites were run one by one.

## Release validation

**iOS simulator, Release configuration** (scratch build, embedded bundle, real AdMob SDK serving test-mode ads;
timings from the stored breadcrumbs):

| Transition | Press → playing |
|---|---|
| 05-05 → 06-01 (next chapter) | 458 ms |
| 06-02 → 06-03, button pressed three times | 446 ms, one transition, landed on 06-03 |
| 06-04 → 06-05 | 428 ms |
| 06-01 → 06-02, 06-03 → 06-04 with an interstitial | ad shown, then 458 / 427 ms after it closed |

Dev build, 20+ more transitions (01-02 … 05-05): 465–566 ms, no watchdog needed after the cover fix.

Not measurable in the simulator: frame rate after entry, memory peak, GPU load, real ad network latency.

**iPhone / TestFlight: PENDING.** Nothing here was run on a phone.
**Android: PENDING.** Not built or run.

## Remaining crash risk

- The crash itself was never observed or read from a crash log. The two heaviest things at that moment are gone
  (the ad wait, the second game screen), but that they were the cause is an inference.
- If it still crashes: the last breadcrumb tells the step; a crash log (.ips from TestFlight feedback or
  Settings → Privacy → Analytics Data) would tell the cause.
- Unverified on device: the covered-canvas wait (item 3) and how long a mission takes to become ready on an
  older iPhone (the 4 s watchdog reveals it regardless).

## Phone checklist

1. Clear a mission, press 다음 스테이지 once: black for about half a second, then the next mission. No long pause.
2. Airplane mode, clear two missions in a row: the second Next must be as fast as the first (ad skipped).
3. Wi-Fi on, play until an ad shows: close it, the next mission follows at once.
4. Hammer 다음 스테이지: one mission forward, never two.
5. Ten transitions in a row, including a chapter's last mission: no crash, music and tilt normal in each.
6. Force-quit right after pressing Next, reopen: the clear and the unlock are there.

## Files

Changed: `src/ui/VisualPlaygroundScreen.tsx`, `src/ui/missionTransition.ts`, `src/ui/preparedMission.ts`,
`src/game/monetization/ads.ts`, `adsConfig.ts`, `MonetizationNative.tsx`, `__tests__/adsController.test.cjs`,
`src/game/analytics/analyticsStorage.ts`, `analyticsTypes.ts`, `package.json` (test lists).
Added: `src/ui/missionSwap.ts`, `src/ui/recentCache.ts`, `src/game/monetization/interstitialNavigation.ts`,
tests `src/ui/__tests__/missionSwap.test.ts`, `src/game/monetization/__tests__/interstitialNavigation.test.ts`,
`src/game/analytics/__tests__/analyticsFlush.test.ts`, this report.

`VisualPlaygroundScreen.tsx` is 760 lines (750 before); the transition logic itself lives in `missionSwap.ts`.
