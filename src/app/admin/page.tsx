import Link from "next/link";
import { Users, Target, Activity, Flame, ArrowUpRight, Sparkles } from "lucide-react";
import { query } from "@/lib/db";
import ParticipationChart from "./ParticipationChart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // 1. Total Employees
  const { rows: employeeCountRows } = await query<{ count: number }>("SELECT count(*)::int AS count FROM profiles WHERE role = 'employee'");
  const totalEmployees = employeeCountRows[0]?.count ?? 0;

  // 2. Highest Streak
  const { rows: topStreakRows } = await query("SELECT full_name, department, current_streak FROM profiles WHERE role = 'employee' ORDER BY current_streak DESC LIMIT 1");
  const topStreakUser = topStreakRows[0] as any;

  // 3. Department Aggregation
  const { rows: allProfiles } = await query<{ department: string | null; total_xp: number }>("SELECT department, total_xp FROM profiles WHERE role = 'employee' AND department IS NOT NULL LIMIT 10000");

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
  const { rows: todayRows } = await query<{ count: number }>("SELECT count(*)::int AS count FROM daily_sessions WHERE date = $1", [today]);
  const sessionsToday = todayRows[0]?.count ?? 0;
    
  let participationRate = totalEmployees && totalEmployees > 0 && sessionsToday !== null 
    ? Math.round((sessionsToday / totalEmployees) * 100) 
    : 0;
  if (participationRate > 100) participationRate = 100; // Cap at 100% in case admins play

  // 5. Active Games Count
  const { rows: activeGameRows } = await query<{ count: number }>("SELECT count(*)::int AS count FROM game_types WHERE is_active = true");
  const activeGamesCount = activeGameRows[0]?.count ?? 0;

  // 6. Participation Data for Chart (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const startDateStr = last7Days[0].toISOString().split('T')[0];
  
  const { rows: recentSessions } = await query<{ date: string }>("SELECT date FROM daily_sessions WHERE date >= $1", [startDateStr]);

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
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary"><Sparkles size={13} /> Operations center</div><h1 className="text-4xl font-black tracking-tight text-foreground">Team momentum</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">A clear view of participation, player health, and the game experience across your office.</p></div>
        <div className="flex gap-2"><Link href="/admin/users" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold transition-colors hover:border-primary/30 hover:text-primary">Manage players <ArrowUpRight size={15} /></Link><Link href="/admin/announcements" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">Post update <ArrowUpRight size={15} /></Link></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm shadow-black/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Employees</h3>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-3xl font-bold">{totalEmployees || 0}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Registered Users
          </span>
        </div>
        
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm shadow-black/[0.02]">
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
        
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm shadow-black/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Active Games</h3>
            <Target size={16} className="text-accent" />
          </div>
          <span className="text-3xl font-bold">{activeGamesCount || 0}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Minigame formats
          </span>
        </div>
        
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm shadow-black/[0.02]">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Engagement</p><h3 className="mt-1 font-black">Participation over time</h3></div><Activity size={18} className="text-primary" /></div>
          <ParticipationChart data={chartData} />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Team health</p><h3 className="mt-1 font-black">Top departments</h3></div><Users size={18} className="text-primary" /></div>
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

