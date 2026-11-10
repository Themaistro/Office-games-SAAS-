/** Deliberately excludes messages/stacks: driver errors may contain SQL or secrets. */
export function logServerFailure(
  operation: string,
  error: unknown,
  requestId?: string,
) {
  const candidate = error as { code?: unknown; name?: unknown } | null;
  const code =
    typeof candidate?.code === "string" &&
    /^[A-Z0-9_]{2,40}$/i.test(candidate.code)
      ? candidate.code
      : undefined;
  console.error("Server operation failed", {
    operation,
    requestId,
    code,
    kind: error instanceof Error ? error.name : "Unknown",
  });
}
