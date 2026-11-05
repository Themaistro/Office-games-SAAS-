import { NATIVE_GENERATOR_SLUGS } from "../../content/domain/capabilities";

export type GameRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  easy_rounds: number;
  medium_rounds: number;
  hard_rounds: number;
};

export type ManagedGame = GameRecord & {
  questionCount: number;
  sourceByDifficulty: Record<string, number>;
  generated: boolean;
};
type SourceCount = { game_type_id: string; difficulty: string; count: number };
export interface GameCatalogSnapshot {
  games: GameRecord[];
  questionCounts: SourceCount[];
  companyTriviaCount: number;
  masterCounts: Record<string, number>;
  masterDifficultyRows: { slug: string; difficulty: string; count: number }[];
  dailyGameCount: number;
}
export interface GameCatalogRepository {
  load(): Promise<GameCatalogSnapshot>;
}

const GAME_CATEGORIES: Record<string, string[]> = {
  "Logic & Problem Solving": [
    "logic",
    "sudoku_lite",
    "odd_object",
    "sudoku-lite",
    "odd-object",
  ],
  "Memory & Reflexes": [
    "memory",
    "sequence",
    "card_match",
    "card-match",
    "reaction",
    "stroop",
  ],
  "Knowledge & Language": [
    "trivia",
    "company_trivia",
    "unscramble",
    "word-unscramble",
    "typing",
    "typing-challenge",
    "word",
    "coding",
  ],
  Mathematics: ["mental_math", "mental-math", "math"],
};

const getCategory = (slug: string) => {
  for (const [category, slugs] of Object.entries(GAME_CATEGORIES)) {
    if (slugs.includes(slug)) return category;
  }
  return "Other Games";
};

export function createGameManagementReader(repository: GameCatalogRepository) {
  return async () => {
    const {
      games,
      questionCounts,
      companyTriviaCount,
      masterCounts,
      masterDifficultyRows,
      dailyGameCount,
    } = await repository.load();
    const questionTotals: Record<string, number> = {};
    const difficulties: Record<string, Record<string, number>> = {};
    for (const row of questionCounts) {
      questionTotals[row.game_type_id] =
        (questionTotals[row.game_type_id] ?? 0) + row.count;
      (difficulties[row.game_type_id] ??= {})[row.difficulty] =
        (difficulties[row.game_type_id][row.difficulty] ?? 0) + row.count;
    }
    const masterDifficulties: Record<string, Record<string, number>> = {};
    for (const row of masterDifficultyRows)
      (masterDifficulties[row.slug] ??= {})[row.difficulty] = row.count;
    const allGames: ManagedGame[] = games.map((game) => ({
      ...game,
      generated: NATIVE_GENERATOR_SLUGS.has(game.slug),
      questionCount:
        (questionTotals[game.id] ?? 0) +
        (masterCounts[game.slug] ?? 0) +
        (game.slug === "trivia" ? companyTriviaCount : 0),
      sourceByDifficulty: Object.fromEntries(
        ["easy", "medium", "hard"].map((difficulty) => [
          difficulty,
          (difficulties[game.id]?.[difficulty] ?? 0) +
            (masterDifficulties[game.slug]?.[difficulty] ?? 0) +
            (game.slug === "trivia" && difficulty === "medium"
              ? companyTriviaCount
              : 0),
        ]),
      ),
    }));
    const groupedGames: Record<string, ManagedGame[]> = {};
    for (const game of allGames)
      (groupedGames[getCategory(game.slug)] ??= []).push(game);
    return {
      groupedGames,
      activeGames: allGames.filter((game) => game.is_active),
      dailyGameCount,
    };
  };
}
