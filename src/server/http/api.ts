import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { logServerFailure } from "../observability";
import { isTrustedMutation } from "./mutation-origin";

/** Transport errors are always JSON; database messages never reach players. */
export async function handleApiRequest(
  work: () => Promise<Response>,
  request?: Request,
): Promise<Response> {
  const requestId = randomUUID();
  try {
    if (request && !isTrustedMutation(request))
      return NextResponse.json(
        { error: "Untrusted request origin", requestId },
        {
          status: 403,
          headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
        },
      );
    const response = await work();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    logServerFailure("http.request", error, requestId);
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
