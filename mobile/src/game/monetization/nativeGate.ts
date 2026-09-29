import { TurboModuleRegistry } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { adsLog } from './adsConfig';

/** Prefer get() — getEnforcing throws and redboxes before our try/catch can help. */
function hasTurboModule(name: string): boolean {
  try {
    return TurboModuleRegistry.get(name) != null;
  } catch {
    return false;
  }
}

export function hasGoogleMobileAdsNative(): boolean {
  return hasTurboModule('RNGoogleMobileAdsModule');
}

export function hasExpoIapNative(): boolean {
  try {
    return requireOptionalNativeModule('ExpoIap') != null;
  } catch {
    return hasTurboModule('ExpoIap');
  }
}

export function monetizationNativeReady(): boolean {
  const ads = hasGoogleMobileAdsNative();
  const iap = hasExpoIapNative();
  if (!ads || !iap) {
    adsLog(
      'native modules missing — ads/iap deferred until Dev Build rebuild',
      { ads, iap },
    );
  }
  return ads && iap;
}
