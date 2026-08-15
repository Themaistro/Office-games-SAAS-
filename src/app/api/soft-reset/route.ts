import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    
    if (profile?.role === "admin") {
      // 1. Reset Profile Stats
      await supabase.from("profiles").update({
        total_xp: 0,
        current_streak: 0,
        best_streak: 0,
        games_played: 0,
        current_level: 1
      }).eq("id", user.id);

      // 2. Delete ALL past and present daily_sessions for this user
      // Use service role key to bypass RLS for deletion
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await adminClient.from("daily_sessions").delete().eq("user_id", user.id);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  
  // Redirect back to dashboard
  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/dashboard`);
}
