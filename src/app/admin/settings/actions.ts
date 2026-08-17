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
  const { error: e2 } = await adminClient.from("daily_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e2) throw new Error("Failed to wipe sessions: " + e2.message);

  // 3. Wipe all chess and ttt games (clears the live feed)
  const { error: e4 } = await adminClient.from("chess_games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e4) throw new Error("Failed to wipe chess games: " + e4.message);

  const { error: e5 } = await adminClient.from("ttt_games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e5) throw new Error("Failed to wipe ttt games: " + e5.message);

  const { error: e6 } = await adminClient.from("activity_feed").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e6) throw new Error("Failed to wipe activity feed: " + e6.message);

  // 4. Wipe cached questions (daily pool) to force a fresh pull for the new season
  const { error: e3 } = await adminClient.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e3) throw new Error("Failed to wipe questions: " + e3.message);

  // 4. Reset employee profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      total_xp: 0,
      current_streak: 0,
      best_streak: 0,
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

  revalidatePath("/", "layout");
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
  const { error: e1 } = await adminClient.from("season_winners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e1) throw new Error("Failed to wipe season winners: " + e1.message);

  // 2. Wipe historical sessions
  const { error: e2 } = await adminClient.from("daily_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e2) throw new Error("Failed to wipe sessions: " + e2.message);

  // 3. Wipe cached questions (daily pool)
  const { error: e3 } = await adminClient.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e3) throw new Error("Failed to wipe questions: " + e3.message);

  // 3b. Wipe all chess and ttt games (clears the live feed)
  const { error: e4 } = await adminClient.from("chess_games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e4) throw new Error("Failed to wipe chess games: " + e4.message);

  const { error: e5 } = await adminClient.from("ttt_games").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e5) throw new Error("Failed to wipe ttt games: " + e5.message);

  const { error: e6 } = await adminClient.from("activity_feed").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e6) throw new Error("Failed to wipe activity feed: " + e6.message);

  // 4. Reset employee profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      total_xp: 0,
      current_streak: 0,
      best_streak: 0,
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

  revalidatePath("/", "layout");
}

export async function bulkUpdateTimeLimits(dailyLimit: number, sessionLimit: number) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Unauthorized: Admins only");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { error } = await adminClient
    .from("profiles")
    .update({
      daily_time_limit_minutes: dailyLimit === 0 ? null : dailyLimit,
      session_time_limit_minutes: sessionLimit === 0 ? null : sessionLimit
    })
    .eq("role", "employee");

  if (error) {
    console.error("Failed to bulk update time limits:", error);
    // Give a clear message if this is a missing-column error (PGRST204 / column not found)
    if (error.message?.includes("daily_time_limit_minutes") || error.message?.includes("session_time_limit_minutes") || error.code === "PGRST204") {
      throw new Error(
        "Database columns missing! Run this SQL in Supabase:\n\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_time_limit_minutes integer;\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_time_limit_minutes integer;"
      );
    }
    throw new Error(`Failed to update time limits: ${error.message}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}
