import "server-only";
import { runMaintenance } from "@/server/database/maintenance";
import { GAME_REGISTRY, GAME_TYPES } from "../domain/game-registry";
import { lockPlayers } from "./postgres-match-service";

/** Bounded, idempotent cleanup. Row deletion and terminal history commit together. */
export function expireBoardInvitations() {
  return runMaintenance("board-invitation-expiry", 30, async (client) => {
    const candidates: {
      type: (typeof GAME_TYPES)[number];
      id: string;
      players: string[];
    }[] = [];
    for (const type of GAME_TYPES) {
      const def = GAME_REGISTRY[type],
        [a, b] = def.playerColumns;
      const { rows } = await client.query(
        `SELECT id,${a},${b} FROM ${def.table} WHERE status='waiting' AND created_at<=now()-interval '30 minutes' ORDER BY created_at,id LIMIT 30`,
      );
      candidates.push(
        ...rows.map((row) => ({
          type,
          id: row.id as string,
          players: [row[a], row[b]].filter(Boolean) as string[],
        })),
      );
    }
    await lockPlayers(
      client,
      candidates.flatMap((item) => item.players),
      false,
    );
    for (const candidate of candidates) {
      const def = GAME_REGISTRY[candidate.type],
        [a, b] = def.playerColumns;
      const { rows } = await client.query(
        `DELETE FROM ${def.table} WHERE id=$1 AND status='waiting' AND created_at<=now()-interval '30 minutes' RETURNING ${a},${b}`,
        [candidate.id],
      );
      if (!rows[0]) continue;
      await client.query(
        "INSERT INTO challenge_events(game_id,game_type,challenger_id,challenged_id,event_type) VALUES($1,$2,$3,$4,'expired')",
        [candidate.id, candidate.type, rows[0][a], rows[0][b]],
      );
    }
  });
}
