import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectPresenceForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "SELECT p.id AS user_id, p.full_name, p.avatar_url, p.department, pr.last_seen AS online_at FROM presence pr JOIN profiles p ON p.id=pr.user_id WHERE pr.last_seen > now() - interval '90 seconds' AND pr.user_id <> $1 AND p.role='employee' ORDER BY pr.last_seen DESC",
    values,
  );
}

export function insertPresenceForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO presence (user_id,last_seen) VALUES ($1,now()) ON CONFLICT (user_id) DO UPDATE SET last_seen=now()",
    values,
  );
}
