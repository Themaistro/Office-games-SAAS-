import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForAnalyticsPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDailySessionsForAnalyticsPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT date, user_id FROM daily_sessions WHERE date >= $1",
    values,
  );
}

export function selectProfilesForAnalyticsPage2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT department, total_xp, current_level, role FROM profiles WHERE role = 'employee'",
    values,
  );
}

export function selectMatchResultsForAnalyticsPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT created_at FROM match_results WHERE created_at >= $1",
    values,
  );
}

export function selectSessionQuestionsForAnalyticsPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT gt.slug AS game_type, (sq.outcome = 'correct') AS is_correct, sq.earned_xp
     FROM session_questions sq
     JOIN questions q ON q.id = sq.question_id
     JOIN game_types gt ON gt.id = q.game_type_id
     WHERE sq.created_at >= $1 AND sq.is_completed = true AND sq.outcome IS NOT NULL`,
    values,
  );
}
