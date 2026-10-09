"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile(fullName: string, avatarUrl: string, department?: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (department !== undefined) {
    await query("UPDATE profiles SET full_name = $1, avatar_url = $2, department = $3 WHERE id = $4", [fullName, avatarUrl, department, user.id]);
  } else {
    await query("UPDATE profiles SET full_name = $1, avatar_url = $2 WHERE id = $3", [fullName, avatarUrl, user.id]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}

