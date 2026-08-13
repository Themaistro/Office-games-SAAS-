import Link from "next/link";
import { Brain, Target, Users, Zap, Trophy, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Brain size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Daily Brain Arena
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Log In to Play
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-24 sm:py-32 lg:px-8 text-center bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Internal Team Challenge
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground">
              Welcome to the <span className="text-primary">Daily Brain Arena</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Take a 15-minute break, stretch your cognitive muscles, and compete with your colleagues on the monthly leaderboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/login"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform hover:-translate-y-1 w-full sm:w-auto"
              >
                Play Today's Mission
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="rules" className="px-4 py-24 sm:py-32 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">The rules of engagement.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Zap className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">15 Minutes Max</h3>
              <p className="text-muted-foreground">You get exactly 15 minutes a day to complete the mission. If the timer runs out, your score is locked until tomorrow.</p>
            </div>
            
            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Brain className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">4 Mini Games</h3>
              <p className="text-muted-foreground">Every day brings a random assortment of Logic puzzles, Word scrambles, Trivia, and Memory tests to keep you sharp.</p>
            </div>
            
            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Trophy className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Monthly Seasons</h3>
              <p className="text-muted-foreground">Earn XP for fast, accurate answers. Build your daily streak for multipliers, and climb the ranks to win the monthly trophy.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="text-primary" size={24} />
            <span className="text-lg font-bold">Daily Brain Arena</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Powered by your HR Department.
          </p>
        </div>
      </footer>
    </div>
  );
}
