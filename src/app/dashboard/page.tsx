import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Play, Flame, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import AnnouncementBanner from "@/components/dashboard/AnnouncementBanner";
import CooldownTimer from "@/components/dashboard/CooldownTimer";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If the user is an admin, they should not see the employee dashboard.
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  // Fetch the most recent session for this user
  const { data: latestSession } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: activeGames } = await supabase
    .from("game_types")
    .select("id")
    .eq("is_active", true);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Calculate Rank
  let userRank = "--";
  if (profile) {
    const { count: higherXpCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin")
      .gt("total_xp", profile.total_xp || 0);
      
    let tieBreakerCount = 0;
    if (profile.full_name) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("role", "admin")
        .eq("total_xp", profile.total_xp || 0)
        .lt("full_name", profile.full_name);
      tieBreakerCount = count || 0;
    }

    userRank = ((higherXpCount || 0) + tieBreakerCount + 1).toString();
  }

  // Fetch top 5 leaderboard
  const { data: topProfiles } = await supabase
    .from("profiles")
    .select("full_name, total_xp, current_level, email")
    .neq("role", "admin")
    .order("total_xp", { ascending: false })
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(5);

  // Fetch user's recent activity
  const { data: recentActivity } = await supabase
    .from("daily_sessions")
    .select("created_at, total_score, total_xp_earned")
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // Force dynamic rendering to ensure fresh data
  const isCompleted = latestSession?.is_completed || latestSession?.status === "completed" || latestSession?.status === "expired";
  const isInProgress = latestSession && !isCompleted;
  
  // Fetch system settings for cooldown
  const { data: settings } = await supabase.from("system_settings").select("cooldown_hours").maybeSingle();
  const cooldownHours = settings?.cooldown_hours ?? 24;

  let isInCooldown = false;
  if (isCompleted && latestSession) {
    const createdAtTime = new Date(latestSession.created_at).getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    if (cooldownMs > 0 && Date.now() - createdAtTime < cooldownMs) {
      isInCooldown = true;
    }
  }
  
  // Format Time
  let formattedTime = "--:--";
  if (latestSession?.started_at && latestSession?.ended_at) {
    const start = new Date(latestSession.started_at);
    const end = new Date(latestSession.ended_at);
    const diffSecs = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    const m = Math.floor(diffSecs / 60);
    const s = diffSecs % 60;
    formattedTime = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Calculate Level Progress
  const currentLevel = profile?.current_level || 1;
  const totalXp = profile?.total_xp || 0;
  
  // XP formula: Next level requires (currentLevel * 1000) total XP
  const xpForCurrentLevel = (currentLevel - 1) * 1000;
  const xpForNextLevel = currentLevel * 1000;
  
  const xpIntoCurrentLevel = Math.max(0, totalXp - xpForCurrentLevel);
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  
  // Ensure progress is bounded between 0 and 100
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpNeededForNextLevel) * 100));

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl">
      {/* Announcements Banner */}
      <AnnouncementBanner announcements={announcements || []} />

      {/* Welcome Banner */}
      <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex-1 w-full max-w-2xl">
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-6">
            Welcome back, <span className="text-primary">{profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0]}!</span>
          </h1>
          
          {/* XP Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">Lv.{currentLevel}</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{totalXp.toLocaleString()} XP</span>
              </div>
              <div className="text-sm font-bold text-primary">
                {Math.round(progressPercent)}% to Lv.{currentLevel + 1}
              </div>
            </div>
            
            <div className="relative h-4 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/50 shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent mix-blend-overlay" />
            </div>
            
            <div className="flex justify-between mt-1.5 text-xs font-semibold text-muted-foreground/70">
              <span>{xpForCurrentLevel.toLocaleString()}</span>
              <span>{xpForNextLevel.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border/60 px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-orange-500/20 p-2 rounded-xl">
              <Flame className="text-orange-500" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Streak</span>
              <span className="text-lg font-black leading-none">{profile?.current_streak || 0} Days</span>
            </div>
          </div>
          <div className="flex-1 md:flex-none flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border/60 px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-yellow-500/20 p-2 rounded-xl">
              <Trophy className="text-yellow-500" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rank</span>
              <span className="text-lg font-black leading-none">#{userRank}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mission Card */}
      <div className="relative rounded-3xl bg-card border border-border/60 shadow-xl overflow-hidden mb-10 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-50" />
        
        <div className="relative px-6 py-12 sm:p-16 text-center flex flex-col items-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-background border border-primary/20 w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="text-primary" size={40} />
            </div>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            {isCompleted ? "Mission Accomplished!" : "Today's Mission"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 font-medium">
            {isCompleted 
              ? "Exceptional work. Your XP has been permanently secured. Rest up, your next challenge awaits tomorrow."
              : "Engage your mind. Complete the random assortment of mini-games as fast and accurately as possible."}
          </p>
          
          {isCompleted ? (
            <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {[
                  { label: "Score", value: latestSession.total_score || 0 },
                  { label: "XP Earned", value: `+${latestSession.total_xp_earned ?? latestSession.total_score ?? 0}`, color: "text-accent" },
                  { label: "Status", value: "Done", color: "text-emerald-500" },
                  { label: "Time", value: formattedTime }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center p-4 bg-background/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</span>
                    <span className={`text-2xl font-black ${stat.color || "text-foreground"}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
              
              {isInCooldown ? (
                <div className="mt-4">
                  <CooldownTimer createdAt={latestSession.created_at} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 mt-4">
                  <Link
                    href="/play/start"
                    className="group/btn relative inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-10 py-5 text-xl font-black text-primary-foreground overflow-hidden transition-all shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Play fill="currentColor" size={24} />
                      START NEXT CHALLENGE
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Link
                href={isInProgress ? "/play" : "/play/start"}
                className="group/btn relative inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-12 py-5 text-xl font-black text-primary-foreground overflow-hidden transition-all shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Play fill="currentColor" size={24} />
                  {isInProgress ? "RESUME CHALLENGE" : "START CHALLENGE"}
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black tracking-tight">Top Players</h3>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              Global
            </div>
          </div>
          
          <div className="space-y-4">
            {topProfiles && topProfiles.length > 0 ? (
              topProfiles.map((p, idx) => {
                const rank = idx + 1;
                
                return (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/40 hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                        ${rank === 1 ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                          rank === 2 ? 'bg-gray-400' : 
                          rank === 3 ? 'bg-amber-700' : 'bg-primary/50'}
                      `}>
                        {rank}
                      </div>
                      <div>
                        <p className="font-bold">{p.full_name || p.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground font-medium">Level {p.current_level || 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary">{p.total_xp || 0}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">XP</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-background/50 rounded-2xl border border-dashed border-border">
                <Trophy className="mx-auto text-muted-foreground/30 mb-3" size={32} />
                <p className="text-muted-foreground font-medium">Leaderboard is currently empty.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm flex flex-col">
          <h3 className="text-2xl font-black tracking-tight mb-8">Your Recent Activity</h3>
          <div className="space-y-4 flex-1">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/40">
                  <div>
                    <p className="font-bold">Daily Mission</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {new Date(activity.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-accent">+{activity.total_xp_earned ?? activity.total_score}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">XP</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-background/50 rounded-2xl border border-dashed border-border h-full flex flex-col items-center justify-center">
                <Play className="mx-auto text-muted-foreground/30 mb-3" size={32} />
                <p className="text-muted-foreground font-medium">No recent activity yet.<br/>Complete a mission to see it here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
