"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function resetUserStreak(userId: string) {
  await assertAdmin();
  await query("UPDATE profiles SET current_streak = 0 WHERE id = $1", [userId]);

  revalidatePath("/admin/users");
}

export async function updateUserDepartment(formData: FormData) {
  await assertAdmin();

  const userId = formData.get("userId") as string;
  const department = formData.get("department") as string;

  if (userId && department !== null) {
    await query("UPDATE profiles SET department = $1 WHERE id = $2", [department, userId]);
  }

  revalidatePath("/admin/users");
}

export async function toggleUserStatus(userId: string, deactivate: boolean) {
  await assertAdmin();

  try { await query("UPDATE profiles SET is_active = $1 WHERE id = $2", [!deactivate, userId]); } catch (error) { return { error: error instanceof Error ? error.message : "Failed to update user status" }; }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkResetStreaks(userIds: string[]) {
  await assertAdmin();
  try { await query("UPDATE profiles SET current_streak = 0 WHERE id = ANY($1::uuid[])", [userIds]); } catch (error) { return { error: error instanceof Error ? error.message : "Failed to reset streaks" }; }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkDeactivate(userIds: string[]) {
  await assertAdmin();
  try { await query("UPDATE profiles SET is_active = false WHERE id = ANY($1::uuid[])", [userIds]); } catch (error) { return { error: error instanceof Error ? error.message : "Failed to deactivate users" }; }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function getPlayerDetails(userId: string) {
  await assertAdmin();
  const [{ rows: profiles }, { rows: sessions }] = await Promise.all([
    query("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [userId]),
    query("SELECT * FROM daily_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [userId]),
  ]);
  return { profile: profiles[0] ?? null, sessions };
}

export async function wipePlayerSession(userId: string) {
  await assertAdmin();
  await query("DELETE FROM daily_sessions WHERE user_id = $1 AND created_at >= CURRENT_DATE", [userId]);

  // Revalidate both admin and the player's dashboard so GlobalRealtimeSync
  // picks up the change and refreshes their browser automatically.
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function grantExtraTime(userId: string, extraSeconds: number = 300) {
  await assertAdmin();
  const { rows } = await query<{ id: string; allowed_duration_seconds: number }>("SELECT id, allowed_duration_seconds FROM daily_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [userId]);
  const latestSession = rows[0];

  if (latestSession) {
    const newDuration = (latestSession.allowed_duration_seconds || 900) + extraSeconds;
    await query("UPDATE daily_sessions SET allowed_duration_seconds = $1 WHERE id = $2", [newDuration, latestSession.id]);
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function setPlayerTimeLimits(
  userId: string,
  dailyLimitMinutes: number | null,
  sessionLimitMinutes: number | null
) {
  await assertAdmin();
  await query("UPDATE profiles SET daily_time_limit_minutes = $1, session_time_limit_minutes = $2 WHERE id = $3", [dailyLimitMinutes, sessionLimitMinutes, userId]);

  revalidatePath("/admin/users");
  return { success: true };
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const { rows } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  if (rows[0]?.role !== "admin") throw new Error("Unauthorized");
  return user;
}
