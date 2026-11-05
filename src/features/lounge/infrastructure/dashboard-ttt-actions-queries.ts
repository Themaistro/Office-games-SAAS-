import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function updateTttGamesForMakeTttMove<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE ttt_games SET board_state=$1,current_turn=$2,status=$3,winner_id=CASE WHEN $3='x_won' THEN x_player_id WHEN $3='o_won' THEN o_player_id ELSE NULL END,updated_at=now() WHERE id=$4",
    values,
  );
}

export function selectTttGamesForCreateTttRematch<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT * FROM ttt_games WHERE id=$1", values);
}
