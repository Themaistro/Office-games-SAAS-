/** A deterministic number for a stored challenge and a named variation. */
export function seededNumber(seed: string | undefined, salt = "", max = 1) {
  const value = `${seed || "fallback"}:${salt}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % Math.max(1, max));
}

export function seededShuffle<T>(items: T[], seed?: string, salt = "") {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = seededNumber(seed, `${salt}:${index}`, index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}
