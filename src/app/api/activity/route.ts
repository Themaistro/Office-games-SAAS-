import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query(`
    SELECT a.id::text, a.user_id, a.activity_type AS type, COALESCE(a.metadata->>'description', '') AS description, a.created_at, a.metadata,
      jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url) AS profiles
    FROM activity_feed a LEFT JOIN profiles p ON p.id = a.user_id
    UNION ALL
    SELECT 'daily-' || ds.id, ds.user_id, 'mission',
      COALESCE(p.full_name, 'Someone') || ' completed a Daily Mission with a score of ' || COALESCE(ds.total_score, 0) || ' and earned ' || COALESCE(ds.total_xp_earned, 0) || ' XP',
      ds.ended_at, jsonb_build_object('score', ds.total_score, 'xp', ds.total_xp_earned, 'session_id', ds.id),
      jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url)
    FROM daily_sessions ds LEFT JOIN profiles p ON p.id = ds.user_id
    WHERE ds.is_completed = true
      AND NOT EXISTS (SELECT 1 FROM activity_feed af WHERE af.user_id = ds.user_id AND af.metadata->>'session_id' = ds.id::text)
    UNION ALL
    SELECT 'chess-' || g.id, g.white_player_id, 'chess',
      CASE WHEN g.status = 'in_progress' THEN COALESCE(w.full_name, 'Someone') || ' is playing ' || COALESCE(b.full_name, 'an opponent') || ' in Chess'
           WHEN g.status = 'draw' THEN COALESCE(w.full_name, 'Someone') || ' drew with ' || COALESCE(b.full_name, 'an opponent') || ' in Chess'
           WHEN g.status = 'white_won' THEN COALESCE(w.full_name, 'Someone') || ' defeated ' || COALESCE(b.full_name, 'an opponent') || ' in Chess'
           ELSE COALESCE(b.full_name, 'Someone') || ' defeated ' || COALESCE(w.full_name, 'an opponent') || ' in Chess' END,
      g.updated_at, jsonb_build_object('game_id', g.id, 'game_type', 'chess'),
      jsonb_build_object('full_name', w.full_name, 'avatar_url', w.avatar_url)
    FROM chess_games g LEFT JOIN profiles w ON w.id = g.white_player_id LEFT JOIN profiles b ON b.id = g.black_player_id
    WHERE g.status IN ('in_progress', 'white_won', 'black_won', 'draw')
    UNION ALL
    SELECT 'ttt-' || g.id, g.x_player_id, 'ttt',
      CASE WHEN g.status = 'in_progress' THEN COALESCE(x.full_name, 'Someone') || ' is playing ' || COALESCE(o.full_name, 'an opponent') || ' in Tic-Tac-Toe'
           WHEN g.status = 'draw' THEN COALESCE(x.full_name, 'Someone') || ' drew with ' || COALESCE(o.full_name, 'an opponent') || ' in Tic-Tac-Toe'
           WHEN g.status = 'x_won' THEN COALESCE(x.full_name, 'Someone') || ' defeated ' || COALESCE(o.full_name, 'an opponent') || ' in Tic-Tac-Toe'
           ELSE COALESCE(o.full_name, 'Someone') || ' defeated ' || COALESCE(x.full_name, 'an opponent') || ' in Tic-Tac-Toe' END,
      g.updated_at, jsonb_build_object('game_id', g.id, 'game_type', 'ttt'),
      jsonb_build_object('full_name', x.full_name, 'avatar_url', x.avatar_url)
    FROM ttt_games g LEFT JOIN profiles x ON x.id = g.x_player_id LEFT JOIN profiles o ON o.id = g.o_player_id
    WHERE g.status IN ('in_progress', 'x_won', 'o_won', 'draw')
    UNION ALL
    SELECT 'connect-four-' || g.id, g.red_player_id, 'connect-four',
      CASE WHEN g.status = 'in_progress' THEN COALESCE(r.full_name, 'Someone') || ' is playing ' || COALESCE(y.full_name, 'an opponent') || ' in Connect Four'
           WHEN g.status = 'draw' THEN COALESCE(r.full_name, 'Someone') || ' drew with ' || COALESCE(y.full_name, 'an opponent') || ' in Connect Four'
           WHEN g.status = 'red_won' THEN COALESCE(r.full_name, 'Someone') || ' defeated ' || COALESCE(y.full_name, 'an opponent') || ' in Connect Four'
           ELSE COALESCE(y.full_name, 'Someone') || ' defeated ' || COALESCE(r.full_name, 'an opponent') || ' in Connect Four' END,
      g.updated_at, jsonb_build_object('game_id', g.id, 'game_type', 'connect-four'),
      jsonb_build_object('full_name', r.full_name, 'avatar_url', r.avatar_url)
    FROM connect_four_games g LEFT JOIN profiles r ON r.id = g.red_player_id LEFT JOIN profiles y ON y.id = g.yellow_player_id
    WHERE g.status IN ('in_progress', 'red_won', 'yellow_won', 'draw')
    ORDER BY created_at DESC LIMIT 30`);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

