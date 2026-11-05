"use client";
import { useRef, useState } from "react";
export function useMatchAction({
  pauseSync,
  resumeSync,
  refresh,
  onError,
}: {
  pauseSync: () => void;
  resumeSync: () => void;
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const lock = useRef(false),
    [busy, setBusy] = useState(false);
  async function action(run: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    pauseSync();
    try {
      await run();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Action failed");
    } finally {
      resumeSync();
      try {
        await refresh();
      } finally {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return { action, busy };
}
