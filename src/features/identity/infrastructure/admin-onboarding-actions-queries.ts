import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForInviteRoster<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT role FROM profiles WHERE id = $1", values);
}

export function selectUsersForInviteRoster<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM users WHERE lower(email)=$1 LIMIT 1",
    values,
  );
}

export function insertInvitationsForInviteRoster<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `INSERT INTO invitations (email, full_name, invited_by, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, now() + interval '7 days')
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, invited_by = EXCLUDED.invited_by, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, accepted_at = NULL`,
    values,
  );
}
