"use client";

import Link from "next/link";
import { X, Trophy, Brain, Flame, Target, Percent, Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayerDetails, wipePlayerSession, grantExtraTime } from "./actions";

// Helper to format YYYY-MM-DD to a nice string
function formatSessionDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PlayerDrawer({ userId, onClose }: { userId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const { profile, sessions } = await getPlayerDetails(userId);
        setProfile(profile);
        setSessions(sessions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex justify-center items-center">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      </>
    );
  }

  if (!profile) return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex justify-center items-center">
          <div className="p-4 text-center text-muted-foreground">Player not found.</div>
        </div>
      </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-background z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-border flex flex-col pb-24">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground z-10 transition-colors">
          <X size={20} />
        </button>
        {/* Header Info */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full" />
            ) : (
              <span className="text-2xl font-bold text-secondary-foreground">{profile.full_name?.charAt(0)}</span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile.full_name || 'Anonymous Player'}</h2>
            <p className="text-muted-foreground">{profile.department || 'No Department'} • {profile.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-background p-3 rounded-xl border border-border flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Trophy size={14}/> Level</span>
            <span className="text-xl font-bold text-primary">{profile.current_level}</span>
          </div>
          <div className="bg-background p-3 rounded-xl border border-border flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Flame size={14} className="text-orange-500"/> Streak</span>
            <span className="text-xl font-bold text-orange-500">{profile.current_streak} days</span>
          </div>
          <div className="bg-background p-3 rounded-xl border border-border flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Brain size={14}/> Total XP</span>
            <span className="text-xl font-bold">{profile.total_xp?.toLocaleString()}</span>
          </div>
          <div className="bg-background p-3 rounded-xl border border-border flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Target size={14}/> Correct</span>
            <span className="text-xl font-bold text-green-500">{profile.total_correct_answers?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="p-6 border-b border-border bg-card">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-destructive"><Flame size={18}/> Admin Actions</h3>
        <div className="space-y-3">
          <button 
            onClick={async () => {
              if (confirm("Are you sure you want to wipe today's session? This will delete their score for today and let them play again.")) {
                try {
                  await wipePlayerSession(userId);
                  alert("Session wiped! They can now play again today.");
                  onClose();
                } catch (e: any) {
                  alert(e.message);
                }
              }
            }}
            className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 py-2.5 rounded-lg font-bold transition-colors border border-destructive/20 flex items-center justify-center gap-2"
          >
            <X size={16} />
            Reset Daily Lock (Wipe Today's Attempt)
          </button>
          
          <button 
            onClick={async () => {
              try {
                await grantExtraTime(userId, 300);
                alert("Granted 5 extra minutes to their current session!");
              } catch (e: any) {
                alert(e.message);
              }
            }}
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2.5 rounded-lg font-bold transition-colors border border-primary/20 flex items-center justify-center gap-2"
          >
            <Target size={16} />
            Grant +5 Minutes Extra Time
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar size={18}/> Recent Sessions</h3>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session: any) => (
              <div key={session.id} className="p-4 bg-card border border-border rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{formatSessionDate(session.session_date)}</span>
                  {session.is_completed ? (
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-medium">Completed</span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-medium">Forfeited</span>
                  )}
                </div>
                
                {session.is_completed && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <span className="block text-xs text-muted-foreground">Session Score</span>
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
          <div className="p-8 text-center bg-card rounded-xl border border-border border-dashed text-muted-foreground">
            No activity found for this player.
          </div>
        )}
      </div>
    </div>
    </>
  );
}
