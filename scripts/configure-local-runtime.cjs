// Local-only operator tooling. Never imported by the application.
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto'),{spawnSync}=require('node:child_process');
const dotenv=require('dotenv');
const root=path.join(__dirname,'..'),appPath=path.join(root,'.env.local'),operatorPath=path.join(root,'.env.migrations.local');
async function main(){
  let body=fs.readFileSync(appPath,'utf8');
  const app=dotenv.parse(body),operator=fs.existsSync(operatorPath)?dotenv.parse(fs.readFileSync(operatorPath)):{};
  const migration=operator.MIGRATION_DATABASE_URL||app.MIGRATION_DATABASE_URL||app.DATABASE_URL;
  const adminUrl=new URL(migration),runtimeUrl=new URL(app.DATABASE_URL);
  if(![adminUrl,runtimeUrl].every(url=>['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('This command supports local PostgreSQL only');
  if(adminUrl.pathname!==runtimeUrl.pathname||adminUrl.port!==runtimeUrl.port)throw new Error('Operator and application must target the same local database');
  const role='office_games_runtime_local',password=randomBytes(32).toString('hex');
  const result=spawnSync(process.execPath,['scripts/provision-runtime-role.cjs'],{cwd:root,env:{...process.env,...app,DATABASE_URL:migration,MIGRATION_DATABASE_URL:migration,RUNTIME_DATABASE_ROLE:role,RUNTIME_DATABASE_PASSWORD:password},encoding:'utf8'});
  if(result.status!==0)throw new Error('Unable to provision the local runtime role. Check operator access and company identity.');
  runtimeUrl.username=role;runtimeUrl.password=password;
  body=body.replace(/^MIGRATION_DATABASE_URL=.*(?:\r?\n|$)/gm,'');
  const line='DATABASE_URL='+runtimeUrl.toString();
  body=/^DATABASE_URL=.*$/m.test(body)?body.replace(/^DATABASE_URL=.*$/m,()=>line):body+'\n'+line+'\n';
  // Save operator access before removing it from the application environment.
  fs.writeFileSync(operatorPath,'MIGRATION_DATABASE_URL='+migration+'\n',{mode:0o600});
  fs.writeFileSync(appPath,body,{mode:0o600});
  console.log('Local runtime role configured. Operator credentials are isolated in .env.migrations.local. Restart the local app to use the new credential.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
