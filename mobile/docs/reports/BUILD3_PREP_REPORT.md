# Build 3 preparation (2026-10-10)

Branch `release/build-3`. No build, no submission.

## What build 3 contains

- Mission Complete hotfix `e074e4c`, merged (`5e1dcbf`).
- Remove Ads card: when the product lookup failed, the main button is an enabled "다시 시도" that reloads the
  product; the error sentence stays. Purchase / restore logic untouched.
- `app.json`: expo-audio `enableBackgroundPlayback: false`, `microphonePermission: false`; `ios.buildNumber` "3";
  `android.versionCode` 3.
- iPad (this iPhone-only app runs there as a window): headers and the game HUD start below the system window
  controls; a player who has never chosen a control mode starts with Touch.

## iPad — what was measured (simulator, iPadOS 27, iPad Air 11)

| | iPad Air 11 | iPhone 18 Pro Max |
|---|---|---|
| `Platform.isPad` | **false** | false |
| `Platform.constants.interfaceIdiom` | phone | phone |
| `Platform.constants.systemName` | **iPadOS** | iOS |
| window / screen (pt) | 410×1180 / 820×1180 | 440×956 / 440×956 |
| safe-area top | 32 | 62 |

The safe-area inset does not include the window controls: they are drawn at y 45–65 and a tap at y 72 on the back
button never reached the app (y 86 did). So the fix cannot be inset-only; iPad is recognised by `systemName`.

After the fix (`topInset = max(safe top, 72)` on iPad only): back button frame 16, 86, 44 × 54, tap at its centre
(38, 113) returns to Home. iPhone SE 3: back button 16, 34 and Settings / Home screenshots identical to before
(0 differing samples). iPhone 18 Pro Max: back button 16, 76 (= 62 + 14, unchanged); Settings differs only in the
system home indicator rows.

First-run control mode on iPad, fresh install: nothing stored, Settings shows Touch selected; choosing Tilt stores
`tilt`; after a restart still Tilt; back to Touch works; a mission then runs on the drag stick. An install that
already had a saved choice kept it (Tilt stayed Tilt).

Not verified: a physical iPad (the `systemName` value and the window controls were read in the simulator only),
tilt itself on an iPad, an iPad held in landscape.

## Clean prebuild on this branch

`npx expo prebuild --clean --platform ios --no-install` → `ios/DontMove/Info.plist`:
`UIBackgroundModes` absent, `NSMicrophoneUsageDescription` absent, `CFBundleVersion` 3,
`CFBundleShortVersionString` 1.0.0. (`ios/` is git-ignored and not part of the commit.)

## TODO — after release (not touched)

- **Android `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MEDIA_PLAYBACK`** (`app.json:43-44`): nothing in the app
  needs them with background playback off; Play review may ask. Decide before the first Play submission.
  (`app.json` cannot hold comments, so the note lives here.)
- **Android device check**: no Android build exists and none was run. `screenOrientation=portrait`,
  `resizeableActivity` not declared, targetSdk 36 — behaviour on tablets / foldables is unknown.
- **Vertical field of view differs by device** (#11): width is fixed at 9.4 tiles, height follows the aspect —
  iPhone SE 16.7, Pro Max 20.4, iPad window 27.1 tiles (`VisualPlaygroundScreen.tsx` `VIEW_TILES_WIDE`, `zoom`).
  Changes difficulty; a cap on the vertical view is a gameplay change.
- **Touch targets under 44 pt** (#15): pause / caught modal buttons and the result screen's secondary buttons
  are about 36 pt tall (`VisualPlaygroundScreen.tsx` `button` style, `MissionResult.tsx` `button` style).
- **System font size** (#16): only the Home menu caps scaling (`maxFontSizeMultiplier`); fixed 82 pt headers and
  absolutely positioned modals may overflow on a small iPhone with large text. Not tested.
- iPad tilt axes: the iOS attitude module has no interface-orientation term
  (`modules/dont-move-attitude/ios/DontMoveAttitudeModule.swift`); Touch is the iPad default instead of a fix.

## Stage B — measured in the simulator

Debug build of the scratch project (iPhone-only, as the store build) running this working tree.

| Device | App window (pt) | Game view (tiles, w × h) |
|---|---|---|
| iPhone SE 3 (iOS 26.5) | 375 × 667 | 9.4 × 16.7 |
| iPhone 18 Pro Max (iOS 27) | 440 × 956 | 9.4 × 20.4 |
| iPad Air 11 (iPadOS 27) | 410 × 1180 window, resizable | 9.4 × 27.1 |
| iPad Air 11, window dragged shorter | 410 × 767 | 9.4 × 17.6 |
| iPad mini, iPad Pro 13 (iPadOS 27) | same windowed presentation (home / intro only) | not measured |

iPad: the system window-control pill lies over the top-left of the app window. Back button frame 16, 46, 44 × 54;
a tap at its centre (y 72) did not reach the app, a tap at y 86 did. The mission label in the game HUD is under
the pill too (not interactive).

Captures: `Reports/BUILD3_SIZE_CHECK/`.

The iPad rows above are from before the fix.

Not run: Android (no Android build exists; `adb` not on PATH), tilt on any device (no sensor in the simulator),
system font-size changes, iPad held in landscape.
