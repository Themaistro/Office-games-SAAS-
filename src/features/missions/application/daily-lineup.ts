import { buildDailyLineup, type MissionGame } from "../domain/rotation";

export interface LineupRepository {
  find(userId: string, date: string): Promise<string[] | null>;
  history(userId: string, date: string): Promise<string[][]>;
  save(
    userId: string,
    date: string,
    gameIds: string[],
    seed: number,
  ): Promise<void>;
}

/** Caller serializes mission creation per player; existing sessions retain their route. */
export function createDailyLineupService(repository: LineupRepository) {
  return async (
    date: string,
    games: MissionGame[],
    count: number,
    userId: string,
  ) => {
    if (!Number.isInteger(count) || count < 1 || count > games.length) {
      throw new Error(
        "Mission size must be between one and the number of active games.",
      );
    }
    if (new Set(games.map((game) => game.id)).size !== games.length) {
      throw new Error("The active game catalog contains duplicate games.");
    }
    const saved = await repository.find(userId, date);
    const byId = new Map(games.map((game) => [game.id, game]));
    if (
      saved?.length === count &&
      new Set(saved).size === count &&
      saved.every((id) => byId.has(id))
    ) {
      return saved.map((id) => byId.get(id)!);
    }
    const history = await repository.history(userId, date);
    const lineup = buildDailyLineup(`${date}:${userId}`, games, count, history);
    await repository.save(
      userId,
      date,
      lineup.games.map((game) => game.id),
      lineup.seed,
    );
    return lineup.games;
  };
}
