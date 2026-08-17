import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // First delete session_questions to satisfy foreign key
  const { error: sqErr } = await supabase.from('session_questions').delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  // Then delete daily_sessions
  const { error: dsErr } = await supabase.from('daily_sessions').delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Then delete questions
  const { error: qErr } = await supabase.from('questions').delete().neq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({ sqErr, dsErr, qErr });
}
