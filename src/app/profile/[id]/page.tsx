import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import { User, Flame, Trophy, Target, CalendarDays, Award, Star, Lock, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ActivityHeatmap from "@/components/profile/ActivityHeatmap";
import CognitiveRadarChart from "@/components/profile/CognitiveRadarChart";
import ChessStatsCard from "@/components/profile/ChessStatsCard";
import TttStatsCard from "@/components/profile/TttStatsCard";
import ChallengeMenu from "@/components/profile/ChallengeMenu";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage(props: { params: Promise<{ id: string }>, searchParams?: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const profileId = params.id;
  const activeTab = searchParams?.tab || "overview";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">Please log in to view your profile.</p>
        </main>
      </div>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single();

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">Profile not found.</p>
        </main>
      </div>
    );
  }

  // Fetch Chess Games for stats
  const { data: chessGames } = await supabase
    .from("chess_games")
    .select(`
      *,
      white:profiles!chess_games_white_player_id_fkey ( id, full_name, avatar_url, chess_elo ),
      black:profiles!chess_games_black_player_id_fkey ( id, full_name, avatar_url, chess_elo )
    `)
    .or(`white_player_id.eq.${profileId},black_player_id.eq.${profileId}`)
    .in('status', ['white_won', 'black_won', 'draw'])
    .order('updated_at', { ascending: false });

  const { data: tttGames } = await supabase
    .from('ttt_games')
    .select(`*, x_player:profiles!ttt_games_x_player_id_fkey(id, full_name, avatar_url), o_player:profiles!ttt_games_o_player_id_fkey(id, full_name, avatar_url)`)
    .or(`x_player_id.eq.${profileId},o_player_id.eq.${profileId}`)
    .in('status', ['x_won', 'o_won', 'draw'])
    .order('updated_at', { ascending: false });

  const currentLevelBaseXp = (profile.current_level - 1) * 1200;
  const nextLevelXp = profile.current_level * 1200;
  const xpIntoLevel = profile.total_xp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / 1200) * 100)));

  // Compute User Title & Theme
  let userTitle = "Rookie";
  let themeColor = "from-primary/10 to-accent/5"; 
  let borderColor = "border-border/50";
  let glowEffect = "";
  
  if (profile.current_level >= 10) {
    userTitle = "Mastermind";
    themeColor = "from-yellow-500/20 to-amber-700/10";
    borderColor = "border-yellow-500/50";
    glowEffect = "shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]";
  } else if (profile.current_level >= 5) {
    userTitle = "Brainiac";
    themeColor = "from-slate-400/20 to-slate-600/10";
    borderColor = "border-slate-400/50";
    glowEffect = "shadow-[0_0_30px_-10px_rgba(148,163,184,0.3)]";
  } else if (profile.current_level >= 3) {
    userTitle = "Apprentice";
    themeColor = "from-orange-500/10 to-amber-600/5";
    borderColor = "border-orange-500/30";
  }

  // Calculate Global Rank
  let userRank = "--";
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

  if (profile.role !== "admin") {
    userRank = ((higherXpCount || 0) + tieBreakerCount + 1).toString();
  } else {
    userRank = "Admin";
  }

  // Calculate Department Rank
  let deptRank = "--";
  if (profile.department && profile.role !== "admin") {
    const { count: higherDeptXpCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("department", profile.department)
      .neq("role", "admin")
      .gt("total_xp", profile.total_xp || 0);
      
    let deptTieBreakerCount = 0;
    if (profile.full_name) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("department", profile.department)
        .neq("role", "admin")
        .eq("total_xp", profile.total_xp || 0)
        .lt("full_name", profile.full_name);
      deptTieBreakerCount = count || 0;
    }
    deptRank = ((higherDeptXpCount || 0) + deptTieBreakerCount + 1).toString();
  }

  // Fetch Mission History for Sidebar (last 10)
  const { data: recentHistory } = await supabase
    .from("daily_sessions")
    .select("date, total_score, total_xp_earned, is_completed")
    .eq("user_id", profileId)
    .eq("is_completed", true)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch up to 35 days for the heatmap
  const { data: heatmapHistory } = await supabase
    .from("daily_sessions")
    .select("date, total_score, total_xp_earned, is_completed")
    .eq("user_id", profileId)
    .eq("is_completed", true)
    .order("created_at", { ascending: false })
    .limit(35);

  // Fetch Game-Specific Stats
  const { data: userSessions } = await supabase
    .from("daily_sessions")
    .select("id")
    .eq("user_id", profileId)
    .eq("is_completed", true);

  const sessionIds = userSessions?.map(s => s.id) || [];
  let gameStatsArray: { name: string, plays: number, avgScore: number, accuracy: number }[] = [];
  
  if (sessionIds.length > 0) {
    const { data: questionsData } = await supabase
      .from("session_questions")
      .select(`
        earned_xp, 
        is_correct, 
        questions (
          game_types (
            name
          )
        )
      `)
      .in("session_id", sessionIds);
      
    if (questionsData) {
      const statsMap: Record<string, { totalScore: number, plays: number, correctCount: number }> = {};
      
      questionsData.forEach((q: any) => {
        const gt = q.questions?.game_types;
        const gameName = gt ? (Array.isArray(gt) ? gt[0]?.name : gt.name) : "Unknown Game";
        if (gameName === "Unknown Game") return; // Skip broken records
        
        if (!statsMap[gameName]) {
          statsMap[gameName] = { totalScore: 0, plays: 0, correctCount: 0 };
        }
        statsMap[gameName].plays += 1;
        statsMap[gameName].totalScore += (q.earned_xp || 0);
        if (q.is_correct) statsMap[gameName].correctCount += 1;
      });
      
      gameStatsArray = Object.entries(statsMap).map(([name, stats]) => ({
        name,
        plays: stats.plays,
        avgScore: Math.round(stats.totalScore / stats.plays),
        accuracy: Math.round((stats.correctCount / stats.plays) * 100)
      })).sort((a, b) => b.plays - a.plays);
    }
  }

  // Generate deterministic Radar Chart data based on user stats
  // We use their games_played and total_xp to seed some varied strengths
  const baseScore = Math.min(100, (profile.total_xp / 100) + 40);
  const offset = profile.games_played % 5;
  
  const radarData = [
    { subject: 'Memory', A: Math.min(100, baseScore + (offset === 0 ? 20 : -10)), fullMark: 100 },
    { subject: 'Speed', A: Math.min(100, baseScore + (offset === 1 ? 25 : -5)), fullMark: 100 },
    { subject: 'Logic', A: Math.min(100, baseScore + (offset === 2 ? 15 : 5)), fullMark: 100 },
    { subject: 'Trivia', A: Math.min(100, baseScore + (offset === 3 ? 30 : -15)), fullMark: 100 },
    { subject: 'Accuracy', A: Math.min(100, baseScore + (offset === 4 ? 20 : 0)), fullMark: 100 },
  ];

  // Define Badges Logic
  const badges = [
    {
      id: "first_blood",
      name: "First Blood",
      description: "Complete your first mission",
      icon: Award,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      unlocked: profile.games_played >= 1
    },
    {
      id: "veteran",
      name: "Veteran",
      description: "Complete 50 missions",
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      unlocked: profile.games_played >= 50
    },
    {
      id: "hot_streak",
      name: "Hot Streak",
      description: "Achieve a 7-day streak",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      unlocked: (profile.best_streak || 0) >= 7
    },
    {
      id: "unstoppable",
      name: "Unstoppable",
      description: "Achieve a 30-day streak",
      icon: Flame,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      unlocked: (profile.best_streak || 0) >= 30
    },
    {
      id: "10k_club",
      name: "10k Club",
      description: "Accumulate 10,000 XP",
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      unlocked: profile.total_xp >= 10000
    },
    {
      id: "level_10",
      name: "Level 10",
      description: "Reach Player Level 10",
      icon: Star,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      unlocked: profile.current_level >= 10
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-28 pb-8 max-w-5xl">
        
        {/* Profile Header (Glassmorphic) */}
        <div className={`relative overflow-hidden bg-card/60 backdrop-blur-xl border ${borderColor} rounded-3xl p-8 sm:p-10 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-xl group transition-all duration-500 ${glowEffect}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${themeColor} opacity-50`} />
          
          {user.id === profile.id && (
            <EditProfileModal currentName={profile.full_name} currentAvatar={profile.avatar_url} />
          )}

          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center shrink-0 border-4 border-background shadow-2xl overflow-hidden ${
            profile.current_level >= 10 ? 'ring-4 ring-yellow-500/50 shadow-yellow-500/50' : 
            profile.current_level >= 5 ? 'ring-4 ring-slate-400/50 shadow-slate-400/50' : ''
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted" />
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover relative z-10" />
            ) : (
              <User className="w-16 h-16 text-muted-foreground/50 relative z-10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-20 pointer-events-none" />
          </div>
          
          <div className="relative flex-1 text-center md:text-left w-full z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-1 pr-10">{profile.full_name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full tracking-wider uppercase">
                    {userTitle}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {profile.department ? `${profile.department} Division` : 'No Department'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur px-4 py-2 rounded-2xl border border-border/50 shadow-sm">
                  <Trophy className="text-yellow-500 w-5 h-5" />
                  <span className="font-bold text-muted-foreground">Global Rank</span>
                  <span className="font-black text-xl text-foreground">#{userRank}</span>
                </div>
                {user.id !== profile.id && (
                  <ChallengeMenu targetUserId={profile.id} />
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full max-w-xl mx-auto md:mx-0">
              <div className="flex justify-between items-end text-sm font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">Level <span className="text-foreground text-lg">{profile.current_level}</span></span>
                <span className="text-primary">{profile.total_xp.toLocaleString()} <span className="text-muted-foreground text-xs">/ {nextLevelXp.toLocaleString()} XP</span></span>
              </div>
              
              <div className="relative w-full bg-secondary/50 h-4 rounded-full overflow-hidden shadow-inner border border-border/50">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent mix-blend-overlay" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-8 border-b border-border/50 pb-px">
          <Link 
            href={`/profile/${profileId}?tab=overview`} 
            className={clsx(
              "px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors", 
              activeTab === "overview" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Overview
          </Link>
          <Link 
            href={`/profile/${profileId}?tab=mastery`} 
            className={clsx(
              "px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors", 
              activeTab === "mastery" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Cognitive Mastery
          </Link>
          <Link 
            href={`/profile/${profileId}?tab=chess`} 
            className={clsx(
              "px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors", 
              activeTab === "chess" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Office Lounge
          </Link>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8">
            {/* Lifetime Statistics */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-4 flex items-center gap-2">
                <Activity className="text-primary" /> Lifetime Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                  { icon: Flame, color: "text-orange-500", label: "Current Streak", value: profile.current_streak },
                  { icon: CalendarDays, color: "text-blue-500", label: "Best Streak", value: profile.best_streak },
                  { icon: Target, color: "text-green-500", label: "Missions", value: profile.games_played },
                  { icon: Trophy, color: "text-yellow-500", label: "Global Rank", value: `#${userRank}` },
                  { icon: Star, color: "text-purple-500", label: "Dept Rank", value: `#${deptRank}` }
                ].map((stat, i) => (
                  <div key={i} className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-card/80 transition-colors shadow-sm group hover:-translate-y-1">
                    <stat.icon className={clsx("mb-3 w-8 h-8 transition-transform group-hover:scale-110", stat.color)} />
                    <span className="text-3xl font-black mb-1">{stat.value}</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Activity Heatmap */}
              <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold tracking-tight mb-6 text-center">35-Day Activity</h2>
                <ActivityHeatmap history={heatmapHistory || []} />
              </div>

              {/* Trophies & Badges */}
              <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
                  <Award className="text-yellow-500" /> Milestone Trophies
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {badges.map((badge) => (
                    <div 
                      key={badge.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all relative overflow-hidden group flex flex-col items-center text-center",
                        badge.unlocked 
                          ? `${badge.bg} ${badge.border} hover:scale-105 shadow-sm` 
                          : "bg-secondary/20 border-border/30 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      {!badge.unlocked && <Lock size={14} className="absolute top-3 right-3 text-muted-foreground" />}
                      <badge.icon size={28} className={clsx("mb-3", badge.unlocked ? badge.color : "text-muted-foreground")} />
                      <h3 className="font-bold text-sm mb-1">{badge.name}</h3>
                      <p className="text-xs text-muted-foreground leading-tight">{badge.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cognitive Mastery */}
        {activeTab === "mastery" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cognitive Strengths */}
                <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm">
                  <h2 className="text-xl font-bold tracking-tight mb-6 text-center uppercase text-muted-foreground text-xs">Cognitive Strengths</h2>
                  <CognitiveRadarChart data={radarData} />
                </div>
                
                {/* Game Mastery */}
                <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-full">
                  <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
                    <Target className="text-primary" /> Game Mastery
                  </h2>
                  {gameStatsArray.length > 0 ? (
                    <div className="space-y-4">
                      {gameStatsArray.slice(0, 5).map((stat, i) => (
                        <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{stat.name}</span>
                            <span className="text-sm text-muted-foreground font-medium">{stat.plays} plays</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Accuracy: <span className={stat.accuracy >= 80 ? 'text-green-500 font-bold' : stat.accuracy >= 50 ? 'text-yellow-500 font-bold' : 'text-red-500 font-bold'}>{stat.accuracy}%</span></span>
                            <span className="text-muted-foreground">Avg XP: <span className="text-primary font-bold">{stat.avgScore}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-center opacity-50">
                      <Target size={40} className="mb-4 text-muted-foreground" />
                      <p className="font-medium">No game data yet.</p>
                      <p className="text-sm">Play missions to see your mastery stats!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mission History Sidebar */}
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-black tracking-tight mb-0 flex items-center gap-2">
                <CalendarDays className="text-primary" /> Mission Log
              </h2>
              <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                {recentHistory && recentHistory.length > 0 ? (
                  <div className="divide-y divide-border/50 overflow-y-auto max-h-[800px]">
                    {recentHistory.map((session, i) => (
                      <div key={i} className="p-5 hover:bg-secondary/30 transition-colors flex items-center justify-between group cursor-default">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground">{session.date}</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Score: {session.total_score}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
                            +{session.total_xp_earned} XP
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
                    <Target className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="font-bold text-muted-foreground">No missions completed yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back after your first day!</p>
                  </div>
                )}
                
                <div className="p-4 bg-secondary/30 border-t border-border/50 text-center">
                  <Link href="/play/start" className="text-sm font-bold text-primary hover:underline">
                    Play Today's Mission &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Office Lounge */}
        {activeTab === "chess" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChessStatsCard 
              elo={profile.chess_elo || 1200} 
              games={chessGames || []} 
              currentUserId={profileId} 
            />
            <TttStatsCard 
              elo={profile.ttt_elo || 1200} 
              games={tttGames || []} 
              currentUserId={profileId} 
            />
          </div>
        )}
      </main>
    </div>
  );
}
