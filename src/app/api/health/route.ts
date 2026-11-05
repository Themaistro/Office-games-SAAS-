import { handleApiRequest } from "@/server/http/api";
import { checkReadiness } from "@/server/readiness";
import { NextResponse } from "next/server";

export async function GET() {
  return handleApiRequest(async () => {
    const result = await checkReadiness();
    return NextResponse.json(
      { status: result.ready ? "ready" : "unavailable" },
      { status: result.ready ? 200 : 503 },
    );
  });
}
