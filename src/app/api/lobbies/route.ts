import { lobby } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { listBoardLobbies } = lobby;

export const dynamic = "force-dynamic";
export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await listBoardLobbies(user.id));
  });
}
