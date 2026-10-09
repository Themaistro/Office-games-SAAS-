import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { rows } = await query("SELECT games_played FROM profiles WHERE id=$1", [user.id]); return NextResponse.json(rows[0] ?? null); }

