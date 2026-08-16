import { login } from "./actions";
import { Brain } from "lucide-react";
import Link from "next/link";
import BouncingBackground from "@/components/BouncingBackground";
import PasswordInput from "@/components/PasswordInput";
import SSOButtons from "@/components/SSOButtons";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const resolvedParams = await searchParams;
  
  // Fetch accurate user count from Supabase
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
    
  const playersCount = count || 0;
  
  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      
      {/* Global Background Layer */}
      <div className="absolute inset-0 z-0 flex">
        {/* Left Side Background */}
        <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-primary/90 to-primary" />
        {/* Right Side Background */}
        <div className="flex-1 bg-background" />
      </div>

      {/* Global Bouncing Game Icons (DVD Screensaver Effect) */}
      <BouncingBackground />

      {/* Left Side - Visual Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-20 flex-col justify-between p-12 overflow-hidden animate-in fade-in duration-1000 pointer-events-none">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white animate-in slide-in-from-left-8 duration-700 delay-150 fill-mode-both">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
              <Brain size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">Daily Brain Arena</span>
          </div>
          
          {/* Live Players Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 animate-in fade-in duration-1000 delay-500 fill-mode-both">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-white/90">
              {playersCount.toLocaleString()} {playersCount === 1 ? 'player registered' : 'players registered'}
            </span>
          </div>
        </div>

        <div className="relative z-10 text-white mt-auto animate-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <h1 className="text-4xl font-bold tracking-tight mb-4 leading-tight drop-shadow-lg">
            Sharpen your mind. <br /> Compete with your team.
          </h1>
          <p className="text-lg text-white/90 max-w-md drop-shadow-md">
            Join the daily challenge, earn XP for accuracy and speed, and climb the monthly leaderboard.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 relative z-20">
        <div className="mx-auto w-full max-w-sm lg:w-[400px] bg-background/80 backdrop-blur-2xl p-8 rounded-3xl border border-border/50 shadow-2xl">
          <div className="lg:hidden flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Brain size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">Daily Brain Arena</span>
            </div>
          </div>

          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to start today's mission.
            </p>
          </div>

          <form id="login-form" className="space-y-6">
            {resolvedParams?.error && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="text-xl animate-bounce">⚠️</span>
                <span>{resolvedParams.error}</span>
              </div>
            )}
            {resolvedParams?.message && (
              <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="text-xl">✅</span>
                <span>{resolvedParams.message}</span>
              </div>
            )}
            
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 fill-mode-both">
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-foreground transition-colors group-focus-within:text-primary" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:text-sm shadow-sm"
                  placeholder="employee@company.com"
                />
              </div>
              
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground transition-colors group-focus-within:text-primary" htmlFor="password">
                    Password
                  </label>
                  <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors pointer-events-auto">
                    Forgot password?
                  </a>
                </div>
                <PasswordInput />
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
              <button
                formAction={login}
                className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Sign In
                  <Brain size={16} className="transition-transform group-hover:scale-110 group-hover:rotate-12" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              </button>
            </div>
            
            {/* SSO Separator */}
            <div className="relative animate-in fade-in duration-1000 delay-500 fill-mode-both">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background/80 px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* SSO Buttons */}
            <SSOButtons />

            <p className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500 fill-mode-both">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-foreground hover:text-primary transition-colors pointer-events-auto">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
