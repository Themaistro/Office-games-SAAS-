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

export async function wipePlayerSession(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Delete ALL of today's sessions for this user (both completed and incomplete).
  // This is the only way to fully reset the cooldown — if we only delete the
  // most recent session, an older completed session from earlier today would
  // still trigger the cooldown on the dashboard.
  const today = new Date().toISOString().split('T')[0];
  const { error } = await adminClient
    .from("daily_sessions")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`);

  if (error) {
    console.error("Error wiping session:", error);
    throw new Error(error.message);
  }

  // Revalidate both admin and the player's dashboard so GlobalRealtimeSync
  // picks up the change and refreshes their browser automatically.
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function grantExtraTime(userId: string, extraSeconds: number = 300) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  // Get the most recent session
  const { data: latestSession } = await supabase
    .from("daily_sessions")
    .select("id, allowed_duration_seconds")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestSession) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const newDuration = (latestSession.allowed_duration_seconds || 900) + extraSeconds;
    const { error } = await adminClient.from("daily_sessions").update({ allowed_duration_seconds: newDuration }).eq("id", latestSession.id);
    if (error) {
      console.error("Error granting time:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function setPlayerTimeLimits(
  userId: string,
  dailyLimitMinutes: number | null,
  sessionLimitMinutes: number | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") throw new Error("Unauthorized: Admins only");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("profiles")
    .update({
      daily_time_limit_minutes: dailyLimitMinutes,
      session_time_limit_minutes: sessionLimitMinutes,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to set player time limits:", error);
    if (error.message?.includes("daily_time_limit_minutes") || error.message?.includes("session_time_limit_minutes")) {
      throw new Error(
        "DB columns missing. Run in Supabase SQL editor:\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_time_limit_minutes integer;\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_time_limit_minutes integer;"
      );
    }
    throw new Error(`Failed to update: ${error.message}`);
  }

  revalidatePath("/admin/users");
  return { success: true };
}
