import "server-only";
import { query } from "../../../server/database/connection";
import { GAME_REGISTRY } from "../domain/game-registry";

/** Account state, independent of the page/tab the player currently has open. */
export async function playerActivity(userId: string) {
  const party = (
    await query<{ id: string }>(
      "SELECT r.id FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='in_progress' AND r.updated_at>now()-interval '2 hours' LIMIT 1",
      [userId],
    )
  ).rows[0];
  let activeMatch: { id: string; type: string } | null = party
    ? { id: party.id, type: "party" }
    : null;
  if (!activeMatch)
    for (const game of Object.values(GAME_REGISTRY)) {
      const [first, second] = game.playerColumns;
      const row = (
        await query<{ id: string }>(
          `SELECT id FROM ${game.table} WHERE status='in_progress' AND (${first}=$1 OR ${second}=$1) LIMIT 1`,
          [userId],
        )
      ).rows[0];
      if (row) {
        activeMatch = { id: row.id, type: game.type };
        break;
      }
    }
  const mission =
    (
      await query<{ id: string }>(
        "SELECT id FROM daily_sessions WHERE user_id=$1 AND status='in_progress' AND created_at+allowed_duration_seconds*interval '1 second'>now() LIMIT 1",
        [userId],
      )
    ).rows[0] ?? null;
  return { activeMatch, mission };
}
