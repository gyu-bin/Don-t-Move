import { Platform } from 'react-native';
import { appendAnalyticsEvent } from './analyticsStorage';
import { uploadAnalyticsEvent } from './analyticsRemote';
import type { AnalyticsEventName, AnalyticsProps } from './analyticsTypes';

function platformName(): string {
  return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
    ? Platform.OS
    : 'unknown';
}

/** Fire-and-forget local + Supabase analytics. Never throws to gameplay callers. */
export function track(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  try {
    const merged = { platform: platformName(), ...props };
    appendAnalyticsEvent(name, merged);
    uploadAnalyticsEvent(name, merged);
  } catch {
    /* ignore */
  }
}
