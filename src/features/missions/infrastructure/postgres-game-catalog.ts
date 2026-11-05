import "server-only";
import { query } from "../../../server/database/connection";
import type {
  GameCatalogRepository,
  GameRecord,
} from "../application/game-management";

export const postgresGameCatalog: GameCatalogRepository = {
  async load() {
    // 1. Fetch all games
    const { rows: games } = await query<GameRecord>(
      "SELECT * FROM game_types ORDER BY name",
    );

    // 2. Fetch question counts
    const { rows: questionCounts } = await query<{
      game_type_id: string;
      difficulty: "easy" | "medium" | "hard";
      count: number;
    }>(
      "SELECT game_type_id, difficulty, count(*)::int AS count FROM questions WHERE is_active = true GROUP BY game_type_id, difficulty",
    );
    const [
      { rows: companyTriviaRows },
      { rows: masterTriviaRows },
      { rows: codingTriviaRows },
      { rows: masterWordRows },
      { rows: masterTypingRows },
      { rows: masterOddRows },
    ] = await Promise.all([
      // Company Trivia predates per-question difficulty and is treated as medium
      // by the mission engine, so count it once and map it to that bucket here.
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM company_trivia WHERE is_active = true AND game_slug IN ('trivia', 'general-trivia', 'company_trivia')",
      ),
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM master_trivia_bank WHERE department NOT IN ('IT', 'Engineering', 'Product')",
      ),
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM master_trivia_bank WHERE department IN ('IT', 'Engineering', 'Product')",
      ),
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM master_word_bank",
      ),
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM master_typing_bank",
      ),
      query<{ count: number }>(
        "SELECT count(*)::int AS count FROM master_odd_object_bank",
      ),
    ]);
    const companyTriviaCount = companyTriviaRows[0]?.count ?? 0;
    const masterCounts: Record<string, number> = {
      trivia: masterTriviaRows[0]?.count ?? 0,
      coding: codingTriviaRows[0]?.count ?? 0,
      word: masterWordRows[0]?.count ?? 0,
      unscramble: masterWordRows[0]?.count ?? 0,
      typing: masterTypingRows[0]?.count ?? 0,
      odd_object: masterOddRows[0]?.count ?? 0,
    };

    const { rows: settingsRows } = await query<{ daily_game_count: number }>(
      "SELECT daily_game_count FROM system_settings WHERE id = 1",
    );
    const { rows: masterDifficultyRows } = await query<{
      slug: string;
      difficulty: string;
      count: number;
    }>(`
      SELECT 'trivia' AS slug, difficulty, count(*)::int AS count FROM master_trivia_bank WHERE department NOT IN ('IT', 'Engineering', 'Product') GROUP BY difficulty
      UNION ALL SELECT 'coding', difficulty, count(*)::int FROM master_trivia_bank WHERE department IN ('IT', 'Engineering', 'Product') GROUP BY difficulty
      UNION ALL SELECT 'word', difficulty, count(*)::int FROM master_word_bank GROUP BY difficulty
      UNION ALL SELECT 'unscramble', difficulty, count(*)::int FROM master_word_bank GROUP BY difficulty
      UNION ALL SELECT 'typing', difficulty, count(*)::int FROM master_typing_bank GROUP BY difficulty
      UNION ALL SELECT 'odd_object', difficulty, count(*)::int FROM master_odd_object_bank GROUP BY difficulty
    `);

    return {
      games,
      questionCounts,
      companyTriviaCount,
      masterCounts,
      masterDifficultyRows,
      dailyGameCount: settingsRows[0]?.daily_game_count ?? 5,
    };
  },
};
