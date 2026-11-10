import { sessionIdentity } from "@/features/identity/composition";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const token = request.cookies.get("office_games_session")?.value;
    let destination: string | null = null;
    if (!token) destination = "/login";
    else {
      try {
        const identity = await sessionIdentity(token);
        if (!identity) destination = "/login";
        else if (identity.role !== "admin") destination = "/dashboard";
      } catch {
        return NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    if (destination) {
      const target = request.nextUrl.clone();
      target.pathname = destination;
      target.search = "";
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Other pages and API handlers enforce their own permissions. Do not add
    // a proxy invocation to every poll, public page and process-liveness probe.
    "/admin/:path*",
  ],
};
