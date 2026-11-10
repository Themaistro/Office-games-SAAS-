import { cancelWaitingMatch } from "./postgres-match-service";
import "server-only";
import { query } from "../../../server/database/connection";
import {
  getGameDefinition,
  GAME_REGISTRY,
  type GameType,
} from "../domain/game-registry";

type SentInvitation = {
  id: string;
  type: GameType;
  status: "waiting" | "in_progress";
  created_at: string;
  challenged_id: string | null;
};

export function sentInvitations(userId: string, target: string | null) {
  const sources = Object.values(GAME_REGISTRY).map(
    ({ table, type, playerColumns: [first, second] }) =>
      `SELECT id,'${type}' AS type,status,created_at,${second} AS challenged_id FROM ${table} WHERE ${first}=$1 AND (status='in_progress' OR status='waiting' AND created_at>now()-interval '30 minutes') AND ($2::uuid IS NULL OR ${second}=$2)`,
  );
  return query<SentInvitation>(
    sources.join(" UNION ALL ") + " ORDER BY created_at DESC",
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
