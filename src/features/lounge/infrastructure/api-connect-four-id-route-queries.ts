import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectConnectFourGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT g.*, jsonb_build_object('id', r.id, 'full_name', r.full_name, 'avatar_url', r.avatar_url, 'lounge_lp', r.lounge_lp) AS red,
    jsonb_build_object('id', y.id, 'full_name', y.full_name, 'avatar_url', y.avatar_url, 'lounge_lp', y.lounge_lp) AS yellow
    FROM connect_four_games g LEFT JOIN profiles r ON r.id = g.red_player_id LEFT JOIN profiles y ON y.id = g.yellow_player_id WHERE g.id = $1`,
    values,
  );
}

export function insertGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('connect-four', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now() WHERE game_spectators.last_seen<now()-interval '5 seconds'",
    values,
  );
}

export function selectGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='connect-four' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC",
    values,
  );
}
