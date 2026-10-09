import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import UnifiedOfficeLounge from "@/components/dashboard/UnifiedOfficeLounge";
import LoungeRankCard from "@/components/dashboard/LoungeRankCard";

export const dynamic = "force-dynamic";

export default async function OfficeLoungePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { rows } = await query("SELECT role, lounge_lp FROM profiles WHERE id = $1 LIMIT 1", [user.id]);
  if (rows[0]?.role === "admin") redirect("/admin");
  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to your choices</Link><div className="mt-6 mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Swords size={28}/></div><div><p className="text-xs font-black uppercase tracking-widest text-violet-500">Social play</p><h1 className="mt-1 text-4xl font-black tracking-tight">Office Lounge</h1><p className="mt-2 text-muted-foreground">Create a match, join a coworker, or watch a live game.</p></div></div><div className="w-full md:max-w-xs"><LoungeRankCard loungeLp={rows[0]?.lounge_lp ?? 0}/></div></div><UnifiedOfficeLounge currentUserId={user.id} loungeLp={rows[0]?.lounge_lp ?? 0}/></div>;
}
