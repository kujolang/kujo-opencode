import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {startLifecycle,lifecycleConfig} from '../lib/lifecycle-host.mjs';

function fixture(){
 const hooks=new Map(),records=[];let subscribed=0,disposed=0,flushed=0,current=true,closed=0;
 const hook=domain=>async(name,callback)=>{hooks.set(`${domain}.${name}`,callback);return {dispose:async()=>{disposed++;}};};
 const ctx={tool:{hook:hook('tool')},session:{hook:hook('session')},event:{subscribe:async function*({signal}){subscribed++;yield {type:'session.execution.started',data:{sessionID:'local'}};yield {type:'session.execution.interrupted',data:{sessionID:'local',reason:'user'}};await new Promise(resolve=>signal.aborted?resolve():signal.addEventListener('abort',resolve,{once:true}));}}};
 const options={ctx,home:'/tmp/unused',project:'/tmp/project',version:'0.2.0',interval:5,sessionAtProject:async id=>{if(id!=='local')throw Error('different workspace');},isCurrent:async()=>current,makeOutbox:settings=>({capture:async value=>records.push(value),flush:async()=>{flushed++;return {sent:true};},retry:async()=>({sent:true,rearmed:1}),status:async()=>({enabled:settings.enabled}),recover:async()=>({recovered:true}),discard:async()=>({discarded:records.length}),close:async()=>{closed++;}})};
 return {options,hooks,records,setCurrent:value=>{current=value;},counts:()=>({subscribed,disposed,flushed,closed})};
}
test('lifecycle defaults off and rejects unknown configuration and remote endpoints',async()=>{
 const f=fixture(),bridge=await startLifecycle(f.options);assert.equal(f.hooks.size,0);assert.equal(f.counts().subscribed,0);assert.equal((await bridge.status()).enabled,false);assert.equal((await bridge.status()).intervention.enabled,false);await bridge.close();
 for(const value of [{enabled:'true'},{enabled:false,intervention:'yes'},{enabled:false,runledger:'yes'},{enabled:true,token:'secret'},{enabled:true,url:'https://remote.example'}])assert.throws(()=>lifecycleConfig(value));
});
test('enabled observers bind real metadata, reject other workspaces, and stop at unload',async()=>{
 const f=fixture(),bridge=await startLifecycle({...f.options,config:{enabled:true}});
 const event={sessionID:'local',agent:'build',tool:'kujo_check',id:'call1',messageID:'msg1',input:'PRIVATE',model:{providerID:'opencode',id:'free'},headers:{secret:'PRIVATE'}};
 await f.hooks.get('tool.execute.before')(event);
 await f.hooks.get('tool.execute.after')({...event,status:'completed',result:{content:'PRIVATE',metadata:{ok:false,receipt_id:'receipt1'}}});
 await f.hooks.get('session.model.request')(event);
 await f.hooks.get('session.http.response')({...event,response:new Response('PRIVATE',{status:403})});
 await f.hooks.get('session.retry')({...event,attempt:2,error:'PRIVATE'});
 const count=f.records.length;await f.hooks.get('tool.execute.before')({...event,sessionID:'elsewhere'});assert.equal(f.records.length,count);
 assert.ok(f.records.some(r=>r.phase==='session.started'));assert.ok(f.records.some(r=>r.phase==='session.cancelled'));
 assert.ok(f.records.some(r=>r.phase==='tool.error'&&r.receiptID==='receipt1'));
 assert.ok(f.records.some(r=>r.phase==='model.response'&&r.httpStatus===403));
 assert.equal(JSON.stringify(f.records).includes('PRIVATE'),false);
 assert.equal((await bridge.retry()).rearmed,1);f.setCurrent(false);assert.equal((await bridge.retry()).reason,'configuration_changed');await f.hooks.get('tool.execute.before')(event);assert.equal(f.records.length,count);assert.equal((await bridge.flush()).reason,'configuration_changed');
 await bridge.close();const prior=f.counts();await delay(20);await f.hooks.get('tool.execute.before')(event);assert.deepEqual(f.counts(),prior);assert.equal(f.records.length,count);assert.equal(prior.disposed,5);
});
test('observer and delivery failures do not change host request or tool execution',async()=>{
 const f=fixture();f.options.sessionAtProject=async()=>{throw Error('unavailable');};const bridge=await startLifecycle({...f.options,config:{enabled:true}});
 const event={sessionID:'local',model:{id:'free',providerID:'opencode'},headers:{private:'unchanged'}};await f.hooks.get('session.model.request')(event);assert.deepEqual(event.headers,{private:'unchanged'});assert.equal(f.records.length,0);await bridge.close();
});

