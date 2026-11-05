import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function updateProfilesForResetUserStreak<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET current_streak = 0 WHERE id = $1 AND role = 'employee'",
    values,
  );
}

export function selectDepartmentsForUpdateUserDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT name FROM departments WHERE name = $1 AND is_active = true LIMIT 1",
    values,
  );
}

export function updateProfilesForUpdateUserDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET department = $1 WHERE id = $2 AND role = 'employee'",
    values,
  );
}

export function updateProfilesForToggleUserStatus<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET is_active = $1 WHERE id = $2 AND role = 'employee'",
    values,
  );
}

export function updateProfilesForBulkResetStreaks<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET current_streak = 0 WHERE id = ANY($1::uuid[]) AND role = 'employee'",
    values,
  );
}

export function updateProfilesForBulkDeactivate<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET is_active = false WHERE id = ANY($1::uuid[]) AND role = 'employee'",
    values,
  );
}

export function selectProfilesForGetPlayerDetails<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM profiles WHERE id = $1 AND role = 'employee' LIMIT 1",
    values,
  );
}

export function selectDailySessionsForGetPlayerDetails<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM daily_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
    values,
  );
}

export function deleteDailySessionsForWipePlayerSession<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "DELETE FROM daily_sessions WHERE user_id = $1 AND created_at >= CURRENT_DATE AND EXISTS (SELECT 1 FROM profiles WHERE id = $1 AND role = 'employee')",
    values,
  );
}

export function selectDailySessionsForGrantExtraTime<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT s.id, s.allowed_duration_seconds FROM daily_sessions s JOIN profiles p ON p.id = s.user_id AND p.role = 'employee' WHERE s.user_id = $1 AND s.is_completed = false ORDER BY s.created_at DESC LIMIT 1",
    values,
  );
}

export function updateDailySessionsForGrantExtraTime<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE daily_sessions SET allowed_duration_seconds = $1 WHERE id = $2",
    values,
  );
}

export function updateProfilesForSetPlayerTimeLimits<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET daily_time_limit_minutes = $1, session_time_limit_minutes = $2 WHERE id = $3 AND role = 'employee'",
    values,
  );
}
