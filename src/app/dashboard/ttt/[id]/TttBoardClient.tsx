"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Circle, X as XIcon, Trophy, User, Flag } from "lucide-react";
import { makeTttMove, cancelTttGame, resignTttGame } from "../actions";
import { clsx } from "clsx";
import Link from "next/link";

export default function TttBoardClient({ initialGame, currentUserId }: { initialGame: any; currentUserId: string }) {
  const [game, setGame] = useState<any>(initialGame);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const channelRef = React.useRef<any>(null);

  useEffect(() => {
    setGame(initialGame);
  }, [initialGame]);

  useEffect(() => {
    const channel = supabase
      .channel(`ttt_games_${game.id}`, {
        config: { broadcast: { self: false } }
      })
      .on('broadcast', { event: 'move' }, (payload) => {
        const index = payload.payload;
        setGame((prev: any) => {
          if (prev.board_state[index] !== '-') return prev;
          const newBoard = prev.board_state.split("");
          newBoard[index] = prev.current_turn;
          return {
            ...prev,
            board_state: newBoard.join(""),
            current_turn: prev.current_turn === "X" ? "O" : "X"
          };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ttt_games', filter: `id=eq.${game.id}` }, (payload) => {
        const newRecord = payload.new;
        setGame((prev: any) => {
          if (prev.status === 'waiting' && newRecord.status === 'in_progress') {
            setTimeout(() => router.refresh(), 0);
          }
          return { ...prev, ...newRecord };
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [game.id, router]);

  const isX = game.x_player_id === currentUserId;
  const isO = game.o_player_id === currentUserId;
  const isSpectator = !isX && !isO;

  const mySymbol = isX ? "X" : isO ? "O" : null;
  const myTurn = mySymbol && game.current_turn === mySymbol && game.status === "in_progress";

  const handleCellClick = async (index: number) => {
    if (!myTurn || loadingAction || game.board_state[index] !== '-') return;
    
    // Optimistic update locally
    const newBoard = game.board_state.split("");
    newBoard[index] = mySymbol;
    setGame({ ...game, board_state: newBoard.join(""), current_turn: mySymbol === "X" ? "O" : "X" });

    // Broadcast move immediately to opponent
    channelRef.current?.send({
      type: 'broadcast',
      event: 'move',
      payload: index
    });

    setLoadingAction(true);
    try {
      await makeTttMove(game.id, index);
    } catch (err: any) {
      console.error(err);
      // Revert if error
      setGame(game);
    } finally {
      setLoadingAction(false);
    }
  };

  const isGameOver = game.status === "x_won" || game.status === "o_won" || game.status === "draw";

  let statusMessage = "Waiting for Opponent...";
  if (game.status === "in_progress") {
    statusMessage = myTurn ? "Your Turn" : "Opponent's Turn";
    if (isSpectator) statusMessage = `${game.current_turn}'s Turn`;
  } else if (game.status === "x_won") {
    statusMessage = isX ? "Victory!" : isO ? "Defeat!" : "X Wins!";
  } else if (game.status === "o_won") {
    statusMessage = isO ? "Victory!" : isX ? "Defeat!" : "O Wins!";
  } else if (game.status === "draw") {
    statusMessage = "Draw!";
  }

  const renderPlayerCard = (player: any, symbol: "X" | "O", isCurrentTurn: boolean) => {
    if (!player) {
      return (
        <div className="flex-1 p-4 rounded-3xl bg-card border-2 border-dashed border-border/50 flex flex-col items-center justify-center opacity-50">
          <Loader2 className="animate-spin text-muted-foreground mb-2" />
          <p className="text-sm font-bold text-muted-foreground">Waiting...</p>
        </div>
      );
    }

    return (
      <div className={clsx(
        "flex-1 p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 relative overflow-hidden group",
        isCurrentTurn && !isGameOver ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)] scale-[1.02]" : "border-border/60 bg-card",
        game.status === `${symbol.toLowerCase()}_won` && "border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
      )}>
        {isCurrentTurn && !isGameOver && (
          <div className="absolute inset-0 bg-primary/10 animate-pulse" />
        )}
        
        <div className="relative z-10 w-16 h-16 rounded-full overflow-hidden border-4 border-background shadow-md bg-secondary flex items-center justify-center">
          {player.avatar_url ? (
            <img src={player.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <User size={24} className="text-muted-foreground" />
          )}
        </div>
        
        <div className="relative z-10 text-center">
          <div className="font-black text-lg truncate w-full px-2">{player.full_name || "Unknown"}</div>
          <div className="text-sm font-bold text-muted-foreground flex items-center justify-center gap-1">
            <Trophy size={14} className="text-primary" /> {player.ttt_elo || 1200}
          </div>
        </div>

        <div className={clsx(
          "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center mt-2 shadow-sm",
          symbol === "X" ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
        )}>
          {symbol === "X" ? <XIcon strokeWidth={3} /> : <Circle strokeWidth={3} />}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:-translate-x-1 transition-transform">
            <ArrowLeft size={16} />
          </div>
          Back to Lounge
        </button>

        <div className="flex items-center gap-3">
          <div className={clsx(
            "px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border transition-colors shadow-sm",
            game.status === "in_progress" && myTurn && "bg-primary text-primary-foreground border-primary animate-pulse",
            game.status === "in_progress" && !myTurn && "bg-secondary text-muted-foreground border-border/50",
            game.status === "waiting" && "bg-accent/20 text-accent-foreground border-accent/30",
            isGameOver && "bg-background text-foreground border-border/60"
          )}>
            {statusMessage}
          </div>

          {game.status === "waiting" && !isSpectator && (
            <button 
              onClick={async () => {
                try {
                  await cancelTttGame(game.id);
                  router.push('/dashboard');
                } catch (e: any) {
                  if (e.message === "NEXT_REDIRECT") throw e;
                  alert("Failed to cancel: " + e.message);
                }
              }}
              className="px-4 py-2 rounded-full font-bold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <XIcon size={14} /> Cancel
            </button>
          )}

          {game.status === "in_progress" && !isSpectator && (
            <button 
              onClick={() => setShowResignConfirm(true)}
              className="px-4 py-2 rounded-full font-bold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <Flag size={14} /> Resign
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 sm:gap-8 justify-between">
        {renderPlayerCard(game.x_player, "X", game.current_turn === "X")}
        {renderPlayerCard(game.o_player, "O", game.current_turn === "O")}
      </div>

      <div className="relative mx-auto mt-4 sm:mt-8">
        <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] grid grid-cols-3 grid-rows-3 gap-3 p-3 bg-secondary/50 rounded-3xl border border-border/60 shadow-xl relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px]" />
          
          {game.board_state.split("").map((cell: string, idx: number) => {
            const isClickable = cell === '-' && myTurn && !loadingAction;
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={!isClickable}
                className={clsx(
                  "relative bg-card rounded-2xl flex items-center justify-center transition-all duration-300",
                  isClickable ? "hover:scale-95 hover:bg-primary/5 cursor-pointer shadow-sm border border-border/40 hover:border-primary/40" : "cursor-default border border-transparent shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]",
                  cell === 'X' ? "text-blue-500" : cell === 'O' ? "text-red-500" : "text-transparent"
                )}
              >
                {cell === 'X' && <XIcon size={64} strokeWidth={2.5} className="animate-in zoom-in spin-in-12 duration-300" />}
                {cell === 'O' && <Circle size={56} strokeWidth={3} className="animate-in zoom-in duration-300" />}
              </button>
            );
          })}
        </div>

        {isGameOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center animate-in fade-in zoom-in duration-500 rounded-3xl bg-background/60 backdrop-blur-md border border-border/50">
            <div className="bg-card p-8 rounded-3xl shadow-2xl border border-border/80 flex flex-col items-center text-center max-w-[80%] transform transition-transform hover:scale-105">
              <Trophy size={48} className={clsx(
                "mb-4",
                game.status === "draw" ? "text-muted-foreground" : "text-yellow-500 animate-bounce"
              )} />
              <h2 className="text-3xl font-black tracking-tight mb-2">
                {statusMessage}
              </h2>
              <p className="text-muted-foreground text-sm font-semibold mb-6">
                {game.status === "draw" ? "It's a tie! Well played both." : "Elo ratings have been updated."}
              </p>
              <Link href="/dashboard" className="px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
                Return to Lounge
              </Link>
            </div>
          </div>
        )}
      </div>
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card p-6 rounded-3xl border shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-2">Resign Match?</h3>
            <p className="text-muted-foreground text-sm mb-6">Are you sure you want to resign? You will lose Elo points.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResignConfirm(false)} className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg font-bold text-sm transition-colors">Cancel</button>
              <button 
                onClick={async () => {
                  try {
                    await resignTttGame(game.id);
                    setShowResignConfirm(false);
                  } catch (e: any) {
                    if (e.message === "NEXT_REDIRECT") throw e;
                    alert("Failed to resign: " + e.message);
                  }
                }}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 rounded-lg font-bold text-sm transition-colors"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
