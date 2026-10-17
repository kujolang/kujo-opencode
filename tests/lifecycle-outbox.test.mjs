import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LifecycleOutbox,lifecycleMetadata,lifecycleEndpoint} from '../lib/lifecycle-outbox.mjs';
const event={phase:'tool.completed',sessionID:'ses_1',agent:'build',tool:'kujo_source_inspect',callID:'call_1',provider:'opencode',model:'fixture'};
async function options(){const home=await mkdtemp(join(tmpdir(),'kujo-lifecycle-'));return {home,project:join(home,'project'),enabled:true};}
test('lifecycle default is off with no disk or network side effects',async()=>{
 const opts=await options();let requests=0;const box=new LifecycleOutbox({...opts,enabled:false,fetchImpl:async()=>requests++});assert.equal((await box.capture(event)).reason,'disabled');assert.equal((await box.flush()).reason,'disabled');assert.equal(requests,0);await assert.rejects(readFile(join(box.root,'queue.json')),{code:'ENOENT'});
});
test('metadata projection excludes content, headers, errors and unsafe identifiers before persistence',async()=>{
 const raw={...event,input:'SECRET',output:'SECRET',headers:{Authorization:'SECRET'},error:{message:'SECRET'},prompt:'SECRET',messages:['SECRET'],tool:'unsafe tool content'};
 assert.deepEqual(lifecycleMetadata(raw),{phase:event.phase,sessionID:event.sessionID,agent:'build',callID:'call_1',provider:'opencode',model:'fixture'});
 const opts=await options();let body;const box=new LifecycleOutbox({...opts,fetchImpl:async(_url,request)=>{body=request.body;return new Response('SECRET',{status:200});},token:()=> 'PRIVATE_TOKEN'});
 await box.capture(raw);assert.doesNotMatch(await readFile(join(box.root,'queue.json'),'utf8'),/SECRET|PRIVATE_TOKEN/);await box.flush();assert.doesNotMatch(body,/SECRET|PRIVATE_TOKEN/);const batch=JSON.parse(body);assert.deepEqual(batch.records[0].content,[]);assert.equal(batch.records[0].privacy.content_mode,'off');assert.equal(batch.records[0].references[0].id,event.sessionID);assert.doesNotMatch(await readFile(join(box.root,'queue.json'),'utf8'),/SECRET|PRIVATE_TOKEN/);
});
test('uncertain delivery survives restart and reuses canonical deduplication identities',async()=>{
 const opts=await options();let now=100000,first;const one=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async(_url,request)=>{first=JSON.parse(request.body);throw Error('lost acknowledgement SECRET');}});await one.capture(event);assert.equal((await one.flush()).sent,false);await one.close();now+=2000;
 let second;const two=new LifecycleOutbox({...opts,version:'upgraded',now:()=>now,fetchImpl:async(_url,request)=>{second=JSON.parse(request.body);return new Response('{}');}});assert.equal((await two.flush()).sent,true);assert.deepEqual(second,first);assert.equal((await two.status()).pending,0);assert.equal((await two.status()).delivered,1);
});
test('retry count, retention, queue size and endpoint changes are bounded',async()=>{
 const opts=await options();let now=100000,requests=0;const box=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async()=>{requests++;return new Response('retry',{status:503});}});await box.capture(event);
 for(let i=0;i<6;i++){await box.flush();now+=60001;}assert.equal(requests,5);assert.equal((await box.status()).discarded,0);assert.equal((await box.status()).held_for_retry,1);await box.discard();
 for(let i=0;i<128;i++)assert.equal((await box.capture(event)).queued,true);assert.equal((await box.capture(event)).reason,'queue_full');assert.equal((await box.status()).pending,128);
 const changed=new LifecycleOutbox({...opts,url:'http://127.0.0.1:7701',now:()=>now,fetchImpl:async()=>{throw Error('must not send');}});assert.equal((await changed.flush()).reason,'idle');assert.equal((await changed.status()).held_for_other_endpoint,128);
 now+=86400001;await box.flush();assert.equal((await box.status()).pending,0);
});
test('permanent rejection is not retried and unload cancels delivery without losing the queued job',async()=>{
 const opts=await options();const denied=new LifecycleOutbox({...opts,fetchImpl:async()=>new Response('SECRET',{status:401})});await denied.capture(event);await denied.flush();assert.equal((await denied.status()).pending,1);assert.equal((await denied.status()).held_for_retry,1);assert.equal((await denied.status()).discarded,0);assert.equal((await denied.status()).last_code,'http_401');await denied.discard();
 let started;const ready=new Promise(resolve=>started=resolve);const box=new LifecycleOutbox({...opts,fetchImpl:async(_url,request)=>new Promise((resolve,reject)=>{started();request.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});})});await box.capture(event);const pending=box.flush();await ready;await box.close();await pending;assert.equal((await box.status()).pending,1);assert.equal((await box.capture(event)).reason,'disabled');
});
test('parallel workers deliver a claim once and malformed state never reaches the network',async()=>{
 const opts=await options();let requests=0;const fetchImpl=async()=>{requests++;return new Response('{}');};const one=new LifecycleOutbox({...opts,fetchImpl}),two=new LifecycleOutbox({...opts,fetchImpl});await one.capture(event);await Promise.all([one.flush(),two.flush()]);assert.equal(requests,1);
 await writeFile(join(one.root,'queue.json'),'{}');assert.equal((await one.flush()).reason,'queue_unavailable');assert.equal(requests,1);
});
test('only explicit loopback origins are accepted',()=>{
 for(const url of ['https://127.0.0.1','http://example.com','http://user:pass@localhost','http://localhost/path','http://localhost?secret=x'])assert.throws(()=>lifecycleEndpoint(url));assert.equal(lifecycleEndpoint('http://[::1]:7700'),'http://[::1]:7700');
});
test('process death during delivery retains a lease and replays only after it expires',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {pathToFileURL}=await import('node:url');const {resolve}=await import('node:path');
 const opts=await options();let now=100000;const first=new LifecycleOutbox({...opts,now:()=>now});const captured=await first.capture(event);
 const script=`import {LifecycleOutbox} from ${JSON.stringify(pathToFileURL(resolve('lib/lifecycle-outbox.mjs')).href)};const box=new LifecycleOutbox({...${JSON.stringify(opts)},now:()=>100000,fetchImpl:async()=>process.exit(24)});await box.flush();`;
 await assert.rejects(promisify(execFile)(process.execPath,['--input-type=module','-e',script]),error=>error.code===24);
 let requests=0;const resumed=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async(_url,options)=>{requests++;assert.equal(JSON.parse(options.body).records[0].record_id,captured.id);return new Response('{}');}});
 assert.equal((await resumed.flush()).reason,'idle');assert.equal(requests,0);now+=15001;assert.equal((await resumed.flush()).sent,true);assert.equal(requests,1);
});
test('interrupted queue transaction requires explicit recovery and preserves queued metadata',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {pathToFileURL}=await import('node:url');const {resolve}=await import('node:path');
 const opts=await options();const box=new LifecycleOutbox({...opts,fetchImpl:async()=>new Response('{}')});await box.capture(event);
 const script=`import {replaceDirectory} from ${JSON.stringify(pathToFileURL(resolve('lib/atomic-directory.mjs')).href)};await replaceDirectory(${JSON.stringify(box.root)},async()=>{}, {checkpoint:async phase=>{if(phase==='locked')process.exit(25)}});`;
 await assert.rejects(promisify(execFile)(process.execPath,['--input-type=module','-e',script]),error=>error.code===25);
 assert.equal((await box.flush()).reason,'queue_unavailable');assert.equal((await box.recover()).recovered,true);assert.equal((await box.status()).pending,1);assert.equal((await box.flush()).sent,true);
});
test('exhausted outage survives reload and retries only with explicit recovery preserving identity',async()=>{
 const opts=await options();let now=100000,requests=0;const bodies=[];
 const box=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async(_url,request)=>{requests++;bodies.push(request.body);return new Response('',{status:503});}});
 const queued=await box.capture(event);
 for(let i=0;i<5;i++){await box.flush();now+=60001;}
 await box.close();assert.equal(requests,5);
 const restored=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async(_url,request)=>{requests++;bodies.push(request.body);return new Response('{}');}});
 assert.equal((await restored.status()).held_for_retry,1);assert.equal((await restored.status()).discarded,0);
 assert.equal((await restored.flush()).reason,'idle');assert.equal(requests,5);
 const result=await restored.retry();assert.equal(result.rearmed,1);assert.equal(result.sent,true);assert.equal(requests,6);
 assert.equal(new Set(bodies).size,1);assert.equal(JSON.parse(bodies[5]).records[0].record_id,queued.id);
 assert.equal((await restored.status()).pending,0);assert.equal((await restored.status()).discarded,0);
});
test('manual retry does not release other endpoints or extend retention',async()=>{
 const opts=await options();let now=100000,requests=0;
 const original=new LifecycleOutbox({...opts,now:()=>now,fetchImpl:async()=>{requests++;return new Response('',{status:401});}});
 await original.capture(event);await original.flush();assert.equal((await original.status()).held_for_retry,1);
 const changed=new LifecycleOutbox({...opts,url:'http://127.0.0.1:7701',now:()=>now,fetchImpl:async()=>assert.fail('Wrong endpoint')});
 assert.equal((await changed.retry()).rearmed,0);assert.equal((await original.status()).pending,1);
 now+=86400001;assert.equal((await original.retry()).rearmed,0);assert.equal(requests,1);assert.equal((await original.status()).discarded,1);
});
