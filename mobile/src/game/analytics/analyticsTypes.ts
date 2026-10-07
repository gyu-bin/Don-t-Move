export type AnalyticsEventName =
  | 'session_start'
  | 'mission_start'
  | 'mission_clear'
  | 'mission_caught'
  | 'mission_retry'
  | 'mission_quit'
  | 'chapter_complete'
  | 'control_mode_change'
  | 'interstitial_due'
  | 'interstitial_shown'
  | 'interstitial_skipped'
  | 'remove_ads_purchased'
  | 'remove_ads_restored'
  | 'remove_ads_restore_empty'
  | 'remove_ads_failed';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsEvent {
  id: string;
  at: number;
  name: AnalyticsEventName;
  props: AnalyticsProps;
}

export const ANALYTICS_STORAGE_KEY = 'dont-move.analytics.v1';
export const ANALYTICS_MAX_EVENTS = 4000;
