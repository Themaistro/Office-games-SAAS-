import { createClient } from "@/lib/supabase/server";
import { BarChart, Users, Target, Swords, Activity, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch DAU (Daily Active Users) over the last 30 days
  // Since we can't easily do a pure SQL GROUP BY in Supabase JS without a view or RPC,
  // we'll fetch recent sessions and group them in JS.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: recentSessions } = await supabase
    .from("daily_sessions")
    .select("date, user_id")
    .gte("date", thirtyDaysAgo.toISOString().split('T')[0]);

  // Group DAU
  const dauMap: Record<string, Set<string>> = {};
  recentSessions?.forEach(session => {
    if (!dauMap[session.date]) {
      dauMap[session.date] = new Set();
    }
    dauMap[session.date].add(session.user_id);
  });

  const dauChart = Object.keys(dauMap).sort().map(date => ({
    date,
    count: dauMap[date].size
  }));

  const todayDAU = dauChart.length > 0 ? dauChart[dauChart.length - 1].count : 0;
  
  // Fetch Department Stats
  const { data: profiles } = await supabase
    .from("profiles")
    .select("department, total_xp, current_level, role")
    .eq("role", "employee");

  const deptMap: Record<string, { users: number, totalXp: number }> = {};
  let totalEmployees = 0;
  
  profiles?.forEach(p => {
    totalEmployees++;
    const dept = p.department || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { users: 0, totalXp: 0 };
    deptMap[dept].users++;
    deptMap[dept].totalXp += p.total_xp || 0;
  });

  const deptStats = Object.keys(deptMap)
    .map(dept => ({
      name: dept,
      users: deptMap[dept].users,
      avgXp: Math.round(deptMap[dept].totalXp / deptMap[dept].users)
    }))
    .sort((a, b) => b.avgXp - a.avgXp);

  // Fetch Chess Match Count (Last 30 days)
  const { data: chessGames } = await supabase
    .from("chess_games")
    .select("created_at")
    .in("status", ["white_won", "black_won", "draw"])
    .gte("created_at", thirtyDaysAgo.toISOString());

  const chessMatchCount = chessGames?.length || 0;

  // Mini-Game Difficulty
  // We'll fetch all session questions from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sessionQuestions } = await supabase
    .from("session_questions")
    .select("game_type, is_correct, earned_xp")
    .gte("created_at", sevenDaysAgo.toISOString());

  const gameMap: Record<string, { plays: number, correct: number, totalXp: number }> = {};
  sessionQuestions?.forEach(sq => {
    if (!gameMap[sq.game_type]) gameMap[sq.game_type] = { plays: 0, correct: 0, totalXp: 0 };
    gameMap[sq.game_type].plays++;
    if (sq.is_correct) gameMap[sq.game_type].correct++;
    gameMap[sq.game_type].totalXp += sq.earned_xp || 0;
  });

  const gameStats = Object.keys(gameMap)
    .map(game => ({
      name: game.replace(/_/g, " "),
      plays: gameMap[game].plays,
      accuracy: Math.round((gameMap[game].correct / gameMap[game].plays) * 100),
      avgXp: Math.round(gameMap[game].totalXp / gameMap[game].plays)
    }))
    .sort((a, b) => a.accuracy - b.accuracy); // Sort by lowest accuracy (Hardest)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <BarChart className="text-primary" /> Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Real-time metrics on engagement and performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's DAU</span>
            <Users className="text-blue-500 w-5 h-5" />
          </div>
          <div className="text-3xl font-black">{todayDAU}</div>
          <p className="text-xs text-muted-foreground mt-1">Unique players today</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Employees</span>
            <Target className="text-green-500 w-5 h-5" />
          </div>
          <div className="text-3xl font-black">{totalEmployees}</div>
          <p className="text-xs text-muted-foreground mt-1">Registered non-admin accounts</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Chess Activity</span>
            <Swords className="text-orange-500 w-5 h-5" />
          </div>
          <div className="text-3xl font-black">{chessMatchCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Completed matches (Last 30 Days)</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Sessions</span>
            <Activity className="text-purple-500 w-5 h-5" />
          </div>
          <div className="text-3xl font-black">{recentSessions?.length || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Missions played (Last 30 Days)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Engagement */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="text-primary w-5 h-5" /> Department Performance
          </h2>
          <div className="space-y-4">
            {deptStats.map((dept, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{dept.name}</span>
                  <span className="text-primary font-black">{dept.avgXp.toLocaleString()} avg XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${Math.min(100, (dept.avgXp / (deptStats[0]?.avgXp || 1)) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground text-right">{dept.users} employees active</div>
              </div>
            ))}
            {deptStats.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No department data available.</div>
            )}
          </div>
        </div>

        {/* Mini-Game Difficulty */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Target className="text-red-500 w-5 h-5" /> Mini-Game Difficulty
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Ranked from hardest to easiest based on average accuracy (Last 7 Days).</p>
          
          <div className="space-y-3">
            {gameStats.map((game, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold capitalize">{game.name}</div>
                    <div className="text-xs text-muted-foreground">{game.plays} total plays</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black ${game.accuracy < 50 ? 'text-red-500' : game.accuracy < 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {game.accuracy}%
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Accuracy</div>
                </div>
              </div>
            ))}
            {gameStats.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No game data from the last 7 days.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
