"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPrize(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const iconEmoji = formData.get("icon_emoji") as string || "🏆";
  const rankRequirement = parseInt(formData.get("rank_requirement") as string);

  if (!title || !rankRequirement) {
    throw new Error("Title and Rank Requirement are required.");
  }

  // Delete any existing prize for this rank to ensure only one prize per position
  await supabase.from("prizes").delete().eq("rank_requirement", rankRequirement);

  const { error } = await supabase
    .from("prizes")
    .insert({
      title: title.trim(),
      icon_emoji: iconEmoji.trim(),
      rank_requirement: rankRequirement
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deletePrize(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("prizes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
}
