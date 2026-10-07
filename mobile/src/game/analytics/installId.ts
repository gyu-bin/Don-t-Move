import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dont-move.analytics.install-id.v1';

function uuid(): string {
  // RFC4122-ish v4 without crypto dependency in RN/tests.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const n = (Math.random() * 16) | 0;
    const v = ch === 'x' ? n : (n & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;
let loading: Promise<string> | null = null;

export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    try {
      const existing = await AsyncStorage.getItem(KEY);
      if (existing && existing.length >= 32) {
        cached = existing;
        return existing;
      }
      const created = uuid();
      await AsyncStorage.setItem(KEY, created);
      cached = created;
      return created;
    } catch {
      const fallback = uuid();
      cached = fallback;
      return fallback;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
