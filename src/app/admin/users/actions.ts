"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resetUserStreak(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("profiles").update({ current_streak: 0 }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function updateUserDepartment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const userId = formData.get("userId") as string;
  const department = formData.get("department") as string;

  if (userId && department !== null) {
    const { error } = await supabase.from("profiles").update({ department }).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}
