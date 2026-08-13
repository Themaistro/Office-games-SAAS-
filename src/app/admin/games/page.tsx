"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleGameStatus } from "../actions";
import { Shield, Settings2, Power } from "lucide-react";

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const { data } = await supabase.from("game_types").select("*").order("name");
    if (data) setGames(data);
    setLoading(false);
  };

  const handleToggle = async (gameId: string, currentStatus: boolean) => {
    try {
      // Optimistic UI update
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, is_active: !currentStatus } : g));
      await toggleGameStatus(gameId, currentStatus);
    } catch (err) {
      console.error(err);
      // Revert on failure
      fetchGames();
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading games...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games Management</h1>
          <p className="text-muted-foreground mt-1">
            Toggle which mini-games are available in the daily sprints.
          </p>
        </div>
        <Shield className="text-primary w-12 h-12 opacity-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <div key={game.id} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{game.name}</h3>
                <span className="bg-muted px-2 py-1 rounded text-xs font-mono">{game.slug}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{game.description}</p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
              <span className={`text-sm font-bold flex items-center gap-2 ${game.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                <span className={`w-2 h-2 rounded-full ${game.is_active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                {game.is_active ? 'ACTIVE' : 'DISABLED'}
              </span>
              
              <button 
                onClick={() => handleToggle(game.id, game.is_active)}
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
  );
}
