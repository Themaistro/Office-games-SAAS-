"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createChessGame(preferredColor: "white" | "black" | "random" = "random", timeMs: number = 600000) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check for active daily mission
  const { data: activeMission } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .limit(1);

  if (activeMission && activeMission.length > 0) {
    throw new Error("You have an unfinished Daily Mission! Please complete it first.");
  }

  let whitePlayerId = null;
  let blackPlayerId = null;

  if (preferredColor === "white") {
    whitePlayerId = user.id;
  } else if (preferredColor === "black") {
    blackPlayerId = user.id;
  } else {
    // random
    if (Math.random() > 0.5) {
      whitePlayerId = user.id;
    } else {
      blackPlayerId = user.id;
    }
  }

  // Prevent orphaned lobbies across both games
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  await adminClient
    .from("chess_games")
    .delete()
    .eq("status", "waiting")
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`);

  await adminClient
    .from("ttt_games")
    .delete()
    .eq("status", "waiting")
    .or(`x_player_id.eq.${user.id},o_player_id.eq.${user.id}`);

  const { data, error } = await supabase
    .from("chess_games")
    .insert({
      white_player_id: whitePlayerId,
      black_player_id: blackPlayerId,
      status: "waiting",
      white_time_ms: timeMs,
      black_time_ms: timeMs,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create chess game:", error);
    throw new Error("Failed to create game");
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${data.id}`);
}

export async function challengeUserToChess(targetUserId: string, timeControlMs: number = 600000) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check for active daily mission
  const { data: activeMission } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .limit(1);

  if (activeMission && activeMission.length > 0) {
    throw new Error("You have an unfinished Daily Mission! Please complete it first.");
  }

  // Delete any waiting games this user might have created previously
  await supabase
    .from("chess_games")
    .delete()
    .eq("status", "waiting")
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`);

  // Create a direct challenge — challenger is always white_player_id so the
  // lobby widget can distinguish sender vs receiver without extra DB columns.
  const { data, error } = await supabase
    .from("chess_games")
    .insert({
      white_player_id: user.id,       // challenger
      black_player_id: targetUserId,  // challenged
      status: "waiting",
      white_time_ms: timeControlMs,
      black_time_ms: timeControlMs,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create direct challenge:", error);
    throw new Error("Failed to challenge user");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/profile/${targetUserId}`);
  // Send challenger to the board to wait
  redirect(`/dashboard/chess/${data.id}`);
}

export async function acceptChallenge(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check for active daily mission
  const { data: activeMission } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .limit(1);
  if (activeMission && activeMission.length > 0) {
    throw new Error("You have an unfinished Daily Mission! Please complete it first.");
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await adminClient
    .from("chess_games")
    .update({ status: "in_progress", last_move_timestamp: new Date().toISOString() })
    .eq("id", gameId)
    .eq("black_player_id", user.id);

  if (error) throw new Error("Failed to accept challenge");

  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function declineChallenge(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await adminClient
    .from("chess_games")
    .delete()
    .eq("id", gameId);

  if (error) throw new Error("Failed to decline challenge");

  revalidatePath("/dashboard");
}

export async function cancelChessGame(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: game, error: fetchError } = await supabase
    .from("chess_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (fetchError || !game) {
    throw new Error("Game not found");
  }

  if (game.status !== "waiting") {
    throw new Error("Cannot cancel a game that is already in progress.");
  }

  if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
    throw new Error("You can only cancel your own game.");
  }

  // Need service role to securely bypass RLS for deletion
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Delete the game entirely instead of marking as abandoned to keep history clean
  const { error: deleteError } = await adminClient
    .from("chess_games")
    .delete()
    .eq("id", gameId);

  if (deleteError) {
    console.error("Failed to cancel game:", deleteError);
    throw new Error("Failed to cancel game");
  }

  revalidatePath("/dashboard");
}

