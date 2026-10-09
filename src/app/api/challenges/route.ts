import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query(`SELECT id, 'chess' AS type, created_at, (SELECT full_name FROM profiles WHERE id=white_player_id) AS challenger FROM chess_games WHERE black_player_id=$1 AND white_player_id IS NOT NULL AND status='waiting' UNION ALL SELECT id, 'ttt' AS type, created_at, (SELECT full_name FROM profiles WHERE id=x_player_id) AS challenger FROM ttt_games WHERE o_player_id=$1 AND x_player_id IS NOT NULL AND status='waiting' ORDER BY created_at DESC`, [user.id]);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
