import Link from "next/link";
import { ArrowLeft, Building2, Play, Shield } from "lucide-react";
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
  const session = rows[0] as Record<string, any> | undefined;
  const completed = Boolean(session && (session.is_completed || session.status === "completed" || session.status === "expired"));
  const inProgress = Boolean(session && !completed);
  return <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to your choices</Link><section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"><div className="bg-gradient-to-br from-primary to-primary/75 p-8 text-primary-foreground sm:p-12"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Shield size={28}/></div><p className="mt-8 text-xs font-black uppercase tracking-widest text-white/70">Your daily path</p><h1 className="mt-2 text-4xl font-black tracking-tight">Daily Mission</h1><p className="mt-3 max-w-xl font-medium leading-7 text-white/80">A focused 10–15 minute mix of challenges to build your streak and sharpen your thinking.</p></div><div className="p-6 sm:p-8"><h2 className="text-xl font-black">{completed ? "Mission complete" : inProgress ? "Your mission is waiting" : "Ready when you are"}</h2><p className="mt-2 text-muted-foreground">{completed ? "You completed today’s mission. Come back after the cooldown for your next one." : "Work through each challenge at your own pace. Your progress is saved as you go."}</p><div className="mt-7 flex flex-wrap items-center gap-4">{completed ? <CooldownTimer createdAt={session!.created_at}/> : <Link href={inProgress ? "/play" : "/play/start"} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-black text-primary-foreground shadow-lg hover:scale-[1.02]"><Play size={18} fill="currentColor"/>{inProgress ? "Resume mission" : "Start mission"}</Link>}<Link href="/office-lounge" className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 font-bold hover:bg-secondary"><Building2 size={18}/> Join the Office Lounge</Link></div></div></section></div>;
}
