import { apiMessagesRouteQueries } from "@/features/social/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { handleApiRequest } from "@/server/http/api";
import { NextResponse } from "next/server";

const {
  selectDirectMessagesForGET,
  selectDirectMessagesForGET2,
  updateDirectMessagesForPATCH,
  selectProfilesForPOST,
  selectProfilesForPOST2,
  insertDirectMessagesForPOST,
} = apiMessagesRouteQueries;

const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const other = new URL(request.url).searchParams.get("with");
    const before = new URL(request.url).searchParams.get("before");
    if ((other && !validId(other)) || (before && !validId(before)))
      return NextResponse.json(
        { error: "Invalid conversation" },
        { status: 400 },
      );
    if (!other) {
      const { rows } = await selectDirectMessagesForGET([user.id]);
      return NextResponse.json(
        {
          unreadCount: rows.reduce((total, row) => total + row.unread_count, 0),
          messages: rows,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { rows } = await selectDirectMessagesForGET2([
      user.id,
      other,
      before,
    ]);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await request.json().catch(() => null);
    const ids = payload?.messageIds;
    if (
      !Array.isArray(ids) ||
      ids.length > 100 ||
      ids.some((id) => !validId(id))
    )
      return NextResponse.json(
        { error: "Invalid read receipt" },
        { status: 400 },
      );
    await updateDirectMessagesForPATCH([user.id, ids]);
    return NextResponse.json({ success: true });
  });
}

export async function POST(request: Request) {
  return handleApiRequest(async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = (await request.json().catch(() => null)) as {
      recipientId?: string;
      body?: string;
    } | null;
    const recipientId =
      typeof payload?.recipientId === "string"
        ? payload.recipientId.trim()
        : "";
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (
      !validId(recipientId) ||
      !body ||
      body.length > 2000 ||
      recipientId === user.id
    ) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    const sender = await selectProfilesForPOST([user.id]);
    if (!sender.rowCount)
      return NextResponse.json(
        { error: "Player messaging is unavailable" },
        { status: 403 },
      );
    const { rows: recipient } = await selectProfilesForPOST2([recipientId]);
    if (!recipient[0])
      return NextResponse.json(
        { error: "User is unavailable" },
        { status: 404 },
      );
    const { rows } = await insertDirectMessagesForPOST([
      user.id,
      recipientId,
      body,
    ]);
    return NextResponse.json(rows[0], { status: 201 });
  });
}
