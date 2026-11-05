export function eligibleMissionGames<T extends { id: string }>(
  games: T[],
  configuredIds?: string[] | null,
) {
  if (!configuredIds?.length) return games;
  const byId = new Map(games.map((game) => [game.id, game]));
  return [...new Set(configuredIds)]
    .map((id) => byId.get(id))
    .filter((game): game is T => Boolean(game));
}

export function isMissionLineupCompatible(
  lineupIds: string[],
  eligibleIds: string[],
  missionSize: number,
) {
  const expectedCount = Math.min(Math.max(0, missionSize), eligibleIds.length);
  if (lineupIds.length !== expectedCount) return false;
  if (new Set(lineupIds).size !== lineupIds.length) return false;
  const eligible = new Set(eligibleIds);
  return lineupIds.every((id) => eligible.has(id));
}
