import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query<any>(`SELECT g.*,
    jsonb_build_object('id', x.id, 'full_name', x.full_name, 'avatar_url', x.avatar_url, 'ttt_elo', x.ttt_elo) AS x_player,
    jsonb_build_object('id', o.id, 'full_name', o.full_name, 'avatar_url', o.avatar_url, 'ttt_elo', o.ttt_elo) AS o_player
    FROM ttt_games g LEFT JOIN profiles x ON x.id = g.x_player_id LEFT JOIN profiles o ON o.id = g.o_player_id WHERE g.id = $1`, [id]);
  const game = rows[0];
  if (!game || (game.status === "waiting" && game.x_player_id !== user.id && game.o_player_id !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isPlayer = game.x_player_id === user.id || game.o_player_id === user.id;
  if (!isPlayer) await query("INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('ttt', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now()", [id, user.id]);
  const { rows: spectators } = await query("SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='ttt' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC", [id]);
  return NextResponse.json({ ...game, spectators }, { headers: { "Cache-Control": "no-store" } });
}

