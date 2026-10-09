import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query("SELECT a.id, a.user_id, a.activity_type AS type, COALESCE(a.metadata->>'description', '') AS description, a.created_at, a.metadata, jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url) AS profiles FROM activity_feed a LEFT JOIN profiles p ON p.id = a.user_id ORDER BY a.created_at DESC LIMIT 20");
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

