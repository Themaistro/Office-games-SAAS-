import { getGameDefinition, getGamePath } from "./game-registry";
export function acceptedSentInvitation(
  rows: unknown,
  tracked: ReadonlySet<string>,
) {
  if (!Array.isArray(rows)) return null;
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.type !== "string" ||
      row.status !== "in_progress" ||
      !tracked.has(row.id)
    )
      continue;
    const game = getGameDefinition(row.type);
    if (game)
      return {
        id: row.id,
        type: game.type,
        path: getGamePath(game.type, row.id),
      };
  }
  return null;
}
