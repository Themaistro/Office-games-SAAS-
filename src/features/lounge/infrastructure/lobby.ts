import "server-only";
import { query } from "../../../server/database/connection";
import { GAME_REGISTRY } from "../domain/game-registry";

/** A registered board game automatically participates in the common lobby. */
export async function listBoardLobbies(userId: string) {
  const results = await Promise.all(
    Object.values(GAME_REGISTRY).map(async (game) => {
      const [first, second] = game.playerColumns;
      const { rows } = await query<{
        created_at: string;
        [key: string]: unknown;
      }>(
        `SELECT g.*, $2::text AS game_type,
      (SELECT count(*)::int FROM game_spectators s WHERE s.game_type=$2 AND s.game_id=g.id AND s.last_seen>now()-interval '10 seconds') AS spectator_count,
      jsonb_build_object('full_name',a.full_name,'avatar_url',a.avatar_url,'lounge_lp',a.lounge_lp) AS player1_profile,
      jsonb_build_object('full_name',b.full_name,'avatar_url',b.avatar_url,'lounge_lp',b.lounge_lp) AS player2_profile
      FROM ${game.table} g LEFT JOIN profiles a ON a.id=g.${first} LEFT JOIN profiles b ON b.id=g.${second}
      WHERE g.status='in_progress' OR (g.status='waiting' AND g.created_at>now()-interval '30 minutes'
        AND (g.${first} IS NULL OR g.${second} IS NULL OR g.${first}=$1 OR g.${second}=$1))
      ORDER BY (g.${first}=$1 OR g.${second}=$1) DESC NULLS LAST,g.created_at DESC LIMIT 30`,
        [userId, game.type],
      );
      return rows.map((row) => ({
        ...row,
        creator_id: row[first] || row[second],
        player1_id: row[first],
        player2_id: row[second],
      }));
    }),
  );
  return results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}
