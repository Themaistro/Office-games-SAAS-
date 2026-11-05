import { NextResponse } from "next/server";

// No OAuth provider/token exchange is configured. A query-string code is not
// authentication, and forwarded-host/next headers must not choose a destination.
export async function GET(request: Request) {
  return NextResponse.redirect(
    new URL(
      "/login?error=Single%20sign-on%20is%20not%20configured.%20Please%20use%20your%20email%20and%20password.",
      request.url,
    ),
  );
}
