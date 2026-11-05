import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForDailyMissionPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT role, timezone FROM profiles WHERE id = $1 LIMIT 1",
    values,
  );
}

export function selectDailySessionsForDailyMissionPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM daily_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    values,
  );
}

export function selectSystemSettingsForDailyMissionPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT cooldown_hours FROM system_settings WHERE id = 1",
    values,
  );
}
