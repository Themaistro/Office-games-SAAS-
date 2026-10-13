"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleGameStatus(gameId: string, currentStatus: boolean) {
  await assertAdmin();
  if (currentStatus) {
    const { rows } = await query<{ count: number }>("SELECT count(*)::int AS count FROM game_types WHERE is_active = true");
    if ((rows[0]?.count ?? 0) <= 1) throw new Error("Keep at least one game active for the Daily Mission.");
  }
  const { rowCount } = await query("UPDATE game_types SET is_active = $1 WHERE id = $2 AND is_active = $3", [!currentStatus, gameId, currentStatus]);
  if (rowCount !== 1) throw new Error("This game was changed elsewhere. Refresh and try again.");
  
  revalidatePath("/admin/games");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/daily-mission");
  revalidatePath("/play");
  revalidatePath("/office-lounge");
}

export async function updateGameRounds(gameId: string, easy: number, medium: number, hard: number) {
  await assertAdmin();
  const rounds = [easy, medium, hard];
  if (!rounds.every((value) => Number.isInteger(value) && value >= 0 && value <= 10) || rounds.reduce((sum, value) => sum + value, 0) === 0) {
    throw new Error("Round counts must be whole numbers between 0 and 10, with at least one round enabled.");
  }
  const { rowCount } = await query("UPDATE game_types SET easy_rounds = $1, medium_rounds = $2, hard_rounds = $3 WHERE id = $4", [easy, medium, hard, gameId]);
  if (rowCount !== 1) throw new Error("Game not found. Refresh and try again.");
  
  revalidatePath("/admin/games");
  revalidatePath("/daily-mission");
  revalidatePath("/play");
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const { rows } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  if (rows[0]?.role !== "admin") throw new Error("Unauthorized");
}

