import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from("profiles").update({
      total_xp: 0,
      current_streak: 0,
      best_streak: 0,
      games_played: 0,
      current_level: 1
    }).eq("id", user.id);
  }
  
  // Redirect back to dashboard
  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/dashboard`);
}
