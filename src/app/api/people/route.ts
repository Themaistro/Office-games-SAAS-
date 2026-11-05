import { apiPeopleRouteQueries } from "@/features/players/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { selectProfilesForGET } = apiPeopleRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { rows } = await selectProfilesForGET([user.id]);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
