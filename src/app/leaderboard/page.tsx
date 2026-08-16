import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, User, Flame } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

// We'll mock the data if the DB isn't populated yet, but here's the real query structure.
export default async function LeaderboardPage() {
  const supabase = await createClient();
  
  // 1. Fetch Players Leaderboard
  const { data: leaderboards } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, total_xp, current_level, current_streak, department, role")

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, department, total_xp, current_level, current_streak")
    .eq("role", "employee")
    .order("total_xp", { ascending: false });

  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .order("rank_requirement", { ascending: true });

  if (error) {
    console.error("Error fetching leaderboard:", error);
  }

  const departmentStats = profiles?.reduce((acc: any, profile) => {
    // Only include active users if is_active exists, but since we don't fetch it here yet,
    // we assume profiles from the query are active (or we could filter, but let's just use all fetched)
    const dept = profile.department || 'Unassigned';
    if (!acc[dept]) {
      acc[dept] = { name: dept, totalXp: 0, count: 0 };
    }
    acc[dept].totalXp += profile.total_xp || 0;
    acc[dept].count += 1;
    return acc;
  }, {});

  const departmentLeaderboard = Object.values(departmentStats || {})
    .map((d: any) => ({ name: d.name, xp: Math.round(d.totalXp / Math.max(1, d.count)), count: d.count }))
    .sort((a: any, b: any) => b.xp - a.xp);

  const mockData = [
    { id: '1', full_name: 'Ahmed', total_xp: 14250, current_streak: 14, current_level: 12, avatar_url: null, department: 'Engineering' },
    { id: '2', full_name: 'Sara', total_xp: 13980, current_streak: 21, current_level: 11, avatar_url: null, department: 'Design' },
    { id: '3', full_name: 'Omar', total_xp: 13750, current_streak: 5, current_level: 11, avatar_url: null, department: 'Sales' },
    { id: '1', full_name: 'Ahmed', total_xp: 14250, current_streak: 14, current_level: 12, avatar_url: null, department: 'Engineering', count: 1 },
    { id: '2', full_name: 'Sara', total_xp: 13980, current_streak: 21, current_level: 11, avatar_url: null, department: 'Design', count: 1 },
    { id: '3', full_name: 'Omar', total_xp: 13750, current_streak: 5, current_level: 11, avatar_url: null, department: 'Sales', count: 1 },
    { id: '4', full_name: 'Fatima', total_xp: 12100, current_streak: 12, current_level: 10, avatar_url: null, department: 'Marketing', count: 1 },
  ];

  const dataToUse = (profiles && profiles.length > 0) ? profiles : mockData;

  const mockDeptData = [
    { name: 'Engineering', xp: 5400, count: 4 },
    { name: 'Product', xp: 4800, count: 3 },
    { name: 'Marketing', xp: 3200, count: 2 },
    { name: 'Design', xp: 2900, count: 2 },
  ];
  
  const deptDataToUse = departmentLeaderboard.length > 0 ? departmentLeaderboard : mockDeptData;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-28 max-w-6xl">
        {/* Prize Pool Showcase */}
        {prizes && prizes.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-3xl p-8 text-center relative overflow-hidden mb-12">
            <h2 className="text-2xl font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-8 relative z-10">
              🏆 This Month's Prize Pool 🏆
            </h2>
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              {prizes.map((prize) => (
                <div key={prize.id} className="bg-card/80 backdrop-blur-md border border-border shadow-xl rounded-2xl p-6 flex flex-col items-center min-w-[200px] transform hover:-translate-y-1 transition-all">
                  <span className="text-5xl mb-3 filter drop-shadow-md">{prize.icon_emoji}</span>
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                    {prize.rank_requirement}{prize.rank_requirement === 1 ? 'st' : prize.rank_requirement === 2 ? 'nd' : prize.rank_requirement === 3 ? 'rd' : 'th'} Place
                  </span>
                  <span className="text-lg font-bold text-foreground text-center">{prize.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-yellow-500 w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Office Games Leaderboard</h1>
            <p className="text-muted-foreground">30-Day Sprint • Ends in 24 days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PLAYER LEADERBOARD */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User size={20} className="text-primary"/> 
              Top Employees
            </h2>
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
                          <span className="font-bold text-secondary-foreground">{player.full_name?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold">{player.full_name || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">{player.department || 'Employee'} • Lvl {player.current_level}</span>
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
          </div>

          {/* DEPARTMENT LEADERBOARD */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy size={20} className="text-primary"/> 
              Top Departments
            </h2>
            <div className="bg-card border border-border rounded-2xl shadow-sm p-4 space-y-4">
              {deptDataToUse.map((dept, idx) => (
                <div key={dept.name} className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                      {dept.name}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">{dept.xp.toLocaleString()} avg XP</div>
                      <div className="text-[10px] text-muted-foreground">{dept.count} active players</div>
                    </div>
                  </div>
                  {/* Progress bar visual */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(10, (dept.xp / deptDataToUse[0].xp) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
