"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Circle, Users } from "lucide-react";
import Link from "next/link";

type OnlineUser = {
  user_id: string;
  full_name: string;
  avatar_url: string;
  department: string;
  online_at: string;
};

export default function OnlineUsersWidget({ currentUserId, profile }: { currentUserId: string, profile: any }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Create a unique presence channel
    const channel = supabase.channel('online_users', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        
        // Flatten the presence state and grab the most recent presence per user
        const users = new Map<string, OnlineUser>();
        
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            // Usually the first one is fine
            const p = presences[0];
            if (p.user_id !== currentUserId) {
              users.set(p.user_id, p as OnlineUser);
            }
          }
        }
        
        // Convert to array and sort by recent
        const onlineArr = Array.from(users.values()).sort((a, b) => {
          return new Date(b.online_at).getTime() - new Date(a.online_at).getTime();
        });
        
        setOnlineUsers(onlineArr);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the current user's presence
          await channel.track({
            user_id: currentUserId,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            department: profile.department,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, profile.full_name, profile.avatar_url, profile.department, supabase]);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-black tracking-tight">Who's Online</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
          <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
          {onlineUsers.length} Online
        </div>
      </div>
      
      <div className="space-y-3">
        {onlineUsers.length > 0 ? (
          onlineUsers.slice(0, 5).map((u) => (
            <Link 
              href={`/profile/${u.user_id}`} 
              key={u.user_id} 
              className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/40 hover:bg-background/80 transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full border-2 border-background shadow-sm overflow-hidden bg-secondary flex items-center justify-center">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{u.full_name || "Unknown User"}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{u.department || "Employee"}</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View Profile
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-6 bg-background/50 rounded-2xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground font-medium">No other coworkers online.</p>
          </div>
        )}

        {onlineUsers.length > 5 && (
          <div className="text-center pt-2">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              + {onlineUsers.length - 5} more online
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
