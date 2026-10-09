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
  const rankRequirement = parseInt(formData.get("rank_requirement") as string);

  if (!title || !rankRequirement) {
    throw new Error("Title and Rank Requirement are required.");
  }

  // Delete any existing prize for this rank to ensure only one prize per position
  await query("DELETE FROM prizes WHERE rank_requirement = $1", [rankRequirement]);
  await query("INSERT INTO prizes (title, icon_emoji, rank_requirement) VALUES ($1, $2, $3)", [title.trim(), iconEmoji.trim(), rankRequirement]);

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
