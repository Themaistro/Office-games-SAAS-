"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTttGame(preferredSymbol: "X" | "O" | "random" = "random") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let xPlayerId = null;
  let oPlayerId = null;

  if (preferredSymbol === "X") {
    xPlayerId = user.id;
  } else if (preferredSymbol === "O") {
    oPlayerId = user.id;
  } else {
    if (Math.random() > 0.5) {
      xPlayerId = user.id;
    } else {
      oPlayerId = user.id;
    }
  }

  // Prevent orphaned lobbies across both games
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  await adminClient
    .from("ttt_games")
    .delete()
    .eq("status", "waiting")
    .or(`x_player_id.eq.${user.id},o_player_id.eq.${user.id}`);

  await adminClient
    .from("chess_games")
    .delete()
    .eq("status", "waiting")
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`);

  const { data, error } = await supabase
    .from("ttt_games")
    .insert({
      x_player_id: xPlayerId,
      o_player_id: oPlayerId,
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create TTT game:", error);
    throw new Error("Failed to create game");
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/ttt/${data.id}`);
}

export async function challengeUserToTtt(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Prevent orphaned lobbies across both games
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  await adminClient
    .from("ttt_games")
    .delete()
    .eq("status", "waiting")
    .or(`x_player_id.eq.${user.id},o_player_id.eq.${user.id}`);

  await adminClient
    .from("chess_games")
    .delete()
    .eq("status", "waiting")
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`);

  // Create a direct challenge — challenger is always x_player_id
  const { data, error } = await supabase
    .from("ttt_games")
    .insert({
      x_player_id: user.id,       // challenger
      o_player_id: targetUserId,  // challenged
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create direct challenge:", error);
    throw new Error("Failed to challenge user");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetUserId}`);
  // Send challenger to dashboard lobby to wait
  redirect("/dashboard?challenged=1");
}

export async function joinTttGame(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: game } = await adminClient.from("ttt_games").select("*").eq("id", gameId).single();
  if (!game) throw new Error("Game not found");
  if (game.status !== "waiting") throw new Error("Game is no longer available");
  if (game.x_player_id === user.id || game.o_player_id === user.id) {
    redirect(`/dashboard/ttt/${gameId}`);
  }

  let updates: any = { status: "in_progress" };
  if (!game.x_player_id) {
    updates.x_player_id = user.id;
  } else if (!game.o_player_id) {
    updates.o_player_id = user.id;
  } else {
    throw new Error("Game is full");
  }

  const { error } = await adminClient.from("ttt_games").update(updates).eq("id", gameId);
  if (error) throw new Error("Failed to join game");

  revalidatePath("/dashboard");
  redirect(`/dashboard/ttt/${gameId}`);
}

export async function cancelTttGame(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: game } = await adminClient.from("ttt_games").select("*").eq("id", gameId).single();
  if (!game) throw new Error("Game not found");
  
  if (game.status !== "waiting") throw new Error("Cannot cancel an in-progress game");
  if (game.x_player_id !== user.id && game.o_player_id !== user.id) throw new Error("Unauthorized");

  await adminClient.from("ttt_games").delete().eq("id", gameId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

function checkTttWin(board: string): string | null {
  const winLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (const line of winLines) {
    const [a, b, c] = line;
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // 'X' or 'O'
    }
  }
  return null;
}

export async function makeTttMove(gameId: string, index: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: game } = await adminClient.from("ttt_games").select("*").eq("id", gameId).single();
  if (!game || game.status !== "in_progress") throw new Error("Game not active");

  const isX = game.x_player_id === user.id;
  const isO = game.o_player_id === user.id;
  if (!isX && !isO) throw new Error("Not a player in this game");

  if ((game.current_turn === "X" && !isX) || (game.current_turn === "O" && !isO)) {
    throw new Error("Not your turn");
  }

  if (game.board_state[index] !== '-') {
    throw new Error("Square already taken");
  }

  // Update board
  const boardArr = game.board_state.split("");
  boardArr[index] = game.current_turn;
  const newBoard = boardArr.join("");

  const winner = checkTttWin(newBoard);
  const isDraw = !winner && !newBoard.includes('-');

  let newStatus = "in_progress";
  if (winner === 'X') newStatus = "x_won";
  else if (winner === 'O') newStatus = "o_won";
  else if (isDraw) newStatus = "draw";

  const nextTurn = game.current_turn === "X" ? "O" : "X";

  await adminClient.from("ttt_games").update({
    board_state: newBoard,
    current_turn: nextTurn,
    status: newStatus,
    updated_at: new Date().toISOString()
  }).eq("id", gameId);

  // If game is finished, calculate ELO and post to activity feed
  if (newStatus !== "in_progress") {
    // Determine winner/loser ids
    let winnerId: string | null = null;
    let loserId: string | null = null;
    if (newStatus === "x_won") {
      winnerId = game.x_player_id;
      loserId = game.o_player_id;
    } else if (newStatus === "o_won") {
      winnerId = game.o_player_id;
      loserId = game.x_player_id;
    }

    // Fetch ELOs
    const { data: players } = await adminClient.from("profiles")
      .select("id, ttt_elo, full_name")
      .in("id", [game.x_player_id, game.o_player_id]);
    
    if (players && players.length === 2) {
      const p1 = players[0];
      const p2 = players[1];

      let rating1 = p1.ttt_elo || 1200;
      let rating2 = p2.ttt_elo || 1200;

      // Simple ELO calc
      const K = 32;
      const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
      const expected2 = 1 / (1 + Math.pow(10, (rating1 - rating2) / 400));

      let score1 = 0.5;
      let score2 = 0.5;

      if (winnerId === p1.id) { score1 = 1; score2 = 0; }
      else if (winnerId === p2.id) { score1 = 0; score2 = 1; }

      const newRating1 = Math.round(rating1 + K * (score1 - expected1));
      const newRating2 = Math.round(rating2 + K * (score2 - expected2));

      await adminClient.from("profiles").update({ ttt_elo: newRating1 }).eq("id", p1.id);
      await adminClient.from("profiles").update({ ttt_elo: newRating2 }).eq("id", p2.id);
    }

    // Find loser name
    let loserName = "Unknown";
    if (loserId && players) {
      const loserProfile = players.find(p => p.id === loserId);
      if (loserProfile && loserProfile.full_name) {
        loserName = loserProfile.full_name;
      }
    }

    // Post to Activity Feed
    const feedUserId = winnerId || game.x_player_id; // For draw, just pick X
    
    await adminClient.from("activity_feed").insert({
      user_id: feedUserId,
      type: "ttt",
      description: newStatus === "draw" 
        ? "drew a Tic Tac Toe match." 
        : `won a Tic Tac Toe match against ${loserName}!`,
      metadata: { game_id: gameId, status: newStatus }
    });
  }

  revalidatePath("/dashboard");
}
