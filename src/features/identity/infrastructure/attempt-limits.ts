import "server-only";
import { createHash } from "node:crypto";
import { query } from "@/server/database/connection";

/** Atomic PostgreSQL buckets work across workers; no email/IP is stored. */
export async function consumeAttempt(
  scope: string,
  subject: string,
  limit: number,
  seconds: number,
) {
  const key = createHash("sha256").update(`${scope}:${subject}`).digest("hex");
  const { rows } = await query<{ attempts: number }>(
    `INSERT INTO authentication_attempts(bucket,attempts,expires_at)
     VALUES($1,1,now()+$2*interval '1 second')
     ON CONFLICT(bucket) DO UPDATE SET
       attempts=CASE WHEN authentication_attempts.expires_at<=now() THEN 1 ELSE authentication_attempts.attempts+1 END,
       expires_at=CASE WHEN authentication_attempts.expires_at<=now() THEN EXCLUDED.expires_at ELSE authentication_attempts.expires_at END
     RETURNING attempts`,
    [key, seconds],
  );
  return rows[0].attempts <= limit;
}
