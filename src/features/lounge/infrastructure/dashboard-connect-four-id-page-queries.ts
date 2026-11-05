import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectConnectFourGamesForConnectFourPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT g.*, jsonb_build_object('id', r.id, 'full_name', r.full_name, 'avatar_url', r.avatar_url, 'lounge_lp', r.lounge_lp) AS red,
    jsonb_build_object('id', y.id, 'full_name', y.full_name, 'avatar_url', y.avatar_url, 'lounge_lp', y.lounge_lp) AS yellow
    FROM connect_four_games g LEFT JOIN profiles r ON r.id = g.red_player_id LEFT JOIN profiles y ON y.id = g.yellow_player_id WHERE g.id = $1`,
    values,
  );
}
