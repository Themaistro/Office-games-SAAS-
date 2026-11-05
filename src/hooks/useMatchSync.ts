"use client";

import type { GameType } from "@/features/lounge/domain/game-registry";
import { getGameChannelName } from "@/lib/realtime";
import * as Ably from "ably";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMatchSync(initialGame: any, type: GameType) {
  const [game, setGame] = useState(initialGame);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const alive = useRef(true);
  const paused = useRef(false);
  const revision = useRef(0);
  const pauseSync = useCallback(() => {
    paused.current = true;
    revision.current += 1;
  }, []);
  const resumeSync = useCallback(() => {
    paused.current = false;
  }, []);
  const refresh = useCallback(async () => {
    if (paused.current) return;
    const requestRevision = ++revision.current;
    try {
      const response = await fetch(`/api/${type}/${initialGame.id}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Match unavailable");
      const next = await response.json();
      if (
        alive.current &&
        !paused.current &&
        requestRevision === revision.current
      ) {
        setGame(next);
        setConnectionIssue(false);
      }
    } catch {
      if (alive.current && requestRevision === revision.current)
        setConnectionIssue(true);
    }
  }, [initialGame.id, type]);
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame]);
  useEffect(() => {
    alive.current = true;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2500);
    const focused = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focused);
    document.addEventListener("visibilitychange", focused);
    const realtime = new Ably.Realtime({
      authUrl: `/api/realtime?type=${type}&id=${initialGame.id}`,
    });
    const channel = realtime.channels.get(
      getGameChannelName(type, initialGame.id),
    );
    // Only authenticated server snapshots become authoritative state.
    const handler = () => {
      void refresh();
    };
    void channel.subscribe(handler).catch(() => undefined);
    void refresh();
    return () => {
      alive.current = false;
      revision.current += 1;
      clearInterval(timer);
      window.removeEventListener("focus", focused);
      document.removeEventListener("visibilitychange", focused);
      channel.unsubscribe(handler);
      realtime.close();
    };
  }, [type, initialGame.id, refresh]);
  return { game, setGame, refresh, connectionIssue, pauseSync, resumeSync };
}
