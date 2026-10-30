import 'server-only';
import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from './db';
import { GAME_REGISTRY } from './game-registry';
import { assertAvailable, lockPlayers, settleMatch,forfeitPartySeats } from './match-service';
import { validateChallenge } from './challenge-validation';
import { isUuid, partyLabel, partyChoicePrompt, partyRoundDuration, SUPPORTED_PARTY_SLUGS, type PartyFormat, type PartyMode } from './party-contract';
import type { Question } from '@/types/game';

type Room = { id:string;host_id:string;format:PartyFormat;mode:PartyMode;visibility:string;status:string;phase:string;capacity:number;round_count:number;current_round:number;round_started_at:string;deadline_at:string;advance_at:string;updated_at:string;created_at:string };
type Member = { user_id:string;state:string;score:number;correct_count:number;full_name:string;avatar_url:string|null };
const members = async (c:PoolClient,id:string) => (await c.query<Member>('SELECT m.*,p.full_name,p.avatar_url FROM lounge_room_players m JOIN profiles p ON p.id=m.user_id WHERE room_id=$1 ORDER BY joined_at,user_id',[id])).rows;

async function employee(c:PoolClient,id:string) {
  const p=await c.query("SELECT id FROM profiles WHERE id=$1 AND role='employee' AND is_active=true",[id]);
  if(!p.rowCount)throw new Error('Player access required');
}
async function roomTx<T>(id:string,userId:string,fn:(c:PoolClient,r:Room)=>Promise<T>) {
  if(!isUuid(id))throw new Error('Invalid room');
  return withTransaction(async c=>{
    // Match commands always lock identities before a room/game row.
    const roster=await members(c,id);const ids=[userId,...roster.map(p=>p.user_id)];
    for(const def of Object.values(GAME_REGISTRY)) {
      const [a,b]=def.playerColumns;
      const active=await c.query(`SELECT ${a},${b} FROM ${def.table} WHERE status='in_progress' AND (${a}=$1 OR ${b}=$1)`,[userId]);
      for(const g of active.rows)ids.push(g[a],g[b]);
    }
    const other=await c.query("SELECT p.user_id FROM lounge_room_players p WHERE p.room_id IN (SELECT room_id FROM lounge_room_players WHERE user_id=$1 AND state='joined')",[userId]);
    ids.push(...other.rows.map(p=>p.user_id));
    await lockPlayers(c,ids.filter(Boolean),false);await employee(c,userId);
    const {rows}=await c.query<Room>('SELECT * FROM lounge_rooms WHERE id=$1 FOR UPDATE',[id]);
    if(!rows[0])throw new Error('Room not found');
    const latest=await members(c,id);
    if(latest.some(p=>!ids.includes(p.user_id)))throw new Error('The roster changed. Please try again.');
    return fn(c,rows[0]);
  });
}

async function finish(c:PoolClient,r:Room,status='finished') {
  await c.query('UPDATE lounge_rooms SET status=$1,ended_at=now(),updated_at=now() WHERE id=$2',[status,r.id]);
  await c.query("UPDATE lounge_room_invites SET status='cancelled' WHERE room_id=$1 AND status='pending'",[r.id]);
  r.status=status;
}

