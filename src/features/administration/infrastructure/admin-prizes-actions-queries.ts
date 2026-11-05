import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForAddPrize<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function insertPrizesForAddPrize<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO prizes (title, icon_emoji, rank_requirement) VALUES ($1, $2, $3) ON CONFLICT (rank_requirement) DO UPDATE SET title = EXCLUDED.title, icon_emoji = EXCLUDED.icon_emoji",
    values,
  );
}

export function selectProfilesForDeletePrize<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function deletePrizesForDeletePrize<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("DELETE FROM prizes WHERE id = $1", values);
}
