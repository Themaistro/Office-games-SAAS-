import { apiChessIdRouteQueries } from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { publishChessEvent } from "@/lib/chess-realtime";
import { getMatchResult } from "@/features/lounge/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectChessGamesForGET,
  insertGameSpectatorsForGET,
  selectGameSpectatorsForGET,
  selectChessEventsForGET,
  selectPresenceForGET,
  selectChessGamesForPOST,
  updateChessGamesForPOST,
  updateChessGamesForPOST2,
  insertChessEventsForPOST,
} = apiChessIdRouteQueries;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { rows } = await selectChessGamesForGET([id]);
    const game = rows[0];
    if (
      !game ||
      (game.status === "waiting" &&
        game.white_player_id !== user.id &&
        game.black_player_id !== user.id)
    )
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isPlayer =
      game.white_player_id === user.id || game.black_player_id === user.id;
    if (!isPlayer) await insertGameSpectatorsForGET([id, user.id]);
    const { rows: spectators } = await selectGameSpectatorsForGET([id]);
    const sinceParam = new URL(request.url).searchParams.get("eventsSince");
    const parsedSince = sinceParam ? new Date(sinceParam) : null;
    const since =
      parsedSince && !Number.isNaN(parsedSince.getTime())
        ? parsedSince.toISOString()
        : null;
    const { rows: events } = await selectChessEventsForGET([id, since || null]);
    const { rows: online } = await selectPresenceForGET([
      [game.white_player_id, game.black_player_id].filter(Boolean),
    ]);
    return NextResponse.json(
      {
        ...game,
        result: await getMatchResult("chess", id),
        online_player_ids: online.map((row) => row.user_id),
        spectators,
        events,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const payload = (await request.json().catch(() => null)) as {
      eventType?: string;
      payload?: Record<string, unknown>;
    } | null;
    if (
      !payload?.eventType ||
      !["chat", "offer_draw", "decline_draw"].includes(payload.eventType)
    )
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const { rows: games } = await selectChessGamesForPOST([id]);
    const game = games[0];
    if (
      !game ||
      (game.white_player_id !== user.id && game.black_player_id !== user.id)
    )
      return NextResponse.json({ error: "Not a player" }, { status: 403 });
    if (payload.eventType === "offer_draw")
      await updateChessGamesForPOST([user.id, id]);
    if (payload.eventType === "decline_draw")
      await updateChessGamesForPOST2([id]);
    const safeText = String(payload.payload?.text || "").slice(0, 500);
    const safePayload = payload.eventType === "chat" ? { text: safeText } : {};
    if (payload.eventType === "chat" && !safeText.trim())
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    const { rows } = await insertChessEventsForPOST([
      id,
      user.id,
      payload.eventType,
      JSON.stringify(safePayload),
    ]);
    await publishChessEvent(id, {
      type: payload.eventType as "chat" | "offer_draw" | "decline_draw",
      senderId: user.id,
      payload: safePayload,
    }).catch(() => undefined);
    return NextResponse.json(rows[0], { status: 201 });
  }, request);
}
