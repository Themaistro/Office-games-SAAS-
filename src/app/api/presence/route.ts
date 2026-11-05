import { apiPresenceRouteQueries } from "@/features/social/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { selectPresenceForGET, insertPresenceForPOST } = apiPresenceRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { rows } = await selectPresenceForGET([user.id]);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
export async function POST() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await insertPresenceForPOST([user.id]);
    return NextResponse.json({ ok: true });
  });
}
