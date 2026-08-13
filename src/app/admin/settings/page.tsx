"use client";

import { useState } from "react";
import { resetSeason } from "./actions";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    if (!window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all game history and reset all employee XP and Streaks to zero!")) {
      return;
    }
    
    // Double confirmation for safety
    if (window.prompt("Type 'RESET' to confirm this destructive action:") !== "RESET") {
      return;
    }

    setIsResetting(true);
    setMessage("");

    try {
      await resetSeason();
      setMessage("Season has been successfully reset. A new 30-day competition begins today!");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global configuration and competition cycles.</p>
      </div>

      <div className="bg-card border border-destructive/30 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-destructive/5 px-6 py-4 border-b border-destructive/20 flex items-center gap-3">
          <AlertTriangle className="text-destructive" size={24} />
          <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
        </div>
        <div className="p-6 space-y-6">
          
          <div>
            <h3 className="text-base font-bold">Start New Season (Hard Reset)</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              This action will reset every employee's Total XP, Level, and Current Streak back to zero. It will also permanently delete all historical daily sessions. Only do this at the beginning of a new competition month!
            </p>
            
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 transition-all disabled:opacity-50"
            >
              {isResetting ? <RefreshCw className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
              {isResetting ? "Resetting Database..." : "Wipe Leaderboard & Start New Season"}
            </button>

            {message && (
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border text-sm font-medium">
                {message}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
