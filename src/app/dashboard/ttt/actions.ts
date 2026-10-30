"use server";
import { getCurrentUser } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateMatch, settleMatch, lockedMatch, createWaitingMatch } from "@/lib/match-service";
import { publishGameEvent } from "@/lib/realtime";

type Game = { id: string; x_player_id: string | null; o_player_id: string | null; board_state: string; current_turn: "X" | "O"; status: string };
async function player() { const user = await getCurrentUser(); if (!user) throw new Error("Unauthorized"); return user; }
export async function createTttGame(preferredSymbol: "X" | "O" | "random" = "random") {
  const user=await player();
  if(!["X","O","random"].includes(preferredSymbol)) throw new Error("Invalid side");
  const firstSeat=preferredSymbol==="X"||(preferredSymbol==="random"&&Math.random()>0.5);
  const game=await createWaitingMatch("ttt",user.id,{firstSeat});
  redirect(`/dashboard/ttt/${game.id}`);
}
export async function challengeUserToTtt(targetUserId: string) {
  const user=await player();
  const game=await createWaitingMatch("ttt",user.id,{targetId:targetUserId});
  revalidatePath("/dashboard"); revalidatePath(`/profile/${targetUserId}`);
  return game;
}
export async function acceptTttChallenge(gameId: string, replaceActive = false) { const user=await player(); await activateMatch("ttt",gameId,user.id,true,replaceActive); redirect(`/dashboard/ttt/${gameId}`); }
export async function joinTttGame(gameId: string) { const user=await player(); await activateMatch("ttt",gameId,user.id,false); redirect(`/dashboard/ttt/${gameId}`); }
export async function cancelTttGame(gameId:string){const user=await player();const {rowCount}=await query("DELETE FROM ttt_games WHERE id=$1 AND status='waiting' AND (x_player_id=$2 OR o_player_id=$2)",[gameId,user.id]);if(rowCount)await query("INSERT INTO challenge_events (game_id,game_type,actor_id,event_type) VALUES ($1,'ttt',$2,'cancelled')",[gameId,user.id]);revalidatePath("/dashboard");}
function winner(board:string){for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(board[a]!=="-"&&board[a]===board[b]&&board[a]===board[c])return board[a];return null;}
export async function makeTttMove(gameId:string,index:number){const user=await player();if(!Number.isInteger(index)||index<0||index>8)throw new Error("Invalid move");const result=await withTransaction(async client=>{const {rows}=await lockedMatch(client,"ttt",gameId);const game=rows[0];if(!game||game.status!=="in_progress")throw new Error("Game not active");const symbol=game.x_player_id===user.id?"X":game.o_player_id===user.id?"O":null;if(!symbol||symbol!==game.current_turn)throw new Error("Not your turn");if(game.board_state[index]!=="-")throw new Error("Square already taken");const board=game.board_state.split("");board[index]=symbol;const win=winner(board.join(""));const nextStatus=win?`${win.toLowerCase()}_won`:board.includes("-")?"in_progress":"draw";const nextTurn=symbol==="X"?"O":"X";await client.query("UPDATE ttt_games SET board_state=$1,current_turn=$2,status=$3,winner_id=CASE WHEN $3='x_won' THEN x_player_id WHEN $3='o_won' THEN o_player_id ELSE NULL END,updated_at=now() WHERE id=$4",[board.join(""),nextTurn,nextStatus,gameId]);if(nextStatus!=="in_progress") await settleMatch(client,"ttt",game,nextStatus,win?"line":"draw");return {status:nextStatus,board:board.join(""),currentTurn:nextTurn};});await publishGameEvent("ttt",gameId,{type:"move",senderId:user.id,payload:result}).catch(()=>undefined);revalidatePath(`/dashboard/ttt/${gameId}`);return result.status;}
export async function resignTttGame(gameId:string) {
  const user=await player();
  await withTransaction(async client=>{
    const {rows}=await lockedMatch(client,"ttt",gameId);
    const game=rows[0];if(!game||![game.x_player_id,game.o_player_id].includes(user.id))throw new Error("Not a player");
    if(game.status!=="in_progress")return;
    await settleMatch(client,"ttt",game,game.x_player_id===user.id?"o_won":"x_won","resignation");
  });
  await publishGameEvent("ttt",gameId,{type:"game_finished"}).catch(()=>undefined);
  revalidatePath(`/dashboard/ttt/${gameId}`);
}
export async function createTttRematch(oldGameId:string) {
  const user=await player();
  const {rows}=await query<Game>("SELECT * FROM ttt_games WHERE id=$1",[oldGameId]);
  const old=rows[0];
  if(!old||![old.x_player_id,old.o_player_id].includes(user.id))throw new Error("Not a player");
  if(!["x_won","o_won","draw"].includes(old.status))throw new Error("Finish this match first");
  const target=old.x_player_id===user.id?old.o_player_id:old.x_player_id;
  if(!target)throw new Error("Opponent unavailable");
  const invitation=await challengeUserToTtt(target);
  return invitation.id;
}

