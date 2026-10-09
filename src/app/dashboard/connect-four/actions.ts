"use server";

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createConnectFourGame() {
  const user = await player();
  const supabase = await createClient();
  const { data, error } = await supabase.from("connect_four_games").insert({ red_player_id: user.id }).select("id").single();
  if (error || !data) {
    console.error("Connect Four creation failed", error);
    throw new Error(error?.message || "Could not create Connect Four game");
  }
  redirect(`/dashboard/connect-four/${data.id}`);
}

export async function joinConnectFourGame(gameId: string) {
  const user = await player();
  const supabase = await createClient();
  const { data: game } = await supabase.from("connect_four_games").select("red_player_id,yellow_player_id,status").eq("id", gameId).single();
  if (!game || game.status !== "waiting" || game.red_player_id === user.id || game.yellow_player_id) throw new Error("Game is no longer available");
  const { data } = await supabase.from("connect_four_games").update({ yellow_player_id: user.id, status: "in_progress", updated_at: new Date().toISOString() }).eq("id", gameId).eq("status", "waiting").is("yellow_player_id", null).select("id");
  if (!data?.length) throw new Error("Game was just joined by someone else");
  revalidatePath("/dashboard");
  redirect(`/dashboard/connect-four/${gameId}`);
}

export async function cancelConnectFourGame(gameId: string) {
  const user = await player();
  const supabase = await createClient();
  await supabase.from("connect_four_games").delete().eq("id", gameId).eq("status", "waiting").or(`red_player_id.eq.${user.id},yellow_player_id.eq.${user.id}`);
  revalidatePath("/dashboard");
}

export async function makeConnectFourMove(gameId: string, column: number) {
  const user = await player();
  if (!Number.isInteger(column) || column < 0 || column >= WIDTH) throw new Error("Invalid column");
  const supabase = await createClient();
  const { data: game } = await supabase.from("connect_four_games").select("*").eq("id", gameId).single();
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
  const { data: updated } = await supabase.from("connect_four_games").update({ board_state: board.join(""), current_turn: nextTurn, status, updated_at: new Date().toISOString() }).eq("id", gameId).eq("status", "in_progress").eq("board_state", game.board_state).eq("current_turn", game.current_turn).select("id");
  if (!updated?.length) throw new Error("Move rejected because the game changed");
  revalidatePath(`/dashboard/connect-four/${gameId}`);
}
