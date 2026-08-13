import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from("daily_sessions").delete().eq("is_completed", false).eq("user_id", user.id);
  }
  
  // Also redirect them back to the dashboard so they can start a fresh session
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
