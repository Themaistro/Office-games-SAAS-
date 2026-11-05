import { apiResetSessionRouteQueries } from "@/features/missions/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectProfilesForPOST,
  deleteDailySessionsForPOST,
  updateProfilesForPOST,
} = apiResetSessionRouteQueries;

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

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete only this administrator's incomplete session and break their streak.
    try {
      await deleteDailySessionsForPOST([user.id]);
      await updateProfilesForPOST([user.id]);
    } catch {
      return NextResponse.json(
        { error: "Unable to reset session" },
        { status: 500 },
      );
    }

    // Also redirect them back to the dashboard so they can start a fresh session
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  });
}

export async function GET() {
  return handleApiRequest(async () => {
    return NextResponse.json(
      { error: "Use POST for session reset" },
      { status: 405 },
    );
  });
}
