const { spawn } = require('node:child_process'), net = require('node:net'), path = require('node:path');
const root = path.join(__dirname,'..'), port = 3100;
async function main() {
  await new Promise((resolve,reject) => {
    const probe=net.createServer(); probe.once('error',()=>reject(new Error('Port 3100 is already occupied; refusing to replace another service.')));
    probe.listen(port,'127.0.0.1',()=>probe.close(resolve));
  });
  let logs='';
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data.toString()).slice(-15000);});
  try {
    let ready=false;
    for(let attempt=0;attempt<40;attempt++){
      if(server.exitCode!==null)throw new Error('Production server exited: '+logs);
      try{if((await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)})).status===200){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!ready)throw new Error('Production server did not become ready: '+logs);
    await new Promise((resolve,reject)=>{
      const test=spawn(process.execPath,['scripts/load-test-local.cjs'],{cwd:root,stdio:'inherit',env:{...process.env,LOAD_TEST_URL:`http://127.0.0.1:${port}`}});
      test.once('error',reject);test.once('exit',code=>code===0?resolve():reject(new Error('HTTP verification failed')));
    });
  }finally{server.kill();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
