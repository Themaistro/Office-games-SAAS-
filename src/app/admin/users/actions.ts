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
  if (error) {
    console.error("Error resetting streak:", error);
    throw new Error(error.message);
  }

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
    if (error) {
      console.error("Error updating department:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/admin/users");
}

export async function toggleUserStatus(userId: string, deactivate: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("profiles").update({ is_active: !deactivate }).eq("id", userId);
  if (error) {
    console.error("Error toggling user status:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkResetStreaks(userIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("profiles").update({ current_streak: 0 }).in("id", userIds);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function bulkDeactivate(userIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase.from("profiles").update({ is_active: false }).in("id", userIds);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function getPlayerDetails(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("daily_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }).limit(5)
  ]);
  return { profile, sessions };
}
