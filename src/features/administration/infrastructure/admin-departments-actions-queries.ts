import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForAddDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDepartmentsForAddDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM departments WHERE lower(name) = lower($1) LIMIT 1",
    values,
  );
}

export function insertDepartmentsForAddDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO departments (name, is_active) VALUES ($1, true)",
    values,
  );
}

export function selectProfilesForToggleDepartmentStatus<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function updateDepartmentsForToggleDepartmentStatus<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE departments SET is_active = $1 WHERE id = $2",
    values,
  );
}

export function selectProfilesForDeleteDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDepartmentsForDeleteDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT name FROM departments WHERE id = $1",
    values,
  );
}

export function selectProfilesForDeleteDepartment2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT count(*)::int AS count FROM profiles WHERE department = $1",
    values,
  );
}

export function selectCompanyTriviaForDeleteDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT count(*)::int AS count FROM company_trivia WHERE department = $1",
    values,
  );
}

export function deleteDepartmentsForDeleteDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("DELETE FROM departments WHERE id = $1", values);
}

export function selectProfilesForRenameDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDepartmentsForRenameDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT name FROM departments WHERE id = $1",
    values,
  );
}

export function selectDepartmentsForRenameDepartment2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM departments WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1",
    values,
  );
}

export function updateDepartmentsForRenameDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE departments SET name = $1 WHERE id = $2",
    values,
  );
}

export function updateProfilesForRenameDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET department = $1 WHERE department = $2",
    values,
  );
}

export function updateCompanyTriviaForRenameDepartment<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE company_trivia SET department = $1 WHERE department = $2",
    values,
  );
}

export function selectProfilesForUpdateDepartmentSortOrder<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function updateDepartmentsForUpdateDepartmentSortOrder<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE departments SET sort_order = $1 WHERE id = $2",
    values,
  );
}
