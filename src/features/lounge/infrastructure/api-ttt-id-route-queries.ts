import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectTttGamesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    `SELECT g.*,
    jsonb_build_object('id', x.id, 'full_name', x.full_name, 'avatar_url', x.avatar_url, 'lounge_lp', x.lounge_lp, 'ttt_elo', x.ttt_elo) AS x_player,
    jsonb_build_object('id', o.id, 'full_name', o.full_name, 'avatar_url', o.avatar_url, 'lounge_lp', o.lounge_lp, 'ttt_elo', o.ttt_elo) AS o_player
    FROM ttt_games g LEFT JOIN profiles x ON x.id = g.x_player_id LEFT JOIN profiles o ON o.id = g.o_player_id WHERE g.id = $1`,
    values,
  );
}

export function insertGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('ttt', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now() WHERE game_spectators.last_seen<now()-interval '5 seconds'",
    values,
  );
}

export function selectGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='ttt' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC",
    values,
  );
}
