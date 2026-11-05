"use server";
import { cancelWaitingMatch } from "@/features/lounge/public-server";

import { dashboardConnectFourActionsQueries } from "@/features/lounge/composition";
import { connectFourWinner as winner } from "@/features/lounge/domain/board-rules";
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

const { updateConnectFourGamesForMakeConnectFourMove } =
  dashboardConnectFourActionsQueries;

const WIDTH = 7;
const HEIGHT = 6;

async function player() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createConnectFourGame() {
  const user = await player();
  const game = await createWaitingMatch("connect-four", user.id);
  redirect(`/dashboard/connect-four/${game.id}`);
}
export async function challengeUserToConnectFour(targetUserId: string) {
  const user = await player();
  const game = await createWaitingMatch("connect-four", user.id, {
    targetId: targetUserId,
  });
  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetUserId}`);
  return game;
}

export async function acceptConnectFourChallenge(
  gameId: string,
  replaceActive = false,
) {
  const user = await player();
  await activateMatch("connect-four", gameId, user.id, true, replaceActive);
  redirect(`/dashboard/connect-four/${gameId}`);
}

export async function joinConnectFourGame(gameId: string) {
  const user = await player();
  await activateMatch("connect-four", gameId, user.id, false);
  redirect(`/dashboard/connect-four/${gameId}`);
}

export async function cancelConnectFourGame(gameId: string) {
  const user = await player();
  await cancelWaitingMatch("connect-four", gameId, user.id);
  revalidatePath("/dashboard");
}

export async function makeConnectFourMove(gameId: string, column: number) {
  const user = await player();
  if (!Number.isInteger(column) || column < 0 || column >= WIDTH)
    throw new Error("Invalid column");
  const payload = await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "connect-four", gameId);
    const game = rows[0];
    if (!game || game.status !== "in_progress")
      throw new Error("Game is not active");
    const token =
      game.red_player_id === user.id
        ? "R"
        : game.yellow_player_id === user.id
          ? "Y"
          : null;
    if (!token || token !== game.current_turn) throw new Error("Not your turn");
    const board = game.board_state.split("");
    let row = -1;
    for (let r = HEIGHT - 1; r >= 0; r--)
      if (board[r * WIDTH + column] === "-") {
        row = r;
        break;
      }
    if (row < 0) throw new Error("Column is full");
    board[row * WIDTH + column] = token;
    const win = winner(board, token),
      draw = !win && !board.includes("-");
    const status = win
        ? token === "R"
          ? "red_won"
          : "yellow_won"
        : draw
          ? "draw"
          : "in_progress",
      currentTurn = token === "R" ? "Y" : "R";
    await updateConnectFourGamesForMakeConnectFourMove(
      [board.join(""), currentTurn, gameId],
      client,
    );
    if (status !== "in_progress")
      await settleMatch(
        client,
        "connect-four",
        game,
        status,
        win ? "line" : "draw",
      );
    return { board: board.join(""), currentTurn, status };
  });
  await publishGameEvent("connect-four", gameId, {
    type: "move",
    senderId: user.id,
    payload,
  }).catch(() => undefined);
  revalidatePath(`/dashboard/connect-four/${gameId}`);
  return payload;
}

export async function resignConnectFourGame(gameId: string) {
  const user = await player();
  await withTransaction(async (client) => {
    const { rows } = await lockedMatch(client, "connect-four", gameId);
    const game = rows[0];
    if (!game || ![game.red_player_id, game.yellow_player_id].includes(user.id))
      throw new Error("Not a player");
    if (game.status !== "in_progress") return;
    await settleMatch(
      client,
      "connect-four",
      game,
      user.id === game.red_player_id ? "yellow_won" : "red_won",
      "resignation",
    );
  });
  await publishGameEvent("connect-four", gameId, {
    type: "game_finished",
  }).catch(() => undefined);
  revalidatePath(`/dashboard/connect-four/${gameId}`);
}
