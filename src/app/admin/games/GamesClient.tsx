"use client";

import { useState, useEffect } from "react";
import { Power, Database } from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  questionCount: number;
}

interface GamesClientProps {
  initialGroupedGames: Record<string, Game[]>;
  toggleAction: (gameId: string, currentStatus: boolean) => Promise<void>;
}

export default function GamesClient({ initialGroupedGames, toggleAction }: GamesClientProps) {
  const [groupedGames, setGroupedGames] = useState(initialGroupedGames);

  // Keep state in sync with server props when revalidatePath runs
  useEffect(() => {
    setGroupedGames(initialGroupedGames);
  }, [initialGroupedGames]);

  const handleToggle = async (gameId: string, category: string, currentStatus: boolean) => {
    // Optimistic UI update
    setGroupedGames(prev => {
      const newGroups = { ...prev };
      newGroups[category] = newGroups[category].map(g => 
        g.id === gameId ? { ...g, is_active: !currentStatus } : g
      );
      return newGroups;
    });

    try {
      await toggleAction(gameId, currentStatus);
    } catch (err) {
      console.error("Failed to toggle game status:", err);
      // Revert on failure
      setGroupedGames(initialGroupedGames);
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedGames).map(([category, catGames]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-bold border-b border-border pb-2">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catGames.map((game) => (
              <div key={game.id} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-primary/30 transition-colors">
                
                {/* Visual Status Indicator Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${game.is_active ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />

                <div className="pl-2">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg">{game.name}</h3>
                    <span className="bg-muted px-2 py-1 rounded text-xs font-mono">{game.slug}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{game.description}</p>
                </div>
                
                <div className="pl-2 flex items-center justify-between pt-4 border-t border-border mt-auto">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold flex items-center gap-2 ${game.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                      <span className={`w-2 h-2 rounded-full ${game.is_active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                      {game.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium" title="Available Questions in Pool">
                      <Database size={12} className="opacity-70" />
                      {game.questionCount.toLocaleString()} qs
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => handleToggle(game.id, category, game.is_active)}
                    className={`p-2 rounded-lg transition-colors ${game.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    title={game.is_active ? "Disable Game" : "Enable Game"}
                  >
                    <Power size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
