export function challengeClockOrigin(
  attemptId: string | null,
  now: number,
  storage?: Pick<Storage, "getItem" | "setItem">,
) {
  if (!attemptId || !storage) return now;
  try {
    const key = `challenge-clock:${attemptId}`;
    const stored = Number(storage.getItem(key));
    const origin =
      Number.isFinite(stored) && stored > 0 && stored <= now ? stored : now;
    storage.setItem(key, String(origin));
    return origin;
  } catch {
    return now;
  }
}

/** Always derive remaining time from a deadline, never callback counts. */
export function countdownSeconds(deadline: number, now: number, precision = 1) {
  return Math.max(
    0,
    Math.ceil((deadline - now) / (1000 * precision)) * precision,
  );
}
