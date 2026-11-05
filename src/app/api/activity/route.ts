import { apiActivityRouteQueries } from "@/features/reporting/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { selectActivityFeedForGET } = apiActivityRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    if (!(await getCurrentUser()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { rows } = await selectActivityFeedForGET([]);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
