import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForAddCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDepartmentsForAddCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM departments WHERE name = $1 AND is_active = true LIMIT 1",
    values,
  );
}

export function insertCompanyTriviaForAddCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO company_trivia (game_slug, question, options, correct_answer, target_date, department, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)",
    values,
  );
}

export function selectProfilesForEditCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectDepartmentsForEditCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM departments WHERE name = $1 AND is_active = true LIMIT 1",
    values,
  );
}

export function updateCompanyTriviaForEditCompanyTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE company_trivia SET game_slug = $1, question = $2, options = $3, correct_answer = $4, target_date = $5, department = $6 WHERE id = $7",
    values,
  );
}

export function selectProfilesForDeleteTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function deleteCompanyTriviaForDeleteTrivia<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("DELETE FROM company_trivia WHERE id = $1", values);
}

export function selectProfilesForToggleTriviaStatus<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function updateCompanyTriviaForToggleTriviaStatus<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE company_trivia SET is_active = $1 WHERE id = $2",
    values,
  );
}
