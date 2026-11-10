/** Cookie-authenticated API writes are browser-only and must prove same origin. */
export function isTrustedMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  const source =
    request.headers.get("origin") || request.headers.get("referer");
  if (!source) return site === "same-origin";
  try {
    // Next may normalize a loopback URL to localhost. Host is the browser's
    // actual target authority; forwarded host headers are intentionally ignored.
    const target = new URL(request.url);
    const host = request.headers.get("host");
    if (host) {
      if (!/^(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::[0-9]{1,5})?$/i.test(host))
        return false;
      target.host = host;
    }
    return new URL(source).origin === target.origin;
  } catch {
    return false;
  }
}
