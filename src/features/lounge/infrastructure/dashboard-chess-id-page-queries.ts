import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForChessGamePage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id, full_name, avatar_url, chess_elo, lounge_lp FROM profiles WHERE id = $1",
    values,
  );
}

export function selectChessGamesForChessGamePage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT g.*, jsonb_build_object('id', w.id, 'full_name', w.full_name, 'avatar_url', w.avatar_url, 'lounge_lp', w.lounge_lp, 'chess_elo', w.chess_elo) AS white,
      jsonb_build_object('id', b.id, 'full_name', b.full_name, 'avatar_url', b.avatar_url, 'lounge_lp', b.lounge_lp, 'chess_elo', b.chess_elo) AS black
      FROM chess_games g LEFT JOIN profiles w ON w.id = g.white_player_id LEFT JOIN profiles b ON b.id = g.black_player_id WHERE g.id = $1`,
    values,
  );
}

export function updateChessGamesForChessGamePage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE chess_games SET status = 'in_progress', white_player_id = COALESCE(white_player_id, $1), black_player_id = COALESCE(black_player_id, $2), updated_at = now(), last_move_timestamp = now() WHERE id = $3 AND status = 'waiting'",
    values,
  );
}
