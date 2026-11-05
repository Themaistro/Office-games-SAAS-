"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getGameDefinition,
  getGamePath,
} from "@/features/lounge/domain/game-registry";
import { acceptedSentInvitation } from "@/features/lounge/domain/accepted-invitation";
import { SENT_INVITATION_EVENT } from "@/lib/sent-invitation";

export default function GlobalRealtimeSync({ userId }: { userId?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!userId) return;
    let active = true,
      busy = false;
    let navigating: string | null = null;
    const open = (path: string) => {
      if (window.location.pathname !== path && navigating !== path) {
        navigating = path;
        router.push(path, { scroll: false });
      }
    };
    const controller = new AbortController(),
      key = `office-games:sent-invitations:${userId}`;
    let tracked = new Set<string>();
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "[]");
      if (Array.isArray(saved))
        tracked = new Set(saved.filter((item) => typeof item === "string"));
    } catch {}
    const save = () => {
      try {
        sessionStorage.setItem(key, JSON.stringify([...tracked]));
      } catch {}
    };
    const update = async () => {
      if (busy || !active || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const response = await fetch("/api/challenges?sent=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const rows: unknown = await response.json();
        if (!active || !Array.isArray(rows)) return;
        for (const row of rows) {
          if (
            !row ||
            typeof row.id !== "string" ||
            typeof row.type !== "string" ||
            !getGameDefinition(row.type)
          )
            continue;
          if (row.status === "waiting") tracked.add(row.id);
        }
        let accepted = acceptedSentInvitation(rows, tracked);
        // Recover an already-accepted rematch after refreshing its finished board.
        const current = window.location.pathname.match(
          /^\/dashboard\/([^/]+)\/([0-9a-f-]+)$/i,
        );
        const activeMatch = rows.find(
          (row) =>
            row?.status === "in_progress" &&
            row.id !== current?.[2] &&
            getGameDefinition(row.type),
        );
        if (
          !accepted &&
          activeMatch &&
          current &&
          getGameDefinition(current[1])
        ) {
          const previous = await fetch(`/api/${current[1]}/${current[2]}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (previous.ok) {
            const board = await previous.json();
            if (
              board.status &&
              !["waiting", "in_progress"].includes(board.status)
            )
              accepted = acceptedSentInvitation(
                rows,
                new Set([activeMatch.id]),
              );
          }
        }
        if (!active) return;
        if (accepted) {
          tracked.delete(accepted.id);
          save();
          open(accepted.path);
          return;
        }
        const present = new Set(rows.map((row) => row?.id));
        tracked = new Set([...tracked].filter((id) => present.has(id)));
        save();
      } catch {
      } finally {
        busy = false;
      }
    };
    const sent = (event: Event) => {
      const value = (
        event as CustomEvent<{ id?: string; type?: string; accepted?: boolean }>
      ).detail;
      if (value?.id) {
        if (value.accepted && value.type && getGameDefinition(value.type)) {
          tracked.delete(value.id);
          save();
          const path = getGamePath(value.type, value.id);
          open(path);
          return;
        }
        tracked.add(value.id);
        save();
        void update();
      }
    };
    window.addEventListener(SENT_INVITATION_EVENT, sent);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    const timer = window.setInterval(update, 1000);
    void update();
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener(SENT_INVITATION_EVENT, sent);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [userId, router]);
  return null;
}
