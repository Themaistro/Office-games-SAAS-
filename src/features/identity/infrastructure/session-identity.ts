import "server-only";
import { createHash } from "node:crypto";
import { query } from "../../../server/database/connection";

/** Explicit-token lookup also works before page rendering in the Node proxy. */
export async function sessionIdentity(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { rows } = await query<{
    id: string;
    email: string;
    role: string | null;
  }>(
    `SELECT u.id,u.email,p.role FROM sessions s
    JOIN users u ON u.id=s.user_id LEFT JOIN profiles p ON p.id=u.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND COALESCE(p.is_active,true)=true`,
    [createHash("sha256").update(token).digest("hex")],
  );
  return rows[0] ?? null;
}
