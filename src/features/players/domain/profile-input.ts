export function parseProfileInput(
  name: unknown,
  avatar: unknown,
  department?: unknown,
) {
  if (
    typeof name !== "string" ||
    typeof avatar !== "string" ||
    name.length > 100 ||
    avatar.length > 2048 ||
    (department !== undefined &&
      (typeof department !== "string" || department.length > 150))
  )
    return null;
  const fullName = name.trim(),
    avatarUrl = avatar.trim();
  if (fullName.length < 2 || fullName.length > 50) return null;
  if (avatarUrl) {
    if (
      avatarUrl.startsWith("/") &&
      !avatarUrl.startsWith("//") &&
      !avatarUrl.includes("\\")
    ) {
      // Same-origin uploaded/static images.
    } else {
      try {
        const url = new URL(avatarUrl);
        if (url.protocol !== "https:" || url.username || url.password)
          return null;
      } catch {
        return null;
      }
    }
  }
  return {
    fullName,
    avatarUrl,
    department: typeof department === "string" ? department.trim() : undefined,
  };
}
