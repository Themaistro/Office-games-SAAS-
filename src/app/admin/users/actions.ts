"use server";

import { adminUsersActionsQueries } from "@/features/players/composition";
import { requireAdmin } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

const {
  updateProfilesForResetUserStreak,
  selectDepartmentsForUpdateUserDepartment,
  updateProfilesForUpdateUserDepartment,
  updateProfilesForToggleUserStatus,
  updateProfilesForBulkResetStreaks,
  updateProfilesForBulkDeactivate,
  selectProfilesForGetPlayerDetails,
  selectDailySessionsForGetPlayerDetails,
  deleteDailySessionsForWipePlayerSession,
  selectDailySessionsForGrantExtraTime,
  updateDailySessionsForGrantExtraTime,
  updateProfilesForSetPlayerTimeLimits,
} = adminUsersActionsQueries;

export async function resetUserStreak(userId: string) {
  await requireAdmin();
  await updateProfilesForResetUserStreak([userId]);

  revalidatePath("/admin/users");
}

export async function updateUserDepartment(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  const department = String(formData.get("department") || "").trim();

  if (!userId) throw new Error("Player is required.");

  if (department) {
    const { rows: departments } =
      await selectDepartmentsForUpdateUserDepartment<{ name: string }>([
        department,
      ]);
    if (!departments[0]) throw new Error("Please select an active department.");
  }

  await updateProfilesForUpdateUserDepartment([department || null, userId]);

  revalidatePath("/admin/users");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function toggleUserStatus(userId: string, deactivate: boolean) {
  await requireAdmin();

  try {
    await updateProfilesForToggleUserStatus([!deactivate, userId]);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update user status",
    };
  }
  revalidatePath("/admin/users");
  return { success: true };
}
export async function bulkResetStreaks(userIds: string[]) {
  await requireAdmin();
  try {
    await updateProfilesForBulkResetStreaks([userIds]);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to reset streaks",
    };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkDeactivate(userIds: string[]) {
  await requireAdmin();
  try {
    await updateProfilesForBulkDeactivate([userIds]);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to deactivate users",
    };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function getPlayerDetails(userId: string) {
  await requireAdmin();
  const [{ rows: profiles }, { rows: sessions }] = await Promise.all([
    selectProfilesForGetPlayerDetails([userId]),
    selectDailySessionsForGetPlayerDetails([userId]),
  ]);
  return { profile: profiles[0] ?? null, sessions };
}

export async function wipePlayerSession(userId: string) {
  await requireAdmin();
  await deleteDailySessionsForWipePlayerSession([userId]);

  // Revalidate both admin and the player's dashboard so GlobalRealtimeSync
  // picks up the change and refreshes their browser automatically.
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function grantExtraTime(
  userId: string,
  extraSeconds: number = 300,
) {
  await requireAdmin();
  if (
    !Number.isFinite(extraSeconds) ||
    extraSeconds <= 0 ||
    extraSeconds > 86400
  ) {
    throw new Error("Extra time must be between 1 second and 24 hours.");
  }
  const { rows } = await selectDailySessionsForGrantExtraTime<{
    id: string;
    allowed_duration_seconds: number;
  }>([userId]);
  const latestSession = rows[0];

  if (!latestSession)
    throw new Error(
      "This player does not have an active daily session to extend.",
    );

  const newDuration =
    (latestSession.allowed_duration_seconds || 900) + extraSeconds;
  await updateDailySessionsForGrantExtraTime([newDuration, latestSession.id]);

  revalidatePath("/admin/users");
  return { success: true };
}

export async function setPlayerTimeLimits(
  userId: string,
  dailyLimitMinutes: number | null,
  sessionLimitMinutes: number | null,
) {
  await requireAdmin();
  if (
    dailyLimitMinutes !== null &&
    (!Number.isInteger(dailyLimitMinutes) ||
      dailyLimitMinutes < 0 ||
      dailyLimitMinutes > 1440)
  ) {
    throw new Error("Daily limit must be between 0 and 1440 minutes.");
  }
  if (
    sessionLimitMinutes !== null &&
    (!Number.isInteger(sessionLimitMinutes) ||
      sessionLimitMinutes < 0 ||
      sessionLimitMinutes > 1440)
  ) {
    throw new Error("Session limit must be between 0 and 1440 minutes.");
  }
  await updateProfilesForSetPlayerTimeLimits([
    dailyLimitMinutes,
    sessionLimitMinutes,
    userId,
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}
