import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, User, Flame } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

// We'll mock the data if the DB isn't populated yet, but here's the real query structure.
export default async function LeaderboardPage() {
  const supabase = createClient();
  
  // Real implementation:
  const { data: leaderboards } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, total_xp, current_level, current_streak, role")
    .order("total_xp", { ascending: false })
    .limit(50);
    
  // Mock data fallback if empty
  const mockData = [
    { id: '1', full_name: 'Ahmed', total_xp: 14250, current_streak: 14, current_level: 12 },
    { id: '2', full_name: 'Sara', total_xp: 13980, current_streak: 21, current_level: 11 },
    { id: '3', full_name: 'Omar', total_xp: 13750, current_streak: 5, current_level: 11 },
    { id: '4', full_name: 'Fatima', total_xp: 12100, current_streak: 12, current_level: 10 },
    { id: '5', full_name: 'You (Player)', total_xp: 8450, current_streak: 3, current_level: 8 },
  ];

  const dataToUse = leaderboards && leaderboards.length > 0 ? leaderboards : mockData;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-yellow-500 w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Monthly Leaderboard</h1>
            <p className="text-muted-foreground">Season 1 • August 2026</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 text-sm font-semibold text-muted-foreground">
            <div className="col-span-2 sm:col-span-1 text-center">#</div>
            <div className="col-span-5 sm:col-span-6">Player</div>
            <div className="col-span-2 hidden sm:block text-center">Streak</div>
            <div className="col-span-3 text-right pr-4">XP</div>
          </div>
          
          <div className="divide-y divide-border">
            {dataToUse.map((player, idx) => (
              <div key={player.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 transition-colors">
                <div className="col-span-2 sm:col-span-1 text-center font-bold text-lg">
                  {idx === 0 ? <Medal className="text-yellow-500 mx-auto" /> : 
                   idx === 1 ? <Medal className="text-gray-400 mx-auto" /> : 
                   idx === 2 ? <Medal className="text-amber-700 mx-auto" /> : 
                   idx + 1}
                </div>
                
                <div className="col-span-5 sm:col-span-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt={player.full_name} className="w-full h-full rounded-full" />
                    ) : (
                      <User className="text-secondary-foreground w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">{player.full_name || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground">Level {player.current_level}</span>
                  </div>
                </div>

                <div className="col-span-2 hidden sm:flex justify-center items-center gap-1 font-medium text-orange-500">
                  <Flame size={16} />
                  <span>{player.current_streak}</span>
                </div>

                <div className="col-span-5 sm:col-span-3 text-right pr-4 font-bold text-primary">
                  {player.total_xp.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
