import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Play, Flame, Shield, Trophy, User } from "lucide-react";
import Link from "next/link";
import AnnouncementBanner from "@/components/dashboard/AnnouncementBanner";
import CooldownTimer from "@/components/dashboard/CooldownTimer";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import UnifiedOfficeLounge from "@/components/dashboard/UnifiedOfficeLounge";
import DashboardTutorialTrigger from "@/components/tutorial/DashboardTutorialTrigger";

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
    .select("full_name, total_xp, current_level, email, avatar_url")
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
  const currentLevelBaseXp = (currentLevel - 1) * 1200;
  const nextLevelXp = currentLevel * 1200;
  const xpIntoLevel = totalXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / 1200) * 100)));

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
      <DashboardTutorialTrigger />
      {/* Announcements Banner */}
      <AnnouncementBanner announcements={announcements || []} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* ==================== LEFT COLUMN (MAIN CONTENT) ==================== */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          
          {/* Welcome Banner */}
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Welcome back, <span className="text-primary">{profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0]}!</span>
            </h1>
            
            {/* XP Progress Bar */}
            <div className="w-full bg-card/50 backdrop-blur-sm border border-border/60 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">Lv.{currentLevel}</span>
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{totalXp.toLocaleString()} XP</span>
                </div>
                <div className="text-sm font-bold text-primary">
                  {Math.round(progressPercent)}% to Lv.{currentLevel + 1}
                </div>
              </div>
              
              <div className="relative h-5 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/50 shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent mix-blend-overlay" />
              </div>
              
              <div className="flex justify-between mt-2 text-xs font-semibold text-muted-foreground/70">
                <span>{currentLevelBaseXp.toLocaleString()}</span>
                <span>{nextLevelXp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>

          {/* Main Mission Card */}
          <div id="tour-daily-mission" className="relative rounded-3xl bg-card border border-border/60 shadow-xl overflow-hidden group">
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
                      { 
                        label: "XP Earned", 
                        value: `+${latestSession.total_xp_earned ?? latestSession.total_score ?? 0}`, 
                        color: "text-accent",
                        subtext: (latestSession.total_xp_earned ?? 0) > (latestSession.total_score ?? 0) 
                          ? `${latestSession.total_score} Base + ${(latestSession.total_xp_earned ?? 0) - (latestSession.total_score ?? 0)} Streak` 
                          : null
                      },
                      { label: "Status", value: "Done", color: "text-emerald-500" },
                      { label: "Time", value: formattedTime }
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col items-center p-4 bg-background/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm relative">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</span>
                        <span className={`text-2xl font-black ${stat.color || "text-foreground"}`}>{stat.value}</span>
                        {stat.subtext && (
                          <span className="absolute bottom-1 text-[10px] font-bold text-accent/80 tracking-tight whitespace-nowrap">
                            {stat.subtext}
                          </span>
                        )}
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

          {/* The Office Lounge (Unified) */}
          <div id="tour-office-lounge">
            <UnifiedOfficeLounge currentUserId={user.id} />
          </div>

          {/* Unified Activity Feed (Live Feed + Matches) */}
          <LiveActivityFeed />

        </div>

        {/* ==================== RIGHT COLUMN (SIDEBAR) ==================== */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="sticky top-24 flex flex-col gap-8">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center text-center gap-2 bg-card border border-border/60 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-orange-500/20 p-3 rounded-2xl">
                  <Flame className="text-orange-500" size={28} />
                </div>
                <div>
                  <span className="text-2xl font-black leading-none block mb-1">{profile?.current_streak || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Day Streak</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center gap-2 bg-card border border-border/60 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-yellow-500/20 p-3 rounded-2xl">
                  <Trophy className="text-yellow-500" size={28} />
                </div>
                <div>
                  <span className="text-2xl font-black leading-none block mb-1">#{userRank}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Rank</span>
                </div>
              </div>
            </div>

            {/* Global Leaderboard */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black tracking-tight">Top Players</h3>
                <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  Global
                </div>
              </div>
              
              <div className="space-y-3">
                {topProfiles && topProfiles.length > 0 ? (
                  topProfiles.map((p, idx) => {
                    const rank = idx + 1;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/40 hover:bg-background/80 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full border-2 border-background shadow-sm overflow-hidden bg-secondary flex items-center justify-center">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-background
                              ${rank === 1 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 
                                rank === 2 ? 'bg-gray-400' : 
                                rank === 3 ? 'bg-amber-700' : 'bg-primary'}
                            `}>
                              {rank}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{p.full_name || p.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Level {p.current_level || 1}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className="font-black text-primary text-sm">{p.total_xp || 0}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">XP</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-background/50 rounded-2xl border border-dashed border-border">
                    <Trophy className="mx-auto text-muted-foreground/30 mb-2" size={24} />
                    <p className="text-xs text-muted-foreground font-medium">Leaderboard empty.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Daily Missions */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <h3 className="text-lg font-black tracking-tight mb-6">Recent Missions</h3>
              <div className="space-y-4">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/40 hover:bg-background/80 transition-colors">
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
                  <div className="text-center py-8 bg-background/50 rounded-2xl border border-dashed border-border">
                    <Play className="mx-auto text-muted-foreground/30 mb-3" size={24} />
                    <p className="text-xs text-muted-foreground font-medium">No recent missions yet.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
