import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import MessagesClient from "./MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const otherId = (await searchParams).with;
  if (!otherId) redirect("/people");
  const { rows } = await query<{ id: string; full_name: string; avatar_url: string | null }>("SELECT id, full_name, avatar_url FROM profiles WHERE id = $1 AND role = 'employee' AND is_active = true", [otherId]);
  if (!rows[0]) notFound();
  return <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/people" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to people</Link><div className="mb-6 mt-6 flex items-center gap-3"><MessageCircle className="text-primary"/><h1 className="text-3xl font-black">Messages</h1></div><MessagesClient userId={user.id} person={rows[0]} /></main>;
}
