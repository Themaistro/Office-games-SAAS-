import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForLeaderboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id, full_name, avatar_url, department, total_xp, current_level, current_streak, lounge_lp FROM profiles WHERE role = 'employee' AND is_active = true ORDER BY lounge_lp DESC, full_name ASC LIMIT 100",
    values,
  );
}

export function selectProfilesForLeaderboardPage2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT department,total_xp FROM profiles WHERE role='employee' AND is_active=true",
    values,
  );
}

export function selectPrizesForLeaderboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM prizes ORDER BY rank_requirement ASC",
    values,
  );
}
