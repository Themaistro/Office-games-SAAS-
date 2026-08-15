import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    
    if (profile?.role === "admin") {
      // 1. Delete incomplete daily sessions
      await supabase.from("daily_sessions").delete().eq("is_completed", false).eq("user_id", user.id);
      
      // 2. Break the current streak since they forfeited
      await supabase.from("profiles").update({ current_streak: 0 }).eq("id", user.id);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  
  // Also redirect them back to the dashboard so they can start a fresh session
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
