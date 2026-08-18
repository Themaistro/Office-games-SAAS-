"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Swords, X as XIcon, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { joinChessGame, cancelChessGame } from "@/app/dashboard/chess/actions";
import { joinTttGame, cancelTttGame } from "@/app/dashboard/ttt/actions";

import { useRouter } from "next/navigation";

type OpenGame = {
  id: string;
  creator_id: string;
  player1_id?: string;
  player2_id?: string;
  game_type: "chess" | "ttt";
  created_at: string;
  status: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    chess_elo?: number;
    ttt_elo?: number;
  };
};

export default function UnifiedLobbiesWidget({ currentUserId }: { currentUserId: string }) {
  const [games, setGames] = useState<OpenGame[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchGames();

    const handleGameChange = () => {
      setTimeout(() => fetchGames(), 500);
    };

    const chessChannel = supabase
      .channel('public:chess_games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chess_games' }, handleGameChange)
      .subscribe();

    const tttChannel = supabase
      .channel('public:ttt_games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ttt_games' }, handleGameChange)
      .subscribe();

    return () => {
      supabase.removeChannel(chessChannel);
      supabase.removeChannel(tttChannel);
    };
  }, []);

  const fetchGames = async () => {
    const { data: chessData } = await supabase
      .from('chess_games')
      .select(`
        id, 
        white_player_id, 
        black_player_id,
        status,
        created_at, 
        white_profile:profiles!chess_games_white_player_id_fkey(full_name, avatar_url, chess_elo),
        black_profile:profiles!chess_games_black_player_id_fkey(full_name, avatar_url, chess_elo)
      `)
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false });

    const { data: tttData } = await supabase
      .from('ttt_games')
      .select(`
        id, 
        x_player_id, 
        o_player_id,
        status,
        created_at, 
        x_profile:profiles!ttt_games_x_player_id_fkey(full_name, avatar_url, ttt_elo),
        o_profile:profiles!ttt_games_o_player_id_fkey(full_name, avatar_url, ttt_elo)
      `)
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false });

    const openGames: OpenGame[] = [];

    if (chessData) {
      chessData.forEach((g: any) => {
        const creatorId = g.white_player_id || g.black_player_id;
        const profile = g.white_profile || g.black_profile;
        openGames.push({
          id: g.id,
          creator_id: creatorId,
          player1_id: g.white_player_id,
          player2_id: g.black_player_id,
          game_type: "chess",
          created_at: g.created_at,
          status: g.status,
          profiles: profile
        });
      });
    }

    if (tttData) {
      tttData.forEach((g: any) => {
        const creatorId = g.x_player_id || g.o_player_id;
        const profile = g.x_profile || g.o_profile;
        openGames.push({
          id: g.id,
          creator_id: creatorId,
          player1_id: g.x_player_id,
          player2_id: g.o_player_id,
          game_type: "ttt",
          created_at: g.created_at,
          status: g.status,
          profiles: profile
        });
      });
    }

    openGames.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setGames(openGames);
  };

  const handleJoin = async (gameId: string, gameType: "chess" | "ttt") => {
    setJoiningId(gameId);
    try {
      if (gameType === "chess") {
        await joinChessGame(gameId);
      } else {
        await joinTttGame(gameId);
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      alert("Failed to join game: " + err.message);
      setJoiningId(null);
    }
  };

  const handleCancel = async (gameId: string, gameType: "chess" | "ttt") => {
    try {
      if (gameType === "chess") {
        await cancelChessGame(gameId);
      } else {
        await cancelTttGame(gameId);
      }
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      alert("Failed to cancel game: " + err.message);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
      <h3 className="font-bold text-lg mb-6 tracking-tight">Live & Open Games</h3>
      <div className="space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-8 bg-background/50 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground text-sm font-medium">No open games right now.<br/>Be the first to create one!</p>
          </div>
        ) : (
          games.map((g) => {
            const isCreator = g.creator_id === currentUserId;
            
            return (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/40 group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${g.game_type === 'chess' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {g.game_type === 'chess' ? <Swords size={20} /> : <XIcon size={20} />}
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-background shadow-sm overflow-hidden bg-secondary flex items-center justify-center">
                        {g.profiles?.avatar_url ? (
                          <img src={g.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight">
                        {g.status === 'in_progress'
                          ? (g.player1_id === currentUserId || g.player2_id === currentUserId)
                            ? '⚡ Your Game'
                            : 'Live Match'
                          : (g.profiles?.full_name || "Unknown")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {g.game_type === 'chess' ? 'Chess' : 'Tic Tac Toe'} • {formatDistanceToNow(new Date(g.created_at))} ago
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-4">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-black text-primary">
                      {g.game_type === 'chess' ? (g.profiles?.chess_elo || 1200) : (g.profiles?.ttt_elo || 1200)}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">ELO</div>
                  </div>

                  {g.status === 'in_progress' ? (
                    (g.player1_id === currentUserId || g.player2_id === currentUserId) ? (
                      <button
                        onClick={() => router.push(`/dashboard/${g.game_type}/${g.id}`)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        Return to Game
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/dashboard/${g.game_type}/${g.id}`)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm"
                      >
                        Spectate
                      </button>
                    )
                  ) : isCreator ? (
                    <button
                      onClick={() => handleCancel(g.id, g.game_type)}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(g.id, g.game_type)}
                      disabled={joiningId === g.id}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {joiningId === g.id ? "Joining..." : "Join"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
