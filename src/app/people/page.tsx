import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PeopleDirectory from "./PeopleDirectory";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  if (!(await getCurrentUser())) redirect("/login");
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  return <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to your choices</Link><div className="mb-8 mt-6 flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Users size={28}/></div><div><p className="text-xs font-black uppercase tracking-widest text-emerald-600">Your office community</p><h1 className="mt-1 text-4xl font-black tracking-tight">People</h1><p className="mt-2 text-muted-foreground">See who is around, find your coworkers, and start a conversation.</p></div></div><PeopleDirectory userId={currentUser.id} /></main>;
}
