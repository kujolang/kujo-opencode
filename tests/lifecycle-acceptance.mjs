import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {LifecycleOutbox} from '../lib/lifecycle-outbox.mjs';
import {run} from '../lib/process.mjs';
export async function verifyLifecycleDelivery(binary,source){
 const root=await mkdtemp(join(tmpdir(),'kujo-watchdog-lifecycle-'));const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const endpoint=`http://127.0.0.1:${port}`,token='lifecycle-fixture-token',headers={Authorization:`Bearer ${token}`};
 const exporters=join(root,'exporters.json');await writeFile(exporters,JSON.stringify({schema_version:'watchdog.exporters.v1',exporters:[]}));
 const controller=new AbortController();let terminal=null;
 const running=run(binary,['run',join(source,'dashboard_server.kujo'),'--interpreter','--isolated-imports'],{cwd:source,signal:controller.signal,killTree:true,timeoutMs:45000,maxBytes:65536,env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('WDG_'))),KUJO_MODULE_PATH:source,KUJO_ISOLATED_IMPORTS:'1',WDG_HOST:'127.0.0.1',WDG_PORT:String(port),WDG_DB_PATH:join(root,'watchdog.db'),WDG_PROXY_CONFIG_PATH:join(root,'proxy.json'),WDG_SOURCES_CONFIG_PATH:join(root,'sources.json'),WDG_EXPORTERS_CONFIG_PATH:exporters,WDG_API_AUTH_MODE:'token',WDG_API_AUTH_TOKEN:token,WDG_PROXY_AUTHZ_MODE:'token',WDG_PROXY_AUTHZ_TOKEN:token}}).then(result=>terminal=result,error=>terminal={error:error.message});
 try{
  let ready=false;for(let i=0;i<100;i++){if(terminal)throw Error(JSON.stringify(terminal));try{if((await fetch(endpoint+'/readyz',{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}await delay(100);}assert.equal(ready,true,'Watchdog readiness');
  let now=Date.now();const opts={home:join(root,'home'),project:root,enabled:true,url:endpoint,token:()=>token,now:()=>now,version:'acceptance'};
  const one=new LifecycleOutbox({...opts,fetchImpl:async(url,options)=>{const response=await fetch(url,options);const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));throw Error('Simulated acknowledgement loss');}});
  const raw={phase:'tool.completed',sessionID:'ses_lifecycle',agent:'kujo-build',callID:'call_lifecycle',tool:'kujo_starter_create',provider:'fixture',model:'offline',input:'PRIVATE_CONTENT',output:'PRIVATE_CONTENT',headers:{Authorization:'PRIVATE_CREDENTIAL'}};
  await one.capture(raw);assert.equal((await one.flush()).sent,false);await one.close();now+=2000;
  const two=new LifecycleOutbox(opts);assert.equal((await two.flush()).sent,true);await two.close();
  const response=await fetch(endpoint+'/api/telemetry/v2/records?producer=kujo-opencode',{headers,signal:AbortSignal.timeout(3000)});const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));const records=body.data.records;assert.equal(records.length,1,'Retry must deduplicate at canonical Watchdog');
  assert.deepEqual(records[0].record.content,[]);assert.ok(records[0].record.references.some(ref=>ref.type==='tool_call'&&ref.id==='call_lifecycle'));assert.doesNotMatch(JSON.stringify(body),/PRIVATE_CONTENT|PRIVATE_CREDENTIAL/);assert.doesNotMatch(await readFile(join(two.root,'queue.json'),'utf8'),/PRIVATE_CONTENT|PRIVATE_CREDENTIAL|lifecycle-fixture-token/);
  return {root,canonical_records:records.length,duplicate_suppressed:true};
 }finally{controller.abort();await running;}
}
