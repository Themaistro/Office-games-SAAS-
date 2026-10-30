"use server";

import { getCurrentUser } from "@/lib/auth";
import { activateMatch, settleMatch, lockedMatch, createWaitingMatch } from "@/lib/match-service";
import { query, withTransaction } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { publishGameEvent } from "@/lib/realtime";

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
  const user=await player();
  const game=await createWaitingMatch("connect-four",user.id);
  redirect(`/dashboard/connect-four/${game.id}`);
}
export async function challengeUserToConnectFour(targetUserId: string) {
  const user=await player();
  const game=await createWaitingMatch("connect-four",user.id,{targetId:targetUserId});
  revalidatePath("/dashboard"); revalidatePath(`/profile/${targetUserId}`);
  return game;
}

export async function acceptConnectFourChallenge(gameId: string, replaceActive = false) { const user=await player(); await activateMatch("connect-four",gameId,user.id,true,replaceActive); redirect(`/dashboard/connect-four/${gameId}`); }

export async function joinConnectFourGame(gameId: string) { const user=await player(); await activateMatch("connect-four",gameId,user.id,false); redirect(`/dashboard/connect-four/${gameId}`); }

export async function cancelConnectFourGame(gameId: string) {
  const user = await player();
  const { rowCount } = await query("DELETE FROM connect_four_games WHERE id = $1 AND status = 'waiting' AND (red_player_id = $2 OR yellow_player_id = $2)", [gameId, user.id]);
  if (rowCount) await query("INSERT INTO challenge_events (game_id,game_type,actor_id,event_type) VALUES ($1,'connect-four',$2,'cancelled')", [gameId, user.id]);
  revalidatePath("/dashboard");
}

export async function makeConnectFourMove(gameId: string, column: number) {
  const user=await player();if(!Number.isInteger(column)||column<0||column>=WIDTH)throw new Error("Invalid column");
  const payload=await withTransaction(async client=>{
    const {rows}=await lockedMatch(client,"connect-four",gameId);
    const game=rows[0];if(!game||game.status!=="in_progress")throw new Error("Game is not active");
    const token=game.red_player_id===user.id?"R":game.yellow_player_id===user.id?"Y":null;
    if(!token||token!==game.current_turn)throw new Error("Not your turn");
    const board=game.board_state.split("");let row=-1;
    for(let r=HEIGHT-1;r>=0;r--)if(board[r*WIDTH+column]==="-"){row=r;break;}
    if(row<0)throw new Error("Column is full");
    board[row*WIDTH+column]=token;
    const win=winner(board,token),draw=!win&&!board.includes("-");
    const status=win?(token==="R"?"red_won":"yellow_won"):draw?"draw":"in_progress",currentTurn=token==="R"?"Y":"R";
    await client.query("UPDATE connect_four_games SET board_state=$1,current_turn=$2,updated_at=now() WHERE id=$3",[board.join(""),currentTurn,gameId]);
    if(status!=="in_progress")await settleMatch(client,"connect-four",game,status,win?"line":"draw");
    return {board:board.join(""),currentTurn,status};
  });
  await publishGameEvent("connect-four",gameId,{type:"move",senderId:user.id,payload}).catch(()=>undefined);
  revalidatePath(`/dashboard/connect-four/${gameId}`);
  return payload;
}

export async function resignConnectFourGame(gameId:string) {
  const user=await player();
  await withTransaction(async client=>{
    const {rows}=await lockedMatch(client,"connect-four",gameId);const game=rows[0];
    if(!game||![game.red_player_id,game.yellow_player_id].includes(user.id))throw new Error("Not a player");
    if(game.status!=="in_progress")return;
    await settleMatch(client,"connect-four",game,user.id===game.red_player_id?"yellow_won":"red_won","resignation");
  });
  await publishGameEvent("connect-four",gameId,{type:"game_finished"}).catch(()=>undefined);
  revalidatePath(`/dashboard/connect-four/${gameId}`);
}

