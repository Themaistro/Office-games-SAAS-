import {
  apiChallengesRouteQueries,
  invitationQueries,
  expireBoardInvitations,
} from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { isUuid } from "@/features/lounge/domain/party-contract";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectChessGamesForGET,
  selectChallengeEventsForGET,
  selectProfilesForGET,
  selectLoungeRoomInvitesForGET,
  updateLoungeRoomInvitesForDELETE,
} = apiChallengesRouteQueries;
const { sentInvitations, declineBoardInvitation } = invitationQueries;
export async function GET(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (new URL(request.url).searchParams.get("history") === "1") {
      const { rows } = await selectChessGamesForGET([user.id]);
      const { rows: events } = await selectChallengeEventsForGET([user.id]);
      return NextResponse.json(
        [...rows, ...events]
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.created_at).getTime() -
              new Date(a.updated_at || a.created_at).getTime(),
          )
          .slice(0, 100),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const params = new URL(request.url).searchParams;
    if (params.get("sent") === "1") {
      const target = params.get("to");
      if (target && !isUuid(target))
        return NextResponse.json({ error: "Invalid player" }, { status: 400 });
      const { rows } = await sentInvitations(user.id, target);
      return NextResponse.json(rows, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    await expireBoardInvitations();
    const { rows } = await selectProfilesForGET([user.id]);
    const parties = await selectLoungeRoomInvitesForGET([user.id]);
    return NextResponse.json([...rows, ...parties.rows], {
      headers: { "Cache-Control": "no-store" },
    });
  });
}

export async function DELETE(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, type } = await request.json().catch(() => ({}));
    if (type === "party") {
      if (!isUuid(id))
        return NextResponse.json({ error: "Invalid room" }, { status: 400 });
      await updateLoungeRoomInvitesForDELETE([id, user.id]);
      return NextResponse.json({ ok: true });
    }
    if (!isUuid(id) || !["chess", "ttt", "connect-four"].includes(type))
      return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
    await declineBoardInvitation(type, id, user.id);
    return NextResponse.json({ ok: true });
  }, request);
}
