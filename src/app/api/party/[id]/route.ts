import { getCurrentUser } from "@/features/identity/public-server";
import { partySnapshot } from "@/features/lounge/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";
import { PartyAccessError } from "@/features/lounge/domain/party-contract";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return NextResponse.json(
        await partySnapshot(user.id, (await params).id),
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (!(error instanceof PartyAccessError)) throw error;
      return NextResponse.json(
        { error: "Room unavailable or private" },
        { status: 404 },
      );
    }
  });
}
