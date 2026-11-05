import { getCurrentUser } from "@/features/identity/public-server";
import { listParties } from "@/features/lounge/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await listParties(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
