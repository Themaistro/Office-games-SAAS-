import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows: messages } = await query(
    `SELECT m.id::text, 'message' AS kind, m.created_at, p.full_name AS actor_name,
            p.avatar_url AS actor_avatar, 'Message from ' || p.full_name AS title,
            left(m.body, 120) AS description, (m.read_at IS NULL) AS unread
       FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
      WHERE m.recipient_id = $1 ORDER BY m.created_at DESC LIMIT 50`,
    [user.id],
  );
  const { rows: challenges } = await query(
    `SELECT e.id::text, 'challenge' AS kind, e.created_at,
            COALESCE(p.full_name, 'A coworker') AS actor_name, p.avatar_url AS actor_avatar,
            initcap(replace(e.event_type, '_', ' ')) || ' ' ||
              initcap(replace(e.game_type, '-', ' ')) AS title,
            'Game challenge activity' AS description, false AS unread
       FROM challenge_events e
       LEFT JOIN profiles p ON p.id = COALESCE(e.actor_id, e.challenger_id)
      WHERE e.challenger_id = $1 OR e.challenged_id = $1
      ORDER BY e.created_at DESC LIMIT 50`,
    [user.id],
  );
  const history = [...messages, ...challenges]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 80);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
}
