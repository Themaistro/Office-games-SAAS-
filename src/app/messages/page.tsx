import { messagesPageQueries } from "@/features/social/composition";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/features/identity/public-server";
import MessagesClient from "./MessagesClient";

const { selectProfilesForMessagesPage } = messagesPageQueries;

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const otherId = (await searchParams).with;
  if (!otherId) redirect("/people");
  const { rows } = await selectProfilesForMessagesPage<{
    id: string;
    full_name: string;
    avatar_url: string | null;
  }>([otherId]);
  if (!rows[0]) notFound();
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/people"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to people
      </Link>
      <div className="mb-6 mt-6 flex items-center gap-3">
        <MessageCircle className="text-primary" />
        <h1 className="text-3xl font-black">Messages</h1>
      </div>
      <MessagesClient userId={user.id} person={rows[0]} />
    </main>
  );
}
