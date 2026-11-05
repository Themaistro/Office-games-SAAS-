import "server-only";
import { query, withTransaction } from "@/server/database/connection";
import { GAME_REGISTRY, type GameType } from "../domain/game-registry";
import type { RematchPhase, RematchState } from "../domain/rematch";
import {
  activateMatch,
  assertAvailable,
  cancelWaitingMatch,
  createWaitingMatch,
  lockPlayers,
} from "./postgres-match-service";
import { playerActivity } from "./player-activity";
async function sourceMatch(type: GameType, sourceId: string, userId: string) {
  const definition = GAME_REGISTRY[type],
    { rows } = await query(`SELECT * FROM ${definition.table} WHERE id=$1`, [
      sourceId,
    ]),
    source = rows[0];
  if (
    !source ||
    !definition.playerColumns.some((column) => source[column] === userId)
  )
    throw new Error("Only the two players can request a rematch");
  if (![...definition.winStatuses, "draw"].includes(source.status))
    throw new Error("Finish this match before requesting a rematch");
  const opponentId = definition.playerColumns
    .map((column) => source[column])
    .find((id) => id && id !== userId) as string | undefined;
  if (!opponentId) throw new Error("Your opponent is no longer available");
  return { source, opponentId, definition };
}
export async function readRematch(
  type: GameType,
  sourceId: string,
  userId: string,
  invitationId?: string | null,
): Promise<RematchState> {
  const { source, opponentId, definition } = await sourceMatch(
      type,
      sourceId,
      userId,
    ),
    [a, b] = definition.playerColumns;
  const [presence, activity] = await Promise.all([
    query(
      "SELECT user_id FROM presence WHERE user_id=$1 AND last_seen>now()-interval '90 seconds'",
      [opponentId],
    ),
    playerActivity(opponentId),
  ]);
  const context = {
    opponentOnline: Boolean(presence.rowCount),
    opponentBusy: Boolean(activity.activeMatch),
  };
  const { rows } = await query(
    `SELECT * FROM ${definition.table} WHERE id<>$1 AND ((${a}=$2 AND ${b}=$3) OR (${a}=$3 AND ${b}=$2)) AND (status='waiting' AND created_at>=$5 OR id=$4::uuid) ORDER BY CASE WHEN status='in_progress' AND id=$4 THEN 0 WHEN status='waiting' THEN 1 ELSE 2 END,created_at DESC LIMIT 1`,
    [sourceId, userId, opponentId, invitationId || null, source.created_at],
  );
  const invitation = rows[0];
  if (invitation) {
    const phase: RematchPhase =
      invitation.status === "in_progress"
        ? "accepted"
        : invitation.status === "waiting"
          ? Date.now() - new Date(invitation.created_at).getTime() >=
            30 * 60_000
            ? "expired"
            : invitation[a] === userId
              ? "pending"
              : "incoming"
          : "completed";
    return { id: invitation.id, phase, ...context };
  }
  if (invitationId) {
    const events = await query(
      "SELECT event_type,actor_id,challenger_id,challenged_id FROM challenge_events WHERE game_type=$1 AND game_id=$2 AND ((challenger_id=$3 AND challenged_id=$4) OR (challenger_id=$4 AND challenged_id=$3)) ORDER BY created_at DESC LIMIT 1",
      [type, invitationId, userId, opponentId],
    );
    const event = events.rows[0]?.event_type;
    return {
      id: invitationId,
      phase: ["declined", "cancelled", "expired"].includes(event)
        ? event
        : "unavailable",
      declinedByMe: event === "declined" && events.rows[0]?.actor_id === userId,
      ...context,
    };
  }
  return { id: null, phase: "idle", ...context };
}
export async function requestRematch(
  type: GameType,
  sourceId: string,
  userId: string,
): Promise<RematchState> {
  const { source, opponentId, definition } = await sourceMatch(
      type,
      sourceId,
      userId,
    ),
    [a, b] = definition.playerColumns;
  const id = await withTransaction(async (client) => {
    await lockPlayers(client, [userId, opponentId]);
    const eligible = await client.query(
      "SELECT id FROM profiles WHERE id=ANY($1::uuid[]) AND role='employee' AND is_active=true",
      [[userId, opponentId]],
    );
    if (eligible.rowCount !== 2)
      throw new Error("Your opponent is no longer available for a rematch");
    await assertAvailable(client, userId);
    const { rows } = await client.query(
      `SELECT * FROM ${definition.table} WHERE id<>$1 AND status='waiting' AND ((${a}=$2 AND ${b}=$3) OR (${a}=$3 AND ${b}=$2)) ORDER BY created_at DESC FOR UPDATE`,
      [source.id, userId, opponentId],
    );
    for (const pending of rows) {
      if (Date.now() - new Date(pending.created_at).getTime() >= 30 * 60_000) {
        await client.query(
          `DELETE FROM ${definition.table} WHERE id=$1 AND status='waiting'`,
          [pending.id],
        );
        await client.query(
          "INSERT INTO challenge_events(game_id,game_type,challenger_id,challenged_id,event_type) VALUES($1,$2,$3,$4,'expired')",
          [pending.id, type, pending[a], pending[b]],
        );
        continue;
      }
      if (pending[b] === userId) {
        // A reciprocal click is consent to play, but not to interrupt a mission.
        // Return the incoming invite so the shared acceptance warning can run.
        if ((await playerActivity(userId)).mission) return pending.id as string;
        try {
          await assertAvailable(client, opponentId);
        } catch {
          throw new Error(
            "Your opponent has started another game. This invitation is still waiting.",
          );
        }
        await activateMatch(type, pending.id, userId, true);
      }
      return pending.id as string;
    }
    return (
      await createWaitingMatch(type, userId, {
        targetId: opponentId,
        timeMs: 600000,
      })
    ).id;
  });
  return readRematch(type, sourceId, userId, id);
}
export async function cancelRematch(
  type: GameType,
  sourceId: string,
  userId: string,
  id: string,
) {
  const state = await readRematch(type, sourceId, userId, id);
  if (state.phase === "pending" && state.id === id)
    await cancelWaitingMatch(type, id, userId);
  return readRematch(type, sourceId, userId, id);
}