export async function joinChessGame(gameId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check for active daily mission
  const { data: activeMission } = await supabase
    .from('daily_sessions')
    .select('id')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .limit(1);

  if (activeMission && activeMission.length > 0) {
    throw new Error("You have an unfinished Daily Mission! Please complete it first.");
  }

  const { data: game, error: fetchError } = await supabase
    .from("chess_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (fetchError || !game) {
    throw new Error("Game not found");
  }

  if (game.status !== "waiting") {
    // If it's in progress, they might be reconnecting
    if (game.white_player_id === user.id || game.black_player_id === user.id) {
      redirect(`/dashboard/chess/${gameId}`);
    }
    throw new Error("Game is no longer available");
  }

  // Prevent joining your own game as the other player
  if (game.white_player_id === user.id || game.black_player_id === user.id) {
    redirect(`/dashboard/chess/${gameId}`);
  }

  // Prevent joining a direct challenge game where both players are already set
  if (game.white_player_id && game.black_player_id) {
    throw new Error("This game already has two players.");
  }

  // Delete any other waiting games this user might have created before joining someone else's
  await supabase
    .from("chess_games")
    .delete()
    .eq("status", "waiting")
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`);

  const updateData: any = {
    status: "in_progress",
    updated_at: new Date().toISOString(),
    last_move_timestamp: new Date().toISOString()
  };

  if (!game.white_player_id) {
    updateData.white_player_id = user.id;
  } else if (!game.black_player_id) {
    updateData.black_player_id = user.id;
  }

  // Need service role to securely bypass RLS for joining
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error: updateError } = await adminClient
    .from("chess_games")
    .update(updateData)
    .eq("id", gameId);

  if (updateError) {
    console.error("Failed to join game:", updateError);
    throw new Error("Failed to join game: " + updateError.message);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function updateChessGameState(gameId: string, pgn: string, fen: string, status: string, turn: 'w' | 'b') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Fetch current game state to calculate time securely
  const { data: game } = await adminClient.from("chess_games").select("*").eq("id", gameId).single();
  if (!game) return;
  
  // Verify user is actually part of the game
  if (game.white_player_id !== user.id && game.black_player_id !== user.id) return;

  const now = new Date();
  const updatePayload: any = {
    pgn,
    fen,
    status,
    updated_at: now.toISOString(),
    last_move_timestamp: now.toISOString()
  };

  // If there's a last move timestamp, deduct time from the player who just moved
  if (game.last_move_timestamp && status === "in_progress") {
    const elapsedMs = now.getTime() - new Date(game.last_move_timestamp).getTime();
    
    // If it's black's turn now, white just moved!
    if (turn === 'b') {
      const newWhiteTime = Math.max(0, game.white_time_ms - elapsedMs);
      updatePayload.white_time_ms = newWhiteTime;
      if (newWhiteTime === 0) {
        updatePayload.status = 'black_won'; // Time out
        await processChessGameEnd(gameId, 'black_won');
      }
    } else {
      // White's turn now, black just moved
      const newBlackTime = Math.max(0, game.black_time_ms - elapsedMs);
      updatePayload.black_time_ms = newBlackTime;
      if (newBlackTime === 0) {
        updatePayload.status = 'white_won'; // Time out
        await processChessGameEnd(gameId, 'white_won');
      }
    }
  }

  await adminClient.from("chess_games").update(updatePayload).eq("id", gameId);
}

export async function declareChessTimeout(gameId: string) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: game } = await adminClient.from("chess_games").select("*").eq("id", gameId).single();
  if (!game || game.status !== "in_progress" || !game.last_move_timestamp) return { success: false };

  // Calculate if time actually ran out on the server side to prevent cheating
  const elapsedMs = Date.now() - new Date(game.last_move_timestamp).getTime();
  
  // To know whose turn it is, we need to load the PGN
  const { Chess } = await import('chess.js');
  const chess = new Chess();
  if (game.pgn) {
    chess.loadPgn(game.pgn);
  }
  
  const isWhiteTurn = chess.turn() === 'w';
  
  if (isWhiteTurn) {
    if (elapsedMs >= game.white_time_ms) {
      await adminClient.from("chess_games").update({ 
        white_time_ms: 0, 
        status: 'black_won',
        updated_at: new Date().toISOString() 
      }).eq("id", gameId);
      await processChessGameEnd(gameId, 'black_won');
      return { success: true };
    }
  } else {
    if (elapsedMs >= game.black_time_ms) {
      await adminClient.from("chess_games").update({ 
        black_time_ms: 0, 
        status: 'white_won',
        updated_at: new Date().toISOString() 
      }).eq("id", gameId);
      await processChessGameEnd(gameId, 'white_won');
      return { success: true };
    }
  }
  
  return { success: false };
}

export async function resignChessGame(gameId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: game } = await adminClient.from("chess_games").select("*").eq("id", gameId).single();
    if (!game) return { success: false, error: "Game not found" };

    let result: 'white_won' | 'black_won' | 'draw';
    if (game.white_player_id === user.id) {
      result = 'black_won';
    } else if (game.black_player_id === user.id) {
      result = 'white_won';
    } else {
      return { success: false, error: "Spectators can't resign" };
    }

    await processChessGameEnd(gameId, result);
    return { success: true };
  } catch (error: any) {
    console.error("Error resigning game:", error);
    return { success: false, error: error.message };
  }
}

export async function drawChessGame(gameId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: game } = await adminClient.from("chess_games").select("*").eq("id", gameId).single();
    if (!game) return { success: false, error: "Game not found" };
    
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      return { success: false, error: "You are not a player in this game" };
    }

    await processChessGameEnd(gameId, 'draw');
    return { success: true };
  } catch (error: any) {
    console.error("Error drawing game:", error);
    return { success: false, error: error.message };
  }
}

export async function processChessGameEnd(gameId: string, result: 'white_won' | 'black_won' | 'draw') {
  const supabase = await createClient();
  
  // Need service role to securely update elos
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: game } = await adminClient.from("chess_games").select("*").eq("id", gameId).single();
  if (!game || game.status === result) return; // Already processed

  await adminClient.from("chess_games").update({ status: result, updated_at: new Date().toISOString() }).eq("id", gameId);

  // Elo calculation
  if (!game.white_player_id || !game.black_player_id) return;

  const { data: whiteProfile } = await adminClient.from("profiles").select("chess_elo, full_name").eq("id", game.white_player_id).single();
  const { data: blackProfile } = await adminClient.from("profiles").select("chess_elo, full_name").eq("id", game.black_player_id).single();

  const R1 = whiteProfile?.chess_elo || 1200;
  const R2 = blackProfile?.chess_elo || 1200;

  const E1 = 1 / (1 + Math.pow(10, (R2 - R1) / 400));
  const E2 = 1 / (1 + Math.pow(10, (R1 - R2) / 400));

  let S1 = 0.5, S2 = 0.5;
  if (result === 'white_won') { S1 = 1; S2 = 0; }
  else if (result === 'black_won') { S1 = 0; S2 = 1; }

  const K = 32;
  const newR1 = Math.round(R1 + K * (S1 - E1));
  const newR2 = Math.round(R2 + K * (S2 - E2));

  await adminClient.from("profiles").update({ chess_elo: newR1 }).eq("id", game.white_player_id);
  await adminClient.from("profiles").update({ chess_elo: newR2 }).eq("id", game.black_player_id);
  
  // Log Activity Feed Event
  let winnerId = null;
  let description = "played a chess match that ended in a draw.";
  if (result === 'white_won') {
    winnerId = game.white_player_id;
    const loserName = blackProfile?.full_name || "Unknown";
    description = `won a chess match against ${loserName}!`;
  } else if (result === 'black_won') {
    winnerId = game.black_player_id;
    const loserName = whiteProfile?.full_name || "Unknown";
    description = `won a chess match against ${loserName}!`;
  }
  
  // Create two events so both profiles show activity, or just one global one. 
  // For a global feed, one event is fine. We will attribute it to the winner if there is one, or white if draw.
  const feedUserId = winnerId || game.white_player_id;
  
  await adminClient.from("activity_feed").insert({
    user_id: feedUserId,
    type: "chess",
    description: description,
    metadata: { game_id: gameId, result: result }
  });
}
