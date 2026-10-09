import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return NextResponse.json([]);
  const { rows } = await query("SELECT id, full_name, department, avatar_url, role FROM profiles WHERE role = 'employee' AND full_name ILIKE $1 ORDER BY full_name ASC LIMIT 10", [`%${term}%`]);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}
