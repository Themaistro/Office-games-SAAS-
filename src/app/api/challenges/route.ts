import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (new URL(request.url).searchParams.get("history") === "1") {
    const { rows } = await query(`SELECT id, 'chess' AS type, status, created_at, updated_at, CASE WHEN white_player_id=$1 THEN black_player_id ELSE white_player_id END AS other_player_id FROM chess_games WHERE white_player_id=$1 OR black_player_id=$1 UNION ALL SELECT id, 'ttt' AS type, status, created_at, updated_at, CASE WHEN x_player_id=$1 THEN o_player_id ELSE x_player_id END AS other_player_id FROM ttt_games WHERE x_player_id=$1 OR o_player_id=$1 UNION ALL SELECT id, 'connect-four' AS type, status, created_at, updated_at, CASE WHEN red_player_id=$1 THEN yellow_player_id ELSE red_player_id END AS other_player_id FROM connect_four_games WHERE red_player_id=$1 OR yellow_player_id=$1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 100`, [user.id]);
    const { rows: events } = await query(`SELECT game_id AS id, game_type AS type, event_type AS status, created_at, created_at AS updated_at, CASE WHEN challenger_id=$1 THEN challenged_id ELSE challenger_id END AS other_player_id FROM challenge_events WHERE challenger_id=$1 OR challenged_id=$1 ORDER BY created_at DESC LIMIT 100`, [user.id]);
    return NextResponse.json([...rows, ...events].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).slice(0, 100), { headers: { "Cache-Control": "no-store" } });
  }
  const params = new URL(request.url).searchParams;
  if (params.get("sent") === "1") {
    const target = params.get("to");
    const targetFilter = target ? " AND black_player_id=$2" : "";
    const targetFilterTtt = target ? " AND o_player_id=$2" : "";
    const targetFilterConnect = target ? " AND yellow_player_id=$2" : "";
    const values = target ? [user.id, target] : [user.id];
    const { rows } = await query(`SELECT id, 'chess' AS type, status, created_at, black_player_id AS challenged_id FROM chess_games WHERE white_player_id=$1 AND status IN ('waiting','in_progress')${targetFilter} UNION ALL SELECT id, 'ttt' AS type, status, created_at, o_player_id AS challenged_id FROM ttt_games WHERE x_player_id=$1 AND status IN ('waiting','in_progress')${targetFilterTtt} UNION ALL SELECT id, 'connect-four' AS type, status, created_at, yellow_player_id AS challenged_id FROM connect_four_games WHERE red_player_id=$1 AND status IN ('waiting','in_progress')${targetFilterConnect} ORDER BY created_at DESC`, values);
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  }
  const { rows: expiredChess } = await query<{ id: string; white_player_id: string; black_player_id: string }>("SELECT id, white_player_id, black_player_id FROM chess_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  const { rows: expiredTtt } = await query<{ id: string; x_player_id: string; o_player_id: string }>("SELECT id, x_player_id, o_player_id FROM ttt_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  const { rows: expiredConnectFour } = await query<{ id: string; red_player_id: string; yellow_player_id: string }>("SELECT id, red_player_id, yellow_player_id FROM connect_four_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  for (const game of expiredChess) await query("INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'chess',$2,$3,'expired')", [game.id, game.white_player_id, game.black_player_id]);
  for (const game of expiredTtt) await query("INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'ttt',$2,$3,'expired')", [game.id, game.x_player_id, game.o_player_id]);
  for (const game of expiredConnectFour) await query("INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'connect-four',$2,$3,'expired')", [game.id, game.red_player_id, game.yellow_player_id]);
  await query("DELETE FROM chess_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  await query("DELETE FROM ttt_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  await query("DELETE FROM connect_four_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'");
  const { rows } = await query(`SELECT id, 'chess' AS type, created_at, (SELECT full_name FROM profiles WHERE id=white_player_id) AS challenger FROM chess_games WHERE black_player_id=$1 AND white_player_id IS NOT NULL AND status='waiting' UNION ALL SELECT id, 'ttt' AS type, created_at, (SELECT full_name FROM profiles WHERE id=x_player_id) AS challenger FROM ttt_games WHERE o_player_id=$1 AND x_player_id IS NOT NULL AND status='waiting' UNION ALL SELECT id, 'connect-four' AS type, created_at, (SELECT full_name FROM profiles WHERE id=red_player_id) AS challenger FROM connect_four_games WHERE yellow_player_id=$1 AND red_player_id IS NOT NULL AND status='waiting' ORDER BY created_at DESC`, [user.id]);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, type } = await request.json().catch(() => ({}));
  const tables: Record<string, string> = { chess: "chess_games", ttt: "ttt_games", "connect-four": "connect_four_games" };
  const recipientColumns: Record<string, string> = { chess: "black_player_id", ttt: "o_player_id", "connect-four": "yellow_player_id" };
  if (!id || !tables[type] || !recipientColumns[type]) return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
  const playerColumns: Record<string, [string, string]> = { chess: ["white_player_id", "black_player_id"], ttt: ["x_player_id", "o_player_id"], "connect-four": ["red_player_id", "yellow_player_id"] };
  const [challengerColumn, challengedColumn] = playerColumns[type];
  const existing = await query<{ challenger_id: string; challenged_id: string }>(`SELECT ${challengerColumn} AS challenger_id, ${challengedColumn} AS challenged_id FROM ${tables[type]} WHERE id=$1 AND ${recipientColumns[type]}=$2 AND status='waiting'`, [id, user.id]);
  const { rowCount } = await query(`DELETE FROM ${tables[type]} WHERE id=$1 AND ${recipientColumns[type]}=$2 AND status='waiting'`, [id, user.id]);
  if (rowCount && existing.rows[0]) await query("INSERT INTO challenge_events (game_id,game_type,actor_id,challenger_id,challenged_id,event_type) VALUES ($1,$2,$3,$4,$5,'declined')", [id, type, user.id, existing.rows[0].challenger_id, existing.rows[0].challenged_id]);
  return NextResponse.json({ ok: true });
}

