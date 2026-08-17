import { Users, Target, Activity, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ParticipationChart from "./ParticipationChart";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  
  // 1. Total Employees
  const { count: totalEmployees } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employee");

  // 2. Highest Streak
  const { data: topStreakUser } = await supabase
    .from("profiles")
    .select("full_name, department, current_streak")
    .eq("role", "employee")
    .order("current_streak", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Department Aggregation
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("department, total_xp")
    .eq("role", "employee")
    .not("department", "is", null)
    .limit(10000); // FIX: Increase limit to handle larger organizations

  const deptStats: Record<string, { totalXp: number, count: number }> = {};
  if (allProfiles) {
    allProfiles.forEach(p => {
      if (p.department) {
        if (!deptStats[p.department]) deptStats[p.department] = { totalXp: 0, count: 0 };
        deptStats[p.department].totalXp += (p.total_xp || 0);
        deptStats[p.department].count += 1;
      }
    });
  }

  const departmentLeaderboard = Object.entries(deptStats)
    .map(([name, stats]) => ({ 
      name, 
      avgXp: stats.count > 0 ? Math.floor(stats.totalXp / stats.count) : 0 
    }))
    .sort((a, b) => b.avgXp - a.avgXp)
    .slice(0, 5);

  // 4. Daily Participation (Sessions today)
  const today = new Date().toISOString().split('T')[0];
  const { count: sessionsToday } = await supabase
    .from("daily_sessions")
    .select("*", { count: "exact", head: true })
    .eq("date", today);
    
  let participationRate = totalEmployees && totalEmployees > 0 && sessionsToday !== null 
    ? Math.round((sessionsToday / totalEmployees) * 100) 
    : 0;
  if (participationRate > 100) participationRate = 100; // Cap at 100% in case admins play

  // 5. Active Games Count
  const { count: activeGamesCount } = await supabase
    .from("game_types")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // 6. Participation Data for Chart (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const startDateStr = last7Days[0].toISOString().split('T')[0];
  
  const { data: recentSessions } = await supabase
    .from("daily_sessions")
    .select("date")
    .gte("date", startDateStr);

  const sessionsByDate = (recentSessions || []).reduce((acc, curr) => {
    acc[curr.date] = (acc[curr.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = last7Days.map((d) => {
    const dateStr = d.toISOString().split('T')[0];
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sessions: sessionsByDate[dateStr] || 0
    };
  });

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];
  const sessionsYesterday = sessionsByDate[yesterdayDateStr] || 0;
  
  // Calculate participation trend
  let trendDirection = "neutral";
  let trendValue = 0;
  if (sessionsYesterday > 0) {
    trendValue = Math.round((((sessionsToday ?? 0) - sessionsYesterday) / sessionsYesterday) * 100);
    trendDirection = trendValue > 0 ? "up" : trendValue < 0 ? "down" : "neutral";
  } else if ((sessionsToday ?? 0) > 0) {
    trendDirection = "up";
    trendValue = 100;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor Daily Brain Arena performance and engagement.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Employees</h3>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-3xl font-bold">{totalEmployees || 0}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Registered Users
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Daily Participation</h3>
            <Activity size={16} className="text-blue-500" />
          </div>
          <span className="text-3xl font-bold">{participationRate}%</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            {sessionsToday || 0} players today 
            {trendDirection === "up" && <span className="text-green-500 ml-1">↑ {trendValue}%</span>}
            {trendDirection === "down" && <span className="text-destructive ml-1">↓ {Math.abs(trendValue)}%</span>}
            {trendDirection === "neutral" && <span className="text-muted-foreground ml-1">- 0%</span>}
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Active Games</h3>
            <Target size={16} className="text-accent" />
          </div>
          <span className="text-3xl font-bold">{activeGamesCount || 0}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Minigame formats
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Highest Streak</h3>
            <Flame size={16} className="text-orange-500" />
          </div>
          <span className="text-3xl font-bold">{topStreakUser?.current_streak || 0}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            {topStreakUser ? `${topStreakUser.full_name?.split(' ')[0] || 'Unknown'} (${topStreakUser.department || 'N/A'})` : 'No streaks yet'}
          </span>
        </div>
      </div>

      {/* Charts/Content Area Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">Participation Over Time</h3>
          <ParticipationChart data={chartData} />
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">Top Performing Departments (By Avg XP)</h3>
          <div className="space-y-4">
            {departmentLeaderboard.length > 0 ? departmentLeaderboard.map((team) => (
              <div key={team.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <span className="font-medium">{team.name}</span>
                <span className="text-sm text-primary font-bold">{team.avgXp.toLocaleString()} XP Avg</span>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground text-center py-4">No department data available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
