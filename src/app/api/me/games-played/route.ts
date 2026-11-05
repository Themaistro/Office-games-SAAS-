import { apiMeGamesPlayedRouteQueries } from "@/features/missions/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { selectProfilesForGET } = apiMeGamesPlayedRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { rows } = await selectProfilesForGET([user.id]);
    return NextResponse.json(rows[0] ?? null);
  });
}
