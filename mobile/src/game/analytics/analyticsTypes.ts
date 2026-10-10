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
  | 'interstitial_ready'
  | 'interstitial_shown'
  | 'interstitial_closed'
  | 'interstitial_skipped'
  // Mission Complete → Next Stage breadcrumbs: where a stalled or crashed transition stopped.
  | 'next_stage_pressed'
  | 'mission_transition_begin'
  | 'mission_old_unmounted'
  | 'mission_new_ready'
  | 'mission_transition_complete'
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
