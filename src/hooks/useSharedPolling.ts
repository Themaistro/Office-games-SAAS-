"use client";
import { useCallback, useSyncExternalStore } from "react";

import { createPollingStore, empty, type Snapshot } from "@/lib/client-polling";
const stores = new Map<string, ReturnType<typeof createPollingStore>>();

/** One request owner per endpoint/account, including multiple component consumers. */
export function useSharedPolling<T>(
  url: string,
  interval: number,
  scope = "company",
  enabled = true,
) {
  const key = `${scope}:${url}:${interval}`;
  let store = stores.get(key);
  if (!store && stores.size >= 100)
    for (const [oldKey, oldStore] of stores) {
      if (!oldStore.listeners.size) stores.delete(oldKey);
    }
  if (!store) {
    store = createPollingStore(url, interval);
    stores.set(key, store);
  }
  const selected = store;
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!enabled) return () => {};
      selected.listeners.add(listener);
      if (selected.listeners.size === 1) selected.start();
      return () => {
        selected.listeners.delete(listener);
        if (!selected.listeners.size) selected.stop();
      };
    },
    [enabled, selected],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (enabled ? selected.snapshot : empty),
    () => empty,
  ) as Snapshot<T>;
  return {
    ...snapshot,
    refresh: selected.refresh,
    invalidate: selected.invalidate,
  };
}
