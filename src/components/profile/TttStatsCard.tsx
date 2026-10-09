import React from "react";
import { Trophy, Swords, X as XIcon } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type TttStatsCardProps = {
  elo: number;
  games: any[];
  currentUserId: string;
};

export default function TttStatsCard({ elo, games, currentUserId }: TttStatsCardProps) {
  const finishedGames = games.filter(g => ["x_won", "o_won", "draw"].includes(g.status));
  const totalGames = finishedGames.length;
  
  let wins = 0;
  let losses = 0;
  let draws = 0;

  finishedGames.forEach(g => {
    if (g.status === "draw") {
      draws++;
    } else if (
      (g.status === "x_won" && g.x_player_id === currentUserId) || 
      (g.status === "o_won" && g.o_player_id === currentUserId)
    ) {
      wins++;
    } else {
      losses++;
    }
  });

  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/20 p-2.5 rounded-xl">
          <XIcon className="text-primary w-5 h-5" />
        </div>
        <h3 className="font-bold text-lg">Tic Tac Toe</h3>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">TTT Rating</p>
          <div className="text-4xl font-black tabular-nums tracking-tighter flex items-center gap-2">
            {elo}
            <Trophy className="text-yellow-500 w-6 h-6" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-sm font-medium mb-1">Win Rate</p>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-primary">
            {winRate}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 rounded-full bg-muted flex overflow-hidden mb-4">
        {totalGames > 0 && (
          <>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(wins / totalGames) * 100}%` }}></div>
            <div className="h-full bg-slate-400 transition-all" style={{ width: `${(draws / totalGames) * 100}%` }}></div>
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(losses / totalGames) * 100}%` }}></div>
          </>
        )}
      </div>

      <div className="flex justify-between text-sm font-bold">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          {wins} <span className="text-muted-foreground font-normal">Wins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          {draws} <span className="text-muted-foreground font-normal">Draws</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          {losses} <span className="text-muted-foreground font-normal">Losses</span>
        </div>
      </div>

      {/* Recent Matches Feed (Small) */}
      {finishedGames.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <h4 className="font-bold text-sm text-muted-foreground mb-4 uppercase tracking-wider">Recent Matches</h4>
          <div className="flex flex-col gap-3">
            {finishedGames.slice(0, 5).map((game) => {
              const isX = game.x_player_id === currentUserId;
              const isWin = (isX && game.status === "x_won") || (!isX && game.status === "o_won");
              const isDraw = game.status === "draw";
              const isLoss = !isWin && !isDraw;
              
              const opponent = isX ? game.o_player : game.x_player;

              return (
                <div 
                  key={game.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40 group"
                >
                  <Link href={`/profile/${opponent?.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className={`w-8 h-8 rounded-full border-2 overflow-hidden flex-shrink-0 ${isWin ? 'border-green-500' : isLoss ? 'border-red-500' : 'border-slate-400'}`}>
                      {opponent?.avatar_url ? (
                        <img src={opponent.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-[10px]">?</div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold w-24 sm:w-32 truncate hover:text-primary transition-colors">{opponent?.full_name || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(game.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3">
                    {isWin ? (
                      <span className="text-[10px] font-bold uppercase bg-green-500/10 text-green-500 px-2 py-1 rounded">Win</span>
                    ) : isLoss ? (
                      <span className="text-[10px] font-bold uppercase bg-red-500/10 text-red-500 px-2 py-1 rounded">Loss</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase bg-slate-400/10 text-slate-400 px-2 py-1 rounded">Draw</span>
                    )}
                    <Link href={`/dashboard/ttt/${game.id}`} className="text-[10px] font-bold text-primary hover:underline ml-1">
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
