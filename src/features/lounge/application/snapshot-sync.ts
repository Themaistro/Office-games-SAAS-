/** Serialized reads with per-read completion; polling cannot keep an action busy forever. */
export function createSnapshotSync<T>(ports: {
  read: (signal: AbortSignal) => Promise<T>;
  apply: (snapshot: T) => void;
  failed: () => void;
}) {
  let paused = false,
    disposed = false,
    generation = 0,
    running = false,
    controller: AbortController | null = null;
  let waiting: (() => void)[] = [];
  function releaseWaiting() {
    const queued = waiting;
    waiting = [];
    queued.forEach((resolve) => resolve());
  }
  async function drain() {
    running = true;
    try {
      while (waiting.length && !paused && !disposed) {
        const completed = waiting;
        waiting = [];
        const version = generation,
          request = new AbortController();
        controller = request;
        try {
          const value = await ports.read(request.signal);
          if (!paused && !disposed && version === generation)
            ports.apply(value);
        } catch {
          if (
            !paused &&
            !disposed &&
            version === generation &&
            !request.signal.aborted
          )
            ports.failed();
        } finally {
          completed.forEach((resolve) => resolve());
        }
      }
    } finally {
      running = false;
    }
  }
  return {
    refresh(): Promise<void> {
      if (paused || disposed) return Promise.resolve();
      const completion = new Promise<void>((resolve) => waiting.push(resolve));
      if (!running) void drain();
      return completion;
    },
    pause() {
      paused = true;
      generation++;
      controller?.abort();
      releaseWaiting();
    },
    resume() {
      paused = false;
    },
    dispose() {
      disposed = true;
      generation++;
      controller?.abort();
      releaseWaiting();
    },
  };
}
