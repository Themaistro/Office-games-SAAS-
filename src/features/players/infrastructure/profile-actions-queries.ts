import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectDepartmentsForUpdateProfile<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT name FROM departments WHERE name = $1 AND is_active = true LIMIT 1",
    values,
  );
}

export function updateProfilesForUpdateProfile<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET full_name = $1, avatar_url = $2, department = $3 WHERE id = $4",
    values,
  );
}

export function updateProfilesForUpdateProfile2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET full_name = $1, avatar_url = $2 WHERE id = $3",
    values,
  );
}
