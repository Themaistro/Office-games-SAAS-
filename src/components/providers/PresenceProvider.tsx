"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;

    const setupPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, department, role')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      channel = supabase.channel('online_users', {
        config: { presence: { key: session.user.id } },
      });

      const updatePresenceState = () => {
        const state = channel.presenceState();
        const users = new Map<string, OnlineUser>();
        
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            const p = presences[0];
            if (p.user_id !== session.user.id) {
              users.set(p.user_id, p as OnlineUser);
            }
          }
        }
        
        const onlineArr = Array.from(users.values()).sort((a, b) => {
          return new Date(b.online_at).getTime() - new Date(a.online_at).getTime();
        });
        
        setOnlineUsers(onlineArr);
      };

      channel
        .on('presence', { event: 'sync' }, updatePresenceState)
        .on('presence', { event: 'join' }, updatePresenceState)
        .on('presence', { event: 'leave' }, updatePresenceState)
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            if (profile.role !== 'admin') {
              await channel.track({
                user_id: session.user.id,
                full_name: profile.full_name || "Unknown",
                avatar_url: profile.avatar_url || "",
                department: profile.department || "",
                online_at: new Date().toISOString(),
              });
            }
          }
        });
    };

    setupPresence();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
