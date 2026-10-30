const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),bcrypt=require('bcryptjs'),{Client}=require('pg');
const root=path.resolve(__dirname,'..'),file=path.join(root,'.local-audit-fixtures.json');
const env=require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local')));
if(!['localhost','127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname))throw new Error('Local only');
async function stageVisualFixtures(client, fixtures) {
  const ids=fixtures.people.map(person=>person.id);
  const verified=await client.query('SELECT id,email FROM users WHERE id=ANY($1::uuid[])',[ids]);
  if(verified.rowCount!==6||verified.rows.some(person=>person.email!==`ui-audit-${person.id}@example.invalid`))throw new Error('Presentation staging requires the disposable fixture accounts');
  const board=Array(42).fill('-');
  for(const [index,token] of [[35,'R'],[36,'Y'],[37,'R'],[38,'Y'],[28,'R'],[29,'Y']])board[index]=token;
  await client.query('UPDATE connect_four_games SET board_state=$1,updated_at=now() WHERE id=$2',[board.join(''),fixtures.games['connect-four']]);
  const {Chess}=require('chess.js');const chess=new Chess();
  for(const move of ['e4','e5','Nf3','Nc6'])chess.move(move);
  await client.query('UPDATE chess_games SET fen=$1,pgn=$2,last_move_timestamp=now(),updated_at=now() WHERE id=$3',[chess.fen(),chess.pgn(),fixtures.games.chess]);
}
async function main(){const client=new Client({connectionString:env.DATABASE_URL});await client.connect();try{
  if(process.argv.includes('--cleanup')){
    if(!fs.existsSync(file))return;
    const fixtures=JSON.parse(fs.readFileSync(file));const ids=fixtures.people.map(p=>p.id),games=Object.values(fixtures.games);
    const verified=await client.query('SELECT id,email FROM users WHERE id=ANY($1::uuid[])',[ids]);
    if(verified.rows.some(person=>person.email!==`ui-audit-${person.id}@example.invalid`))throw new Error('Cleanup refused: fixture identity mismatch');
    await client.query('BEGIN');
    for(const table of ['match_results','challenge_events'])await client.query(`DELETE FROM ${table} WHERE game_id=ANY($1::uuid[])`,[games]);
    await client.query('DELETE FROM activity_feed WHERE user_id=ANY($1::uuid[])',[ids]);
    await client.query('DELETE FROM lounge_rooms WHERE host_id=ANY($1::uuid[]) OR id IN (SELECT room_id FROM lounge_room_players WHERE user_id=ANY($1::uuid[]))',[ids]);
    for(const table of ['chess_games','ttt_games','connect_four_games'])await client.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[])`,[games]);
    await client.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);await client.query('COMMIT');fs.unlinkSync(file);console.log('Disposable UI fixtures removed.');return;
  }
  if(fs.existsSync(file)){
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(process.argv.includes('--stage'))await stageVisualFixtures(client,data);
    if(process.argv.includes('--party-users'))for(const table of ['ttt_games','chess_games','connect_four_games'])await client.query(`UPDATE ${table} SET status='draw' WHERE id=ANY($1::uuid[])`,[Object.values(data.games)]);
    if(process.argv.includes('--join-party')){
      const roomId=process.argv[process.argv.indexOf('--join-party')+1];
      if(!/^[0-9a-f-]{36}$/i.test(roomId||''))throw Error('Invalid fixture room');
      const room=await client.query("SELECT id FROM lounge_rooms WHERE id=$1 AND host_id=$2 AND status='waiting'",[roomId,data.people[0].id]);
      if(!room.rowCount)throw Error('Room must belong to this disposable host');
      await client.query('INSERT INTO lounge_room_players(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[roomId,data.people[1].id]);
    }
    console.log(JSON.stringify(data));return;
  }
  const password=`Local-audit-${crypto.randomBytes(8).toString('hex')}!`,hash=await bcrypt.hash(password,12),people=[];
  await client.query('BEGIN');
  for(let i=0;i<6;i++){const id=crypto.randomUUID(),email=`ui-audit-${id}@example.invalid`,name=i%2===0?'Morgan Lane':'Alex Rivera';await client.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[id,email,hash]);await client.query('INSERT INTO profiles(id,email,full_name,lounge_lp) VALUES($1,$2,$3,125)',[id,email,name]);people.push({id,email});}
  const games={};
  for(const [i,type,table,a,b]of [[0,'ttt','ttt_games','x_player_id','o_player_id'],[2,'connect-four','connect_four_games','red_player_id','yellow_player_id'],[4,'chess','chess_games','white_player_id','black_player_id']]){const {rows}=await client.query(`INSERT INTO ${table}(${a},${b},status) VALUES($1,$2,'in_progress') RETURNING id`,[people[i].id,people[i+1].id]);games[type]=rows[0].id;}
  await client.query('UPDATE chess_games SET last_move_timestamp=now() WHERE id=$1',[games.chess]);
  await client.query('COMMIT');const data={people,password,games};fs.writeFileSync(file,JSON.stringify(data,null,2));console.log(JSON.stringify(data));
}finally{await client.end();}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
