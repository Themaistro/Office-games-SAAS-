"use client";

import { useState } from "react";
import { Brain, Swords, Clock3, Users, ArrowRight, Sparkles, DoorOpen, Map } from "lucide-react";

export default function DashboardModeTabs() {
  const [mode, setMode] = useState<"mission" | "lounge">("mission");

  const selectMode = (nextMode: "mission" | "lounge") => {
    setMode(nextMode);
    document.getElementById("tour-daily-mission")?.classList.toggle("hidden", nextMode !== "mission");
    document.getElementById("tour-office-lounge")?.classList.toggle("hidden", nextMode !== "lounge");
    document.getElementById("dashboard-mode-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="dashboard-mode-tabs" className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-secondary/30 p-5 shadow-sm sm:p-8" role="tablist" aria-label="Choose your Office Games journey">
      <div className="relative z-10 mb-6 flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary"><Map size={14}/> Your Office Games map</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Choose your journey</h2><p className="mt-1 text-sm font-medium text-muted-foreground">Where do you want to go today?</p></div><div className="hidden rounded-full border border-border/60 bg-background/60 px-3 py-2 text-xs font-bold text-muted-foreground sm:block">Pick a door to begin</div></div>
      <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        <button role="tab" aria-selected={mode === "mission"} onClick={() => selectMode("mission")} className={`group relative min-h-[245px] overflow-hidden rounded-[1.5rem] border-2 p-6 text-left transition-all duration-300 sm:p-7 ${mode === "mission" ? "border-primary bg-gradient-to-br from-primary/20 to-card shadow-xl shadow-primary/10" : "border-border/60 bg-background/50 hover:-translate-y-1 hover:border-primary/50"}`}>
          <div className="absolute -bottom-10 right-3 h-48 w-32 rounded-t-[4rem] border-8 border-primary/30 bg-gradient-to-b from-primary/30 to-primary/5 shadow-[inset_0_0_30px_rgba(255,255,255,0.12)] transition-transform duration-500 group-hover:scale-105"><div className="absolute right-4 top-1/2 h-4 w-4 rounded-full bg-primary shadow-lg"/><div className="absolute inset-x-3 top-3 h-1 rounded-full bg-primary/40"/></div>
          <div className="relative max-w-[65%]"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Brain size={25}/></div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Path of focus</p><h3 className="mt-1 text-2xl font-black">Daily Mission</h3><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Enter a quick sequence of games, build your streak, and earn today&apos;s XP.</p><div className="mt-5 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="flex items-center gap-1"><Clock3 size={13}/> 10–15 min</span><span className="flex items-center gap-1"><Sparkles size={13}/> Rewards</span></div></div><DoorOpen className={`absolute bottom-5 right-[7.3rem] text-primary transition-transform ${mode === "mission" ? "translate-x-1" : "group-hover:translate-x-1"}`} size={18}/>
        </button>
        <button role="tab" aria-selected={mode === "lounge"} onClick={() => selectMode("lounge")} className={`group relative min-h-[245px] overflow-hidden rounded-[1.5rem] border-2 p-6 text-left transition-all duration-300 sm:p-7 ${mode === "lounge" ? "border-violet-500 bg-gradient-to-br from-violet-500/20 to-card shadow-xl shadow-violet-500/10" : "border-border/60 bg-background/50 hover:-translate-y-1 hover:border-violet-500/50"}`}>
          <div className="absolute -bottom-10 right-3 h-48 w-32 rounded-t-[4rem] border-8 border-violet-500/30 bg-gradient-to-b from-violet-500/30 to-violet-500/5 shadow-[inset_0_0_30px_rgba(255,255,255,0.12)] transition-transform duration-500 group-hover:scale-105"><div className="absolute right-4 top-1/2 h-4 w-4 rounded-full bg-violet-500 shadow-lg"/><div className="absolute inset-x-3 top-3 h-1 rounded-full bg-violet-500/40"/></div>
          <div className="relative max-w-[65%]"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500"><Swords size={25}/></div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Social arcade</p><h3 className="mt-1 text-2xl font-black">Office Lounge</h3><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">Open the lounge to challenge coworkers, join a lobby, or watch a live match.</p><div className="mt-5 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="flex items-center gap-1"><Users size={13}/> Multiplayer</span><span>♟ 🔴 ✕</span></div></div><DoorOpen className={`absolute bottom-5 right-[7.3rem] text-violet-500 transition-transform ${mode === "lounge" ? "translate-x-1" : "group-hover:translate-x-1"}`} size={18}/>
        </button>
      </div>
    </div>
  );
}

