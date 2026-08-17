"use client";

import React, { useState } from "react";
import { User, Swords, X as XIcon, Loader2 } from "lucide-react";
import { createChessGame } from "@/app/dashboard/chess/actions";
import { createTttGame } from "@/app/dashboard/ttt/actions";
import UnifiedLobbiesWidget from "./UnifiedLobbiesWidget";

export default function UnifiedOfficeLounge({ currentUserId }: { currentUserId: string }) {
  const [loadingChess, setLoadingChess] = useState(false);
  const [loadingTtt, setLoadingTtt] = useState(false);
  
  const [showChessOptions, setShowChessOptions] = useState(false);
  const [chessColor, setChessColor] = useState<"white" | "black" | "random">("random");
  const [chessTime, setChessTime] = useState(600000); // Default 10 min

  const handleCreateChess = async () => {
    setLoadingChess(true);
    try {
      await createChessGame(chessColor, chessTime);
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      console.error(err);
      alert(err.message || "Failed to create chess game");
      setLoadingChess(false);
    }
  };

  const handleCreateTtt = async () => {
    setLoadingTtt(true);
    try {
      await createTttGame();
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      console.error(err);
      alert(err.message || "Failed to create TTT game");
      setLoadingTtt(false);
    }
  };

  return (
    <div id="tour-office-lounge" className="flex flex-col gap-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="bg-primary/20 p-2 rounded-xl">
          <User className="text-primary" size={24} />
        </div>
        <h3 className="text-2xl font-black tracking-tight">The Office Lounge</h3>
      </div>

      {/* Unified Create Game Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chess Card */}
        <div 
          onClick={() => !showChessOptions && !(loadingChess || loadingTtt) && setShowChessOptions(true)}
          className={`relative group overflow-hidden bg-card border rounded-3xl p-6 text-left transition-all ${
            !showChessOptions && !(loadingChess || loadingTtt)
              ? 'cursor-pointer hover:border-orange-500/50 hover:shadow-sm hover:-translate-y-1 border-border/60'
              : showChessOptions
              ? 'border-orange-500/50 shadow-sm'
              : 'opacity-50 border-border/60'
          }`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Swords size={64} className="text-orange-500 transform group-hover:scale-110 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="relative z-10">
            <div className="bg-orange-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Swords className="text-orange-500" size={24} />
            </div>
            <h4 className="text-lg font-black tracking-tight mb-1">Play Chess</h4>
            
            {showChessOptions ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Color</label>
                    <select 
                      value={chessColor} 
                      onChange={(e) => setChessColor(e.target.value as any)}
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-medium"
                    >
                      <option value="random">Random</option>
                      <option value="white">White</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Time</label>
                    <select 
                      value={chessTime} 
                      onChange={(e) => setChessTime(Number(e.target.value))}
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-medium"
                    >
                      <option value={60000}>1 min</option>
                      <option value={180000}>3 min</option>
                      <option value={300000}>5 min</option>
                      <option value={600000}>10 min</option>
                      <option value={1800000}>30 min</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowChessOptions(false); }}
                    className="flex-1 py-2 text-sm font-bold text-muted-foreground bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCreateChess(); }}
                    disabled={loadingChess}
                    className="flex-1 py-2 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors flex justify-center items-center gap-2"
                  >
                    {loadingChess ? <><Loader2 className="animate-spin" size={16} /> Creating</> : 'Start Match'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground font-medium">Create a new chess lobby with custom time limits.</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-orange-500">
                  Create Match &rarr;
                </div>
              </>
            )}
          </div>
        </div>

        {/* TTT Card */}
        <div
          onClick={() => {
            if (!loadingChess && !loadingTtt) handleCreateTtt();
          }}
          className={`relative group overflow-hidden bg-card border rounded-3xl p-6 text-left transition-all ${
            !(loadingChess || loadingTtt)
              ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-sm hover:-translate-y-1 border-border/60'
              : 'opacity-50 border-border/60'
          }`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <XIcon size={64} className="text-blue-500 transform group-hover:scale-110 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="relative z-10">
            <div className="bg-blue-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <XIcon className="text-blue-500" size={24} />
            </div>
            <h4 className="text-lg font-black tracking-tight mb-1">Play Tic Tac Toe</h4>
            <p className="text-sm text-muted-foreground font-medium">Create a quick match against a colleague.</p>
            
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-500">
              {loadingTtt ? (
                <><Loader2 className="animate-spin" size={16} /> Creating...</>
              ) : (
                <>Create Match &rarr;</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Open Lobbies */}
      <UnifiedLobbiesWidget currentUserId={currentUserId} />
    </div>
  );
}
