import { sessionIdentity } from "./session-identity";
import { query, withTransaction } from "@/server/database/connection";
import { invitationHash } from "@/features/identity/infrastructure/invitations";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import "server-only";

const SESSION_COOKIE = "office_games_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type CurrentUser = { id: string; email: string };
export type CurrentAdmin = CurrentUser & { role: "admin" };

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(token), expiresAt],
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

async function readCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const identity = await sessionIdentity(token);
    return identity ? { id: identity.id, email: identity.email } : null;
  } catch {
    // A stale browser session or a temporary database outage must never trap
    // the entire application in Next's loading/retry loop.
    return null;
  }
}

export const getCurrentUser = cache(readCurrentUser);

/**
 * The single source of truth for privileged access.  A valid session alone is
 * never enough: the current profile must still be an active administrator.
 */
async function readCurrentAdmin(): Promise<CurrentAdmin | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  let rows: { role: string; is_active: boolean }[];
  try {
    ({ rows } = await query<{ role: string; is_active: boolean }>(
      "SELECT role, is_active FROM profiles WHERE id = $1 LIMIT 1",
      [user.id],
    ));
  } catch {
    return null;
  }
  const profile = rows[0];
  if (profile?.role !== "admin" || profile.is_active === false) return null;

  return { ...user, role: "admin" };
}

export const getCurrentAdmin = cache(readCurrentAdmin);

/** Use this from admin-only server actions. Never trust a client-side check. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token)
    await query("DELETE FROM sessions WHERE token_hash = $1", [
      hashToken(token),
    ]);
  cookieStore.delete(SESSION_COOKIE);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  department: string;
  position: string;
  invitationToken?: string;
}) {
  return withTransaction(async (client) => {
    if (input.invitationToken) {
      const accepted = await client.query(
        "UPDATE invitations SET accepted_at=now() WHERE token_hash=$1 AND lower(email)=$2 AND accepted_at IS NULL AND expires_at>now() RETURNING id",
        [invitationHash(input.invitationToken), input.email],
      );
      if (!accepted.rowCount)
        throw new Error("Invitation is invalid or expired");
    }
    const user = await client.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, $2, now()) RETURNING id",
      [input.email, input.passwordHash],
    );
    await client.query(
      `INSERT INTO profiles (id, email, full_name, department, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.rows[0].id,
        input.email,
        input.fullName,
        input.department,
        input.position,
      ],
    );
    return user.rows[0].id;
  });
}
