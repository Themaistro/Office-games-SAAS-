"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Swords, X as XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { acceptChallenge } from "@/app/dashboard/chess/actions";
import { acceptTttChallenge } from "@/app/dashboard/ttt/actions";

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBellClient({ userId }: NotificationBellProps) {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchChallenges = async () => {
    if (!userId) return;
    
    // Fetch Chess challenges
    const { data: chessData } = await supabase
      .from("chess_games")
      .select("id, created_at, white:profiles!chess_games_white_player_id_fkey(full_name)")
      .eq("black_player_id", userId)
      .eq("status", "waiting");

    // Fetch TTT challenges
    const { data: tttData } = await supabase
      .from("ttt_games")
      .select("id, created_at, x_player:profiles!ttt_games_x_player_id_fkey(full_name)")
      .eq("o_player_id", userId)
      .eq("status", "waiting");

    const mappedChess = (chessData || []).map((g: any) => ({
      id: g.id,
      type: "chess",
      challenger: g.white?.full_name || "Someone",
      createdAt: new Date(g.created_at).getTime()
    }));

    const mappedTtt = (tttData || []).map((g: any) => ({
      id: g.id,
      type: "ttt",
      challenger: g.x_player?.full_name || "Someone",
      createdAt: new Date(g.created_at).getTime()
    }));

    const all = [...mappedChess, ...mappedTtt].sort((a, b) => b.createdAt - a.createdAt);
    setChallenges(all);
  };

  useEffect(() => {
    fetchChallenges();

    const handleNewChallenge = () => {
      fetchChallenges();
      setIsOpen(true);
      const audio = new Audio("/sounds/check.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio blocked by browser", e));
    };

    // Listen for new challenges
    const chessSub = supabase.channel('chess_challenges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chess_games', filter: `black_player_id=eq.${userId}` }, handleNewChallenge)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chess_games', filter: `black_player_id=eq.${userId}` }, fetchChallenges)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chess_games', filter: `black_player_id=eq.${userId}` }, fetchChallenges)
      .subscribe();

    const tttSub = supabase.channel('ttt_challenges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ttt_games', filter: `o_player_id=eq.${userId}` }, handleNewChallenge)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ttt_games', filter: `o_player_id=eq.${userId}` }, fetchChallenges)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ttt_games', filter: `o_player_id=eq.${userId}` }, fetchChallenges)
      .subscribe();

    return () => {
      supabase.removeChannel(chessSub);
      supabase.removeChannel(tttSub);
    };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccept = async (challenge: any) => {
    try {
      if (challenge.type === "chess") {
        await acceptChallenge(challenge.id);
      } else {
        await acceptTttChallenge(challenge.id);
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      alert("Failed to join game: " + err.message);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors"
      >
        <Bell size={20} className="text-muted-foreground" />
        {challenges.length > 0 && (
          <div className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex justify-between items-center">
            <p className="text-sm font-bold text-foreground">Notifications</p>
            <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{challenges.length}</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {challenges.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new challenges right now.
              </div>
            ) : (
              <div className="flex flex-col">
                {challenges.map((c) => (
                  <div key={c.id} className="p-3 border-b border-border/40 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium mb-2">
                      <span className="font-bold text-primary">{c.challenger}</span> challenged you to a game of <span className="font-bold">{c.type === 'chess' ? 'Chess' : 'Tic Tac Toe'}</span>!
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAccept(c)}
                        className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        {c.type === "chess" ? <Swords size={12} /> : <XIcon size={12} />} Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
