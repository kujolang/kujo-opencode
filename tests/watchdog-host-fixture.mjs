import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {run} from '../lib/process.mjs';
export async function watchdogHostFixture(root,installation){
 const directory=join(root,'watchdog');await mkdir(directory);
 const exec=promisify(execFile),source=installation.sources.watchdog.path;
 const sourceCommit=(await exec('git',['rev-parse','HEAD'],{cwd:source})).stdout.trim();
 assert.equal((await exec('git',['status','--porcelain'],{cwd:source})).stdout.trim(),'','Canonical Watchdog source must be clean');
 const provenance={source_commit:sourceCommit,source_clean:true,runtime_sha256:createHash('sha256').update(await readFile(installation.kujo_bin)).digest('hex')};
 const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const endpoint=`http://127.0.0.1:${port}`,token=randomUUID(),proxyToken=randomUUID();
 const exporters=join(directory,'exporters.json');await writeFile(exporters,JSON.stringify({schema_version:'watchdog.exporters.v1',exporters:[]}));
 let controller,running,terminal;
 async function start(){
  assert.ok(!controller,'Fixture already started');controller=new AbortController();terminal=null;
  const source=installation.sources.watchdog.path;
  running=run(installation.kujo_bin,['run',join(source,'dashboard_server.kujo'),'--interpreter','--isolated-imports'],{cwd:source,signal:controller.signal,killTree:true,timeoutMs:600000,maxBytes:65536,env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('WDG_'))),KUJO_MODULE_PATH:source,KUJO_ISOLATED_IMPORTS:'1',WDG_HOST:'127.0.0.1',WDG_PORT:String(port),WDG_DB_PATH:join(directory,'watchdog.db'),WDG_PROXY_CONFIG_PATH:join(directory,'proxy.json'),WDG_SOURCES_CONFIG_PATH:join(directory,'sources.json'),WDG_EXPORTERS_CONFIG_PATH:exporters,WDG_API_AUTH_MODE:'token',WDG_API_AUTH_TOKEN:token,WDG_PROXY_AUTHZ_MODE:'token',WDG_PROXY_AUTHZ_TOKEN:proxyToken}}).then(()=>terminal=true,()=>terminal=true);
  for(let i=0;i<100;i++){if(terminal)throw Error('Private Watchdog stopped before readiness');try{if((await fetch(endpoint+'/readyz',{signal:AbortSignal.timeout(500)})).ok)return;}catch{}await delay(100);}
  throw Error('Private Watchdog readiness timed out');
 }
 async function stop(){if(controller){controller.abort();await running;controller=null;}}
 async function records(){const response=await fetch(endpoint+'/api/telemetry/v2/records?producer=kujo-opencode',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(3000)});assert.equal(response.status,200);const body=await response.json();assert.ok(!JSON.stringify(body).includes(token),'Credential leaked into Watchdog response');return body.data.records.map(item=>item.record);}
 try{await start();return {endpoint,token,records,start,stop,provenance};}catch(error){await stop();throw error;}
}
