import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ANALYTICS_MAX_EVENTS,
  ANALYTICS_STORAGE_KEY,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsProps,
} from './analyticsTypes';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeEvents(value: unknown): AnalyticsEvent[] {
  if (!Array.isArray(value)) return [];
  const out: AnalyticsEvent[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Partial<AnalyticsEvent>;
    if (typeof item.name !== 'string' || typeof item.at !== 'number') continue;
    out.push({
      id: typeof item.id === 'string' ? item.id : newId(),
      at: item.at,
      name: item.name as AnalyticsEventName,
      props: item.props && typeof item.props === 'object' ? item.props as AnalyticsProps : {},
    });
  }
  return out.slice(-ANALYTICS_MAX_EVENTS);
}

export async function loadAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
    return raw ? normalizeEvents(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

let saving: Promise<void> = Promise.resolve();
let memory: AnalyticsEvent[] | null = null;

async function ensureMemory(): Promise<AnalyticsEvent[]> {
  if (memory) return memory;
  memory = await loadAnalyticsEvents();
  return memory;
}

/** Events recorded within this window are written to storage together. */
export const ANALYTICS_FLUSH_DELAY_MS = 1500;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One storage write for a burst of events. The whole log (up to ANALYTICS_MAX_EVENTS rows) is one JSON value, so
 * encoding and writing it once per event put that cost on the JS thread several times in a row exactly where
 * events cluster: mission clear and the transition to the next mission.
 */
function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsEvents();
  }, ANALYTICS_FLUSH_DELAY_MS);
  // Node (tests): a pending flush must not keep the process alive.
  (flushTimer as { unref?: () => void }).unref?.();
}

/** Write what is in memory now. Never throws. */
export function flushAnalyticsEvents(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  const snapshot = memory;
  if (!snapshot) return saving.catch(() => {});
  let encoded: string;
  try { encoded = JSON.stringify(snapshot); } catch { return saving.catch(() => {}); }
  saving = saving.catch(() => {}).then(() => AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, encoded));
  return saving.catch(() => {});
}

export function appendAnalyticsEvent(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  const event: AnalyticsEvent = { id: newId(), at: Date.now(), name, props };
  void ensureMemory().then((loaded) => {
    // Append to what is in memory now, not to what it was when this event was recorded: several events recorded
    // in the same tick would otherwise each start from the same list and only the last would survive.
    memory = [...(memory ?? loaded), event].slice(-ANALYTICS_MAX_EVENTS);
    scheduleFlush();
  }).catch(() => {});
}

export async function readAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  return ensureMemory().then((events) => events.slice());
}

/** Test / reset helper. */
export async function replaceAnalyticsEvents(events: AnalyticsEvent[]): Promise<void> {
  memory = normalizeEvents(events);
  await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(memory));
}
