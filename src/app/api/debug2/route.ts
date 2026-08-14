import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: sessions, error: sErr } = await supabase
    .from('daily_sessions')
    .select('id, user_id, date, is_completed, session_questions(id, order_index, is_completed)')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (sErr) return NextResponse.json({ error: sErr.message });
  return NextResponse.json(sessions);
}
