import { apiUsersSearchRouteQueries } from "@/features/players/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { selectProfilesForGET } = apiUsersSearchRouteQueries;

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    if (!(await getCurrentUser()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (term.length < 2) return NextResponse.json([]);
    const { rows } = await selectProfilesForGET([`%${term}%`]);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
