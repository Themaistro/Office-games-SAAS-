"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleGameStatus(gameId: string, currentStatus: boolean) {
  await assertAdmin();
  await query("UPDATE game_types SET is_active = $1 WHERE id = $2", [!currentStatus, gameId]);
  
  revalidatePath("/admin/games");
  revalidatePath("/admin");
}

export async function updateGameRounds(gameId: string, easy: number, medium: number, hard: number) {
  await assertAdmin();
  const rounds = [easy, medium, hard];
  if (!rounds.every((value) => Number.isInteger(value) && value >= 0 && value <= 100)) {
    throw new Error("Round counts must be whole numbers between 0 and 100");
  }
  await query("UPDATE game_types SET easy_rounds = $1, medium_rounds = $2, hard_rounds = $3 WHERE id = $4", [easy, medium, hard, gameId]);
  
  revalidatePath("/admin/games");
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const { rows } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  if (rows[0]?.role !== "admin") throw new Error("Unauthorized");
}

