import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const other = new URL(request.url).searchParams.get("with");
  if (!other) {
    const { rows } = await query(
      `SELECT m.sender_id, p.full_name, p.avatar_url, count(*)::int AS unread_count,
              max(m.created_at) AS latest_at
         FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
        WHERE m.recipient_id = $1 AND m.read_at IS NULL
        GROUP BY m.sender_id, p.full_name, p.avatar_url ORDER BY latest_at DESC`,
      [user.id],
    );
    return NextResponse.json({ unreadCount: rows.reduce((total, row) => total + row.unread_count, 0), messages: rows }, { headers: { "Cache-Control": "no-store" } });
  }
  const { rows } = await query(
    `SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at,
            p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
      WHERE (m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at ASC LIMIT 100`,
    [user.id, other],
  );
  await query("UPDATE direct_messages SET read_at = now() WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL", [user.id, other]);
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { recipientId?: string; body?: string } | null;
  const recipientId = payload?.recipientId?.trim();
  const body = payload?.body?.trim();
  if (!recipientId || !body || body.length > 2000 || recipientId === user.id) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const { rows: recipient } = await query("SELECT id FROM profiles WHERE id = $1 AND role = 'employee' AND is_active = true", [recipientId]);
  if (!recipient[0]) return NextResponse.json({ error: "User is unavailable" }, { status: 404 });
  const { rows } = await query(
    "INSERT INTO direct_messages (sender_id, recipient_id, body) VALUES ($1, $2, $3) RETURNING id, sender_id, recipient_id, body, created_at, read_at",
    [user.id, recipientId, body],
  );
  return NextResponse.json(rows[0], { status: 201 });
}
