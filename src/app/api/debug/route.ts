import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: s } = await supabase.from('daily_sessions').select('*');
  const { data: q } = await supabase.from('questions').select('id, created_at, game_type_id');
  const { data: sq } = await supabase.from('session_questions').select('*');

  return NextResponse.json({ sessions: s, questions: q?.length, session_questions: sq?.length });
}
