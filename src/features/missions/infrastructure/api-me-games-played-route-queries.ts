import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "SELECT games_played FROM profiles WHERE id=$1",
    values,
  );
}
