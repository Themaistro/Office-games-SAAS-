import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { publishChessEvent } from "@/lib/chess-realtime";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query("SELECT * FROM chess_games WHERE id = $1", [id]);
  const game = rows[0];
  if (!game || (game.status === "waiting" && game.white_player_id !== user.id && game.black_player_id !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isPlayer = game.white_player_id === user.id || game.black_player_id === user.id;
  if (!isPlayer) await query("INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('chess', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now()", [id, user.id]);
  const { rows: spectators } = await query("SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='chess' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC", [id]);
  const sinceParam = new URL(request.url).searchParams.get("eventsSince");
  const parsedSince = sinceParam ? new Date(sinceParam) : null;
  const since = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince.toISOString() : null;
  const { rows: events } = await query("SELECT e.id, e.sender_id, e.event_type, e.payload, e.created_at, p.full_name FROM chess_events e JOIN profiles p ON p.id=e.sender_id WHERE e.game_id=$1 AND e.created_at > COALESCE($2::timestamptz, now() - interval '2 minutes') ORDER BY e.created_at ASC LIMIT 50", [id, since || null]);
  return NextResponse.json({ ...game, spectators, events }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = await request.json().catch(() => null) as { eventType?: string; payload?: Record<string, unknown> } | null;
  if (!payload?.eventType || !["chat", "offer_draw", "decline_draw"].includes(payload.eventType)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const { rows: games } = await query("SELECT white_player_id, black_player_id FROM chess_games WHERE id=$1 AND status='in_progress'", [id]);
  const game = games[0];
  if (!game || (game.white_player_id !== user.id && game.black_player_id !== user.id)) return NextResponse.json({ error: "Not a player" }, { status: 403 });
  const safeText = String(payload.payload?.text || "").slice(0, 500);
  const safePayload = payload.eventType === "chat" ? { text: safeText } : {};
  if (payload.eventType === "chat" && !safeText.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const { rows } = await query("INSERT INTO chess_events (game_id, sender_id, event_type, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, sender_id, event_type, payload, created_at", [id, user.id, payload.eventType, JSON.stringify(safePayload)]);
  await publishChessEvent(id, { type: payload.eventType as "chat" | "offer_draw" | "decline_draw", senderId: user.id, payload: safePayload }).catch(() => undefined);
  return NextResponse.json(rows[0], { status: 201 });
}

