import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/** Transport errors are always JSON; database messages never reach players. */
export async function handleApiRequest(
  work: () => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();
  try {
    const response = await work();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    console.error("API request failed", {
      requestId,
      kind: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      {
        error: "We couldn't complete that request. Please try again.",
        requestId,
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
      },
    );
  }
}
