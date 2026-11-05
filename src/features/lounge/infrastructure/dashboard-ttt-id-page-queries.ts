import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectTttGamesForTttGamePage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT g.*,
    jsonb_build_object('id', x.id, 'full_name', x.full_name, 'avatar_url', x.avatar_url, 'lounge_lp', x.lounge_lp, 'ttt_elo', x.ttt_elo) AS x_player,
    jsonb_build_object('id', o.id, 'full_name', o.full_name, 'avatar_url', o.avatar_url, 'lounge_lp', o.lounge_lp, 'ttt_elo', o.ttt_elo) AS o_player
    FROM ttt_games g LEFT JOIN profiles x ON x.id = g.x_player_id LEFT JOIN profiles o ON o.id = g.o_player_id WHERE g.id = $1`,
    values,
  );
}

export function selectTttGamesForTttGamePage2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT status, x_player_id, o_player_id FROM ttt_games WHERE status IN ('x_won', 'o_won', 'draw') AND ((x_player_id = $1 AND o_player_id = $2) OR (x_player_id = $2 AND o_player_id = $1))`,
    values,
  );
}
