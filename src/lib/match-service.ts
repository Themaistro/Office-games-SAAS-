import "server-only";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import { GAME_REGISTRY, GAME_TYPES, type GameType } from "./game-registry";

// All games use the same participant locks, lifecycle and rank settlement.
export async function createWaitingMatch(type: GameType, userId: string, options: { targetId?: string; firstSeat?: boolean; timeMs?: number } = {}) {
  const def = GAME_REGISTRY[type];
  const [a, b] = def.playerColumns;
  const target = options.targetId;
  if ("targetId" in options && (typeof target !== "string" || target === userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))) throw new Error("Invalid challenge target");
  const timeMs = options.timeMs ?? 600000;
  if (type === "chess" && (!Number.isInteger(timeMs) || timeMs < 60000 || timeMs > 3600000)) throw new Error("Choose a chess clock between 1 and 60 minutes");
  return withTransaction(async client => {
    const participants = [userId, ...(target ? [target] : [])];
    await lockPlayers(client, participants);
    const eligible = await client.query("SELECT id FROM profiles WHERE id=ANY($1::uuid[]) AND role='employee' AND is_active=true", [participants]);
    if (eligible.rowCount !== participants.length) throw new Error("That player is unavailable");
    if (target) {
      const pending = await client.query(`SELECT id FROM ${def.table} WHERE status='waiting' AND ((${a}=$1 AND ${b}=$2) OR (${a}=$2 AND ${b}=$1)) LIMIT 1`, [userId, target]);
      if (pending.rowCount) throw new Error(`A ${def.label} invitation is already waiting between these players`);
    } else {
      await assertAvailable(client, userId);
      const existing = await client.query(`SELECT * FROM ${def.table} WHERE status='waiting' AND ((${a}=$1 AND ${b} IS NULL) OR (${b}=$1 AND ${a} IS NULL)) AND created_at>now()-interval '30 minutes' LIMIT 1`, [userId]);
      const lobby = existing.rows[0];
      const requestedSeat = options.firstSeat === false ? b : a;
      if (lobby?.[requestedSeat] === userId && (type !== "chess" || (Number(lobby.white_time_ms) === timeMs && Number(lobby.black_time_ms) === timeMs))) return { id: lobby.id as string };
      // Replace only this player's public lobbies. Never erase private invitations
      // addressed to them, or silently cancel another coworker's invitation.
      for (const registered of Object.values(GAME_REGISTRY)) {
        const [x,y] = registered.playerColumns;
        const cancelled = await client.query(`DELETE FROM ${registered.table} WHERE status='waiting' AND ((${x}=$1 AND ${y} IS NULL) OR (${y}=$1 AND ${x} IS NULL)) RETURNING id`, [userId]);
        for (const row of cancelled.rows) await client.query("INSERT INTO challenge_events(game_id,game_type,actor_id,event_type) VALUES($1,$2,$3,'cancelled')", [row.id,registered.type,userId]);
      }
    }
    const first = target || options.firstSeat !== false ? userId : null;
    const second = target || (options.firstSeat === false ? userId : null);
    const clockColumns = type === "chess" ? ",white_time_ms,black_time_ms" : "";
    const clockValues = type === "chess" ? ",$3,$3" : "";
    const created = await client.query(`INSERT INTO ${def.table}(${a},${b}${clockColumns}) VALUES($1,$2${clockValues}) RETURNING id`, type === "chess" ? [first,second,timeMs] : [first,second]);
    const id = created.rows[0].id as string;
    if (target) await client.query("INSERT INTO challenge_events(game_id,game_type,actor_id,challenger_id,challenged_id,event_type) VALUES($1,$2,$3,$3,$4,'created')", [id,type,userId,target]);
    return { id };
  });
}

export async function lockPlayers(client: PoolClient, ids: string[], requireActive = true) {
  const unique = [...new Set(ids)].sort();
  const { rows } = await client.query("SELECT id FROM profiles WHERE id = ANY($1::uuid[]) AND ($2::boolean=false OR is_active=true) ORDER BY id FOR UPDATE", [unique,requireActive]);
  if (rows.length !== unique.length) throw new Error("A player is unavailable");
}

export async function assertAvailable(client: PoolClient, userId: string, excluded?: string) {
  const party = await client.query("SELECT r.id FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='in_progress' AND r.updated_at>now()-interval '2 hours' AND ($2::uuid IS NULL OR r.id<>$2) LIMIT 1", [userId,excluded??null]);
  if(party.rowCount)throw new Error('A player is already in a Lounge party. Finish or leave it first.');
  for (const type of GAME_TYPES) {
    const { table, playerColumns: [a, b] } = GAME_REGISTRY[type];
    const { rows } = await client.query(`SELECT id FROM ${table} WHERE status='in_progress' AND (${a}=$1 OR ${b}=$1) AND ($2::uuid IS NULL OR id<>$2) LIMIT 1`, [userId, excluded ?? null]);
    if (rows.length) throw new Error("A player is already in a match. Finish or resign it first.");
  }
}

