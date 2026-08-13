import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Play, Flame, Shield, Trophy } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
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

  // Check if they have an active or completed session today
  // For MVP, we'll just determine timezone dynamically if needed, 
  // but let's query via UTC date boundaries for now or let PG do it based on timezone.
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todaySession } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  const isCompleted = todaySession?.status === "completed" || todaySession?.status === "expired";
  const isInProgress = todaySession?.status === "in_progress";
  
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
      {/* Welcome Banner */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {profile?.full_name || profile?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Level {profile?.current_level || 1} • {profile?.total_xp || 0} XP
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
            <Flame className="text-orange-500" size={20} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase">Streak</span>
              <span className="font-bold leading-none">{profile?.current_streak || 0} Days</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
            <Trophy className="text-yellow-500" size={20} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase">Rank</span>
              <span className="font-bold leading-none">#--</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mission Card */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden mb-8">
        <div className="bg-primary/10 px-6 py-8 sm:p-10 text-center flex flex-col items-center">
          <Shield className="text-primary mb-4" size={48} />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Today's Mission
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            {isCompleted 
              ? "You've completed your daily mission. Great job! Come back tomorrow."
              : "You have 15 minutes to complete as many brain challenges as you can. Ready?"}
          </p>
          
          {isCompleted ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl bg-background/50 rounded-xl p-4 border border-border/50">
              <div className="flex flex-col items-center p-2">
                <span className="text-xs font-medium text-muted-foreground uppercase mb-1">Score</span>
                <span className="text-xl font-bold">{todaySession.total_score}</span>
              </div>
              <div className="flex flex-col items-center p-2">
                <span className="text-xs font-medium text-muted-foreground uppercase mb-1">XP Earned</span>
                <span className="text-xl font-bold text-accent">+{todaySession.total_xp_earned}</span>
              </div>
              <div className="flex flex-col items-center p-2">
                <span className="text-xs font-medium text-muted-foreground uppercase mb-1">Status</span>
                <span className="text-xl font-bold text-green-500">Done</span>
              </div>
              <div className="flex flex-col items-center p-2">
                <span className="text-xs font-medium text-muted-foreground uppercase mb-1">Time</span>
                <span className="text-xl font-bold">--:--</span>
              </div>
            </div>
          ) : (
            <Link
              href={isInProgress ? "/play" : "/play/start"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Play fill="currentColor" size={20} />
              {isInProgress ? "RESUME CHALLENGE" : "START CHALLENGE"}
            </Link>
          )}
        </div>
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">No recent activity yet.</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Current Leaderboard</h3>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Play a game to appear on the leaderboard!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
