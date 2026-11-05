const { Client } = require('pg');
async function main() {
  const url=new URL(process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1'].includes(url.hostname)&&!process.argv.includes('--allow-remote'))throw new Error('Remote provisioning requires --allow-remote and an explicitly supplied migration connection.');
  const id=process.env.OFFICE_GAMES_COMPANY_ID,name=process.env.OFFICE_GAMES_COMPANY_NAME||'Office Games';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id||''))throw new Error('Supply a lowercase UUID in OFFICE_GAMES_COMPANY_ID');
  const c=new Client({connectionString:url.toString()});await c.connect();
  try{
    await c.query('BEGIN');const row=(await c.query('SELECT company_id FROM deployment_identity WHERE id=1 FOR UPDATE')).rows[0];
    if(!row)throw new Error('Run schema migrations before provisioning');
    if(row.company_id!==id&&(await c.query('SELECT 1 FROM users LIMIT 1')).rowCount)throw new Error('Refusing to reassign a database that already contains accounts');
    await c.query('UPDATE deployment_identity SET company_id=$1,company_name=$2 WHERE id=1',[id,name]);await c.query('COMMIT');console.log('Company database identity verified.');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{await c.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
