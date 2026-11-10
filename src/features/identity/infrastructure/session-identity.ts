import "server-only";
import { createHash } from "node:crypto";
import { query } from "../../../server/database/connection";

/** Explicit-token lookup also works before page rendering in the Node proxy. */
export async function sessionIdentity(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const adminHours = Number(process.env.ADMIN_SESSION_MAX_AGE_HOURS ?? 8);
  if (!Number.isInteger(adminHours) || adminHours < 1 || adminHours > 24)
    throw new Error("Admin session age must be between 1 and 24 hours");
  const { rows } = await query<{
    id: string;
    email: string;
    role: string | null;
  }>(
    `SELECT u.id,u.email,p.role FROM sessions s
    JOIN users u ON u.id=s.user_id JOIN profiles p ON p.id=u.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND p.is_active=true
      AND (p.role<>'admin' OR s.created_at>now()-$2*interval '1 hour')`,
    [createHash("sha256").update(token).digest("hex"), adminHours],
  );
  return rows[0] ?? null;
}
