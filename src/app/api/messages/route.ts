import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const other = new URL(request.url).searchParams.get("with");
  const before = new URL(request.url).searchParams.get("before");
  if ((other && !validId(other)) || (before && !validId(before))) return NextResponse.json({error:"Invalid conversation"},{status:400});
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
    `SELECT * FROM (SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at,
            p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM direct_messages m JOIN profiles p ON p.id = m.sender_id
      WHERE ((m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1))
        AND ($3::uuid IS NULL OR (m.created_at,m.id) < (
          SELECT cursor.created_at,cursor.id FROM direct_messages cursor WHERE cursor.id=$3
          AND ((cursor.sender_id=$1 AND cursor.recipient_id=$2) OR (cursor.sender_id=$2 AND cursor.recipient_id=$1))
        ))
      ORDER BY m.created_at DESC, m.id DESC LIMIT 100) recent ORDER BY created_at ASC, id ASC`,
    [user.id, other, before],
  );
  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const ids = payload?.messageIds;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => !validId(id))) return NextResponse.json({error:"Invalid read receipt"},{status:400});
  await query("UPDATE direct_messages SET read_at=now() WHERE recipient_id=$1 AND id=ANY($2::uuid[]) AND read_at IS NULL", [user.id,ids]);
  return NextResponse.json({success:true});
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { recipientId?: string; body?: string } | null;
  const recipientId = typeof payload?.recipientId === "string" ? payload.recipientId.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!validId(recipientId) || !body || body.length > 2000 || recipientId === user.id) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const sender = await query("SELECT id FROM profiles WHERE id=$1 AND role='employee' AND is_active=true", [user.id]);
  if (!sender.rowCount) return NextResponse.json({error:"Player messaging is unavailable"},{status:403});
  const { rows: recipient } = await query("SELECT id FROM profiles WHERE id = $1 AND role = 'employee' AND is_active = true", [recipientId]);
  if (!recipient[0]) return NextResponse.json({ error: "User is unavailable" }, { status: 404 });
  const { rows } = await query(
    "INSERT INTO direct_messages (sender_id, recipient_id, body) VALUES ($1, $2, $3) RETURNING id, sender_id, recipient_id, body, created_at, read_at",
    [user.id, recipientId, body],
  );
  return NextResponse.json(rows[0], { status: 201 });
}
