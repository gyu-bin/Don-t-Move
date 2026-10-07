import type { AnalyticsEvent } from './analyticsTypes';

export type AdminTab = 'overview' | 'missions' | 'failures' | 'controls' | 'monetization';

export interface MissionRow {
  missionId: string;
  starts: number;
  clears: number;
  caught: number;
  retries: number;
  clearRate: number;
  avgClearSeconds: number | null;
}

export interface OverviewStats {
  eventCount: number;
  sessions: number;
  missionStarts: number;
  missionClears: number;
  missionCaught: number;
  clearRate: number;
  last7Days: { sessions: number; clears: number; caught: number };
  last30Days: { sessions: number; clears: number; caught: number };
}

export interface FailureStats {
  bySource: { guard: number; cctv: number; other: number };
  topMissions: { missionId: string; caught: number }[];
}

export interface ControlStats {
  tiltStarts: number;
  touchStarts: number;
  modeChanges: number;
  toTilt: number;
  toTouch: number;
}

export interface MonetizationStats {
  interstitialDue: number;
  interstitialShown: number;
  interstitialSkipped: number;
  showRate: number;
  removeAdsPurchased: number;
  removeAdsRestored: number;
  removeAdsRestoreEmpty: number;
  removeAdsFailed: number;
}

function dayAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function countSince(events: AnalyticsEvent[], name: string, since: number): number {
  return events.filter((e) => e.name === name && e.at >= since).length;
}

function missionIdOf(event: AnalyticsEvent): string {
  const id = event.props.missionId;
  return typeof id === 'string' && id ? id : 'unknown';
}

export function aggregateOverview(events: AnalyticsEvent[]): OverviewStats {
  const missionStarts = events.filter((e) => e.name === 'mission_start').length;
  const missionClears = events.filter((e) => e.name === 'mission_clear').length;
  const missionCaught = events.filter((e) => e.name === 'mission_caught').length;
  const sessions = events.filter((e) => e.name === 'session_start').length;
  const since7 = dayAgo(7);
  const since30 = dayAgo(30);
  return {
    eventCount: events.length,
    sessions,
    missionStarts,
    missionClears,
    missionCaught,
    clearRate: missionStarts > 0 ? missionClears / missionStarts : 0,
    last7Days: {
      sessions: countSince(events, 'session_start', since7),
      clears: countSince(events, 'mission_clear', since7),
      caught: countSince(events, 'mission_caught', since7),
    },
    last30Days: {
      sessions: countSince(events, 'session_start', since30),
      clears: countSince(events, 'mission_clear', since30),
      caught: countSince(events, 'mission_caught', since30),
    },
  };
}

export function aggregateMissions(events: AnalyticsEvent[]): MissionRow[] {
  const map = new Map<string, { starts: number; clears: number; caught: number; retries: number; clearSeconds: number[] }>();
  const row = (id: string) => {
    let cur = map.get(id);
    if (!cur) {
      cur = { starts: 0, clears: 0, caught: 0, retries: 0, clearSeconds: [] };
      map.set(id, cur);
    }
    return cur;
  };
  for (const event of events) {
    if (event.name === 'mission_start') row(missionIdOf(event)).starts += 1;
    else if (event.name === 'mission_clear') {
      const r = row(missionIdOf(event));
      r.clears += 1;
      const seconds = Number(event.props.seconds);
      if (Number.isFinite(seconds) && seconds >= 0) r.clearSeconds.push(seconds);
    } else if (event.name === 'mission_caught') row(missionIdOf(event)).caught += 1;
    else if (event.name === 'mission_retry') row(missionIdOf(event)).retries += 1;
  }
  return [...map.entries()]
    .map(([missionId, r]) => ({
      missionId,
      starts: r.starts,
      clears: r.clears,
      caught: r.caught,
      retries: r.retries,
      clearRate: r.starts > 0 ? r.clears / r.starts : 0,
      avgClearSeconds: r.clearSeconds.length
        ? r.clearSeconds.reduce((a, b) => a + b, 0) / r.clearSeconds.length
        : null,
    }))
    .sort((a, b) => a.missionId.localeCompare(b.missionId));
}

export function aggregateFailures(events: AnalyticsEvent[]): FailureStats {
  const bySource = { guard: 0, cctv: 0, other: 0 };
  const caughtByMission = new Map<string, number>();
  for (const event of events) {
    if (event.name !== 'mission_caught') continue;
    const source = event.props.catchSource;
    if (source === 'guard') bySource.guard += 1;
    else if (source === 'cctv') bySource.cctv += 1;
    else bySource.other += 1;
    const id = missionIdOf(event);
    caughtByMission.set(id, (caughtByMission.get(id) ?? 0) + 1);
  }
  const topMissions = [...caughtByMission.entries()]
    .map(([missionId, caught]) => ({ missionId, caught }))
    .sort((a, b) => b.caught - a.caught)
    .slice(0, 15);
  return { bySource, topMissions };
}

export function aggregateControls(events: AnalyticsEvent[]): ControlStats {
  let tiltStarts = 0;
  let touchStarts = 0;
  let modeChanges = 0;
  let toTilt = 0;
  let toTouch = 0;
  for (const event of events) {
    if (event.name === 'mission_start') {
      if (event.props.controlMode === 'tilt') tiltStarts += 1;
      else if (event.props.controlMode === 'touch') touchStarts += 1;
    } else if (event.name === 'control_mode_change') {
      modeChanges += 1;
      if (event.props.to === 'tilt') toTilt += 1;
      else if (event.props.to === 'touch') toTouch += 1;
    }
  }
  return { tiltStarts, touchStarts, modeChanges, toTilt, toTouch };
}

export function aggregateMonetization(events: AnalyticsEvent[]): MonetizationStats {
  const interstitialDue = events.filter((e) => e.name === 'interstitial_due').length;
  const interstitialShown = events.filter((e) => e.name === 'interstitial_shown').length;
  const interstitialSkipped = events.filter((e) => e.name === 'interstitial_skipped').length;
  return {
    interstitialDue,
    interstitialShown,
    interstitialSkipped,
    showRate: interstitialDue > 0 ? interstitialShown / interstitialDue : 0,
    removeAdsPurchased: events.filter((e) => e.name === 'remove_ads_purchased').length,
    removeAdsRestored: events.filter((e) => e.name === 'remove_ads_restored').length,
    removeAdsRestoreEmpty: events.filter((e) => e.name === 'remove_ads_restore_empty').length,
    removeAdsFailed: events.filter((e) => e.name === 'remove_ads_failed').length,
  };
}

export function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}
