/** Browser timer throttling must not slow down an authoritative match clock. */
export function elapsedMilliseconds(previous: number, now: number) {
  return Math.max(0, now - previous);
}
export function remainingClock(
  base: number | string,
  active: boolean,
  lastMove: string | null,
  status: string,
  now = Date.now(),
) {
  const numeric = Number(base);
  const stored = Number.isFinite(numeric) ? Math.max(0, numeric) : 600000;
  const stamp = lastMove ? new Date(lastMove).getTime() : NaN;
  return status === "in_progress" && active && Number.isFinite(stamp)
    ? Math.max(0, stored - Math.max(0, now - stamp))
    : stored;
}
