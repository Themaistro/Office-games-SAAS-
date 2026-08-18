"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GlobalRealtimeSync() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  useEffect(() => {
    const supabase = createClient();
    
    // Debounce the refresh to prevent spamming the server
    let timeoutId: NodeJS.Timeout;
    const triggerRefresh = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        startTransition(() => {
          router.refresh();
        });
      }, 1000); // Max 1 refresh per second
    };

    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => triggerRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_sessions' }, () => triggerRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => triggerRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chess_games' }, () => triggerRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ttt_games' }, () => triggerRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        // We removed window.location.reload()! 
        // Now it seamlessly updates the server components behind the scenes
        triggerRefresh();
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
