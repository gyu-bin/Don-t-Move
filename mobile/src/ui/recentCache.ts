/**
 * Keeps the `limit` most recently used entries and forgets the rest. Forgetting only drops the reference: whatever
 * the value owns is released by its own lifecycle, never disposed from here.
 */
export function createRecentCache<K, V>(limit: number) {
  const entries = new Map<K, V>();
  const put = (key: K, value: V): V => {
    entries.delete(key);
    entries.set(key, value);
    while (entries.size > limit) entries.delete(entries.keys().next().value as K);
    return value;
  };
  return {
    /** Reading an entry makes it the most recent one, so the entry in use is never the one that falls out. */
    get(key: K): V | undefined {
      const value = entries.get(key);
      return value === undefined ? undefined : put(key, value);
    },
    put,
    keys: (): K[] => [...entries.keys()],
    get size() { return entries.size; },
  };
}
