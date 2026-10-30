// Local-only checks for single-use invitations and transactional registration.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
if (!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local database only');
const load = Module._load, resolve = Module._resolveFilename;
Module._load = function(name, parent, main) { if(name==='server-only')return {}; return load.call(this,name,parent,main); };
Module._resolveFilename = function(name,parent,...args) { return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args); };
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, filename);
const { query } = require('../src/lib/db.ts');
const { createUser } = require('../src/lib/auth.ts');
const { findInvitation, invitationHash } = require('../src/lib/invitations.ts');
const email=`invitation-audit-${randomUUID()}@example.invalid`;
const token=randomBytes(32).toString('base64url');
const input={email,passwordHash:'not-a-login-hash',fullName:'Invitation test',department:'General',position:'Fixture',invitationToken:token};
async function main() {
  try {
    await query("INSERT INTO invitations(email,full_name,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[email,input.fullName,invitationHash(token)]);
    assert.equal((await findInvitation(token)).email,email);
    assert.equal(await findInvitation('invalid'),null);
    await assert.rejects(()=>createUser({...input,email:`wrong-${email}`}),/Invitation/);
    assert.ok(await findInvitation(token));
    console.log('PASS wrong email cannot use or consume an invitation');
    await query("UPDATE invitations SET expires_at=now()-interval '1 minute' WHERE email=$1",[email]);
    assert.equal(await findInvitation(token),null);
    await assert.rejects(()=>createUser(input),/Invitation/);
    console.log('PASS expired invitations cannot register');
    await query("UPDATE invitations SET expires_at=now()+interval '1 hour' WHERE email=$1",[email]);
    const attempts=await Promise.allSettled([createUser(input),createUser(input)]);
    assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(await findInvitation(token),null);
    assert.equal((await query('SELECT id FROM users WHERE email=$1',[email])).rowCount,1);
    console.log('PASS concurrent registration accepts one account and consumes the link once');
  } finally {
    await query('DELETE FROM users WHERE email=$1',[email]);
    await query('DELETE FROM invitations WHERE email=$1',[email]);
    await global.postgresPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
