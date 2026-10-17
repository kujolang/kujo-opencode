import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {leashStatus,deliverLeash,MAX_LEASH_BYTES} from '../lib/leash.mjs';
import {loadCatalog,profileAbilities} from '../lib/catalog.mjs';
import {LocalAbilityRuntime,FileAbilityState} from '../.generated/local-runtime.mjs';
async function fixture(t,reply){
 const requests=[];const server=createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;requests.push({url:req.url,headers:req.headers,body});reply(req,res,body);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const origin=`http://127.0.0.1:${server.address().port}`;return {origin,requests,env:{KUJO_LEASH_URL:origin,KUJO_LEASH_TOKEN:'fixture-secret',KUJO_LEASH_AUDIENCE:'fixture'}};
}
const event={schema:'kujo.intervention-request/v2',request_id:'request-fixture',summary:'Fixture; no notification provider configured'};
test('Leash is explicitly exposed and readiness never sends network requests or returns credentials',async()=>{
 const catalog=await loadCatalog();assert.ok(!profileAbilities(catalog,'kujo.profile.essentials').some(a=>a.source==='leash'));assert.equal(profileAbilities(catalog,'kujo.profile.full').filter(a=>a.source==='leash').length,2);
 assert.equal(leashStatus({}).configured,false);assert.equal(leashStatus({KUJO_LEASH_URL:'http://127.0.0.1:9191'}).configured,false);
 const status=leashStatus({KUJO_LEASH_URL:'https://example.com',KUJO_LEASH_TOKEN:'secret'});assert.equal(status.configured,true);assert.equal(status.network_requested,false);assert.ok(!JSON.stringify(status).includes('secret'));
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com/path','https://example.com?token=x','file:///tmp/test'])assert.throws(()=>leashStatus({KUJO_LEASH_URL:url}));
});
test('Leash delivery requires bound native approval; replay does not redeliver and receipt is bounded',async t=>{
 const f=await fixture(t,(_req,res,body)=>{res.writeHead(201);res.end(JSON.stringify({status:'awaiting_decision',event_id:JSON.parse(body).request_id,diagnostic:'fixture-secret'}));});
 const item=(await loadCatalog()).abilities.find(a=>a.adapter==='leash_deliver');const root=await mkdtemp(join(tmpdir(),'kujo-leash-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const profile={schema:'kujo.ability-profile/v1',id:'kujo.profile.fixture',version:'1.0.0',description:'Fixture',default:true,extends:[],ability_ids:[item.definition.id],metadata:{}};
 const runtime=new LocalAbilityRuntime({abilities:[{...item,handler:(input,ctx)=>deliverLeash(input,{signal:ctx.signal,env:f.env})}],profiles:[profile],profileId:profile.id,state:new FileAbilityState({statePath:join(root,'state.json'),receiptsPath:join(root,'receipts.jsonl')})});
 const input={origin:f.origin,event};const controls={invocationId:'fixture',idempotencyKey:'fixture-key'};
 const denied=await runtime.execute({abilityId:item.definition.id,input,controls});assert.equal(denied.code,'ability_approval_required');assert.equal(f.requests.length,0);
 const approval=await runtime.requestApproval({abilityId:item.definition.id,input,invocationId:controls.invocationId});
 const changed=await runtime.execute({abilityId:item.definition.id,input:{...input,origin:'http://127.0.0.1:1'},controls:{...controls,approvalId:approval.approval_id}});assert.equal(changed.ok,false);assert.equal(f.requests.length,0);
 const result=await runtime.execute({abilityId:item.definition.id,input,controls:{...controls,approvalId:approval.approval_id}});assert.equal(result.ok,true);assert.equal(f.requests.length,1);assert.deepEqual(JSON.parse(f.requests[0].body),event);assert.equal(f.requests[0].url,'/v1/intervention-events');assert.equal(f.requests[0].headers.authorization,'Bearer fixture-secret');assert.equal(f.requests[0].headers['x-kujo-audience'],'fixture');assert.ok(!JSON.stringify(result).includes('fixture-secret'));assert.equal(result.receipt.result.human_decision,'not_observed');
 const replay=await runtime.execute({abilityId:item.definition.id,input,controls:{invocationId:'later',idempotencyKey:'fixture-key'}});assert.equal(replay.replayed,true);assert.equal(f.requests.length,1);
});
test('configuration changes, cancellation and oversized payloads send nothing',async t=>{
 const f=await fixture(t,(_req,res)=>res.end('{}'));
 await assert.rejects(deliverLeash({origin:'http://127.0.0.1:1',event},{env:f.env}),{code:'leash_destination_changed'});
 await assert.rejects(deliverLeash({origin:f.origin,event:{...event,summary:'x'.repeat(MAX_LEASH_BYTES)}},{env:f.env}),{code:'leash_request_limit'});
 const controller=new AbortController();controller.abort();await assert.rejects(deliverLeash({origin:f.origin,event},{env:f.env,signal:controller.signal}),{name:'AbortError'});assert.equal(f.requests.length,0);
});
test('redirects, rejection, malformed, oversized and mismatched acknowledgements are not retried',async t=>{
 for(const kind of ['redirect','rejected','malformed','oversized','mismatch']){
  const f=await fixture(t,(_req,res)=>{if(kind==='redirect'){res.writeHead(302,{location:'/other'});res.end();}else if(kind==='rejected'){res.writeHead(401);res.end('fixture-secret');}else if(kind==='oversized')res.end('x'.repeat(MAX_LEASH_BYTES+1));else if(kind==='malformed')res.end('fixture-secret');else res.end(JSON.stringify({status:'awaiting_decision',event_id:'wrong'}));});
  await assert.rejects(deliverLeash({origin:f.origin,event},{env:f.env}),e=>e.code.startsWith('leash_')&&!e.message.includes('fixture-secret'));assert.equal(f.requests.length,1);
 }
});
