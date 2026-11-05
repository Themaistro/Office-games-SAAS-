import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function updateConnectFourGamesForMakeConnectFourMove<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE connect_four_games SET board_state=$1,current_turn=$2,updated_at=now() WHERE id=$3",
    values,
  );
}
