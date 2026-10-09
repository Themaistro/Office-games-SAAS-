"use client";

import React, { useEffect, useState } from "react";
import { Swords, X as XIcon, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { joinChessGame, cancelChessGame } from "@/app/dashboard/chess/actions";
import { joinTttGame, cancelTttGame } from "@/app/dashboard/ttt/actions";
import { joinConnectFourGame, cancelConnectFourGame } from "@/app/dashboard/connect-four/actions";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { getLoungeRank } from "@/lib/lounge-ranks";
import { GAME_TYPES, getGameLabel, type GameType } from "@/lib/game-registry";

type OpenGame = {
  id: string;
  creator_id: string;
  player1_id?: string;
  player2_id?: string;
  game_type: GameType;
  created_at: string;
  status: string;
  spectator_count?: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
    lounge_lp?: number;
  };
  player1_profile?: OpenGame["profiles"];
  player2_profile?: OpenGame["profiles"];
};

export default function UnifiedLobbiesWidget({ currentUserId }: { currentUserId: string }) {
  const [games, setGames] = useState<OpenGame[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const liveGames = games.filter((game) => game.status === "in_progress");
  // Only waiting lobbies are joinable. Completed, cancelled, and abandoned
  // matches must never reappear as open games after the review screen.
  const openGames = games.filter((game) => game.status === "waiting");
  const orderedGames = [...openGames, ...liveGames];

  useEffect(() => {
    fetchGames();

    const timer = window.setInterval(fetchGames, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/lobbies', { cache: 'no-store' });
      if (!response.ok) throw new Error("Lobbies unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid lobby response");
      setGames(data.filter((game: OpenGame) => GAME_TYPES.includes(game.game_type)));
      setConnectionIssue(false);
    } catch {
      // Never leave an old lobby snapshot on screen after the source is unavailable.
      setGames([]);
      setConnectionIssue(true);
    }
    return;
  };
  const handleJoin = async (gameId: string, gameType: GameType) => {
    setJoiningId(gameId);
    try {
      if (gameType === "chess") {
        await joinChessGame(gameId);
      } else if (gameType === "ttt") {
        await joinTttGame(gameId);
      } else {
        await joinConnectFourGame(gameId);
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      toast("Failed to join game: " + err.message);
      setJoiningId(null);
    }
  };

  const handleCancel = async (gameId: string, gameType: GameType) => {
    try {
      if (gameType === "chess") {
        await cancelChessGame(gameId);
      } else if (gameType === "ttt") {
        await cancelTttGame(gameId);
      } else {
        await cancelConnectFourGame(gameId);
      }
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      toast("Failed to cancel game: " + err.message);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3"><div><h3 className="font-bold text-lg tracking-tight">Office games</h3><p className="text-xs text-muted-foreground">{openGames.length} open · {liveGames.length} live</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live now</span></div>
      {connectionIssue && <div role="status" className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700">Connection is unstable. We’re trying to reconnect to the lobby…</div>}
      <div className="space-y-3">
        {orderedGames.length === 0 ? (
          <div className="text-center py-8 bg-background/50 rounded-2xl border border-dashed border-border"><p className="text-muted-foreground text-sm font-medium">No open games or live matches right now.<br/>Be the first to start one!</p></div>
        ) : (
          orderedGames.map((g, index) => {
            const isCreator = g.creator_id === currentUserId;
            const opponent = g.player1_id === currentUserId ? g.player2_profile : g.player1_profile;
            const displayProfile = opponent || g.profiles;
            const matchLabel = g.player1_id === currentUserId || g.player2_id === currentUserId
              ? `⚡ vs ${opponent?.full_name || "Your opponent"}`
              : `${g.player1_profile?.full_name || "Player 1"} vs ${g.player2_profile?.full_name || "Player 2"}`;
            
            return (
              <React.Fragment key={g.id}>
              {(index === 0 || index === openGames.length) && <div className={`${index === openGames.length ? "pt-5" : ""} flex items-center justify-between`}><h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{index === openGames.length ? "Live matches" : "Open games"}</h4><span className="text-xs font-bold text-muted-foreground">{index === openGames.length ? liveGames.length : openGames.length}</span></div>}
              <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/40 bg-background/50 p-3 transition-colors hover:border-primary/30">
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${g.game_type === 'chess' ? 'bg-orange-500/20 text-orange-500' : g.game_type === 'connect-four' ? 'bg-violet-500/20 text-violet-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {g.game_type === 'chess' ? <Swords size={20} /> : g.game_type === 'connect-four' ? '🔴' : <XIcon size={20} />}
                  </div>

                  {/* Creator Info */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-background shadow-sm overflow-hidden bg-secondary flex items-center justify-center">
                        {displayProfile?.avatar_url ? (
                          <img src={displayProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="font-bold text-sm tracking-tight">
                        {g.status === 'in_progress'
                          ? (g.player1_id === currentUserId || g.player2_id === currentUserId)
                          ? matchLabel
                            : matchLabel
                            : (displayProfile?.full_name || "Unknown")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {getGameLabel(g.game_type)} • {formatDistanceToNow(new Date(g.created_at))} ago {g.status === 'in_progress' && g.spectator_count ? ` • ${g.spectator_count} watching` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 w-full items-center gap-3 lg:gap-4 lg:pl-4">
                  {g.game_type !== 'connect-four' && <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-sm font-black text-primary">
                      {getLoungeRank(displayProfile?.lounge_lp).name}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{getLoungeRank(displayProfile?.lounge_lp).lp} LP</div>
                  </div>}

                  {g.status === 'in_progress' ? (
                    (g.player1_id === currentUserId || g.player2_id === currentUserId) ? (
                      <button
                        onClick={() => router.push(`/dashboard/${g.game_type}/${g.id}`)}
                        className="flex-1 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                      >
                        Return to Game
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/dashboard/${g.game_type}/${g.id}`)}
                        className="flex-1 whitespace-nowrap rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90"
                      >
                        Spectate
                      </button>
                    )
                  ) : isCreator ? (
                    <button
                      onClick={() => handleCancel(g.id, g.game_type)}
                      className="flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 sm:flex-none"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(g.id, g.game_type)}
                      disabled={joiningId === g.id}
                      className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                    >
                      {joiningId === g.id ? "Joining..." : "Join"}
                    </button>
                  )}
                </div>
              </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

