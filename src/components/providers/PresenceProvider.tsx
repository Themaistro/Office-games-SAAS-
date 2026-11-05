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

  useEffect(() => {
    // Presence is only needed inside the authenticated application. Avoid
    // starting background requests on public/auth pages during hydration.
    if (
      !enabled ||
      !pathname ||
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register"
    ) {
      return;
    }

    const controller = new AbortController();
    const update = async () => {
      try {
        await fetch("/api/presence", {
          method: "POST",
          signal: controller.signal,
        });
        const response = await fetch("/api/presence", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok && !controller.signal.aborted)
          setOnlineUsers(await response.json());
      } catch {
        /* Keep the previous presence snapshot during a network interruption. */
      }
    };
    void update();
    const timer = window.setInterval(update, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pathname, enabled]);

  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
