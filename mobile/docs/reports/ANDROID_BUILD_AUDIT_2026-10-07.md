# Android build audit — 2026-10-07

## Scope

React Native / Expo `mobile/`: source platform guards, imports and assets, native dependencies, Expo configuration, Android prebuild and actual Release compilation. Gameplay, campaign data and legacy-unity were not modified. Preexisting AdMob classic configuration in app.json was preserved.

## Findings and fixes

1. **Confirmed Release resource-link failure.** `:app:processReleaseResources` failed with `resource drawable/splashscreen_logo ... not found` (merged values.xml:8196). The splash theme referenced a drawable while the plugin had no image. Added Android-only existing `assets/branding/splash-mark.png`, width 120, contain. Prebuild now creates all five density variants. Failed log: `Reports/AndroidBuildAudit/gradle-splash-failure.log`.
2. **Skia native build prerequisite missing.** The installed binary package existed, but `@shopify/react-native-skia/libs/android` was absent. Installed Skia CMake fails when libskia.a is absent. Added an idempotent postinstall/preandroid check that delegates preparation to Skia's own installed script and verifies all 36 static libraries. Recovery and subsequent no-op were exercised.
3. **Dependency alignment.** Updated Expo 57 patch versions for Expo/Constants/Updates, installed expo-dev-client for the existing development build profile, and deduplicated expo-asset to one native version. Official Expo dependency check and autolinking verification pass.
4. **Android command.** `npm run android` now invokes `expo run:android`, building the required native modules instead of only starting Expo Go.

## Verification

| Check | Result |
|---|---|
| Expo Android prebuild | PASS |
| Expo dependency compatibility | PASS, dependencies up to date |
| Native autolinking / duplicate module check | PASS |
| TypeScript app + campaign | PASS |
| ESLint | 0 errors, 1 preexisting warning in src/ota/applyUpdate.ts:36 |
| Android Tilt / OTA / Ads regression tests | 42 PASS / 0 FAIL |
| Relative source imports / asset references | 708 / 219 checked, no missing or case-mismatched references |
| Android production JS bundle | PASS, actual Release build bundles 216 assets |
| ARM64 Release APK + AAB | PASS, BUILD SUCCESSFUL in 3m 45s, 966 tasks |
| Default four-ABI Release APK + AAB | PASS, BUILD SUCCESSFUL in 5m 23s, 1008 tasks |
| Physical Android device gameplay | Not tested |
| EAS cloud build / Play upload | Not executed |

## Build environment and limits

- Existing Android Studio bundled JDK 21; Android SDK 36/36.1.
- Gradle 9.3.1; NDK 27.0.12077973 installed as required by the build (existing NDK 27.1 also retained).
- Initial wrapper/download timeouts were environmental. Used the same official Gradle distribution and verified the official React Native Maven AAR checksum before caching it. No dependency source patches.
- Local Release uses the generated template's debug signing key; these artifacts verify compilation and are not signed for Play upload.
- Gradle/dependency deprecation warnings remain; the current Gradle build succeeds. This does not certify compatibility with future Gradle 10.

Logs are in `Reports/AndroidBuildAudit/`. Build reproduction and setup are documented in `docs/ANDROID_BUILD.md`.

## Generated artifacts

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`
- Both include armeabi-v7a, arm64-v8a, x86 and x86_64 native libraries.
- Final all-ABI log: `Reports/AndroidBuildAudit/gradle-release-all-abis.log`.
