"use server";

import { missionConfiguration } from "@/features/missions/composition";
import { requireAdmin } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

export async function toggleGameStatus(gameId: string, currentStatus: boolean) {
  await requireAdmin();
  await missionConfiguration.toggleGame(gameId, currentStatus);

  revalidatePath("/admin/games");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/daily-mission");
  revalidatePath("/play");
  revalidatePath("/office-lounge");
}

export async function updateGameRounds(
  gameId: string,
  easy: number,
  medium: number,
  hard: number,
) {
  await requireAdmin();
  await missionConfiguration.setRounds(gameId, easy, medium, hard);

  revalidatePath("/admin/games");
  revalidatePath("/daily-mission");
  revalidatePath("/play");
}

export async function updateDailyMissionSize(dailyGameCount: number) {
  await requireAdmin();
  await missionConfiguration.setSize(dailyGameCount);
  for (const path of [
    "/dashboard",
    "/admin/games",
    "/admin/settings",
    "/daily-mission",
    "/play",
  ])
    revalidatePath(path);
}
