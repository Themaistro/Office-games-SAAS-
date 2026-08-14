import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import { User, Flame, Trophy, Target, CalendarDays, Award } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If no real user, show placeholder for dev preview
  let profile = {
    full_name: "Player 1",
    total_xp: 8450,
    current_level: 8,
    current_streak: 3,
    best_streak: 12,
    games_played: 45
  };

  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) profile = data;
  }

  const nextLevelXp = profile.current_level * 1200;
  const progressPercent = Math.min(100, Math.round((profile.total_xp / nextLevelXp) * 100));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-sm">
          <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center shrink-0 border-4 border-background shadow-lg">
            <User className="w-16 h-16 text-secondary-foreground" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
            <p className="text-muted-foreground mb-6">
              {profile.department ? `${profile.department} Team` : 'No Department Assigned'}
            </p>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end text-sm font-medium">
                <span>Level {profile.current_level}</span>
                <span className="text-primary">{profile.total_xp} / {nextLevelXp} XP</span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <h2 className="text-xl font-bold mb-4">Lifetime Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
            <Flame className="text-orange-500 mb-2 w-8 h-8" />
            <span className="text-3xl font-bold">{profile.current_streak}</span>
            <span className="text-xs text-muted-foreground uppercase font-medium mt-1">Current Streak</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
            <CalendarDays className="text-blue-500 mb-2 w-8 h-8" />
            <span className="text-3xl font-bold">{profile.best_streak}</span>
            <span className="text-xs text-muted-foreground uppercase font-medium mt-1">Best Streak</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
            <Target className="text-green-500 mb-2 w-8 h-8" />
            <span className="text-3xl font-bold">{profile.games_played}</span>
            <span className="text-xs text-muted-foreground uppercase font-medium mt-1">Missions Played</span>
          </div>
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
            <Trophy className="text-yellow-500 mb-2 w-8 h-8" />
            <span className="text-3xl font-bold">12</span>
            <span className="text-xs text-muted-foreground uppercase font-medium mt-1">Peak Rank</span>
          </div>
        </div>

        {/* Badges Section */}
        <h2 className="text-xl font-bold mb-4">Badges & Achievements</h2>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                <Flame className="w-8 h-8 text-orange-600" />
              </div>
              <span className="font-semibold text-sm">7 Day Streak</span>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <span className="font-semibold text-sm">First Mission</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
              <span className="font-semibold text-sm">Monthly Champion</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <span className="font-semibold text-sm">Perfect Score</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
