"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleGameStatus(gameId: string, currentStatus: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  // Verify admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase
    .from("game_types")
    .update({ is_active: !currentStatus })
    .eq("id", gameId);

  if (error) throw error;
  
  revalidatePath("/admin/games");
  revalidatePath("/admin");
}
