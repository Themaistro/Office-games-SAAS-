const {spawnSync,spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.join(__dirname,'..');
module.exports=async function testContainer(runtimeConnection,fixtureConnection){
  const name='office-games-architecture-qa-'+randomUUID().slice(0,8);
  const envFile=path.join(os.tmpdir(),name+'.env');
  const url=new URL(runtimeConnection);url.hostname='host.docker.internal';
  const id='00000000-0000-4000-8000-000000000001';
  fs.writeFileSync(envFile,`DATABASE_URL=${url}\nOFFICE_GAMES_COMPANY_ID=${id}\nNEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID=${id}\nDATABASE_POOL_MAX=5\n`,{mode:0o600});
  const docker=args=>spawnSync('docker',args,{cwd:root,encoding:'utf8'});
  const build=target=>new Promise((resolve,reject)=>{
    const image=target==='runner'?'office-games:architecture-qa':'office-games:operator-qa';
    const child=spawn('docker',['build','--target',target,'--tag',image,'--build-arg',`NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID=${id}`,'.'],{cwd:root,stdio:'inherit'});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`Docker ${target} build failed`)));
  });
  try{
    await build('runner');await build('operator');
    const operatorUrl=new URL(fixtureConnection);operatorUrl.hostname='host.docker.internal';
    const operatorEnv=envFile+'.operator';
    fs.writeFileSync(operatorEnv,`DATABASE_URL=${operatorUrl}\nOFFICE_GAMES_COMPANY_ID=${id}\n`,{mode:0o600});
    try{
      const migrated=docker(['run','--rm','--env-file',operatorEnv,'office-games:operator-qa','node','scripts/migrate.cjs']);
      if(migrated.status!==0)throw new Error('Operator image migration rehearsal failed');
    }finally{fs.unlinkSync(operatorEnv);}
    const started=docker(['run','--detach','--rm','--name',name,'--env-file',envFile,'--publish','127.0.0.1:3102:3000','office-games:architecture-qa']);
    if(started.status!==0)throw new Error(started.stderr||'Container did not start');
    let ready=false;
    for(let i=0;i<60;i++){
      try{if((await fetch('http://127.0.0.1:3102/api/health',{signal:AbortSignal.timeout(1000)})).status===200){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!ready)throw new Error('Container readiness failed: '+docker(['logs',name]).stdout);
    const modules=docker(['exec',name,'node','-e',"require('pg');const fs=require('fs');fs.readFileSync('db/runtime-migrations.json');if(fs.existsSync('scripts/migrate.cjs')||fs.existsSync('db/content'))process.exit(1);console.log('Runtime driver present; operator tools excluded')"]);
    if(modules.status!==0)throw new Error(modules.stderr||'Missing container runtime dependencies');
    const test=spawnSync(process.execPath,['scripts/load-test-local.cjs'],{cwd:root,stdio:'inherit',env:{...process.env,LOAD_TEST_URL:'http://127.0.0.1:3102',LOAD_TEST_DATABASE_URL:fixtureConnection,LOAD_TEST_TARGET:'Docker production image with restricted runtime database role',LOAD_TEST_REPORT:'container-capacity.json'}});
    if(test.status!==0)throw new Error('Container HTTP verification failed');
    console.log('PASS Docker runtime with restricted database role and no operator tools; separate migration image rehearsed.');
  }finally{
    docker(['rm','--force',name]);
    fs.unlinkSync(envFile);
  }
};
