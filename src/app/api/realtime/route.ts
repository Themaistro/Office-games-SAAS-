import { invitationQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { getGameDefinition } from "@/features/lounge/domain/game-registry";
import { partySnapshot } from "@/features/lounge/public-server";
import { getGameChannelName } from "@/lib/realtime";
import { handleApiRequest } from "@/server/http/api";
import { getRealtimePublisher } from "@/server/realtime/publisher";
import { NextResponse } from "next/server";
import { PartyAccessError } from "@/features/lounge/domain/party-contract";

const { readMatchSnapshot } = invitationQueries;

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = new URL(request.url).searchParams,
      type = params.get("type") || "",
      id = params.get("id") || "";
    const def = getGameDefinition(type);
    if (
      (!def && type !== "party") ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return NextResponse.json({ error: "Invalid match" }, { status: 400 });
    if (type === "party") {
      try {
        await partySnapshot(user.id, id);
      } catch (error) {
        if (!(error instanceof PartyAccessError)) throw error;
        return NextResponse.json(
          { error: "Private or unavailable room" },
          { status: 403 },
        );
      }
    } else if (def) {
      const { rows } = await readMatchSnapshot(type, id);
      const game = rows[0];
      if (!game)
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      if (
        game.status === "waiting" &&
        game[def.playerColumns[0]] &&
        game[def.playerColumns[1]] &&
        !def.playerColumns.some((column) => game[column] === user.id)
      )
        return NextResponse.json(
          { error: "Private invitation" },
          { status: 403 },
        );
    }
    const client = getRealtimePublisher();
    if (!client)
      return NextResponse.json(
        { error: "Push unavailable; polling remains active" },
        { status: 503 },
      );
    const token = await client.auth.createTokenRequest({
      clientId: user.id,
      ttl: 15 * 60_000,
      capability: JSON.stringify({
        [getGameChannelName(type, id)]: ["subscribe"],
      }),
    });
    return NextResponse.json(token, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
