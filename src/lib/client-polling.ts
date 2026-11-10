export type Snapshot<T> = {
  data: T | undefined;
  loading: boolean;
  failed: boolean;
};
type Store = {
  snapshot: Snapshot<unknown>;
  listeners: Set<() => void>;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
  start: () => void;
  stop: () => void;
};
export const empty: Snapshot<never> = {
  data: undefined,
  loading: true,
  failed: false,
};

export function createPollingStore(url: string, interval: number): Store {
  let controller: AbortController | null = null;
  let pending: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let mutationRevision = 0;
  let failures = 0;
  const store: Store = {
    snapshot: empty,
    listeners: new Set(),
    refresh,
    invalidate,
    start,
    stop,
  };
  async function invalidate() {
    mutationRevision++;
    // A mutation may finish after an older read started. Follow that read with
    // a fresh one rather than treating its pre-mutation result as current.
    if (pending) await pending;
    await refresh();
  }
  function emit(snapshot: Snapshot<unknown>) {
    store.snapshot = snapshot;
    store.listeners.forEach((listener) => listener());
  }
  function refresh(): Promise<void> {
    if (pending) return pending;
    if (!store.listeners.size || document.visibilityState !== "visible")
      return Promise.resolve();
    controller = new AbortController();
    const current = generation;
    const revision = mutationRevision;
    pending = (async () => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller!.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) throw new Error("Snapshot unavailable");
        const data: unknown = await response.json();
        if (generation === current && revision === mutationRevision) {
          failures = 0;
          emit({ data, loading: false, failed: false });
        }
      } catch {
        if (generation === current && revision === mutationRevision) {
          failures = Math.min(failures + 1, 5);
          emit({ ...store.snapshot, loading: false, failed: true });
        }
      } finally {
        if (generation === current) pending = null;
      }
    })();
    return pending;
  }
  function tick() {
    const current = generation;
    void refresh().finally(() => {
      if (generation === current && store.listeners.size)
        timer = setTimeout(
          tick,
          Math.min(60000, interval * 2 ** failures) +
            Math.random() * interval * 0.1,
        );
    });
  }
  function focused() {
    void refresh();
  }
  function start() {
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    document.addEventListener("visibilitychange", focused);
    tick();
  }
  function stop() {
    generation++;
    controller?.abort();
    pending = null;
    failures = 0;
    clearTimeout(timer);
    window.removeEventListener("focus", focused);
    window.removeEventListener("online", focused);
    document.removeEventListener("visibilitychange", focused);
    store.snapshot = empty;
  }
  return store;
}
