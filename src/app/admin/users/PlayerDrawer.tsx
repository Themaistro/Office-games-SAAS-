"use client";

import Link from "next/link";
import { X, Trophy, Brain, Flame, Target, Calendar, Loader2, Clock, Check, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerDetails, wipePlayerSession, grantExtraTime, setPlayerTimeLimits } from "./actions";
import ConfirmModal from "@/components/ui/ConfirmModal";

function formatSessionDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PlayerDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [wipeModal, setWipeModal] = useState(false);

  // Time limit form state
  const [dailyLimit, setDailyLimit] = useState<string>("");
  const [sessionLimit, setSessionLimit] = useState<string>("");
  const [savingLimits, setSavingLimits] = useState(false);

  const showMsg = (text: string, ok = true) => {
    setActionMsg({ text, ok });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const loadData = async () => {
    try {
      const { profile, sessions } = await getPlayerDetails(userId);
      setProfile(profile);
      setSessions(sessions || []);
      // Seed form with existing values
      setDailyLimit(profile?.daily_time_limit_minutes != null ? String(profile.daily_time_limit_minutes) : "");
      setSessionLimit(profile?.session_time_limit_minutes != null ? String(profile.session_time_limit_minutes) : "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleWipe = async () => {
    try {
      await wipePlayerSession(userId);
      showMsg("Session wiped! They can play again today.");
      loadData();
    } catch (e: any) {
      showMsg(e.message, false);
    }
  };

  const handleGrantTime = async () => {
    try {
      await grantExtraTime(userId, 300);
      showMsg("Granted +5 minutes to their current session!");
    } catch (e: any) {
      showMsg(e.message, false);
    }
  };

  const handleSaveLimits = async () => {
    setSavingLimits(true);
    try {
      const dl = dailyLimit === "" ? null : parseInt(dailyLimit, 10);
      const sl = sessionLimit === "" ? null : parseInt(sessionLimit, 10);
      await setPlayerTimeLimits(userId, dl, sl);
      showMsg("Time limits updated for this player.");
      loadData();
    } catch (e: any) {
      showMsg(e.message, false);
    } finally {
      setSavingLimits(false);
    }
  };

  const handleClearLimits = async () => {
    setSavingLimits(true);
    try {
      await setPlayerTimeLimits(userId, null, null);
      setDailyLimit("");
      setSessionLimit("");
      showMsg("Personal limits cleared — player now uses global defaults.");
    } catch (e: any) {
      showMsg(e.message, false);
    } finally {
      setSavingLimits(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex justify-center items-center">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      </>
    );
  }

  if (!profile) return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex justify-center items-center">
        <div className="p-4 text-center text-muted-foreground">Player not found.</div>
      </div>
    </>
  );

  const hasPersonalLimits = profile?.daily_time_limit_minutes != null || profile?.session_time_limit_minutes != null;

  return (
    <>
      <ConfirmModal
        isOpen={wipeModal}
        onClose={() => setWipeModal(false)}
        onConfirm={handleWipe}
        title="Wipe Today's Session?"
        message="This will delete their score for today and let them play again immediately."
        confirmText="Yes, Wipe It"
        cancelText="Keep It"
        isDestructive
        offsetClassName="sm:pr-[28rem]"
      />

      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={() => { if (!wipeModal) onClose(); }} />
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex flex-col pb-24">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground z-10 transition-colors">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-bold text-secondary-foreground">{profile.full_name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.full_name || "Anonymous Player"}</h2>
              <p className="text-muted-foreground">{profile.department || "No Department"} · {profile.role}</p>
              <Link href={`/profile/${userId}`} className="text-xs text-primary underline mt-0.5 inline-block">View public profile →</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: "Level", value: profile.current_level, icon: <Trophy size={14} />, color: "text-primary" },
              { label: "Streak", value: `${profile.current_streak} days`, icon: <Flame size={14} className="text-orange-500" />, color: "text-orange-500" },
              { label: "Total XP", value: profile.total_xp?.toLocaleString(), icon: <Brain size={14} />, color: "" },
              { label: "Correct", value: profile.total_correct_answers?.toLocaleString(), icon: <Target size={14} />, color: "text-green-500" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-background p-3 rounded-xl border border-border flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">{icon} {label}</span>
                <span className={`text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback banner */}
        {actionMsg && (
          <div className={`mx-4 mt-4 p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${actionMsg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
            {actionMsg.ok ? <Check size={16} /> : <AlertCircle size={16} />}
            {actionMsg.text}
          </div>
        )}

        {/* ── Time Limits ── */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Personal Time Limits
            </h3>
            {hasPersonalLimits && (
              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Override Active</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Leave blank to use the global defaults from Settings. Setting a value here overrides only this player.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Limit (min)</label>
              <input
                type="number"
                min="1"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="Global default"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sprint Limit (min)</label>
              <input
                type="number"
                min="1"
                value={sessionLimit}
                onChange={(e) => setSessionLimit(e.target.value)}
                placeholder="Global default"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveLimits}
              disabled={savingLimits}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={14} /> Save Limits
            </button>
            {hasPersonalLimits && (
              <button
                onClick={handleClearLimits}
                disabled={savingLimits}
                className="px-4 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Admin Actions ── */}
        <div className="p-6 border-b border-border bg-card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-destructive">
            <Flame size={16} /> Admin Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setWipeModal(true)}
              className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 py-2.5 rounded-lg font-bold transition-colors border border-destructive/20 flex items-center justify-center gap-2"
            >
              <X size={16} /> Reset Daily Lock (Wipe Today's Attempt)
            </button>
            <button
              onClick={handleGrantTime}
              className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2.5 rounded-lg font-bold transition-colors border border-primary/20 flex items-center justify-center gap-2"
            >
              <Target size={16} /> Grant +5 Minutes Extra Time
            </button>
          </div>
        </div>

        {/* ── Recent Sessions ── */}
        <div className="p-6">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Calendar size={16} /> Recent Sessions
          </h3>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div key={session.id} className="p-4 bg-card border border-border rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{formatSessionDate(session.session_date || session.date)}</span>
                    {session.is_completed ? (
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-medium">Completed</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-medium">Forfeited</span>
                    )}
                  </div>
                  {session.is_completed && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <span className="block text-xs text-muted-foreground">Score</span>
                        <span className="font-bold text-primary">{session.total_score}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground">XP Earned</span>
                        <span className="font-bold text-green-500">+{session.total_xp_earned}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-card rounded-xl border border-border border-dashed text-muted-foreground text-sm">
              No activity found for this player.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
