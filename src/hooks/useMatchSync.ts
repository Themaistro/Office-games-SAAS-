"use client";
import type { GameType } from "@/features/lounge/domain/game-registry";
import {
  assertMatchSnapshot,
  isOlderSnapshot,
  type MatchIdentity,
} from "@/features/lounge/domain/match-snapshot";
import { createSnapshotSync } from "@/features/lounge/application/snapshot-sync";
import { useGameRealtime } from "./useGameRealtime";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMatchSync<T extends MatchIdentity>(
  initialGame: T,
  type: GameType,
) {
  const [game, setGame] = useState(initialGame),
    [connectionIssue, setConnectionIssue] = useState(false);
  const sync = useRef<ReturnType<typeof createSnapshotSync<T>> | null>(null);
  const paused = useRef(false);
  const realtimeHealthy = useGameRealtime(
    type,
    initialGame.id,
    () => {
      void sync.current?.refresh();
    },
    () => {
      void sync.current?.refresh();
    },
  );
  const pauseSync = useCallback(() => {
    paused.current = true;
    sync.current?.pause();
  }, []);
  const resumeSync = useCallback(() => {
    paused.current = false;
    sync.current?.resume();
  }, []);
  const refresh = useCallback(
    () => sync.current?.refresh() ?? Promise.resolve(),
    [],
  );
  useEffect(() => {
    if (!paused.current)
      setGame((current) =>
        current.id !== initialGame.id || !isOlderSnapshot(initialGame, current)
          ? initialGame
          : current,
      );
  }, [initialGame]);
  useEffect(() => {
    const coordinator = createSnapshotSync<T>({
      read: async (signal) => {
        const response = await fetch(`/api/${type}/${initialGame.id}`, {
          cache: "no-store",
          signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw new Error("Match unavailable");
        const value: unknown = await response.json();
        assertMatchSnapshot(value, type, initialGame.id);
        return value as T;
      },
      apply: (next) => {
        setGame((current) =>
          current.id === next.id && isOlderSnapshot(next, current)
            ? current
            : next,
        );
        setConnectionIssue(false);
      },
      failed: () => setConnectionIssue(true),
    });
    sync.current = coordinator;
    if (paused.current) coordinator.pause();
    const focused = () => {
      if (document.visibilityState === "visible") void coordinator.refresh();
    };
    let nextPollAt = 0;
    const timer = window.setInterval(() => {
      if (Date.now() < nextPollAt) return;
      nextPollAt = Date.now() + (realtimeHealthy.current ? 5000 : 2500);
      focused();
    }, 500);
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    document.addEventListener("visibilitychange", focused);
    void coordinator.refresh();
    return () => {
      coordinator.dispose();
      if (sync.current === coordinator) sync.current = null;
      clearInterval(timer);
      window.removeEventListener("focus", focused);
      window.removeEventListener("online", focused);
      document.removeEventListener("visibilitychange", focused);
    };
  }, [type, initialGame.id]);
  return { game, setGame, refresh, connectionIssue, pauseSync, resumeSync };
}
