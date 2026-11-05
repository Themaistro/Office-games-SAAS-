import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForAdminDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT count(*)::int AS count FROM profiles WHERE role = 'employee'",
    values,
  );
}

export function selectProfilesForAdminDashboardPage2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT full_name, department, current_streak FROM profiles WHERE role = 'employee' ORDER BY current_streak DESC LIMIT 1",
    values,
  );
}

export function selectProfilesForAdminDashboardPage3<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT department, total_xp FROM profiles WHERE role = 'employee' AND department IS NOT NULL LIMIT 10000",
    values,
  );
}

export function selectDailySessionsForAdminDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT count(*)::int AS count FROM daily_sessions WHERE date = $1",
    values,
  );
}

export function selectGameTypesForAdminDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT count(*)::int AS count FROM game_types WHERE is_active = true",
    values,
  );
}

export function selectDailySessionsForAdminDashboardPage2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT date FROM daily_sessions WHERE date >= $1",
    values,
  );
}
