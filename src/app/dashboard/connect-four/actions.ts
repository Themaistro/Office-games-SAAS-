"use server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const WIDTH = 7;
const HEIGHT = 6;

function winner(board: string[], token: string) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let row = 0; row < HEIGHT; row++) for (let col = 0; col < WIDTH; col++) {
    if (board[row * WIDTH + col] !== token) continue;
    for (const [dc, dr] of directions) {
      let count = 1;
      for (let step = 1; step < 4; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (r < 0 || r >= HEIGHT || c < 0 || c >= WIDTH || board[r * WIDTH + c] !== token) break;
        count++;
      }
      if (count === 4) return true;
    }
  }
  return false;
}

async function player() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createConnectFourGame() {
  const user = await player();
  const { rows } = await query<{ id: string }>("INSERT INTO connect_four_games (red_player_id) VALUES ($1) RETURNING id", [user.id]);
  if (!rows[0]) throw new Error("Could not create Connect Four game");
  redirect(`/dashboard/connect-four/${rows[0].id}`);
}

export async function joinConnectFourGame(gameId: string) {
  const user = await player();
  const { rows: games } = await query<{ red_player_id: string; yellow_player_id: string | null; status: string }>("SELECT red_player_id, yellow_player_id, status FROM connect_four_games WHERE id = $1", [gameId]);
  const game = games[0];
  if (!game || game.status !== "waiting" || game.red_player_id === user.id || game.yellow_player_id) throw new Error("Game is no longer available");
  const { rowCount } = await query("UPDATE connect_four_games SET yellow_player_id = $1, status = 'in_progress', updated_at = now() WHERE id = $2 AND status = 'waiting' AND yellow_player_id IS NULL", [user.id, gameId]);
  if (!rowCount) throw new Error("Game was just joined by someone else");
  revalidatePath("/dashboard");
  redirect(`/dashboard/connect-four/${gameId}`);
}

export async function cancelConnectFourGame(gameId: string) {
  const user = await player();
  await query("DELETE FROM connect_four_games WHERE id = $1 AND status = 'waiting' AND (red_player_id = $2 OR yellow_player_id = $2)", [gameId, user.id]);
  revalidatePath("/dashboard");
}

export async function makeConnectFourMove(gameId: string, column: number) {
  const user = await player();
  if (!Number.isInteger(column) || column < 0 || column >= WIDTH) throw new Error("Invalid column");
  const { rows: games } = await query<any>("SELECT * FROM connect_four_games WHERE id = $1", [gameId]);
  const game = games[0];
  if (!game || game.status !== "in_progress") throw new Error("Game is not active");
  const token = game.red_player_id === user.id ? "R" : game.yellow_player_id === user.id ? "Y" : null;
  if (!token || token !== game.current_turn) throw new Error("Not your turn");
  const board = game.board_state.split("");
  let row = -1;
  for (let r = HEIGHT - 1; r >= 0; r--) if (board[r * WIDTH + column] === "-") { row = r; break; }
  if (row < 0) throw new Error("That column is full");
  board[row * WIDTH + column] = token;
  const isWin = winner(board, token);
  const isDraw = !isWin && !board.includes("-");
  const status = isWin ? token === "R" ? "red_won" : "yellow_won" : isDraw ? "draw" : "in_progress";
  const nextTurn = token === "R" ? "Y" : "R";
  const { rowCount } = await query("UPDATE connect_four_games SET board_state = $1, current_turn = $2, status = $3, updated_at = now() WHERE id = $4 AND status = 'in_progress' AND board_state = $5 AND current_turn = $6", [board.join(""), nextTurn, status, gameId, game.board_state, game.current_turn]);
  if (!rowCount) throw new Error("Move rejected because the game changed");
  revalidatePath(`/dashboard/connect-four/${gameId}`);
}
