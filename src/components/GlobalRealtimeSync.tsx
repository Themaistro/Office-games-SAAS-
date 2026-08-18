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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        // We removed window.location.reload()! 
        // Now it seamlessly updates the server components behind the scenes
        triggerRefresh();
      })
      .subscribe();

    let presenceChannel: any = null;

    const setupPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, department')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      presenceChannel = supabase.channel('online_users', {
        config: { presence: { key: session.user.id } },
      });

      presenceChannel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: session.user.id,
            full_name: profile.full_name || "Unknown",
            avatar_url: profile.avatar_url || "",
            department: profile.department || "",
            online_at: new Date().toISOString(),
          });
        }
      });
    };

    setupPresence();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [router]);

  return null;
}
