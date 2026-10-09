import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query, withTransaction } from "@/lib/db";

const SESSION_COOKIE = "office_games_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type CurrentUser = { id: string; email: string };

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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<CurrentUser>(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  cookieStore.delete(SESSION_COOKIE);
}

export async function createUser(input: { email: string; passwordHash: string; fullName: string; department: string; position: string }) {
  return withTransaction(async (client) => {
    const user = await client.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, $2, now()) RETURNING id",
      [input.email, input.passwordHash],
    );
    await client.query(
      `INSERT INTO profiles (id, email, full_name, department, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.rows[0].id, input.email, input.fullName, input.department, input.position],
    );
    return user.rows[0].id;
  });
}
