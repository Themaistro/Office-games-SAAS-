import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { partySnapshot } from '@/lib/party-service';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});try{return NextResponse.json(await partySnapshot(user.id,(await params).id),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Room unavailable or private'},{status:404});}}