export async function lockedMatch(client: PoolClient, type: GameType, id: string) {
  const definition=GAME_REGISTRY[type];
  const initial=await client.query(`SELECT * FROM ${definition.table} WHERE id=$1`,[id]);
  if(initial.rows[0])await lockPlayers(client,definition.playerColumns.map(column=>initial.rows[0][column]).filter(Boolean),false);
  return client.query(`SELECT * FROM ${definition.table} WHERE id=$1 FOR UPDATE`,[id]);
}

export async function activateMatch(type: GameType, gameId: string, userId: string, direct: boolean, replaceActive = false) {
  const def = GAME_REGISTRY[type];
  const [a, b] = def.playerColumns;
  return withTransaction(async client => {
    const { rows: initial } = await client.query(`SELECT * FROM ${def.table} WHERE id=$1`, [gameId]);
    const snapshot = initial[0];
    if (!snapshot) throw new Error("Game not found");
    const ids = [snapshot[a], snapshot[b], userId].filter(Boolean) as string[];
    if (replaceActive) for (const otherType of GAME_TYPES) {
      const other = GAME_REGISTRY[otherType], [x,y] = other.playerColumns;
      const active = await client.query(`SELECT ${x},${y} FROM ${other.table} WHERE status='in_progress' AND (${x}=$1 OR ${y}=$1) AND id<>$2`,[userId,gameId]);
      for(const row of active.rows)ids.push(...[row[x],row[y]].filter(Boolean));
    }
    if(replaceActive){const seats=await client.query("SELECT p.user_id FROM lounge_room_players p WHERE p.room_id IN (SELECT p2.room_id FROM lounge_room_players p2 JOIN lounge_rooms r ON r.id=p2.room_id WHERE p2.user_id=$1 AND p2.state='joined' AND r.status='in_progress')",[userId]);ids.push(...seats.rows.map(p=>p.user_id));}
    await lockPlayers(client, ids);
    const { rows } = await client.query(`SELECT * FROM ${def.table} WHERE id=$1 FOR UPDATE`, [gameId]);
    const game = rows[0];
    if (game.status === "in_progress" && [game[a], game[b]].includes(userId)) return;
    if (game.status !== "waiting") throw new Error("This invitation is no longer available");
    if (Date.now() - new Date(game.created_at).getTime() > 30 * 60_000) throw new Error("This invitation has expired");
    if (direct && (game[b] !== userId || !game[a])) throw new Error("This invitation is not addressed to you");
    if (!direct && game[a] && game[b]) throw new Error("This is a private invitation");
    if (!direct && [game[a], game[b]].includes(userId)) return;
    for (const id of [game[a],game[b]].filter(Boolean)) if(id!==userId)await assertAvailable(client,id,gameId);
    if(replaceActive)for(const otherType of GAME_TYPES){
      const other=GAME_REGISTRY[otherType],[x,y]=other.playerColumns;
      const active=await client.query(`SELECT * FROM ${other.table} WHERE status='in_progress' AND (${x}=$1 OR ${y}=$1) AND id<>$2 FOR UPDATE`,[userId,gameId]);
      for(const row of active.rows)await settleMatch(client,otherType,row,row[x]===userId?other.winStatuses[1]:other.winStatuses[0],"resigned_to_accept_invite");
    }
    if(replaceActive)await forfeitPartySeats(client,userId);
    await assertAvailable(client,userId,gameId);
    const seat = direct ? b : !game[a] ? a : b;
    const clock = type === "chess" ? ", last_move_timestamp=now()" : "";
    await client.query(`UPDATE ${def.table} SET ${seat}=$1,status='in_progress',updated_at=now()${clock} WHERE id=$2 AND status='waiting'`, [userId, gameId]);
    await client.query("INSERT INTO challenge_events(game_id,game_type,actor_id,challenger_id,challenged_id,event_type) VALUES($1,$2,$3,$4,$5,'accepted')", [gameId, type, userId, game[a] || userId, game[b] || userId]);
  });
}

