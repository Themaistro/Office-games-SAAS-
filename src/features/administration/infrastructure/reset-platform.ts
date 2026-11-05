import "server-only";
import type { SqlExecutor } from "../../../server/database/executor";

export async function deleteGameplayData(executor: SqlExecutor) {
  // Keep users, company identity, departments, content banks and configuration.
  // Delete children before parents; the transaction is owned by the caller.
  for (const table of [
    "lounge_rooms",
    "match_results",
    "season_snapshots",
    "season_winners",
    "chess_events",
    "challenge_events",
    "game_spectators",
    "direct_messages",
    "question_history",
    "daily_sessions",
    "user_daily_mission_lineups",
    "daily_mission_lineups",
    "questions",
    "chess_games",
    "ttt_games",
    "connect_four_games",
    "activity_feed",
  ]) {
    await executor.query(`DELETE FROM ${table}`);
  }
}