async function reconcile(c:PoolClient,r:Room) {
  const now=Date.now();
  if(r.status==='finished'||r.status==='cancelled')return;
  await c.query("UPDATE lounge_room_invites SET status='expired' WHERE room_id=$1 AND status='pending' AND expires_at<=now()",[r.id]);
  if(r.status==='waiting'&&now-new Date(r.created_at).getTime()>1800000){await finish(c,r,'cancelled');return;}
  if(r.status!=='in_progress')return;
  if(now-new Date(r.updated_at).getTime()>7200000){await finish(c,r,'cancelled');return;}
  const active=(await members(c,r.id)).filter(p=>p.state==='joined');
  if(r.phase==='question') {
    const submitted=await c.query('SELECT user_id FROM lounge_room_answers WHERE room_id=$1 AND position=$2',[r.id,r.current_round]);
    if(active.length<2||now>=new Date(r.deadline_at).getTime()||active.every(p=>submitted.rows.some(a=>a.user_id===p.user_id))) {
      // Scores are revealed together; live totals cannot leak answer correctness.
      await c.query('UPDATE lounge_room_players p SET score=score+a.points,correct_count=correct_count+CASE WHEN a.correct THEN 1 ELSE 0 END FROM lounge_room_answers a WHERE p.room_id=$1 AND a.room_id=p.room_id AND a.user_id=p.user_id AND a.position=$2',[r.id,r.current_round]);
      const {rows}=await c.query<Room>("UPDATE lounge_rooms SET phase='reveal',advance_at=now()+interval '6 seconds',updated_at=now() WHERE id=$1 RETURNING *",[r.id]);Object.assign(r,rows[0]);
    }
  }
  if(active.length<2){await finish(c,r);return;}
  if(r.phase==='reveal'&&now>=new Date(r.advance_at).getTime()) {
    if(r.current_round+1>=r.round_count){await finish(c,r);return;}
    const next=await c.query('SELECT duration_seconds FROM lounge_room_rounds WHERE room_id=$1 AND position=$2',[r.id,r.current_round+1]);
    const {rows}=await c.query<Room>("UPDATE lounge_rooms SET current_round=current_round+1,phase='question',round_started_at=now(),deadline_at=now()+$2*interval '1 second',advance_at=NULL,updated_at=now() WHERE id=$1 RETURNING *",[r.id,next.rows[0].duration_seconds]);Object.assign(r,rows[0]);
  }
}

