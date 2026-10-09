import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete only this administrator's incomplete session and break their streak.
  try {
    await query("DELETE FROM daily_sessions WHERE is_completed = false AND user_id = $1", [user.id]);
    await query("UPDATE profiles SET current_streak = 0 WHERE id = $1", [user.id]);
  } catch {
    return NextResponse.json({ error: "Unable to reset session" }, { status: 500 });
  }
  
  // Also redirect them back to the dashboard so they can start a fresh session
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}

export async function GET() {
  return NextResponse.json({ error: "Use POST for session reset" }, { status: 405 });
}

