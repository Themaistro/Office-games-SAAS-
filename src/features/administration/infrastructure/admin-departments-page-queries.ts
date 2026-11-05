import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectDepartmentsForDepartmentsManagementPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM departments ORDER BY sort_order ASC, name ASC",
    values,
  );
}

export function selectProfilesForDepartmentsManagementPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT department FROM profiles", values);
}
