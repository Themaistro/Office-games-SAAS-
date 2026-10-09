import { query } from "@/lib/db";
import { toggleGameStatus, updateGameRounds } from "../actions";
import { Shield } from "lucide-react";
import GamesClient from "./GamesClient";

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
  const { rows: games } = await query("SELECT * FROM game_types ORDER BY name");
  
  // 2. Fetch question counts
  const { rows: questionCounts } = await query<{ game_type_id: string }>("SELECT game_type_id FROM questions");

  // Calculate counts per game
  const countsMap: Record<string, number> = {};
  if (questionCounts) {
    for (const q of questionCounts) {
      countsMap[q.game_type_id] = (countsMap[q.game_type_id] || 0) + 1;
    }
  }

  // 3. Group games
  const groupedGames = (games || []).reduce((acc, game) => {
    const cat = getCategory(game.slug);
    if (!acc[cat]) acc[cat] = [];
    
    // Attach question count
    acc[cat].push({
      ...game,
      questionCount: countsMap[game.id] || 0
    });
    
    return acc;
  }, {} as Record<string, any[]>);

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
            Toggle which mini-games are available in the daily sprints and configure difficulty rounds.
          </p>
        </div>
        <Shield className="text-primary w-12 h-12 opacity-50" />
      </div>

      <GamesClient 
        initialGroupedGames={groupedGames} 
        toggleAction={handleToggle}
        updateRoundsAction={handleUpdateRounds} 
      />
    </div>
  );
}
