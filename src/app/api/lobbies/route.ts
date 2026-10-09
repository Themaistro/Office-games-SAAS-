import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [chess, ttt, connect] = await Promise.all([
    query(`SELECT g.id,g.white_player_id,g.black_player_id,g.status,g.created_at,jsonb_build_object('full_name',COALESCE(w.full_name,b.full_name),'avatar_url',COALESCE(w.avatar_url,b.avatar_url),'chess_elo',COALESCE(w.chess_elo,b.chess_elo)) AS profile,'chess' AS game_type FROM chess_games g LEFT JOIN profiles w ON w.id=g.white_player_id LEFT JOIN profiles b ON b.id=g.black_player_id WHERE g.status IN ('waiting','in_progress') ORDER BY g.created_at DESC LIMIT 30`),
    query(`SELECT g.id,g.x_player_id,g.o_player_id,g.status,g.created_at,jsonb_build_object('full_name',COALESCE(x.full_name,o.full_name),'avatar_url',COALESCE(x.avatar_url,o.avatar_url),'ttt_elo',COALESCE(x.ttt_elo,o.ttt_elo)) AS profile,'ttt' AS game_type FROM ttt_games g LEFT JOIN profiles x ON x.id=g.x_player_id LEFT JOIN profiles o ON o.id=g.o_player_id WHERE g.status IN ('waiting','in_progress') ORDER BY g.created_at DESC LIMIT 30`),
    query(`SELECT g.id,g.red_player_id,g.yellow_player_id,g.status,g.created_at,jsonb_build_object('full_name',COALESCE(r.full_name,y.full_name),'avatar_url',COALESCE(r.avatar_url,y.avatar_url)) AS profile,'connect-four' AS game_type FROM connect_four_games g LEFT JOIN profiles r ON r.id=g.red_player_id LEFT JOIN profiles y ON y.id=g.yellow_player_id WHERE g.status IN ('waiting','in_progress') ORDER BY g.created_at DESC LIMIT 30`),
  ]);
  return NextResponse.json([...chess.rows, ...ttt.rows, ...connect.rows].map((g: any) => ({ ...g, creator_id: g.white_player_id || g.black_player_id || g.x_player_id || g.o_player_id || g.red_player_id || g.yellow_player_id, player1_id: g.white_player_id || g.x_player_id || g.red_player_id, player2_id: g.black_player_id || g.o_player_id || g.yellow_player_id, profiles: g.profile })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), { headers: { "Cache-Control": "no-store" } });
}

