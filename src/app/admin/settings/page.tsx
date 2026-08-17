"use client";

import { useState, useEffect } from "react";
import { resetSeason, getSystemSettings, factoryResetPlatform, updateSystemSettings, bulkUpdateTimeLimits } from "./actions";
import { AlertTriangle, RefreshCw, CalendarDays, Hash, Flame, Clock } from "lucide-react";

export default function SettingsPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [isFactoryResetting, setIsFactoryResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'season' | 'factory' | null }>({ isOpen: false, type: null });
  const [confirmText, setConfirmText] = useState("");

  const loadSettings = async () => {
    const s = await getSystemSettings();
    setSettings(s);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openConfirmModal = (type: 'season' | 'factory') => {
    setConfirmModal({ isOpen: true, type });
    setConfirmText("");
  };

  const executeReset = async () => {
    if (confirmModal.type === 'factory') {
      if (confirmText !== "FACTORY WIPE") return alert("Type FACTORY WIPE exactly to confirm.");
      setIsFactoryResetting(true);
      try {
        await factoryResetPlatform();
        setMessage("Platform has been completely factory reset!");
        await loadSettings();
        setConfirmModal({ isOpen: false, type: null });
      } catch (err: any) {
        setMessage(`Error: ${err.message}`);
      } finally {
        setIsFactoryResetting(false);
      }
    } else if (confirmModal.type === 'season') {
      if (confirmText !== "RESET SEASON") return alert("Type RESET SEASON exactly to confirm.");
      setIsResetting(true);
      try {
        await resetSeason();
        setMessage("Season has been successfully reset. A new competition begins today!");
        await loadSettings();
        setConfirmModal({ isOpen: false, type: null });
      } catch (err: any) {
        setMessage(`Error: ${err.message}`);
      } finally {
        setIsResetting(false);
      }
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

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center gap-3">
          <Clock className="text-primary" size={24} />
          <h2 className="text-lg font-bold">Player Time Limits (Bulk Update)</h2>
        </div>
        <form action={async (formData) => {
          const dlVal = parseInt(formData.get("dailyLimit") as string);
          const slVal = parseInt(formData.get("sessionLimit") as string);
          const dl = isNaN(dlVal) ? 0 : dlVal;
          const sl = isNaN(slVal) ? 0 : slVal;
          await bulkUpdateTimeLimits(dl, sl);
          setMessage("Time limits updated successfully across all employees!");
        }} className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Use these controls to bulk update the time limits for every employee currently registered on the platform. 
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Daily Time Limit (Minutes)</label>
              <input 
                type="number" 
                name="dailyLimit" 
                defaultValue={15}
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">Set to 0 to clear personal limits and use global defaults.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Session Time Limit (Minutes)</label>
              <input 
                type="number" 
                name="sessionLimit" 
                defaultValue={5}
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">
              Apply to All Employees
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
          
          <div className="border-b border-border pb-6 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Wipe Leaderboard & Start New Season</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4 max-w-xl">
                This action will reset every employee's Total XP, Level, and Current Streak back to zero. It will also archive the Top 3 players, permanently delete all historical daily sessions, and flush the daily question pool. Only do this at the beginning of a new competition month!
              </p>
            </div>
            <button 
              onClick={() => openConfirmModal('season')}
              disabled={isResetting || isFactoryResetting}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isResetting ? "Resetting..." : "End Current Season & Reset"}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-red-500 flex items-center gap-2"><Flame size={18}/> Factory Reset Platform</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xl">
                This action completely wipes the platform to a blank slate. ALL historical season winners will be deleted. The Season Counter will reset to 1. All users lose their progress. Use this if you want to completely start over from zero.
              </p>
            </div>
            <button 
              onClick={() => openConfirmModal('factory')}
              disabled={isResetting || isFactoryResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isFactoryResetting ? "Wiping Data..." : "FACTORY RESET"}
            </button>
          </div>

          {message && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border text-sm font-medium">
              {message}
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/30 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-destructive/10 px-6 py-4 flex items-center gap-3 border-b border-destructive/20">
              <AlertTriangle className="text-destructive" size={24} />
              <h2 className="text-lg font-bold text-destructive">CRITICAL ACTION</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">
                You are about to execute a highly destructive action. 
                {confirmModal.type === 'season' 
                  ? " This will archive all winners and reset all employee XP to zero." 
                  : " This will permanently wipe ALL data, users, sessions, and history. It CANNOT be undone."}
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Type "{confirmModal.type === 'season' ? 'RESET SEASON' : 'FACTORY WIPE'}" to confirm
                </label>
                <input 
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-destructive focus:ring-1 focus:ring-destructive"
                  placeholder={confirmModal.type === 'season' ? 'RESET SEASON' : 'FACTORY WIPE'}
                />
              </div>
            </div>
            
            <div className="bg-muted/30 px-6 py-4 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, type: null })}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeReset}
                disabled={(confirmModal.type === 'season' && confirmText !== "RESET SEASON") || (confirmModal.type === 'factory' && confirmText !== "FACTORY WIPE")}
                className="px-4 py-2 text-sm font-bold bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
