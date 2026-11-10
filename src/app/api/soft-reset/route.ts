import { apiSoftResetRouteQueries } from "@/features/missions/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { withTransaction } from "@/server/database/connection";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectProfilesForPOST,
  updateProfilesForPOST,
  deleteDailySessionsForPOST,
} = apiSoftResetRouteQueries;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { rows: profiles } = await selectProfilesForPOST<{ role: string }>([
      user.id,
    ]);
    const profile = profiles[0];

    if (profile?.role === "admin") {
      // 1. Reset Profile Stats
      await withTransaction(async (client) => {
        await updateProfilesForPOST([user.id], client);
        await deleteDailySessionsForPOST([user.id], client);
      });
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Redirect back to dashboard
    const url = new URL(request.url);
    return NextResponse.redirect(`${url.origin}/dashboard`, 303);
  }, request);
}

export async function GET() {
  return handleApiRequest(async () => {
    return NextResponse.json(
      { error: "Use POST for soft reset" },
      { status: 405 },
    );
  });
}
