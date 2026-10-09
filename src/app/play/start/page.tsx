"use client";

import { startDailySession } from "../actions";
import { Brain, Zap, Target, Timer, Trophy, Flame, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function StartSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await startDailySession();
      if (result.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }
      if (result.success) {
        router.push("/play");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-12 px-4 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Centered Glass Card */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Subtle glowing Border Effect Wrapper */}
        <div className="absolute -inset-[1px] rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-60" />
        
        <div className="relative bg-card/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center">
          
          {/* Top Icon */}
          <div className="mb-6 relative group cursor-default">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse group-hover:bg-primary/30 transition-colors" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-background to-background/50 border border-primary/20 rounded-3xl flex items-center justify-center shadow-lg backdrop-blur-md transform transition-transform duration-500 group-hover:rotate-[5deg] group-hover:scale-105">
              <Brain className="text-primary" size={36} />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/60">
            START YOUR ADVENTURE
          </h1>
          
          {/* Decorative Divider */}
          <div className="w-12 h-1 bg-primary/30 rounded-full mb-6" />

          <p className="text-sm text-muted-foreground mb-8 font-medium px-4 leading-relaxed">
            Enter the arena. Forge your path to the top of the leaderboard.
          </p>
          
          {/* Rules Box */}
          <div className="w-full bg-background/90 rounded-2xl border border-white/5 p-6 mb-8 shadow-inner text-left relative overflow-hidden">
            {/* Very faint background pattern/glow in the rules box */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
            
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-5 text-center relative z-10">
              Scoring Parameters
            </h3>
            <ul className="space-y-4 relative z-10">
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-foreground/80">
                  <div className="p-1.5 rounded-lg bg-primary/10"><Target size={14} className="text-primary" /></div>
                  <span className="font-semibold">Accuracy</span>
                </div>
                <span className="text-primary font-black">+100 XP</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-foreground/80">
                  <div className="p-1.5 rounded-lg bg-green-500/10"><Timer size={14} className="text-green-500" /></div>
                  <span className="font-semibold">Speed (&lt;5s)</span>
                </div>
                <span className="text-green-500 font-black">+25 XP</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-foreground/80">
                  <div className="p-1.5 rounded-lg bg-accent/10"><Trophy size={14} className="text-accent" /></div>
                  <span className="font-semibold">Perfect Run</span>
                </div>
                <span className="text-accent font-black">+50 XP</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-foreground/80">
                  <div className="p-1.5 rounded-lg bg-orange-500/10"><Flame size={14} className="text-orange-500" /></div>
                  <span className="font-semibold">Combo</span>
                </div>
                <span className="text-orange-500 font-black">Stacking</span>
              </li>
            </ul>
          </div>
          
          {/* Actions */}
          <form onSubmit={handleStart} className="w-full flex flex-col gap-4">
            {errorMsg && (
              <div className="w-full bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold border border-destructive/20">
                {errorMsg}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="relative group flex items-center justify-center w-full rounded-2xl bg-primary px-4 py-4 sm:py-5 font-black text-primary-foreground text-lg tracking-wider transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <span className="relative z-10 flex items-center gap-2">
                <Zap fill={loading ? "none" : "currentColor"} className={loading ? "animate-pulse" : ""} size={20} />
                {loading ? "INITIALIZING..." : "START GAME"}
                {!loading && <ChevronRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
            
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-[0.2em] transition-colors py-2 mt-2"
            >
              Cancel
            </Link>
          </form>

        </div>
      </div>
    </div>
  );
}
