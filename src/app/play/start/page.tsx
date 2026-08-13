"use client";

import { startDailySession, startTestSession } from "../actions";
import { Brain, Clock, ShieldAlert, Zap, Bug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

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

  const handleTestStart = async () => {
    setTestLoading(true);
    setErrorMsg("");
    try {
      const result = await startTestSession();
      if (result.error) {
        setErrorMsg(result.error);
        setTestLoading(false);
        return;
      }
      if (result.success) {
        router.push("/play");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred");
      setTestLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
            <Brain className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Ready to begin?</h1>
          <p className="text-muted-foreground">
            Play at your own pace! Complete as many brain challenges as you can.
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex justify-between items-center text-sm font-medium mb-4">
            <span className="text-muted-foreground">Scoring Breakdown</span>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex justify-between"><span>Correct Answer</span><span className="text-primary font-bold">+100 XP</span></li>
            <li className="flex justify-between"><span>Speed Bonus (&lt;5s)</span><span className="text-green-500 font-bold">+25 XP</span></li>
            <li className="flex justify-between"><span>Perfect Puzzle</span><span className="text-accent font-bold">+50 XP</span></li>
            <li className="flex justify-between"><span>No Hint Used</span><span className="text-orange-500 font-bold">+20 XP</span></li>
            <li className="flex justify-between"><span>Combo Multiplier</span><span className="text-purple-500 font-bold">Stacking!</span></li>
          </ul>
        </div>
        
        <form onSubmit={handleStart} className="space-y-4">
          {errorMsg && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || testLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-70"
          >
            <Zap className={loading ? "animate-pulse" : ""} />
            {loading ? "STARTING..." : "START MISSION"}
          </button>
        </form>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleTestStart}
            disabled={loading || testLoading}
            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-border disabled:opacity-70 text-sm"
          >
            <Bug className={testLoading ? "animate-pulse" : ""} size={16} />
            {testLoading ? "PREPARING TEST..." : "TEST ALL GAMES (DEV MODE)"}
          </button>
        </div>
        
        <div className="pt-2">
          <a href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Wait, take me back
          </a>
        </div>
      </div>
    </div>
  );
}
