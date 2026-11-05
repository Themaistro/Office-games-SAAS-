import { getCurrentUser } from "@/features/identity/public-server";
import { partySnapshot } from "@/features/lounge/public-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartyRoomClient from "./PartyRoomClient";

export const dynamic = "force-dynamic";
export default async function PartyRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let snapshot;
  try {
    snapshot = await partySnapshot(user.id, (await params).id);
  } catch {
    return (
      <section className="match-room">
        <h1 className="text-2xl font-bold">Room unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          The room may have closed, or you may need a private invitation.
        </p>
        <Link
          href="/office-lounge"
          className="match-button match-button-primary mt-5"
        >
          Back to Lounge
        </Link>
      </section>
    );
  }
  return (
    <PartyRoomClient
      key={snapshot.room.id}
      initial={snapshot}
      userId={user.id}
    />
  );
}
