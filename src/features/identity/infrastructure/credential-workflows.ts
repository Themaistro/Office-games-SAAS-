import "server-only";
import bcrypt from "bcryptjs";
import { authenticate, type LoginAccount } from "../application/authenticate";
import { consumeAttempt } from "./attempt-limits";
import {
  selectUsersForLogin,
  insertActivityFeedForLogin,
} from "./login-actions-queries";
import { selectDepartmentsForSignup } from "./register-actions-queries";
import { createSession, createUser } from "./authentication";
import { findInvitation } from "./invitations";
import { logServerFailure } from "@/server/observability";
import type { parseRegistration } from "../domain/credentials";
import { resolveRegistrationMode } from "../domain/credentials";
import { cleanExpiredIdentityRecords } from "./session-maintenance";

let nextMaintenanceAt = 0;
async function maintainAttempts() {
  if (Date.now() < nextMaintenanceAt) return;
  nextMaintenanceAt = Date.now() + 60000;
  await cleanExpiredIdentityRecords().catch((error) =>
    logServerFailure("authentication.maintenance", error),
  );
}

// Same bcrypt cost for unknown accounts; never used to authenticate a user.
const dummyHash =
  "$2b$12$lXvZliX01NbOuJadGPNMRO01hK7vSvBCmsh9b1woRw/OFflTBbk1W";

export function registrationMode() {
  return resolveRegistrationMode(process.env.REGISTRATION_MODE);
}

export function registrationPasswordMinimum() {
  const minimum = Number(
    process.env.REGISTRATION_PASSWORD_MIN_LENGTH ??
      (process.env.NODE_ENV === "production" ? 12 : 6),
  );
  if (!Number.isInteger(minimum) || minimum < 6 || minimum > 64)
    throw new Error("Registration password minimum must be between 6 and 64");
  return minimum;
}

export async function loginWithCredentials(input: {
  email: string;
  password: string;
}) {
  const result = await authenticate(input, {
    consume: async (scope, subject, limit, seconds) => {
      const allowed = await consumeAttempt(scope, subject, limit, seconds);
      if (allowed && scope === "login-total") await maintainAttempts();
      return allowed;
    },
    find: async (email) =>
      (await selectUsersForLogin<LoginAccount>([email])).rows[0],
    compare: (password, hash) => bcrypt.compare(password, hash ?? dummyHash),
  });
  if ("error" in result) return result;
  await createSession(result.userId);
  // An auxiliary activity entry must not turn a successful login into an error.
  await insertActivityFeedForLogin([
    result.userId,
    "presence",
    JSON.stringify({ description: "just logged in and is ready to play" }),
  ]).catch((error) => logServerFailure("login.activity", error));
  return { success: true };
}

export async function registerWithCredentials(
  input: NonNullable<ReturnType<typeof parseRegistration>>,
): Promise<{ error: string } | { success: true }> {
  if (input.password.length < registrationPasswordMinimum())
    return {
      error: `Use a password of at least ${registrationPasswordMinimum()} characters (up to 72 UTF-8 bytes).`,
    };
  if (
    !(await consumeAttempt("registration-total", "company", 30, 600)) ||
    !(await consumeAttempt("registration-email", input.email, 3, 600))
  )
    return { error: "Too many attempts. Please try again later." };
  if (registrationMode() === "invite" && !input.invitationToken)
    return {
      error: "Ask your administrator for an invitation to join this office.",
    };
  if (input.invitationToken) {
    const invitation = await findInvitation(input.invitationToken);
    if (!invitation || invitation.email.toLowerCase() !== input.email)
      return {
        error:
          "This invitation is invalid, expired, or belongs to another email address.",
      };
  }
  if (!(await selectDepartmentsForSignup([input.department])).rowCount)
    return { error: "Please select an active department." };
  try {
    const userId = await createUser({
      ...input,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    await createSession(userId);
    return { success: true };
  } catch (error) {
    logServerFailure("registration.create", error);
    return {
      error:
        "Unable to create your account. Check your details or try signing in.",
    };
  }
}
