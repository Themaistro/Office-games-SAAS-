import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectDirectMessagesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT m.sender_id, p.full_name, p.avatar_url, count(*)::int AS unread_count,
              max(m.created_at) AS latest_at
         FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
        WHERE m.recipient_id = $1 AND m.read_at IS NULL
        GROUP BY m.sender_id, p.full_name, p.avatar_url ORDER BY latest_at DESC`,
    values,
  );
}

export function selectDirectMessagesForGET2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT * FROM (SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at,
            p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
      WHERE ((m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1))
        AND ($3::uuid IS NULL OR (m.created_at,m.id) < (
          SELECT cursor.created_at,cursor.id FROM direct_messages cursor WHERE cursor.id=$3
          AND ((cursor.sender_id=$1 AND cursor.recipient_id=$2) OR (cursor.sender_id=$2 AND cursor.recipient_id=$1))
        ))
      ORDER BY m.created_at DESC, m.id DESC LIMIT 100) recent ORDER BY created_at ASC, id ASC`,
    values,
  );
}

export function updateDirectMessagesForPATCH<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE direct_messages SET read_at=now() WHERE recipient_id=$1 AND id=ANY($2::uuid[]) AND read_at IS NULL",
    values,
  );
}

export function selectProfilesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM profiles WHERE id=$1 AND role='employee' AND is_active=true",
    values,
  );
}

export function selectProfilesForPOST2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id FROM profiles WHERE id = $1 AND role = 'employee' AND is_active = true",
    values,
  );
}

export function insertDirectMessagesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO direct_messages (sender_id, recipient_id, body) VALUES ($1, $2, $3) RETURNING id, sender_id, recipient_id, body, created_at, read_at",
    values,
  );
}
