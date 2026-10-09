"use client";

import React, { useEffect, useMemo, useState } from "react";
import { User, Circle, Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import ChallengeMenu from "@/components/profile/ChallengeMenu";

import { usePresence } from "@/components/providers/PresenceProvider";

export default function OnlineUsersWidget({ currentUserId, profile: _profile }: { currentUserId: string; profile?: unknown }) {
  const onlineUsers = usePresence();
  const visibleUsers = onlineUsers.filter((user) => user.user_id !== currentUserId);
  const [activity, setActivity] = useState<{ user_id: string; description: string; created_at: string }[]>([]);

  useEffect(() => {
    const loadActivity = async () => {
      const response = await fetch("/api/activity", { cache: "no-store" });
      if (response.ok) setActivity(await response.json());
    };
    loadActivity();
    const timer = window.setInterval(loadActivity, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const latestByUser = useMemo(() => new Map(activity.map((item) => [item.user_id, item.description])), [activity]);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-black tracking-tight">Who's Online</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
          <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
          {visibleUsers.length} Online
        </div>
        <Link href="/people" className="text-xs font-black text-primary hover:underline">See everyone</Link>
      </div>
      
      <div className="space-y-3">
        {visibleUsers.length > 0 ? (
          visibleUsers.slice(0, 5).map((u) => (
            <div
              key={u.user_id} 
              className="flex items-center justify-between gap-2 rounded-2xl border border-border/40 bg-background/50 p-3 transition-colors hover:bg-background/80"
            >
              <Link href={`/profile/${u.user_id}`} className="flex min-w-0 flex-1 items-center gap-3 group">
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
                    <p className="truncate text-sm font-bold transition-colors group-hover:text-primary">{u.full_name || "Unknown User"}</p>
                  <p className="text-[10px] text-muted-foreground font-medium truncate">{latestByUser.get(u.user_id) || "Browsing the office"}</p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Message ${u.full_name || "this player"}`}
                  title="Message"
                  onClick={() => window.dispatchEvent(new CustomEvent("office-games:open-chat", { detail: { person: { id: u.user_id, full_name: u.full_name || "Unknown User", avatar_url: u.avatar_url } } }))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-primary transition-colors hover:bg-primary/10"
                >
                  <MessageCircle size={16} />
                </button>
                <ChallengeMenu targetUserId={u.user_id} compact />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 bg-background/50 rounded-2xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground font-medium">No other coworkers online.</p>
          </div>
        )}

        {visibleUsers.length > 5 && (
          <div className="text-center pt-2">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                 + {visibleUsers.length - 5} more online
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

