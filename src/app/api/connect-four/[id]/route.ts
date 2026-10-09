import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query(`SELECT g.*, jsonb_build_object('id', r.id, 'full_name', r.full_name, 'avatar_url', r.avatar_url) AS red,
    jsonb_build_object('id', y.id, 'full_name', y.full_name, 'avatar_url', y.avatar_url) AS yellow
    FROM connect_four_games g LEFT JOIN profiles r ON r.id = g.red_player_id LEFT JOIN profiles y ON y.id = g.yellow_player_id WHERE g.id = $1`, [id]);
  const game = rows[0];
  if (!game || (game.status === "waiting" && game.red_player_id !== user.id && game.yellow_player_id !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isPlayer = game.red_player_id === user.id || game.yellow_player_id === user.id;
  if (!isPlayer) await query("INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('connect-four', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now()", [id, user.id]);
  const { rows: spectators } = await query("SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='connect-four' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC", [id]);
  return NextResponse.json({ ...game, spectators }, { headers: { "Cache-Control": "no-store" } });
}

