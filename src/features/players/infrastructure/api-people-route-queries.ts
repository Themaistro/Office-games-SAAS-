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
    `SELECT p.id AS user_id, p.full_name, p.avatar_url, p.department,
            p.position, pr.last_seen AS online_at,
            (pr.last_seen > now() - interval '90 seconds') AS is_online,
            COALESCE(a.metadata->>'description', '') AS activity,
            COALESCE(unread.unread_count, 0)::int AS unread_count
       FROM profiles p LEFT JOIN presence pr ON pr.user_id = p.id
       LEFT JOIN LATERAL (SELECT metadata FROM activity_feed WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1) a ON true
       LEFT JOIN LATERAL (SELECT count(*) AS unread_count FROM direct_messages WHERE recipient_id = $1 AND sender_id = p.id AND read_at IS NULL) unread ON true
      WHERE p.role = 'employee' AND p.is_active = true AND p.id <> $1
      ORDER BY (pr.last_seen > now() - interval '90 seconds') DESC,
               p.full_name ASC`,
    values,
  );
}
