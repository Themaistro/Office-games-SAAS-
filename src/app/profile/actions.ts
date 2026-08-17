"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(fullName: string, avatarUrl: string, department?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const payload: any = { 
    full_name: fullName,
    avatar_url: avatarUrl 
  };
  
  if (department !== undefined) {
    payload.department = department;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}
