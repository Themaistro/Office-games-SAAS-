"use server";
import { resignMatch } from "@/features/lounge/public-server";
import { cancelWaitingMatch } from "@/features/lounge/public-server";

import { requestRematch } from "@/features/lounge/composition";
import { dashboardTttActionsQueries } from "@/features/lounge/composition";
import { ticTacToeWinner as winner } from "@/features/lounge/domain/board-rules";
import { getCurrentUser } from "@/features/identity/public-server";
import { withTransaction } from "@/server/database/connection";
import {
  activateMatch,
  createWaitingMatch,
  lockedMatch,
  settleMatch,
} from "@/features/lounge/public-server";
import { publishGameEvent } from "@/server/realtime/publisher";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const { updateTttGamesForMakeTttMove } = dashboardTttActionsQueries;

async function player() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
export async function createTttGame(
  preferredSymbol: "X" | "O" | "random" = "random",
) {
  const user = await player();
  if (!["X", "O", "random"].includes(preferredSymbol))
    throw new Error("Invalid side");
  const firstSeat =
    preferredSymbol === "X" ||
    (preferredSymbol === "random" && Math.random() > 0.5);
  const game = await createWaitingMatch("ttt", user.id, { firstSeat });
  redirect(`/dashboard/ttt/${game.id}`);
}
export async function challengeUserToTtt(targetUserId: string) {
  const user = await player();
  const game = await createWaitingMatch("ttt", user.id, {
    targetId: targetUserId,
  });
  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetUserId}`);
  return game;
}
export async function acceptTttChallenge(
  gameId: string,
  replaceActive = false,
) {
  const user = await player();
  await activateMatch("ttt", gameId, user.id, true, replaceActive);
  redirect(`/dashboard/ttt/${gameId}`);
}
export async function joinTttGame(gameId: string) {
  const user = await player();
  await activateMatch("ttt", gameId, user.id, false);
  redirect(`/dashboard/ttt/${gameId}`);
}
export async function cancelTttGame(gameId: string) {
  const user = await player();
  await cancelWaitingMatch("ttt", gameId, user.id);
  revalidatePath("/dashboard");
}
export async function makeTttMove(gameId: string, index: number) {
  const user = await player();
  if (!Number.isInteger(index) || index < 0 || index > 8)
    throw new Error("Invalid move");
  const result = await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "ttt", gameId);
    const game = rows[0];
    if (!game || game.status !== "in_progress")
      throw new Error("Game not active");
    const symbol =
      game.x_player_id === user.id
        ? "X"
        : game.o_player_id === user.id
          ? "O"
          : null;
    if (!symbol || symbol !== game.current_turn)
      throw new Error("Not your turn");
    if (game.board_state[index] !== "-")
      throw new Error("Square already taken");
    const board = game.board_state.split("");
    board[index] = symbol;
    const win = winner(board.join(""));
    const nextStatus = win
      ? `${win.toLowerCase()}_won`
      : board.includes("-")
        ? "in_progress"
        : "draw";
    const nextTurn = symbol === "X" ? "O" : "X";
    await updateTttGamesForMakeTttMove(
      [board.join(""), nextTurn, nextStatus, gameId],
      client,
    );
    if (nextStatus !== "in_progress")
      await settleMatch(client, "ttt", game, nextStatus, win ? "line" : "draw");
    return { status: nextStatus, board: board.join(""), currentTurn: nextTurn };
  });
  await publishGameEvent("ttt", gameId, {
    type: "move",
    senderId: user.id,
    payload: result,
  }).catch(() => undefined);
  revalidatePath(`/dashboard/ttt/${gameId}`);
  return result.status;
}
export async function resignTttGame(gameId: string) {
  const user = await player();
  if (!user) throw new Error("Unauthorized");
  const result = await resignMatch("ttt", gameId, user.id);
  await publishGameEvent("ttt", gameId, {
    type: "game_finished",
    senderId: user.id,
    payload: result,
  }).catch(() => undefined);
  return { ...result, success: true };
}
export async function createTttRematch(oldGameId: string) {
  const user = await player();
  return (await requestRematch("ttt", oldGameId, user.id)).id;
}
