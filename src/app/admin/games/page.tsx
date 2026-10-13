import { query } from "@/lib/db";
import { toggleGameStatus, updateGameRounds } from "../actions";
import { Shield } from "lucide-react";
import GamesClient from "./GamesClient";

type GameRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  easy_rounds: number;
  medium_rounds: number;
  hard_rounds: number;
};

export const dynamic = "force-dynamic";

const GAME_CATEGORIES: Record<string, string[]> = {
  "Logic & Problem Solving": ["logic", "sudoku_lite", "odd_object", "sudoku-lite", "odd-object"],
  "Memory & Reflexes": ["memory", "sequence", "card_match", "card-match", "reaction", "stroop"],
  "Knowledge & Language": ["trivia", "company_trivia", "unscramble", "word-unscramble", "typing", "typing-challenge", "word", "coding"],
  "Mathematics": ["mental_math", "mental-math", "math"]
};

const getCategory = (slug: string) => {
  for (const [category, slugs] of Object.entries(GAME_CATEGORIES)) {
    if (slugs.includes(slug)) return category;
  }
  return "Other Games";
};

export default async function AdminGamesPage() {
  // 1. Fetch all games
  const { rows: games } = await query<GameRecord>("SELECT * FROM game_types ORDER BY name");
  
  // 2. Fetch question counts
  const { rows: questionCounts } = await query<{ game_type_id: string; difficulty: "easy" | "medium" | "hard" }>("SELECT game_type_id, difficulty FROM questions WHERE is_active = true");
  const [
    { rows: companyTriviaCountRows },
    { rows: masterTriviaRows },
    { rows: codingTriviaRows },
    { rows: masterWordRows },
    { rows: masterTypingRows },
    { rows: masterOddRows },
  ] = await Promise.all([
    query<{ count: number }>("SELECT count(*)::int AS count FROM company_trivia WHERE is_active = true AND game_slug IN ('trivia', 'general-trivia', 'company_trivia')"),
    query<{ count: number }>("SELECT count(*)::int AS count FROM master_trivia_bank WHERE department NOT IN ('IT', 'Engineering', 'Product')"),
    query<{ count: number }>("SELECT count(*)::int AS count FROM master_trivia_bank WHERE department IN ('IT', 'Engineering', 'Product')"),
    query<{ count: number }>("SELECT count(*)::int AS count FROM master_word_bank"),
    query<{ count: number }>("SELECT count(*)::int AS count FROM master_typing_bank"),
    query<{ count: number }>("SELECT count(*)::int AS count FROM master_odd_object_bank"),
  ]);
  const companyTriviaCount = companyTriviaCountRows[0]?.count ?? 0;
  const masterCounts: Record<string, number> = {
    trivia: masterTriviaRows[0]?.count ?? 0,
    coding: codingTriviaRows[0]?.count ?? 0,
    word: masterWordRows[0]?.count ?? 0,
    unscramble: masterWordRows[0]?.count ?? 0,
    typing: masterTypingRows[0]?.count ?? 0,
    odd_object: masterOddRows[0]?.count ?? 0,
  };

  const { rows: settingsRows } = await query<{ daily_game_count: number }>("SELECT daily_game_count FROM system_settings WHERE id = 1");
  const { rows: todaysLineupRows } = await query<{ game_ids: string[] }>("SELECT game_ids FROM daily_mission_lineups WHERE mission_date = CURRENT_DATE");
  const { rows: masterDifficultyRows } = await query<{ slug: string; difficulty: string; count: number }>(`
    SELECT 'trivia' AS slug, difficulty, count(*)::int AS count FROM master_trivia_bank WHERE department NOT IN ('IT', 'Engineering', 'Product') GROUP BY difficulty
    UNION ALL SELECT 'coding', difficulty, count(*)::int FROM master_trivia_bank WHERE department IN ('IT', 'Engineering', 'Product') GROUP BY difficulty
    UNION ALL SELECT 'word', difficulty, count(*)::int FROM master_word_bank GROUP BY difficulty
    UNION ALL SELECT 'unscramble', difficulty, count(*)::int FROM master_word_bank GROUP BY difficulty
    UNION ALL SELECT 'typing', difficulty, count(*)::int FROM master_typing_bank GROUP BY difficulty
    UNION ALL SELECT 'odd_object', difficulty, count(*)::int FROM master_odd_object_bank GROUP BY difficulty
  `);

  // Calculate counts per game
  const countsMap: Record<string, number> = {};
  const questionDifficultyMap: Record<string, Record<string, number>> = {};
  if (questionCounts) {
    for (const q of questionCounts) {
      countsMap[q.game_type_id] = (countsMap[q.game_type_id] || 0) + 1;
      questionDifficultyMap[q.game_type_id] ??= { easy: 0, medium: 0, hard: 0 };
      questionDifficultyMap[q.game_type_id][q.difficulty] = (questionDifficultyMap[q.game_type_id][q.difficulty] || 0) + 1;
    }
  }

  const masterDifficultyCounts: Record<string, Record<string, number>> = {};
  for (const row of masterDifficultyRows) {
    masterDifficultyCounts[row.slug] ??= { easy: 0, medium: 0, hard: 0 };
    masterDifficultyCounts[row.slug][row.difficulty] = row.count;
  }

  // 3. Group games
  const groupedGames = (games || []).reduce((acc, game) => {
    const cat = getCategory(game.slug);
    if (!acc[cat]) acc[cat] = [];
    
    // Attach question count
    const sourceByDifficulty = { ...(questionDifficultyMap[game.id] || { easy: 0, medium: 0, hard: 0 }) };
    const masterByDifficulty = masterDifficultyCounts[game.slug];
    if (masterByDifficulty) {
      for (const difficulty of ["easy", "medium", "hard"]) {
        sourceByDifficulty[difficulty] = (sourceByDifficulty[difficulty] || 0) + masterByDifficulty[difficulty];
      }
    }
    acc[cat].push({
      ...game,
      questionCount: (countsMap[game.id] || 0) + (masterCounts[game.slug] || 0) + (game.slug === "trivia" ? companyTriviaCount : 0),
      sourceByDifficulty,
    });
    
    return acc;
  }, {} as Record<string, any[]>);

  const allGames = (games || []).map((game) => ({
    ...game,
    questionCount: (countsMap[game.id] || 0) + (masterCounts[game.slug] || 0) + (game.slug === "trivia" ? companyTriviaCount : 0),
    sourceByDifficulty: ["easy", "medium", "hard"].reduce((counts, difficulty) => ({
      ...counts,
      [difficulty]: (questionDifficultyMap[game.id]?.[difficulty] || 0) + (masterDifficultyCounts[game.slug]?.[difficulty] || 0),
    }), {} as Record<string, number>),
  }));
  const activeGames = allGames.filter((game) => game.is_active);
  const todaysGameIds = todaysLineupRows[0]?.game_ids || [];
  const todaysGames = todaysGameIds.length > 0
    ? todaysGameIds.map((id) => activeGames.find((game) => game.id === id)).filter((game): game is typeof activeGames[number] => Boolean(game))
    : [];

  // Wrapper for server action
  const handleToggle = async (gameId: string, currentStatus: boolean) => {
    "use server";
    await toggleGameStatus(gameId, currentStatus);
  };

  const handleUpdateRounds = async (gameId: string, easy: number, medium: number, hard: number) => {
    "use server";
    await updateGameRounds(gameId, easy, medium, hard);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games Management</h1>
          <p className="text-muted-foreground mt-1">
            Choose which games can enter the Daily Mission rotation and set their Easy, Medium, and Hard round mix.
          </p>
        </div>
        <Shield className="text-primary w-12 h-12 opacity-50" />
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-5 py-4 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">How this works: </span>
        Availability controls the rotating daily route here. Round counts apply only when that game is selected. Set the number of games in a mission in <span className="font-semibold text-foreground">Settings</span>; add company-specific prompts in <span className="font-semibold text-foreground">Custom Questions</span>.
      </div>

      <GamesClient 
        initialGroupedGames={groupedGames} 
        toggleAction={handleToggle}
        updateRoundsAction={handleUpdateRounds} 
        missionPreview={{
          dailyGameCount: settingsRows[0]?.daily_game_count ?? 5,
          activeGameCount: activeGames.length,
          todaysGames,
          companyTriviaAvailable: companyTriviaCount > 0,
          allActiveGames: activeGames,
        }}
      />
    </div>
  );
}

