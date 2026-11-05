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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
