# Android build verification

The app uses Expo SDK 57 / React Native 0.86 and generated native projects. Configure native behavior in app.json and config plugins; do not hand-edit android/.

## Local build

Use Node 22.13+ and an Android SDK. This Mac already has the JDK bundled with Android Studio:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
npm ci
npx expo prebuild --platform android --no-install
npm run android
```

`npm run android` builds the app (`expo run:android`). It previously only started Metro/Expo Go, which cannot supply this app's custom native dependencies.

For a release compilation check:

```sh
cd android
./gradlew :app:assembleRelease :app:bundleRelease
```

Generated local release artifacts use the template's debug signing configuration. They are compilation/test artifacts, not Play Store upload credentials. EAS production signing remains managed through the existing EAS profile.

## Skia native library preparation

The initial local installation contained react-native-skia-android binaries but had no @shopify/react-native-skia/libs/android output. Skia CMake requires these static libraries and raises a fatal error when libskia.a is absent. `postinstall` and `preandroid` now run tools/native/ensureSkiaLibraries.cjs. It checks every shipped Android static library and invokes the installed Skia official installer only when files are missing or incomplete.

If calling Gradle directly on an older node_modules directory, run this once before building:

```sh
node tools/native/ensureSkiaLibraries.cjs
```

## Android splash resource

The initial Release build failed at `:app:processReleaseResources`: the generated theme referenced `@drawable/splashscreen_logo`, but the splash plugin only had a background color. An Android-only image setting now uses the existing `assets/branding/splash-mark.png`. Prebuild generates all five density variants; iOS splash settings are unchanged.

## Dependency setup

- Expo, Constants and Updates use the SDK 57 recommended patch versions.
- expo-dev-client is installed to support the existing developmentClient EAS profile.
- expo-asset is explicit so Expo and audio resolve one native asset module.
- The existing AdMob classic backend settings are preserved. The Expo CLI's warning about a root-level react-native-google-mobile-ads key does not mean the native Gradle consumer ignores that key.
- The local DontMoveAttitude module is Apple-only. Android uses expo-sensors DeviceMotion; iOS module loading is guarded by Platform.OS.

If the user's npm/npx wrapper passes --allow-scripts into an install and causes EALLOWSCRIPTS, invoke the same Expo installer directly:

```sh
node node_modules/expo/bin/cli install --check
node node_modules/expo/bin/cli install <package>
```

## Verification evidence

See Reports/AndroidBuildAudit/ for Android prebuild, Metro export, Gradle build, TypeScript, lint and targeted regression logs. Release APK and AAB passed for all four default ABIs. See [the audit report](reports/ANDROID_BUILD_AUDIT_2026-10-07.md) for findings, evidence and device-testing limits.

Official references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and [development builds](https://docs.expo.dev/develop/development-builds/introduction/).
