"use client";
import type { GameType } from "@/features/lounge/domain/game-registry";
import {
  assertMatchSnapshot,
  isOlderSnapshot,
  type MatchIdentity,
} from "@/features/lounge/domain/match-snapshot";
import { createSnapshotSync } from "@/features/lounge/application/snapshot-sync";
import { getGameChannelName } from "@/lib/realtime";
import * as Ably from "ably";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMatchSync<T extends MatchIdentity>(
  initialGame: T,
  type: GameType,
) {
  const [game, setGame] = useState(initialGame),
    [connectionIssue, setConnectionIssue] = useState(false);
  const sync = useRef<ReturnType<typeof createSnapshotSync<T>> | null>(null);
  const paused = useRef(false);
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
    let active = true;
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
    const timer = window.setInterval(focused, 2500);
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    document.addEventListener("visibilitychange", focused);
    const realtime = new Ably.Realtime({
      authUrl: `/api/realtime?type=${type}&id=${initialGame.id}`,
    });
    const channel = realtime.channels.get(
      getGameChannelName(type, initialGame.id),
    );
    const handler = () => {
      void coordinator.refresh();
    };
    const connected = () => {
      void coordinator.refresh();
    };
    const disconnected = () => {
      if (active) setConnectionIssue(true);
    };
    realtime.connection.on("connected", connected);
    realtime.connection.on("disconnected", disconnected);
    realtime.connection.on("suspended", disconnected);
    realtime.connection.on("failed", disconnected);
    void channel.subscribe(handler).catch(disconnected);
    void coordinator.refresh();
    return () => {
      active = false;
      coordinator.dispose();
      if (sync.current === coordinator) sync.current = null;
      clearInterval(timer);
      window.removeEventListener("focus", focused);
      window.removeEventListener("online", focused);
      document.removeEventListener("visibilitychange", focused);
      realtime.connection.off();
      channel.unsubscribe(handler);
      realtime.close();
    };
  }, [type, initialGame.id]);
  return { game, setGame, refresh, connectionIssue, pauseSync, resumeSync };
}