export async function createParty(userId:string,input:{format:PartyFormat;mode:PartyMode;rounds:number;visibility:'public'|'private'}) {
  if(!['trivia','mixed'].includes(input.format)||!['duel','group'].includes(input.mode)||!['public','private'].includes(input.visibility)||!Number.isInteger(input.rounds)||input.rounds<3||input.rounds>20)throw new Error('Invalid room settings');
  return withTransaction(async c=>{
    await lockPlayers(c,[userId]);await employee(c,userId);await assertAvailable(c,userId);
    const existing=await c.query("SELECT r.id FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='waiting' AND r.created_at>now()-interval '30 minutes' LIMIT 1",[userId]);
    if(existing.rowCount)throw new Error('You already have a waiting room. Return to it or leave it first.');
    const {rows}=await c.query("INSERT INTO lounge_rooms(host_id,format,mode,visibility,capacity,round_count) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[userId,input.format,input.mode,input.visibility,input.mode==='duel'?2:12,input.rounds]);
    await c.query('INSERT INTO lounge_room_players(room_id,user_id) VALUES($1,$2)',[rows[0].id,userId]);return rows[0].id as string;
  });
}

export async function joinParty(userId:string,id:string,replaceActive=false) {
  return roomTx(id,userId,async(c,r)=>{
    await reconcile(c,r);
    const alreadyJoined=(await members(c,id)).some(p=>p.user_id===userId&&p.state==='joined');
    if(alreadyJoined&&r.status==='in_progress')return;
    if(r.status!=='waiting')throw new Error('This room has already started or closed');
    const roster=await members(c,id);
    if(roster.some(p=>p.user_id===userId&&p.state==='joined'))return;
    if(roster.filter(p=>p.state==='joined').length>=r.capacity)throw new Error('This room is full');
    const invitation=await c.query("SELECT id FROM lounge_room_invites WHERE room_id=$1 AND recipient_id=$2 AND status='pending' AND expires_at>now()",[id,userId]);
    if(r.visibility==='private'&&!invitation.rowCount)throw new Error('You need an invitation to this private room');
    if(replaceActive){
      for(const def of Object.values(GAME_REGISTRY)) {
        const [a,b]=def.playerColumns;
        const games=await c.query(`SELECT * FROM ${def.table} WHERE status='in_progress' AND (${a}=$1 OR ${b}=$1) FOR UPDATE`,[userId]);
        for(const game of games.rows)await settleMatch(c,def.type,game,game[a]===userId?def.winStatuses[1]:def.winStatuses[0],'resigned_to_accept_invite');
      }
      await forfeitPartySeats(c,userId);
    }
    await assertAvailable(c,userId);
    const otherWaiting=await c.query("SELECT r.id FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='waiting' AND r.id<>$2 AND r.created_at>now()-interval '30 minutes' LIMIT 1",[userId,id]);
    if(otherWaiting.rowCount)throw new Error('Leave your other waiting room before joining this one.');
    await c.query("INSERT INTO lounge_room_players(room_id,user_id) VALUES($1,$2) ON CONFLICT(room_id,user_id) DO UPDATE SET state='joined'",[id,userId]);
    await c.query("UPDATE lounge_room_invites SET status='accepted' WHERE room_id=$1 AND recipient_id=$2 AND status='pending'",[id,userId]);
  });
}

export async function inviteParty(userId:string,id:string,target:string) {
  if(!isUuid(target)||target===userId)throw new Error('Choose another player');
  return roomTx(id,userId,async(c,r)=>{
    await reconcile(c,r);if(r.host_id!==userId||r.status!=='waiting')throw new Error('Only the host can invite before the game starts');
    await employee(c,target);
    const existing=await c.query("SELECT user_id FROM lounge_room_players WHERE room_id=$1 AND user_id=$2 AND state='joined'",[id,target]);
    if(existing.rowCount)throw new Error('That player is already in the room');
    const sent=await c.query("INSERT INTO lounge_room_invites(room_id,sender_id,recipient_id) VALUES($1,$2,$3) ON CONFLICT(room_id,recipient_id) DO UPDATE SET status='pending',created_at=now(),expires_at=now()+interval '30 minutes' WHERE lounge_room_invites.status<>'pending' RETURNING id",[id,userId,target]);
    if(!sent.rowCount)throw new Error('An invitation is already waiting for that player');
  });
}

export async function cancelPartyInvite(userId:string,id:string,target:string) {
  if(!isUuid(target))throw new Error('Invalid player');
  return roomTx(id,userId,async(c,r)=>{if(r.host_id!==userId||r.status!=='waiting')throw new Error('Only the host can cancel waiting invitations');await c.query("UPDATE lounge_room_invites SET status='cancelled' WHERE room_id=$1 AND recipient_id=$2 AND status='pending'",[id,target]);});
}

async function freezePack(c:PoolClient,r:Room) {
  const {rows}=await c.query(`SELECT q.*,gt.name,gt.slug,gt.easy_rounds,gt.medium_rounds,gt.hard_rounds FROM questions q JOIN game_types gt ON gt.id=q.game_type_id WHERE q.is_active=true AND gt.is_active=true AND gt.slug=ANY($1::text[]) AND NOT COALESCE((q.content->>'isCompanyTrivia')::boolean,false) ORDER BY random() LIMIT 4000`,[r.format==='trivia'?['trivia']:SUPPORTED_PARTY_SLUGS]);
  const seen=new Set<string>();
  const pool=rows.filter(q=>{
    if(Number(q[`${q.difficulty}_rounds`])===0)return false;
    if(r.format==='trivia'&&(!Array.isArray(q.options)||q.options.length<2||!q.options.includes(q.correct_answer)||!q.content.question))return false;
    if(['card_match','card-match'].includes(q.slug)&&!q.content.cards?.length)return false;
    if(q.slug==='coding'&&!partyChoicePrompt({game_type:{slug:q.slug},content:q.content,options:q.options}))return false;
    const key=q.slug+':'+(q.content.question||q.content.sourceKey||q.content.text||q.id);if(seen.has(key))return false;seen.add(key);return true;
  });
  const selected:typeof pool=[];
  if(r.format==='mixed'){
    const types=[...new Set(pool.map(q=>q.slug))];
    while(selected.length<r.round_count&&pool.length){for(const slug of types){const i=pool.findIndex(q=>q.slug===slug);if(i>=0)selected.push(pool.splice(i,1)[0]);if(selected.length===r.round_count)break;}}
  }else selected.push(...pool.slice(0,r.round_count));
  if(selected.length<r.round_count)throw new Error('Not enough eligible challenges. Activate more content or choose fewer rounds.');
  // Only company-wide prompts are fair for a room spanning departments.
  const company=await c.query("SELECT * FROM company_trivia WHERE is_active=true AND department='General' AND (target_date IS NULL OR target_date=CURRENT_DATE) ORDER BY target_date NULLS LAST,random() LIMIT 1");
  if(company.rows[0]){const q=company.rows[0];if(typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length>1&&q.options.includes(q.correct_answer)){const slot=Math.floor(Math.random()*selected.length);selected[slot]={...selected[slot],id:randomUUID(),slug:'trivia',name:'Company Trivia',difficulty:'medium',content:{question:q.question,isCompanyTrivia:true},options:q.options,correct_answer:q.correct_answer};}}
  for(const [position,q]of selected.entries()){
    const question:Question={id:q.id,game_type_id:q.game_type_id,game_type:{id:q.game_type_id,slug:q.slug,name:q.name,description:''},difficulty:q.difficulty,content:q.content,options:q.options,correct_answer:q.correct_answer,base_xp:0};
    const duration=partyRoundDuration(q.slug,q.difficulty);
    await c.query('INSERT INTO lounge_room_rounds(room_id,position,question,duration_seconds) VALUES($1,$2,$3::jsonb,$4)',[r.id,position,JSON.stringify(question),duration]);
  }
}

export async function startParty(userId:string,id:string) {
  return roomTx(id,userId,async(c,r)=>{
    if(r.host_id!==userId)throw new Error('Only the host can start');
    await reconcile(c,r);if(r.status!=='waiting')throw new Error('Room is not waiting');
    const roster=(await members(c,id)).filter(p=>p.state==='joined');
    if(roster.length<2)throw new Error('At least two players must join');
    for(const p of roster){await employee(c,p.user_id);await assertAvailable(c,p.user_id,id);}
    await freezePack(c,r);
    const first=await c.query('SELECT duration_seconds FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[id]);
    await c.query("UPDATE lounge_rooms SET status='in_progress',round_started_at=now()+interval '5 seconds',deadline_at=now()+interval '5 seconds'+$2*interval '1 second',updated_at=now() WHERE id=$1",[id,first.rows[0].duration_seconds]);
    await c.query("UPDATE lounge_room_invites SET status='cancelled' WHERE room_id=$1 AND status='pending'",[id]);
  });
}

export async function answerParty(userId:string,id:string,position:number,answer:string,interactionSeconds?:number) {
  if(typeof answer!=='string'||answer.length>20000||!Number.isInteger(position))throw new Error('Invalid answer');
  return roomTx(id,userId,async(c,r)=>{
    const player=(await members(c,id)).find(p=>p.user_id===userId&&p.state==='joined');
    if(!player)throw new Error('Only active players can answer');
    await reconcile(c,r);
    const previous=await c.query('SELECT user_id FROM lounge_room_answers WHERE room_id=$1 AND position=$2 AND user_id=$3',[id,position,userId]);
    if(previous.rowCount)return;
    const elapsed=Date.now()-new Date(r.round_started_at).getTime();
    if(r.status!=='in_progress'||r.phase!=='question'||position!==r.current_round||elapsed<0||Date.now()>=new Date(r.deadline_at).getTime())throw new Error('This round is not accepting answers');
    const row=(await c.query('SELECT * FROM lounge_room_rounds WHERE room_id=$1 AND position=$2',[id,position])).rows[0];const q=row.question as Question;
    const seconds=interactionSeconds===undefined?elapsed/1000:interactionSeconds;
    if(!Number.isFinite(seconds)||seconds<0||seconds>elapsed/1000+2)throw new Error('Invalid interaction timing');
    const result=validateChallenge({id:q.id,slug:q.game_type.slug,difficulty:q.difficulty,content:q.content,correctAnswer:q.correct_answer},answer,seconds);
    const points=result.correct?100+Math.max(0,Math.floor(20*(1-elapsed/(row.duration_seconds*1000)))):0;
    await c.query('INSERT INTO lounge_room_answers(room_id,position,user_id,answer,correct,points,elapsed_ms) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[id,position,userId,answer,result.correct,points,Math.floor(elapsed)]);
    await reconcile(c,r);
  });
}

export async function leaveParty(userId:string,id:string) {
  return roomTx(id,userId,async(c,r)=>{
    await reconcile(c,r);
    if(r.status==='finished'||r.status==='cancelled')return;
    const roster=await members(c,id);if(!roster.some(p=>p.user_id===userId&&p.state==='joined'))return;
    await c.query("UPDATE lounge_room_players SET state=$3 WHERE room_id=$1 AND user_id=$2",[id,userId,r.status==='in_progress'?'resigned':'left']);
    const remaining=roster.filter(p=>p.user_id!==userId&&p.state==='joined');
    if(!remaining.length)await finish(c,r,'cancelled');
    else if(r.host_id===userId){await c.query('UPDATE lounge_rooms SET host_id=$2 WHERE id=$1',[id,remaining[0].user_id]);r.host_id=remaining[0].user_id;}
    await reconcile(c,r);
  });
}

export async function partySnapshot(userId:string,id:string) {
  if(!isUuid(id))throw new Error('Invalid room');
  return withTransaction(async c=>{
    await employee(c,userId);
    const r=(await c.query<Room>('SELECT * FROM lounge_rooms WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)throw new Error('Room not found');
    const roster=await members(c,id);const me=roster.find(p=>p.user_id===userId);
    const invited=await c.query("SELECT id FROM lounge_room_invites WHERE room_id=$1 AND recipient_id=$2 AND status IN ('pending','accepted') AND expires_at>now()",[id,userId]);
    if(r.visibility==='private'&&!me&&!invited.rowCount)throw new Error('This is a private room');
    if(!me||me.state!=='joined')await c.query('INSERT INTO lounge_room_spectators(room_id,user_id) VALUES($1,$2) ON CONFLICT(room_id,user_id) DO UPDATE SET last_seen=now()',[id,userId]);
    const spectators=await c.query("SELECT count(*)::int AS count FROM lounge_room_spectators s WHERE room_id=$1 AND last_seen>now()-interval '15 seconds' AND NOT EXISTS(SELECT 1 FROM lounge_room_players p WHERE p.room_id=s.room_id AND p.user_id=s.user_id AND p.state='joined')",[id]);
    await reconcile(c,r);
    const round=(await c.query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=$2',[id,r.current_round])).rows[0];
    const answers=(await c.query('SELECT user_id,answer,correct,points FROM lounge_room_answers WHERE room_id=$1 AND position=$2',[id,r.current_round])).rows;
    const reveal=r.phase==='reveal'||r.status==='finished';
    const correctAnswer=reveal&&round?(['mental_math','mental-math','stroop'].includes(round.question.game_type.slug)?validateChallenge({id:round.question.id,slug:round.question.game_type.slug,difficulty:round.question.difficulty,content:round.question.content,correctAnswer:round.question.correct_answer},'',0).correctAnswer:round.question.correct_answer):undefined;
    const question=round?{...round.question,correct_answer:''}:null;
    // Do not send frozen future rounds or answer keys, even to the host.
    const liveQuestion=Date.now()>=new Date(r.round_started_at).getTime()?question:null;
    const updated=await members(c,id);
    const invitations=userId===r.host_id?(await c.query('SELECT i.id,i.recipient_id,i.status,p.full_name FROM lounge_room_invites i JOIN profiles p ON p.id=i.recipient_id WHERE i.room_id=$1',[id])).rows:[];
    return {room:r,label:partyLabel(r.format,r.mode),serverNow:new Date().toISOString(),spectatorCount:spectators.rows[0].count,myAnswer:answers.find(a=>a.user_id===userId)?.answer??null,players:updated.map(p=>({...p,submitted:answers.some(a=>a.user_id===p.user_id)})),question:liveQuestion,reveal:reveal?{correctAnswer,answers}:null,invitations,isMember:me?.state==='joined',isHost:r.host_id===userId};
  });
}
export type PartySnapshot = Awaited<ReturnType<typeof partySnapshot>>;

export async function listParties(userId:string) {
  const {rows}=await query(`SELECT r.*,p.full_name AS host_name,(SELECT count(*)::int FROM lounge_room_players WHERE room_id=r.id AND state='joined') AS player_count,EXISTS(SELECT 1 FROM lounge_room_players WHERE room_id=r.id AND user_id=$1 AND state='joined') AS joined FROM lounge_rooms r LEFT JOIN profiles p ON p.id=r.host_id WHERE (r.status='in_progress' AND r.updated_at>now()-interval '2 hours' OR r.status='waiting' AND r.created_at>now()-interval '30 minutes') AND (r.visibility='public' OR EXISTS(SELECT 1 FROM lounge_room_players WHERE room_id=r.id AND user_id=$1) OR EXISTS(SELECT 1 FROM lounge_room_invites WHERE room_id=r.id AND recipient_id=$1 AND status='pending' AND expires_at>now())) ORDER BY r.created_at DESC LIMIT 40`,[userId]);return rows;
}
