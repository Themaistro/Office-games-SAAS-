"use client";

import { useState, useEffect } from "react";
import { resetSeason, getSystemSettings, factoryResetPlatform, updateSystemSettings } from "./actions";
import { AlertTriangle, RefreshCw, CalendarDays, Hash, Flame } from "lucide-react";

export default function SettingsPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [isFactoryResetting, setIsFactoryResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const loadSettings = async () => {
    const s = await getSystemSettings();
    setSettings(s);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFactoryReset = async () => {
    if (!window.confirm("CRITICAL WARNING: This will permanently wipe ALL historical season winners, daily sessions, and employee profiles. It will completely reset the platform to a brand new state. This action CANNOT be undone! Are you absolutely sure?")) {
      return;
    }
    
    setIsFactoryResetting(true);
    try {
      await factoryResetPlatform();
      setMessage("Platform has been completely factory reset!");
      await loadSettings();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsFactoryResetting(false);
    }
  };


  const handleReset = async () => {
    if (!window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all game history, archive top winners, and reset all employee XP and Streaks to zero!")) {
      return;
    }
    
    if (window.prompt("Type 'RESET' to confirm this destructive action:") !== "RESET") {
      return;
    }

    setIsResetting(true);
    setMessage("");

    try {
      await resetSeason();
      setMessage("Season has been successfully reset. A new competition begins today!");
      await loadSettings();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const daysActive = settings ? Math.floor((new Date().getTime() - new Date(settings.season_start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global configuration and competition cycles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Current Season</h3>
            <Hash size={16} className="text-primary" />
          </div>
          
          <span className="text-3xl font-bold">Season {settings?.current_season || 1}</span>
          
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Active competition cycle
          </span>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Days Active</h3>
            <CalendarDays size={16} className="text-blue-500" />
          </div>
          <span className="text-3xl font-bold">{daysActive}</span>
          <span className="text-xs text-muted-foreground font-medium mt-2 flex items-center gap-1">
            Days since season started
          </span>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold mb-4">Time & Session Controls</h3>
        <p className="text-sm text-muted-foreground mb-6">Manage global cooldowns and time limits for player sessions.</p>
        
        <form action={async (formData) => {
          try {
            await updateSystemSettings(formData);
            setMessage("Time settings updated successfully!");
            await loadSettings();
          } catch (e: any) {
            setMessage(`Error: ${e.message}`);
          }
        }} className="space-y-4 max-w-md">
          
          <div className="space-y-2">
            <label className="text-sm font-semibold">Daily Cooldown (Hours)</label>
            <input 
              type="number" 
              name="cooldown_hours" 
              defaultValue={settings?.cooldown_hours ?? 24}
              min="0"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">Set to 0 to completely disable the cooldown and allow unlimited play.</p>
          </div>
          
          <div className="space-y-2 pt-2">
            <label className="text-sm font-semibold">Game Timer (Minutes)</label>
            <input 
              type="number" 
              name="game_duration_minutes" 
              defaultValue={settings?.game_duration_seconds ? Math.floor(settings.game_duration_seconds / 60) : 15}
              min="1"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">The time limit players have to complete a daily challenge sprint. Default is 15 minutes.</p>
          </div>
          
          <div className="pt-4">
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Save Time Settings
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-destructive/30 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-destructive/5 px-6 py-4 border-b border-destructive/20 flex items-center gap-3">
          <AlertTriangle className="text-destructive" size={24} />
          <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
        </div>
        <div className="p-6 space-y-6">
          
          <div className="border-b border-border pb-6">
            <h3 className="text-base font-bold">Wipe Leaderboard & Start New Season</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              This action will reset every employee's Total XP, Level, and Current Streak back to zero. It will also archive the Top 3 players, permanently delete all historical daily sessions, and flush the daily question pool. Only do this at the beginning of a new competition month!
            </p>
            
            <button
              onClick={handleReset}
              disabled={isResetting || isFactoryResetting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 transition-all disabled:opacity-50"
            >
              {isResetting ? <RefreshCw className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
              {isResetting ? "Resetting Database..." : "Start New Season"}
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-red-500 flex items-center gap-2"><Flame size={18}/> Factory Reset Platform</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              This action completely wipes the platform to a blank slate. ALL historical season winners will be deleted. The Season Counter will reset to 1. All users lose their progress. Use this if you want to completely start over from zero.
            </p>
            
            <button
              onClick={handleFactoryReset}
              disabled={isResetting || isFactoryResetting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-900 border border-red-500 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50"
            >
              {isFactoryResetting ? <RefreshCw className="animate-spin" size={16} /> : <Flame size={16} />}
              {isFactoryResetting ? "Wiping Everything..." : "FACTORY RESET ALL SEASONS"}
            </button>
          </div>

          {message && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border text-sm font-medium">
              {message}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
