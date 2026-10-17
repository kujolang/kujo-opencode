// Explicit local daemon gate: private credentials, no notification providers,
// no Dispatch resume bridge, and no contact with an existing service.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {deliverLeash} from '../lib/leash.mjs';
const binary=process.env.LEASH_TEST_BIN;
if(!binary)throw Error('Set LEASH_TEST_BIN to a canonical leashd binary for this explicit local gate.');
const root=await mkdtemp(join(tmpdir(),'kujo-leash-canonical-'));
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const token=randomBytes(32).toString('hex');const origin=`http://127.0.0.1:${port}`;
const config={machine:{name:'Kujo OpenCode acceptance',id:'fixture'},bind:{host:'127.0.0.1',port},auth:{token,jwt_secret:randomBytes(32).toString('hex')},storage:{db_path:join(root,'leash.db')},logging:{audit_log_path:join(root,'audit.jsonl')},notifications:{fcm:{enabled:false},chatops:{enabled:false,dispatch_bridge:{enabled:false}}}};
const file=join(root,'config.yml');await writeFile(file,JSON.stringify(config),{mode:0o600});
const child=spawn(resolve(binary),[file],{cwd:root,stdio:['ignore','ignore','pipe']});let log='';child.stderr.on('data',b=>{log=(log+b).slice(-8192);});let spawnError;child.on('error',e=>spawnError=e);
try{
 let ready=false;for(let n=0;n<100;n++){if(spawnError)throw spawnError;if(child.exitCode!==null)throw Error(`Daemon stopped: ${log.replaceAll(token,'[redacted]')}`);try{ready=(await fetch(origin+'/health',{signal:AbortSignal.timeout(500)})).ok;}catch{}if(ready)break;await delay(100);}assert.ok(ready,'canonical daemon health');
 const event={schema:'kujo.intervention-request/v2',request_id:'request-opencode-fixture',boundary_id:'boundary-fixture',run_id:'run-fixture',state_revision:1,reason:{type:'evaluation_failed',message:'Fixture check'},summary:'Local acceptance; notification providers disabled',policy_decision_ref:'policy-fixture',evidence:[],preservation:{status:'satisfied'},allowed_actions:['retry_evaluation','abort'],created_at:new Date().toISOString(),expires_at:null,callback:{target:'dispatch://resume-decision/run-fixture'},run:{workflow_id:'fixture',step_id:'gate',attempt:1},routing:{channels:[],audience:[]},security:{contains_sensitive_data:false}};
 const registration=await fetch(origin+'/devices/register',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({name:'opencode-fixture'}),signal:AbortSignal.timeout(5000)});assert.equal(registration.status,201);const registered=await registration.json();
 const env={KUJO_LEASH_URL:origin,KUJO_LEASH_TOKEN:registered.token};assert.equal(typeof registered.token,'string');
 const first=await deliverLeash({origin,event},{env});assert.equal(first.status,'awaiting_decision');assert.equal(first.human_decision,'not_observed');
 const replay=await deliverLeash({origin,event},{env});assert.equal(replay.status,'duplicate');
 await assert.rejects(deliverLeash({origin,event},{env:{...env,KUJO_LEASH_TOKEN:'incorrect-fixture-token'}}),{code:'leash_remote_rejected'});
 const invalid={...event,request_id:'invalid-event',state_revision:0};await assert.rejects(deliverLeash({origin,event:invalid},{env}),{code:'leash_remote_rejected'});
 const proof={ok:true,binary_sha256:createHash('sha256').update(await readFile(binary)).digest('hex'),root,notification_providers:false,canonical_v2:true,duplicate:true,auth_rejection:true,invalid_event_rejection:true};
 await writeFile(join(root,'verification.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{
 if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');for(let i=0;i<50&&child.exitCode===null&&child.signalCode===null;i++)await delay(100);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
 await rm(file,{force:true});
}
