import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Clock3, Play, Shield, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import CooldownTimer from "@/components/dashboard/CooldownTimer";

export const dynamic = "force-dynamic";

export default async function DailyMissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows: profiles } = await query("SELECT role FROM profiles WHERE id = $1 LIMIT 1", [user.id]);
  if (profiles[0]?.role === "admin") redirect("/admin");
  const { rows } = await query("SELECT * FROM daily_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [user.id]);
  const { rows: settingsRows } = await query<{ cooldown_hours: number }>("SELECT cooldown_hours FROM system_settings WHERE id = 1");
  const session = rows[0] as Record<string, any> | undefined;
  const completed = Boolean(session?.is_completed && session.status === "completed");
  const expired = Boolean(session && session.status === "expired");
  const inProgress = Boolean(session && session.status === "in_progress");
  const cooldownHours = settingsRows[0]?.cooldown_hours ?? 24;
  return <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to your choices</Link>
    <section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className={`p-8 text-primary-foreground sm:p-12 ${completed ? "bg-gradient-to-br from-emerald-600 to-teal-500" : expired ? "bg-gradient-to-br from-amber-600 to-orange-500" : "bg-gradient-to-br from-primary to-primary/75"}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">{completed ? <CheckCircle2 size={29}/> : expired ? <Clock3 size={28}/> : <Shield size={28}/>}</div>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-white/70">{completed ? "Daily win recorded" : expired ? "Mission ended" : "Your daily path"}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{completed ? "You completed today’s mission" : expired ? "Time ran out today" : "Daily Mission"}</h1>
        <p className="mt-3 max-w-xl font-medium leading-7 text-white/80">{completed ? "Nice work. Your progress is saved—take the momentum into the Office Lounge or return tomorrow for a fresh route." : expired ? "This route was not completed before time expired, so no daily win or streak was recorded. The Office Lounge is open whenever you want to play." : "A focused 10–15 minute mix of challenges to build your streak and sharpen your thinking."}</p>
      </div>
      <div className="p-6 sm:p-8">
        {completed ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5"><div className="flex items-center gap-2 text-emerald-700"><Sparkles size={18}/><h2 className="font-black">Mission complete</h2></div><p className="mt-2 text-sm text-muted-foreground">Your next solo route is on its way. Until then, challenge a coworker or watch a live office match.</p><CooldownTimer createdAt={session!.created_at} cooldownHours={cooldownHours}/></div> : expired ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5"><div className="flex items-center gap-2 text-amber-700"><Clock3 size={18}/><h2 className="font-black">No daily win recorded</h2></div><p className="mt-2 text-sm text-muted-foreground">A Daily Mission only counts when every challenge is finished before the timer ends. Your next route will be ready tomorrow.</p></div> : <><h2 className="text-xl font-black">{inProgress ? "Your mission is waiting" : "Ready when you are"}</h2><p className="mt-2 text-muted-foreground">Work through each challenge at your own pace. Your progress is saved as you go.</p></>}
        <div className="mt-7 flex flex-wrap items-center gap-4">{!completed && !expired && <Link href={inProgress ? "/play" : "/play/start"} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-black text-primary-foreground shadow-lg hover:scale-[1.02]"><Play size={18} fill="currentColor"/>{inProgress ? "Resume mission" : "Start mission"}</Link>}<Link href="/office-lounge" className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-black transition-colors ${completed ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90" : "border border-border hover:bg-secondary"}`}><Building2 size={18}/> {completed ? "Explore the Office Lounge" : "Join the Office Lounge"}</Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary">Return to dashboard</Link></div>
      </div>
    </section>
  </div>;
}
