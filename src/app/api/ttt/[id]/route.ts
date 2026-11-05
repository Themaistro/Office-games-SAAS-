import { apiTttIdRouteQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { getMatchResult } from "@/features/lounge/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectTttGamesForGET,
  insertGameSpectatorsForGET,
  selectGameSpectatorsForGET,
} = apiTttIdRouteQueries;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { rows } = await selectTttGamesForGET<any>([id]);
    const game = rows[0];
    if (
      !game ||
      (game.status === "waiting" &&
        game.x_player_id !== user.id &&
        game.o_player_id !== user.id)
    )
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isPlayer =
      game.x_player_id === user.id || game.o_player_id === user.id;
    if (!isPlayer) await insertGameSpectatorsForGET([id, user.id]);
    const { rows: spectators } = await selectGameSpectatorsForGET([id]);
    return NextResponse.json(
      { ...game, result: await getMatchResult("ttt", id), spectators },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
