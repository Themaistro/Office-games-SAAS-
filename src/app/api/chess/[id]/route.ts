import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await query("SELECT * FROM chess_games WHERE id = $1", [id]);
  const game = rows[0];
  if (!game || (game.white_player_id !== user.id && game.black_player_id !== user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game, { headers: { "Cache-Control": "no-store" } });
}

