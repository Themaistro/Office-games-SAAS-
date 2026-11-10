/** Bounded per-worker read cache. Never use for permissions or authoritative state. */
export function createShortReadCache<T>(ttlMs: number, maxEntries = 100) {
  const entries = new Map<
    string,
    { expires: number; value: Promise<T>; pending: boolean }
  >();
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const existing = entries.get(key);
    if (existing && (existing.pending || existing.expires > Date.now()))
      return existing.value;
    if (existing) entries.delete(key);
    if (entries.size >= maxEntries) {
      for (const [oldKey, entry] of entries) {
        if (!entry.pending) {
          entries.delete(oldKey);
          break;
        }
      }
      if (entries.size >= maxEntries) return load();
    }
    const entry = {
      expires: 0,
      value: Promise.resolve().then(load),
      pending: true,
    };
    entries.set(key, entry);
    try {
      const value = await entry.value;
      entry.pending = false;
      entry.expires = Date.now() + ttlMs;
      return value;
    } catch (error) {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    }
  };
}
