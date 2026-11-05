import type { QueryResult, QueryResultRow } from "pg";

/** Repositories can use the default connection or an existing transaction. */
export interface SqlExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
}
