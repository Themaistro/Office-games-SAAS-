import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { rows: profiles } = await query<{ role: string }>("SELECT role FROM profiles WHERE id = $1", [user.id]);
  const profile = profiles[0];

  if (profile?.role === "admin") {
      // 1. Reset Profile Stats
      await withTransaction(async (client) => {
        await client.query(`UPDATE profiles SET total_xp = 0, current_streak = 0,
          best_streak = 0, games_played = 0, current_level = 1 WHERE id = $1`, [user.id]);
        await client.query("DELETE FROM daily_sessions WHERE user_id = $1", [user.id]);
      });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  // Redirect back to dashboard
  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/dashboard`);
}

export async function GET() {
  return NextResponse.json({ error: "Use POST for soft reset" }, { status: 405 });
}

