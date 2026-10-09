import { Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import AnnouncementBanner from "@/components/dashboard/AnnouncementBanner";
import DashboardTutorialTrigger from "@/components/tutorial/DashboardTutorialTrigger";
import OfficeWorldJourney from "@/components/dashboard/OfficeWorldJourney";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import UnifiedLobbiesWidget from "@/components/dashboard/UnifiedLobbiesWidget";
import ChallengeHistoryWidget from "@/components/dashboard/ChallengeHistoryWidget";
import OnlineUsersWidget from "@/components/dashboard/OnlineUsersWidget";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows: profiles } = await query("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [user.id]);
  const profile = profiles[0] as Record<string, any> | undefined;
  if (profile?.role === "admin") redirect("/admin");
  const { rows: announcements } = await query("SELECT * FROM announcements WHERE is_active = true ORDER BY created_at DESC");
  const firstName = String(profile?.full_name || profile?.email || "there").split(" ")[0].split("@")[0];
  const level = profile?.current_level || 1;
  const xp = profile?.total_xp || 0;
  const xpProgress = Math.min(100, Math.round(((xp - (level - 1) * 1200) / 1200) * 100));

  return <main className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <DashboardTutorialTrigger />
    <AnnouncementBanner announcements={announcements || []} />
    <div id="tour-dashboard" className="mt-6 space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card px-6 py-7 shadow-sm sm:px-9 sm:py-8"><div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary"><Sparkles size={14}/> Your office playground</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Good to see you, {firstName}.</h1><p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">Take a healthy break, sharpen your mind, and see what your team is up to.</p></div><div className="grid grid-cols-3 gap-2 sm:gap-3"><div className="min-w-[88px] rounded-2xl border border-border/60 bg-background/70 p-3 text-center"><Flame className="mx-auto mb-1 text-orange-500" size={18}/><p className="text-xl font-black">{profile?.current_streak || 0}</p><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Streak</p></div><div className="min-w-[88px] rounded-2xl border border-border/60 bg-background/70 p-3 text-center"><Trophy className="mx-auto mb-1 text-amber-500" size={18}/><p className="text-xl font-black">Lv.{level}</p><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Level</p></div><div className="min-w-[88px] rounded-2xl border border-border/60 bg-background/70 p-3 text-center"><Medal className="mx-auto mb-1 text-primary" size={18}/><p className="text-xl font-black">{xp.toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">XP</p></div></div></div><div className="relative mt-6"><div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>Progress to level {level + 1}</span><span>{xpProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400" style={{ width: `${xpProgress}%` }}/></div></div></section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]"><div className="space-y-6"><OfficeWorldJourney /><UnifiedLobbiesWidget currentUserId={user.id} /></div><aside className="space-y-6 lg:sticky lg:top-24"><div><p className="text-xs font-black uppercase tracking-widest text-primary">The office is moving</p><h2 className="mt-1 text-2xl font-black tracking-tight">Live right now</h2><p className="mt-1 text-sm text-muted-foreground">See who is online, what they are doing, and jump in.</p></div><OnlineUsersWidget currentUserId={user.id} profile={profile} /><LiveActivityFeed /><ChallengeHistoryWidget /></aside></div>
    </div>
  </main>;
}
