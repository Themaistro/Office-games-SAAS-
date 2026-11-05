import {
  apiChallengesRouteQueries,
  invitationQueries,
} from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { isUuid } from "@/features/lounge/domain/party-contract";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectChessGamesForGET,
  selectChallengeEventsForGET,
  selectChessGamesForGET2,
  selectTttGamesForGET,
  selectConnectFourGamesForGET,
  insertChallengeEventsForGET,
  insertChallengeEventsForGET2,
  insertChallengeEventsForGET3,
  deleteChessGamesForGET,
  deleteTttGamesForGET,
  deleteConnectFourGamesForGET,
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
    const { rows: expiredChess } = await selectChessGamesForGET2<{
      id: string;
      white_player_id: string;
      black_player_id: string;
    }>([]);
    const { rows: expiredTtt } = await selectTttGamesForGET<{
      id: string;
      x_player_id: string;
      o_player_id: string;
    }>([]);
    const { rows: expiredConnectFour } = await selectConnectFourGamesForGET<{
      id: string;
      red_player_id: string;
      yellow_player_id: string;
    }>([]);
    for (const game of expiredChess)
      await insertChallengeEventsForGET([
        game.id,
        game.white_player_id,
        game.black_player_id,
      ]);
    for (const game of expiredTtt)
      await insertChallengeEventsForGET2([
        game.id,
        game.x_player_id,
        game.o_player_id,
      ]);
    for (const game of expiredConnectFour)
      await insertChallengeEventsForGET3([
        game.id,
        game.red_player_id,
        game.yellow_player_id,
      ]);
    await deleteChessGamesForGET([]);
    await deleteTttGamesForGET([]);
    await deleteConnectFourGamesForGET([]);
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
  });
}
