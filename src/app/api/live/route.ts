import { NextResponse } from "next/server";

/** Process liveness only: frequent probes must not keep a sleeping database awake. */
export function GET() {
  return NextResponse.json(
    { status: "alive" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
