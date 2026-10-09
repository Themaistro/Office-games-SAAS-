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

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Presence is only needed inside the authenticated application. Avoid
    // starting background requests on public/auth pages during hydration.
    if (!pathname || pathname === "/" || pathname === "/login" || pathname === "/register") {
      return;
    }

    const update = async () => { await fetch('/api/presence', { method: 'POST' }); const response = await fetch('/api/presence', { cache: 'no-store' }); if (response.ok) setOnlineUsers(await response.json()); };
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}

