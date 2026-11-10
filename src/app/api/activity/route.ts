import { apiActivityRouteQueries } from "@/features/reporting/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const { readCachedActivityFeed } = apiActivityRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    if (!(await getCurrentUser()))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await readCachedActivityFeed();
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