export async function forfeitPartySeats(client:PoolClient,userId:string) {
  const rooms=await client.query("SELECT r.* FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='in_progress' ORDER BY r.id FOR UPDATE OF r",[userId]);
  for(const room of rooms.rows){
    await client.query("UPDATE lounge_room_players SET state='resigned' WHERE room_id=$1 AND user_id=$2",[room.id,userId]);
    const remaining=await client.query("SELECT user_id FROM lounge_room_players WHERE room_id=$1 AND state='joined' ORDER BY joined_at,user_id",[room.id]);
    if((remaining.rowCount??0)<2){
      if(room.phase==='question')await client.query('UPDATE lounge_room_players p SET score=score+a.points,correct_count=correct_count+CASE WHEN a.correct THEN 1 ELSE 0 END FROM lounge_room_answers a WHERE p.room_id=$1 AND a.room_id=p.room_id AND a.user_id=p.user_id AND a.position=$2',[room.id,room.current_round]);
      await client.query("UPDATE lounge_rooms SET status='finished',phase='reveal',ended_at=now(),updated_at=now() WHERE id=$1",[room.id]);
    }
    if(room.host_id===userId&&remaining.rows[0])await client.query('UPDATE lounge_rooms SET host_id=$2 WHERE id=$1',[room.id,remaining.rows[0].user_id]);
  }
}

export async function settleMatch(client: PoolClient, type: GameType, game: Record<string, any>, status: string, reason: string) {
  const def = GAME_REGISTRY[type];
  if (![...def.winStatuses, "draw"].includes(status)) throw new Error("Invalid result");
  const [p1, p2] = def.playerColumns.map(column => game[column] as string);
  if (!p1 || !p2 || p1 === p2) throw new Error("Two players are required");
  const winner = status === def.winStatuses[0] ? p1 : status === def.winStatuses[1] ? p2 : null;
  // The locked active game and unique ledger key make retries idempotent.
  const players = await client.query<{ id: string; lounge_lp: number; full_name: string; chess_elo: number; ttt_elo: number }>("SELECT id,lounge_lp,full_name,chess_elo,ttt_elo FROM profiles WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE", [[p1, p2]]);
  const first = players.rows.find(p => p.id === p1)!;
  const second = players.rows.find(p => p.id === p2)!;
  const delta = (id: string, lp: number) => winner === null ? 5 : winner === id ? 25 : -Math.min(15, lp);
  const d1 = delta(p1, first.lounge_lp), d2 = delta(p2, second.lounge_lp);
  const inserted = await client.query("INSERT INTO match_results(game_type,game_id,player1_id,player2_id,winner_id,reason,player1_lp_delta,player2_lp_delta) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING game_id", [type, game.id, p1, p2, winner, reason, d1, d2]);
  if (!inserted.rowCount) return;
  const winnerColumn = type === "connect-four" ? "" : ",winner_id=$3";
  await client.query(`UPDATE ${def.table} SET status=$1,updated_at=now()${winnerColumn} WHERE id=$2`, type === "connect-four" ? [status, game.id] : [status, game.id, winner]);
  await client.query("UPDATE profiles SET lounge_lp=GREATEST(0,lounge_lp+CASE WHEN id=$1 THEN $3::int ELSE $4::int END) WHERE id=ANY($2::uuid[])", [p1, [p1,p2], d1,d2]);
  if (type === "chess" || type === "ttt") {
    const column = type === "chess" ? "chess_elo" : "ttt_elo";
    const r1 = first[column], r2 = second[column];
    const expected = 1 / (1 + 10 ** ((r2-r1)/400));
    const adjustment = Math.round(32 * ((winner === null ? 0.5 : winner === p1 ? 1 : 0) - expected));
    await client.query(`UPDATE profiles SET ${column}=${column}+CASE WHEN id=$1 THEN $3::int ELSE -$3::int END WHERE id=ANY($2::uuid[])`, [p1,[p1,p2],adjustment]);
  }
  await client.query("INSERT INTO challenge_events(game_id,game_type,actor_id,challenger_id,challenged_id,event_type) VALUES($1,$2,$3,$4,$5,'completed')", [game.id,type,winner || p1,p1,p2]);
  const description = winner ? `${winner === p1 ? first.full_name : second.full_name} defeated ${winner === p1 ? second.full_name : first.full_name} in ${def.label}` : `${first.full_name} drew with ${second.full_name} in ${def.label}`;
  await client.query("INSERT INTO activity_feed(user_id,activity_type,metadata) VALUES($1,$2,$3::jsonb)", [winner || p1,type,JSON.stringify({description,game_id:game.id,result:status,reason})]);
}

export async function getMatchResult(type: GameType, id: string) {
  const { rows } = await query("SELECT * FROM match_results WHERE game_type=$1 AND game_id=$2", [type,id]);
  return rows[0] ?? null;
}
