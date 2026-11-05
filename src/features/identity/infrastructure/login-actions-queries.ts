import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectUsersForLogin<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "SELECT u.id, u.password_hash, COALESCE(p.is_active, true) AS is_active FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = $1",
    values,
  );
}

export function insertActivityFeedForLogin<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO activity_feed (user_id, activity_type, metadata) VALUES ($1, $2, $3)",
    values,
  );
}
