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

export function appendAnalyticsEvent(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  const event: AnalyticsEvent = { id: newId(), at: Date.now(), name, props };
  void ensureMemory().then((events) => {
    memory = [...events, event].slice(-ANALYTICS_MAX_EVENTS);
    const encoded = JSON.stringify(memory);
    saving = saving.catch(() => {}).then(() => AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, encoded));
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
