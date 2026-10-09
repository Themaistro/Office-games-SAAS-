"use client";

import { useState, useEffect } from "react";
import { Power, Database, Settings2, Save, X } from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  questionCount: number;
  easy_rounds?: number;
  medium_rounds?: number;
  hard_rounds?: number;
}

interface GamesClientProps {
  initialGroupedGames: Record<string, Game[]>;
  toggleAction: (gameId: string, currentStatus: boolean) => Promise<void>;
  updateRoundsAction: (gameId: string, easy: number, medium: number, hard: number) => Promise<void>;
}

export default function GamesClient({ initialGroupedGames, toggleAction, updateRoundsAction }: GamesClientProps) {
  const [groupedGames, setGroupedGames] = useState(initialGroupedGames);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editRounds, setEditRounds] = useState({ easy: 1, medium: 1, hard: 1 });

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

  const startEditing = (game: Game) => {
    setEditingGameId(game.id);
    setEditRounds({
      easy: game.easy_rounds ?? 1,
      medium: game.medium_rounds ?? 1,
      hard: game.hard_rounds ?? 1
    });
  };

  const saveRounds = async (gameId: string, category: string) => {
    setEditingGameId(null);
    setGroupedGames(prev => {
      const newGroups = { ...prev };
      newGroups[category] = newGroups[category].map(g => 
        g.id === gameId ? { ...g, easy_rounds: editRounds.easy, medium_rounds: editRounds.medium, hard_rounds: editRounds.hard } : g
      );
      return newGroups;
    });
    try {
      await updateRoundsAction(gameId, editRounds.easy, editRounds.medium, editRounds.hard);
    } catch (err) {
      console.error("Failed to update rounds:", err);
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
                  <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
                  
                  {editingGameId === game.id ? (
                    <div className="bg-muted/50 p-3 rounded-lg border border-border mb-4 grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Easy</label>
                        <input type="number" min="0" max="10" className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold" value={editRounds.easy} onChange={e => setEditRounds({...editRounds, easy: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Medium</label>
                        <input type="number" min="0" max="10" className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold" value={editRounds.medium} onChange={e => setEditRounds({...editRounds, medium: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Hard</label>
                        <input type="number" min="0" max="10" className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold" value={editRounds.hard} onChange={e => setEditRounds({...editRounds, hard: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-4">
                      <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-2 py-1 rounded">EASY: {game.easy_rounds ?? 1}</span>
                      <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded">MED: {game.medium_rounds ?? 1}</span>
                      <span className="text-[10px] font-bold bg-red-500/10 text-red-600 px-2 py-1 rounded">HARD: {game.hard_rounds ?? 1}</span>
                    </div>
                  )}
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
                  
                  <div className="flex items-center gap-2">
                    {editingGameId === game.id ? (
                      <>
                        <button onClick={() => setEditingGameId(null)} className="p-2 rounded-lg transition-colors bg-muted text-muted-foreground hover:bg-muted/80">
                          <X size={18} />
                        </button>
                        <button onClick={() => saveRounds(game.id, category)} className="p-2 rounded-lg transition-colors bg-primary/10 text-primary hover:bg-primary/20">
                          <Save size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(game)} className="p-2 rounded-lg transition-colors bg-muted text-muted-foreground hover:bg-muted/80" title="Configure Rounds">
                          <Settings2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggle(game.id, category, game.is_active)}
                          className={`p-2 rounded-lg transition-colors ${game.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                          title={game.is_active ? "Disable Game" : "Enable Game"}
                        >
                          <Power size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
