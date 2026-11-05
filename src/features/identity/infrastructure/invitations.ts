import { query } from "@/server/database/connection";
import { createHash } from "node:crypto";
import "server-only";

export function invitationHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { rows } = await query<{ email: string; full_name: string }>(
    "SELECT email, full_name FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() LIMIT 1",
    [invitationHash(token)],
  );
  return rows[0] || null;
}
