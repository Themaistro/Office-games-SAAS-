import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectCompanyTriviaForQuestionsManagementPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM company_trivia ORDER BY target_date ASC NULLS FIRST",
    values,
  );
}

export function selectGameTypesForQuestionsManagementPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT slug, name FROM game_types WHERE is_active = true",
    values,
  );
}
