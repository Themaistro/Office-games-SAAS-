"use server";
import { resignMatch } from "@/features/lounge/public-server";
import { cancelWaitingMatch } from "@/features/lounge/public-server";

import {
  evaluateChessTurn,
  type ChessMatch,
} from "@/features/lounge/application/chess-turn";
import {
  chessClock,
  chessRules,
  dashboardChessActionsQueries,
} from "@/features/lounge/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { publishChessEvent } from "@/lib/chess-realtime";
import { withTransaction } from "@/server/database/connection";
import {
  activateMatch,
  createWaitingMatch,
  lockedMatch,
  settleMatch,
} from "@/features/lounge/public-server";
import { Chess as ServerChess } from "chess.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const { updateChessGamesForDrawChessGame } = dashboardChessActionsQueries;

const { saveChessMove, expireChessClock } = chessClock;

export async function createChessGame(
  preferredColor: "white" | "black" | "random" = "random",
  timeMs = 600000,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!["white", "black", "random"].includes(preferredColor))
    throw new Error("Invalid side");
  const firstSeat =
    preferredColor === "white" ||
    (preferredColor === "random" && Math.random() > 0.5);
  const game = await createWaitingMatch("chess", user.id, {
    firstSeat,
    timeMs,
  });
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${game.id}`);
}

export async function challengeUserToChess(
  targetUserId: string,
  timeControlMs = 600000,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const game = await createWaitingMatch("chess", user.id, {
    targetId: targetUserId,
    timeMs: timeControlMs,
  });
  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetUserId}`);
  return game;
}

export async function acceptChallenge(gameId: string, replaceActive = false) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await activateMatch("chess", gameId, user.id, true, replaceActive);
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function declineChallenge(gameId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await cancelWaitingMatch("chess", gameId, user.id, "recipient");
  revalidatePath("/dashboard");
}

export async function cancelChessGame(gameId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await cancelWaitingMatch("chess", gameId, user.id);
  revalidatePath("/dashboard");
}

export async function joinChessGame(gameId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await activateMatch("chess", gameId, user.id, false);
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function updateChessGameState(
  gameId: string,
  pgn: string,
  fen: string,
  _status: string,
  turn: "w" | "b",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (pgn.length > 200_000 || fen.length > 200)
    throw new Error("Invalid board");
  const payload = await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "chess", gameId);
    const game = rows[0];
    if (!game || game.status !== "in_progress")
      throw new Error("Match is not active");
    const evaluated = evaluateChessTurn(
      chessRules,
      game as ChessMatch,
      user.id,
      { pgn, fen, turn },
      Date.now(),
    );
    const { payload, column, remaining, reason } = evaluated;
    await saveChessMove(
      column,
      [payload.pgn, payload.fen, payload.turn, remaining, gameId],
      client,
    );
    if (payload.status !== "in_progress")
      await settleMatch(client, "chess", game, payload.status, reason);
    return payload;
  });
  await publishChessEvent(gameId, {
    type: "move",
    senderId: user.id,
    payload,
  }).catch(() => undefined);
  revalidatePath(`/dashboard/chess/${gameId}`);
}

export async function declareChessTimeout(gameId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const result = await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "chess", gameId);
    const game = rows[0];
    if (
      !game ||
      ![game.white_player_id, game.black_player_id].includes(user.id) ||
      game.status !== "in_progress"
    )
      return null;
    const chess = new ServerChess();
    if (game.pgn) chess.loadPgn(game.pgn);
    const white = chess.turn() === "w",
      column = white ? "white_time_ms" : "black_time_ms";
    if (
      !game.last_move_timestamp ||
      Date.now() - new Date(game.last_move_timestamp).getTime() <
        Number(game[column])
    )
      return null;
    const status = white ? "black_won" : "white_won";
    await expireChessClock(column, gameId, client);
    await settleMatch(client, "chess", game, status, "timeout");
    return status;
  });
  if (result)
    await publishChessEvent(gameId, {
      type: "game_finished",
      payload: { status: result },
    }).catch(() => undefined);
  return { success: Boolean(result) };
}

export async function resignChessGame(gameId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const result = await resignMatch("chess", gameId, user.id);
  await publishChessEvent(gameId, {
    type: "game_finished",
    senderId: user.id,
    payload: result,
  }).catch(() => undefined);
  return { ...result, success: true };
}

// Calling once offers a draw; only the other player can accept it.
export async function drawChessGame(gameId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const accepted = await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "chess", gameId);
    const game = rows[0];
    if (
      !game ||
      game.status !== "in_progress" ||
      ![game.white_player_id, game.black_player_id].includes(user.id)
    )
      throw new Error("Match is unavailable");
    if (game.draw_offered_by && game.draw_offered_by !== user.id) {
      await settleMatch(client, "chess", game, "draw", "agreement");
      return true;
    }
    await updateChessGamesForDrawChessGame([user.id, gameId], client);
    return false;
  });
  await publishChessEvent(gameId, {
    type: accepted ? "game_finished" : "offer_draw",
    senderId: user.id,
    payload: { status: accepted ? "draw" : "in_progress" },
  }).catch(() => undefined);
  return { success: true, offered: !accepted };
}
