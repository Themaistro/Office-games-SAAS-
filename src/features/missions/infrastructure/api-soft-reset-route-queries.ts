import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function updateProfilesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `UPDATE profiles SET total_xp = 0, current_streak = 0,
          best_streak = 0, games_played = 0, current_level = 1 WHERE id = $1`,
    values,
  );
}

export function deleteDailySessionsForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "DELETE FROM daily_sessions WHERE user_id = $1",
    values,
  );
}
