"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Trophy, Swords, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type FeedItem = {
  id: string;
  user_id: string;
  type: string;
  description: string;
  created_at: string;
  metadata: any;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
};

export default function LiveActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchFeed();

    const channel = supabase
      .channel("public:activity_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        // Fetch the user's profile for the new payload, since the raw payload doesn't join
        fetchProfileForNewItem(payload.new as FeedItem);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeed = async () => {
    const { data } = await supabase
      .from("activity_feed")
      .select(`
        *,
        profiles (full_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(20);
      
    if (data) setFeed(data);
  };

  const fetchProfileForNewItem = async (item: FeedItem) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", item.user_id)
      .single();
      
    if (data) {
      const newItem = { ...item, profiles: data };
      setFeed((prev) => [newItem, ...prev].slice(0, 20));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "mission": return <Zap className="text-yellow-500" size={16} />;
      case "chess": return <Swords className="text-orange-500" size={16} />;
      case "achievement": return <Trophy className="text-blue-500" size={16} />;
      default: return <Activity className="text-muted-foreground" size={16} />;
    }
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm flex flex-col h-[600px]">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Activity className="text-primary" size={20} />
        <h3 className="text-lg font-black tracking-tight">Live Activity & Matches</h3>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {feed.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm mt-10">No recent activity.</div>
        ) : (
          feed.map((item) => (
            <div key={item.id} className="flex gap-4 items-start p-3 rounded-2xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-right-4">
              <Link href={`/profile/${item.user_id}`} className="shrink-0 group relative">
                <div className="w-10 h-10 rounded-full border border-border overflow-hidden bg-muted">
                  {item.profiles?.avatar_url ? (
                    <img src={item.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-muted to-muted-foreground/20"></div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border">
                  {getIcon(item.type)}
                </div>
              </Link>
              
              <div className="flex flex-col">
                <p className="text-sm">
                  <Link href={`/profile/${item.user_id}`} className="font-bold hover:text-primary transition-colors hover:underline">
                    {item.profiles?.full_name || "Someone"}
                  </Link>{" "}
                  <span className="text-muted-foreground">{item.description}</span>
                </p>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
