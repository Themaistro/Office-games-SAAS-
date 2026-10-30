import Ably from "ably";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getGameDefinition } from "@/lib/game-registry";
import { getGameChannelName } from "@/lib/realtime";
import { partySnapshot } from '@/lib/party-service';

export async function GET(request: Request) {
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const params=new URL(request.url).searchParams, type=params.get("type")||"",id=params.get("id")||"";
  const def=getGameDefinition(type);
  if((!def&&type!=='party')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:"Invalid match"},{status:400});
  if(type==='party') {try{await partySnapshot(user.id,id);}catch{return NextResponse.json({error:'Private or unavailable room'},{status:403});}} else if(def) {
  const {rows}=await query(`SELECT * FROM ${def.table} WHERE id=$1`,[id]);const game=rows[0];
  if(!game)return NextResponse.json({error:"Match not found"},{status:404});
  if(game.status==="waiting"&&game[def.playerColumns[0]]&&game[def.playerColumns[1]]&&!def.playerColumns.some(column=>game[column]===user.id))return NextResponse.json({error:"Private invitation"},{status:403});
  }
  const key=process.env.ABLY_API_KEY;if(!key)return NextResponse.json({error:"Push unavailable; polling remains active"},{status:503});
  const client=new Ably.Rest(key);
  const token=await client.auth.createTokenRequest({clientId:user.id,ttl:15*60_000,capability:JSON.stringify({[getGameChannelName(type,id)]:["subscribe"]})});
  return NextResponse.json(token,{headers:{"Cache-Control":"no-store"}});
}
