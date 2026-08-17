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

  // Create admin client to bypass RLS for the reset
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch current season settings
  const { data: settings } = await adminClient.from("system_settings").select("*").single();
  const currentSeason = settings?.current_season || 1;

  // 1. Archive Winners (Top 3 globally)
  const { data: topPlayers } = await adminClient
    .from("profiles")
    .select("id, full_name, department, total_xp")
    .eq("role", "employee")
    .order("total_xp", { ascending: false })
    .order("full_name", { ascending: true })
    .limit(3);

  if (topPlayers && topPlayers.length > 0) {
    const winnersToInsert = topPlayers.map((p, index) => ({
      season_number: currentSeason,
      user_id: p.id,
      full_name: p.full_name,
      department: p.department,
      rank: index + 1,
      total_xp: p.total_xp || 0
    }));
    await adminClient.from("season_winners").insert(winnersToInsert);
  }

  // 2. Wipe historical sessions
  await adminClient.from("daily_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 3. Wipe cached questions (daily pool) to force a fresh pull for the new season
  await adminClient.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Reset employee profiles
  const { error: profileError } = await adminClient
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

  // 5. Update season settings (increment season, reset start date)
  await adminClient.from("system_settings").update({
    current_season: currentSeason + 1,
    season_start_date: new Date().toISOString()
  }).eq("id", 1);

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}

export async function getSystemSettings() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("system_settings").select("*").single();
  return settings || { 
    current_season: 1, 
    season_start_date: new Date().toISOString(),
    cooldown_hours: 24,
    game_duration_seconds: 900
  };
}

export async function updateSystemSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized: Admins only");

  const cooldown_hours = Number(formData.get("cooldown_hours")) || 0;
  const game_duration_minutes = Number(formData.get("game_duration_minutes")) || 15;
  const game_duration_seconds = game_duration_minutes * 60;

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Check if id 1 exists
  const { data: existing } = await adminClient.from("system_settings").select("id").eq("id", 1).maybeSingle();
  
  if (existing) {
    await adminClient.from("system_settings").update({
      cooldown_hours,
      game_duration_seconds
    }).eq("id", 1);
  } else {
    await adminClient.from("system_settings").insert({
      id: 1,
      current_season: 1,
      season_start_date: new Date().toISOString(),
      cooldown_hours,
      game_duration_seconds
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
}

export async function factoryResetPlatform() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized: Admins only");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // 1. Wipe all historical season winners
  await adminClient.from("season_winners").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 2. Wipe historical sessions
  await adminClient.from("daily_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 3. Wipe cached questions (daily pool)
  await adminClient.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Reset employee profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      total_xp: 0,
      current_streak: 0,
      current_level: 1,
      games_played: 0
    })
    .eq("role", "employee");

  if (profileError) throw new Error("Failed to reset profiles.");

  // 5. Reset season settings to Season 1
  await adminClient.from("system_settings").update({
    current_season: 1,
    season_start_date: new Date().toISOString()
  }).eq("id", 1);

  revalidatePath("/admin/settings");
}

export async function bulkUpdateTimeLimits(dailyLimit: number, sessionLimit: number) {
  const adminClient = await createAdminClient();
  
  const { error } = await adminClient
    .from("profiles")
    .update({
      daily_time_limit_minutes: dailyLimit,
      session_time_limit_minutes: sessionLimit
    })
    .eq("role", "employee");

  if (error) {
    console.error("Failed to bulk update time limits:", error);
    throw new Error("Failed to update time limits.");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}
