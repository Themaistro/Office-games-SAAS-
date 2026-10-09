import { query } from "@/lib/db";

export async function assertNoActiveMultiplayerGame(userId: string, excludeGameId?: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM (
      SELECT id FROM chess_games WHERE status = 'in_progress' AND (white_player_id = $1 OR black_player_id = $1)
      UNION ALL SELECT id FROM ttt_games WHERE status = 'in_progress' AND (x_player_id = $1 OR o_player_id = $1)
      UNION ALL SELECT id FROM connect_four_games WHERE status = 'in_progress' AND (red_player_id = $1 OR yellow_player_id = $1)
    ) active_games WHERE ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1`,
    [userId, excludeGameId ?? null],
  );
  if (rows[0]) throw new Error("You are already playing another game. Finish or resign it before joining a new match.");
}
