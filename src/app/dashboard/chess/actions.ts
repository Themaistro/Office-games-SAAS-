"use server";

import { createClient } from "@/lib/pg-client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Chess as ServerChess } from "chess.js";
import { publishChessEvent } from "@/lib/chess-realtime";
import { getCurrentUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { activateMatch, settleMatch, lockedMatch, createWaitingMatch } from "@/lib/match-service";
import { assertNoActiveMultiplayerGame } from "@/lib/game-presence";

export async function createChessGame(preferredColor: "white" | "black" | "random" = "random", timeMs = 600000) {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  if (!["white","black","random"].includes(preferredColor)) throw new Error("Invalid side");
  const firstSeat = preferredColor === "white" || (preferredColor === "random" && Math.random() > 0.5);
  const game = await createWaitingMatch("chess",user.id,{firstSeat,timeMs});
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${game.id}`);
}

export async function challengeUserToChess(targetUserId: string, timeControlMs = 600000) {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  const game = await createWaitingMatch("chess",user.id,{targetId:targetUserId,timeMs:timeControlMs});
  revalidatePath("/dashboard"); revalidatePath(`/profile/${targetUserId}`);
  return game;
}

export async function acceptChallenge(gameId: string, replaceActive = false) {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  await activateMatch("chess", gameId, user.id, true, replaceActive);
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function declineChallenge(gameId: string) {
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { createClient: createDbClient } = await import('@/lib/pg-client');
  const adminClient = createDbClient();

  const { error } = await adminClient
    .from("chess_games")
    .delete()
    .eq("id", gameId)
    .eq("status", "waiting")
    .eq("black_player_id", user.id);

  if (error) throw new Error("Failed to decline challenge");
  await adminClient.from("challenge_events").insert({ game_id: gameId, game_type: "chess", actor_id: user.id, event_type: "declined" });

  revalidatePath("/dashboard");
}

export async function cancelChessGame(gameId: string) {
  const dbClient = await createClient();
  const { data: { user } } = await dbClient.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: game, error: fetchError } = await dbClient
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
  const { createClient: createDbClient } = await import('@/lib/pg-client');
  const adminClient = createDbClient();

  // Delete the game entirely instead of marking as abandoned to keep history clean
  const { error: deleteError } = await adminClient
    .from("chess_games")
    .delete()
    .eq("id", gameId);

  if (deleteError) {
    console.error("Failed to cancel game:", deleteError);
    throw new Error("Failed to cancel game");
  }

  await adminClient.from("challenge_events").insert({ game_id: gameId, game_type: "chess", actor_id: user.id, event_type: "cancelled" });

  revalidatePath("/dashboard");
}

export async function joinChessGame(gameId: string) {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  await activateMatch("chess", gameId, user.id, false);
  revalidatePath("/dashboard");
  redirect(`/dashboard/chess/${gameId}`);
}

export async function updateChessGameState(gameId: string, pgn: string, fen: string, _status: string, turn: 'w' | 'b') {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  if (pgn.length > 200_000 || fen.length > 200) throw new Error("Invalid board");
  const payload = await withTransaction(async client => {
    const { rows } = await lockedMatch(client,"chess",gameId);
    const game = rows[0];
    if (!game || game.status !== "in_progress") throw new Error("Match is not active");
    const chess = new ServerChess(); if (game.pgn) chess.loadPgn(game.pgn);
    const mover = chess.turn() === "w" ? game.white_player_id : game.black_player_id;
    if (mover !== user.id) throw new Error("Not your turn");
    const submitted = new ServerChess(); submitted.loadPgn(pgn);
    const history = chess.history(), incoming = submitted.history();
    if (incoming.length !== history.length + 1 || history.some((m,i) => incoming[i] !== m) || submitted.fen() !== fen || submitted.turn() !== turn) throw new Error("Illegal move");
    // Deadline takes priority even when the proposed move is checkmate.
    const clockColumn = chess.turn() === "w" ? "white_time_ms" : "black_time_ms";
    const remaining = Math.max(0, Number(game[clockColumn]) - Math.max(0, Date.now() - new Date(game.last_move_timestamp || Date.now()).getTime()));
    const timedOut = remaining === 0;
    const result = timedOut ? (chess.turn() === "w" ? "black_won" : "white_won") : submitted.isCheckmate() ? (turn === "w" ? "black_won" : "white_won") : submitted.isDraw() ? "draw" : "in_progress";
    await client.query(`UPDATE chess_games SET pgn=$1,fen=$2,turn=$3,${clockColumn}=$4,last_move_timestamp=now(),updated_at=now(),draw_offered_by=NULL WHERE id=$5`, [timedOut ? game.pgn : pgn,timedOut ? game.fen : fen,timedOut ? chess.turn() : turn,remaining,gameId]);
    if (result !== "in_progress") await settleMatch(client,"chess",game,result,timedOut ? "timeout" : submitted.isCheckmate() ? "checkmate" : "draw");
    return { pgn: timedOut ? game.pgn : pgn, fen: timedOut ? game.fen : fen, turn: timedOut ? chess.turn() : turn, status:result, white_time_ms: clockColumn === "white_time_ms" ? remaining : game.white_time_ms, black_time_ms: clockColumn === "black_time_ms" ? remaining : game.black_time_ms, last_move_timestamp:new Date().toISOString() };
  });
  await publishChessEvent(gameId,{type:"move",senderId:user.id,payload}).catch(() => undefined);
  revalidatePath(`/dashboard/chess/${gameId}`);
}

export async function declareChessTimeout(gameId: string) {
  const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized");
  const result = await withTransaction(async client => {
    const {rows} = await lockedMatch(client,"chess",gameId);
    const game=rows[0];
    if (!game || ![game.white_player_id,game.black_player_id].includes(user.id) || game.status !== "in_progress") return null;
    const chess=new ServerChess(); if(game.pgn) chess.loadPgn(game.pgn);
    const white=chess.turn()==="w", column=white?"white_time_ms":"black_time_ms";
    if (!game.last_move_timestamp || Date.now()-new Date(game.last_move_timestamp).getTime()<Number(game[column])) return null;
    const status=white?"black_won":"white_won";
    await client.query(`UPDATE chess_games SET ${column}=0 WHERE id=$1`,[gameId]);
    await settleMatch(client,"chess",game,status,"timeout");
    return status;
  });
  if(result) await publishChessEvent(gameId,{type:"game_finished",payload:{status:result}}).catch(() => undefined);
  return {success:Boolean(result)};
}

export async function resignChessGame(gameId: string) {
  const user=await getCurrentUser(); if(!user) return {success:false,error:"Unauthorized"};
  await withTransaction(async client=>{
    const {rows}=await lockedMatch(client,"chess",gameId);
    const game=rows[0]; if(!game || ![game.white_player_id,game.black_player_id].includes(user.id)) throw new Error("Not a player");
    if(game.status!=="in_progress") return;
    await settleMatch(client,"chess",game,user.id===game.white_player_id?"black_won":"white_won","resignation");
  });
  await publishChessEvent(gameId,{type:"game_finished"}).catch(()=>undefined);
  revalidatePath(`/dashboard/chess/${gameId}`);
  return {success:true};
}

// Calling once offers a draw; only the other player can accept it.
export async function drawChessGame(gameId: string) {
  const user=await getCurrentUser(); if(!user) return {success:false,error:"Unauthorized"};
  const accepted=await withTransaction(async client=>{
    const {rows}=await lockedMatch(client,"chess",gameId);
    const game=rows[0]; if(!game || game.status!=="in_progress" || ![game.white_player_id,game.black_player_id].includes(user.id)) throw new Error("Match is unavailable");
    if(game.draw_offered_by && game.draw_offered_by!==user.id) { await settleMatch(client,"chess",game,"draw","agreement"); return true; }
    await client.query("UPDATE chess_games SET draw_offered_by=$1,updated_at=now() WHERE id=$2",[user.id,gameId]);
    return false;
  });
  await publishChessEvent(gameId,{type:accepted?"game_finished":"offer_draw",senderId:user.id,payload:{status:accepted?"draw":"in_progress"}}).catch(()=>undefined);
  return {success:true,offered:!accepted};
}

