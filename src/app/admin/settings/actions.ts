"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resetSeason() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Unauthorized: Admins only");
  }

  // 1. Wipe all historical sessions to clear the board
  // Since session_questions cascade deletes when daily_sessions is deleted, this is safe.
  const { error: sessionError } = await supabase
    .from("daily_sessions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Hack to delete all rows in Supabase without a specific match

  if (sessionError) {
    console.error("Failed to delete daily sessions:", sessionError);
    throw new Error("Failed to delete historical sessions.");
  }

  // 2. Reset all employee profiles
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      total_xp: 0,
      current_streak: 0,
      current_level: 1,
      games_played: 0
    })
    .eq("role", "employee");

  if (profileError) {
    console.error("Failed to reset profiles:", profileError);
    throw new Error("Failed to reset profiles.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings");
}
