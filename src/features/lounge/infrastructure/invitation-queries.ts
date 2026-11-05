import { cancelWaitingMatch } from "./postgres-match-service";
import "server-only";
import { query } from "../../../server/database/connection";
import { getGameDefinition } from "../domain/game-registry";

export function sentInvitations(userId: string, target: string | null) {
  return query(
    `SELECT id,'chess' AS type,status,created_at,black_player_id AS challenged_id FROM chess_games WHERE white_player_id=$1 AND status IN ('waiting','in_progress') AND ($2::uuid IS NULL OR black_player_id=$2)
    UNION ALL SELECT id,'ttt',status,created_at,o_player_id FROM ttt_games WHERE x_player_id=$1 AND status IN ('waiting','in_progress') AND ($2::uuid IS NULL OR o_player_id=$2)
    UNION ALL SELECT id,'connect-four',status,created_at,yellow_player_id FROM connect_four_games WHERE red_player_id=$1 AND status IN ('waiting','in_progress') AND ($2::uuid IS NULL OR yellow_player_id=$2) ORDER BY created_at DESC`,
    [userId, target],
  );
}

export async function declineBoardInvitation(
  type: string,
  id: string,
  userId: string,
) {
  const game = getGameDefinition(type);
  if (!game) throw new Error("Invalid challenge");
  await cancelWaitingMatch(game.type, id, userId, "recipient");
}

export async function readMatchSnapshot(type: string, id: string) {
  const game = getGameDefinition(type);
  if (!game) throw new Error("Invalid match");
  return query(`SELECT * FROM ${game.table} WHERE id=$1`, [id]);
}
