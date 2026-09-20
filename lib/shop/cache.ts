import "server-only";

// Tiny per-instance TTL cache that also de-duplicates concurrent loads.
export function ttlCache<T>(ms: number, load: () => Promise<T>) {
  let value: { at: number; data: T } | null = null;
  let inflight: Promise<T> | null = null;
  return async (): Promise<T> => {
    if (value && Date.now() - value.at < ms) return value.data;
    inflight ??= load()
      .then((data) => {
        value = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}
