"use server";

import {
  adminSettingsActionsQueries,
  resetPlatform,
} from "@/features/administration/composition";
import { missionConfiguration } from "@/features/missions/composition";
import { requireAdmin } from "@/features/identity/public-server";
import { withTransaction } from "@/server/database/connection";
import { revalidatePath } from "next/cache";

const {
  selectSystemSettingsForResetSeason,
  selectProfilesForResetSeason,
  insertSeasonWinnersForResetSeason,
  insertSeasonSnapshotsForResetSeason,
  updateSystemSettingsForResetSeason,
  selectSystemSettingsForGetSystemSettings,
  updateSystemSettingsForUpdateSystemSettings,
  updateDailySessionsForUpdateSystemSettings,
  updateProfilesForFactoryResetPlatform,
  updateSystemSettingsForFactoryResetPlatform,
  updateProfilesForBulkUpdateTimeLimits,
} = adminSettingsActionsQueries;

const { deleteGameplayData } = resetPlatform;

async function admin() {
  return requireAdmin();
}
export async function resetSeason() {
  await admin();
  await withTransaction(async (client) => {
    const { rows } = await selectSystemSettingsForResetSeason<{
      current_season: number;
    }>([], client);
    const season = rows[0]?.current_season ?? 1;
    const { rows: players } = await selectProfilesForResetSeason([], client);
    for (const [i, p] of players.entries())
      await insertSeasonWinnersForResetSeason(
        [season, p.id, i + 1, p.total_xp ?? 0],
        client,
      );
    // A season rollover must never erase questions, messages or player history.
    await insertSeasonSnapshotsForResetSeason([season], client);
    await updateSystemSettingsForResetSeason([season + 1], client);
  });
  revalidatePath("/", "layout");
}
export async function getSystemSettings() {
  await admin();
  const { rows } = await selectSystemSettingsForGetSystemSettings([]);
  return (
    rows[0] ?? {
      current_season: 1,
      season_start_date: new Date().toISOString(),
      cooldown_hours: 24,
      daily_time_limit_minutes: 15,
      daily_game_count: 5,
    }
  );
}
export async function updateSystemSettings(formData: FormData) {
  await admin();
  const cooldown = Math.max(0, Number(formData.get("cooldown_hours")) || 0);
  const minutes = Math.max(
    1,
    Number(formData.get("game_duration_minutes")) || 15,
  );
  const gameCount = Math.max(
    1,
    Math.min(20, Math.floor(Number(formData.get("daily_game_count")) || 5)),
  );
  await withTransaction(async () => {
    await missionConfiguration.setSize(gameCount);
    await updateSystemSettingsForUpdateSystemSettings([cooldown, minutes]);
    await updateDailySessionsForUpdateSystemSettings([minutes * 60]);
  });
  for (const path of [
    "/admin",
    "/admin/settings",
    "/admin/games",
    "/dashboard",
    "/daily-mission",
    "/play",
  ]) {
    revalidatePath(path);
  }
}
export async function factoryResetPlatform() {
  await admin();
  await withTransaction(async (client) => {
    await deleteGameplayData(client);
    await updateProfilesForFactoryResetPlatform([], client);
    await updateSystemSettingsForFactoryResetPlatform([], client);
  });
  revalidatePath("/", "layout");
}
export async function bulkUpdateTimeLimits(
  dailyLimit: number,
  sessionLimit: number,
) {
  await admin();
  if (
    !Number.isInteger(dailyLimit) ||
    dailyLimit < 0 ||
    dailyLimit > 1440 ||
    !Number.isInteger(sessionLimit) ||
    sessionLimit < 0 ||
    sessionLimit > 1440
  )
    throw new Error(
      "Time limits must be whole numbers between 0 and 1440 minutes.",
    );
  await updateProfilesForBulkUpdateTimeLimits([
    dailyLimit === 0 ? null : dailyLimit,
    sessionLimit === 0 ? null : sessionLimit,
  ]);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}
