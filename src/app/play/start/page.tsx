"use client";

import { startDailySession } from "../actions";
import { Brain, Clock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await startDailySession();
      if (result.success) {
        router.push("/play");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
            <Clock className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Ready to begin?</h1>
          <p className="text-muted-foreground">
            Once you start, your 15-minute daily timer begins immediately. 
            Make sure you won't be interrupted.
          </p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-sm text-secondary-foreground text-left space-y-3">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-accent shrink-0" />
            <p><strong>Timer cannot be paused.</strong> Closing the browser will not stop the timer.</p>
          </div>
          <div className="flex gap-3">
            <Brain className="w-5 h-5 text-accent shrink-0" />
            <p><strong>Answer quickly and accurately</strong> for maximum XP.</p>
          </div>
        </div>

        <form onSubmit={handleStart}>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-md transition-transform active:scale-95 text-lg disabled:opacity-50"
          >
            {loading ? "STARTING..." : "START 15-MINUTE TIMER"}
          </button>
        </form>
        
        <div>
          <a href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Wait, take me back
          </a>
        </div>
      </div>
    </div>
  );
}
