"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addPrize(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const iconEmoji = formData.get("icon_emoji") as string || "🏆";
  const rankRequirement = Number(formData.get("rank_requirement"));

  if (!title?.trim() || !Number.isInteger(rankRequirement) || rankRequirement < 1 || rankRequirement > 100) {
    throw new Error("Title and Rank Requirement are required.");
  }
  if (title.trim().length > 120) throw new Error("Prize title must be 120 characters or fewer.");
  if (!/\p{Extended_Pictographic}/u.test(iconEmoji.trim()) || iconEmoji.trim().length > 16) throw new Error("Choose one emoji icon for the prize.");

  await query("INSERT INTO prizes (title, icon_emoji, rank_requirement) VALUES ($1, $2, $3) ON CONFLICT (rank_requirement) DO UPDATE SET title = EXCLUDED.title, icon_emoji = EXCLUDED.icon_emoji", [title.trim(), iconEmoji.trim(), rankRequirement]);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
}

export async function deletePrize(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  await query("DELETE FROM prizes WHERE id = $1", [id]);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
}

