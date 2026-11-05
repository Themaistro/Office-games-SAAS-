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
    "SELECT id, full_name, department, avatar_url, role FROM profiles WHERE role = 'employee' AND full_name ILIKE $1 ORDER BY full_name ASC LIMIT 10",
    values,
  );
}
