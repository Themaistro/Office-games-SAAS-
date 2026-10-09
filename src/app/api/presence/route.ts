import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query("SELECT p.id AS user_id, p.full_name, p.avatar_url, p.department, pr.last_seen AS online_at FROM presence pr JOIN profiles p ON p.id=pr.user_id WHERE pr.last_seen > now() - interval '90 seconds' AND pr.user_id <> $1 AND p.role='employee' ORDER BY pr.last_seen DESC", [user.id]);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await query("INSERT INTO presence (user_id,last_seen) VALUES ($1,now()) ON CONFLICT (user_id) DO UPDATE SET last_seen=now()", [user.id]);
  return NextResponse.json({ ok: true });
}
