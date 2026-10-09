import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [chess, ttt, connect] = await Promise.all([
    query(`SELECT g.id,g.white_player_id,g.black_player_id,g.status,g.created_at,(SELECT count(*)::int FROM game_spectators s WHERE s.game_type='chess' AND s.game_id=g.id AND s.last_seen > now() - interval '10 seconds') AS spectator_count,jsonb_build_object('full_name',w.full_name,'avatar_url',w.avatar_url,'lounge_lp',w.lounge_lp) AS player1_profile,jsonb_build_object('full_name',b.full_name,'avatar_url',b.avatar_url,'lounge_lp',b.lounge_lp) AS player2_profile,'chess' AS game_type FROM chess_games g LEFT JOIN profiles w ON w.id=g.white_player_id LEFT JOIN profiles b ON b.id=g.black_player_id WHERE g.status='in_progress' OR (g.created_at > now() - interval '30 minutes' AND (g.black_player_id IS NULL OR g.white_player_id=$1 OR g.black_player_id=$1)) ORDER BY g.created_at DESC LIMIT 30`, [user.id]),
    query(`SELECT g.id,g.x_player_id,g.o_player_id,g.status,g.created_at,(SELECT count(*)::int FROM game_spectators s WHERE s.game_type='ttt' AND s.game_id=g.id AND s.last_seen > now() - interval '10 seconds') AS spectator_count,jsonb_build_object('full_name',x.full_name,'avatar_url',x.avatar_url,'lounge_lp',x.lounge_lp) AS player1_profile,jsonb_build_object('full_name',o.full_name,'avatar_url',o.avatar_url,'lounge_lp',o.lounge_lp) AS player2_profile,'ttt' AS game_type FROM ttt_games g LEFT JOIN profiles x ON x.id=g.x_player_id LEFT JOIN profiles o ON o.id=g.o_player_id WHERE g.status='in_progress' OR (g.created_at > now() - interval '30 minutes' AND (g.o_player_id IS NULL OR g.x_player_id=$1 OR g.o_player_id=$1)) ORDER BY g.created_at DESC LIMIT 30`, [user.id]),
    query(`SELECT g.id,g.red_player_id,g.yellow_player_id,g.status,g.created_at,(SELECT count(*)::int FROM game_spectators s WHERE s.game_type='connect-four' AND s.game_id=g.id AND s.last_seen > now() - interval '10 seconds') AS spectator_count,jsonb_build_object('full_name',r.full_name,'avatar_url',r.avatar_url,'lounge_lp',r.lounge_lp) AS player1_profile,jsonb_build_object('full_name',y.full_name,'avatar_url',y.avatar_url,'lounge_lp',y.lounge_lp) AS player2_profile,'connect-four' AS game_type FROM connect_four_games g LEFT JOIN profiles r ON r.id=g.red_player_id LEFT JOIN profiles y ON y.id=g.yellow_player_id WHERE g.status='in_progress' OR (g.created_at > now() - interval '30 minutes' AND (g.yellow_player_id IS NULL OR g.red_player_id=$1 OR g.yellow_player_id=$1)) ORDER BY g.created_at DESC LIMIT 30`, [user.id]),
  ]);
  return NextResponse.json([...chess.rows, ...ttt.rows, ...connect.rows].map((g: any) => ({ ...g, creator_id: g.white_player_id || g.black_player_id || g.x_player_id || g.o_player_id || g.red_player_id || g.yellow_player_id, player1_id: g.white_player_id || g.x_player_id || g.red_player_id, player2_id: g.black_player_id || g.o_player_id || g.yellow_player_id, profiles: g.profile })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), { headers: { "Cache-Control": "no-store" } });
}

