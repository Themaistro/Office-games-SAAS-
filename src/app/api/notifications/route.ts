import { apiNotificationsRouteQueries } from "@/features/social/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectDirectMessagesForGET,
  selectChallengeEventsForGET,
  selectLoungeRoomInvitesForGET,
} = apiNotificationsRouteQueries;

export async function GET() {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { rows: messages } = await selectDirectMessagesForGET([user.id]);
    const { rows: challenges } = await selectChallengeEventsForGET([user.id]);
    const parties = await selectLoungeRoomInvitesForGET([user.id]);
    const history = [...messages, ...challenges, ...parties.rows]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 80);
    return NextResponse.json(
      { history },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
