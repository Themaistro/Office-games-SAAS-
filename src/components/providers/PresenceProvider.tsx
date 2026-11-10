"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type OnlineUser = {
  user_id: string;
  full_name: string;
  avatar_url: string;
  department: string;
  online_at: string;
};

const PresenceContext = createContext<OnlineUser[]>([]);

export function PresenceProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const pathname = usePathname();

  const activePage = Boolean(
    enabled && pathname && !["/", "/login", "/register"].includes(pathname),
  );
  useEffect(() => {
    // Presence is only needed inside the authenticated application. Avoid
    // starting background requests on public/auth pages during hydration.
    if (!activePage) return;

    const controller = new AbortController();
    let busy = false;
    const update = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (response.ok && !controller.signal.aborted) {
          const snapshot = await response.json();
          if (Array.isArray(snapshot.people)) setOnlineUsers(snapshot.people);
        }
      } catch {
        /* Keep the previous presence snapshot during a network interruption. */
      } finally {
        busy = false;
      }
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    void update();
    const timer = window.setInterval(update, 30000);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      controller.abort();
      window.clearInterval(timer);
    };
  }, [activePage]);

  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