test('event subscription reconnects with backoff and unload aborts the replacement stream',async()=>{
 const f=fixture();let attempts=0;
 f.options.ctx.event.subscribe=async function*({signal}){attempts++;if(attempts===1)throw Error('temporary disconnect');yield {type:'session.status',data:{sessionID:'local',status:{type:'idle'}}};await new Promise(resolve=>signal.aborted?resolve():signal.addEventListener('abort',resolve,{once:true}));};
 const bridge=await startLifecycle({...f.options,config:{enabled:true}});
 for(let i=0;i<50&&!f.records.some(r=>r.phase==='session.idle');i++)await delay(5);
 assert.equal(attempts,2);assert.ok(f.records.some(r=>r.phase==='session.idle'));await bridge.close();await delay(20);assert.equal(attempts,2);
});
test('partial observer registration failure disposes already registered hooks',async()=>{
 const f=fixture();f.options.ctx.session.hook=async()=>{throw Error('host registration failed');};
 await assert.rejects(startLifecycle({...f.options,config:{enabled:true}}),/registration failed/);assert.equal(f.counts().disposed,2);assert.equal(f.counts().closed,1);assert.equal(f.counts().subscribed,0);
});

test('guard-only mode has no telemetry and does not wait for interruption inside a tool hook',async t=>{
 const f=fixture();let release,pauses=0;f.options.ctx.session.interrupt=async()=>{pauses++;await new Promise(resolve=>{release=resolve;});};f.options.ctx.session.synthetic=async()=>{};
 const bridge=await startLifecycle({...f.options,config:{enabled:false,intervention:true}});t.after(()=>bridge.close());
 for(const id of ['a','b','c'])await f.hooks.get('tool.execute.after')({sessionID:'local',tool:'fixture',id,status:'error'});
 for(let i=0;i<20&&!pauses;i++)await delay(1);assert.equal(pauses,1);assert.equal(f.records.length,0);release();await bridge.close();
});

test('enabled telemetry includes verified run identity, while failed lookup preserves the event',async()=>{
 const f=fixture();let calls=0;const bridge=await startLifecycle({...f.options,config:{enabled:true},resolveRun:async()=>{calls++;return 'verified-run';}});
 await f.hooks.get('tool.execute.before')({sessionID:'local',tool:'fixture',id:'one'});assert.ok(f.records.some(r=>r.callID==='one'&&r.runID==='verified-run'));assert.ok(calls>0);await bridge.close();
 const g=fixture();const failed=await startLifecycle({...g.options,config:{enabled:true},resolveRun:async()=>{throw Error('private');}});await g.hooks.get('tool.execute.before')({sessionID:'local',tool:'fixture',id:'two'});assert.ok(g.records.some(r=>r.callID==='two'&&r.runID===undefined));await failed.close();
 const h=fixture();const quiet=await startLifecycle({...h.options,resolveRun:async()=>{throw Error('must not inspect');}});assert.equal(h.hooks.size,0);await quiet.close();
});

test('explicit host completion and failure events retain outcomes without a RunLedger verdict',async()=>{
 const f=fixture();f.options.ctx.event.subscribe=async function*({signal}){yield {type:'session.execution.failed',data:{sessionID:'local',error:'PRIVATE'}};yield {type:'session.execution.succeeded',data:{sessionID:'local'}};await new Promise(resolve=>signal.aborted?resolve():signal.addEventListener('abort',resolve,{once:true}));};
 const bridge=await startLifecycle({...f.options,config:{enabled:true}});for(let i=0;i<30&&!f.records.some(r=>r.phase==='session.completed');i++)await delay(5);assert.ok(f.records.some(r=>r.phase==='session.error'));assert.ok(f.records.some(r=>r.phase==='session.completed'));assert.equal(JSON.stringify(f.records).includes('PRIVATE'),false);await bridge.close();
});
