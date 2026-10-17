import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {listGateway,callGateway} from '../lib/gateway.mjs';
import {LocalAbilityRuntime,FileAbilityState,digest} from '../.generated/local-runtime.mjs';
import {loadCatalog} from '../lib/catalog.mjs';
const definition={schema:'kujo.ability/v1',id:'kujo.fixture.read',version:'1.0.0',description:'Read a fixture',input_schema:{type:'object',properties:{},additionalProperties:false},output_schema:{type:'object',properties:{value:{type:'string'}},required:['value']},effects:[{kind:'read',resource:'kujo.fixture.data'}],idempotency:{mode:'intrinsic'}};
const tool={name:'fixture__read',abilityId:definition.id,abilityVersion:'1.0.0',abilityDigest:digest(definition),effects:definition.effects,inputSchema:definition.input_schema,outputSchema:definition.output_schema,execution:'/v1/abilities/fixture/read/run'};
async function runtimeAt(root,definition,handler){const p={schema:'kujo.ability-profile/v1',id:'kujo.profile.fixture',version:'1.0.0',description:'Fixture',default:true,extends:[],ability_ids:[definition.id],metadata:{}};return new LocalAbilityRuntime({abilities:[{definition,tool:{name:'fixture'},handler}],profiles:[p],profileId:p.id,state:new FileAbilityState({statePath:join(root,'state.json'),receiptsPath:join(root,'receipts.jsonl')})});}
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'kujo-gateway-'));const remote=await runtimeAt(join(root,'remote'),definition,async()=>({value:'canonical fixture'}));
 const state={tools:[structuredClone(tool)],requests:[],posts:0,mode:'ok'};
 const server=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;state.requests.push({url:req.url,headers:req.headers,raw});res.setHeader('content-type','application/json');
 if(state.mode==='redirect'){res.writeHead(302,{location:'/elsewhere'});res.end();return;}
 if(state.mode==='oversized'){res.end('x'.repeat(256*1024+1));return;}
 if(req.method==='GET'){res.end(JSON.stringify({data:{tools:state.tools}}));return;}
 state.posts++;const input=JSON.parse(raw);const output=await remote.execute({abilityId:definition.id,input:input.input,controls:{invocationId:input.invocation_id}});const receipt=output.receipt;
 if(state.mode==='mismatch')receipt.invocation_id='other';if(state.mode==='invalid')receipt.duration_ms=-1;
 if(state.mode==='approval'){receipt.status='approval_required';receipt.result=null;res.statusCode=409;res.end(JSON.stringify({error:{details:{receipt}}}));return;}
 if(state.mode==='echo')receipt.result={value:'fixture-secret'};
 res.end(JSON.stringify({data:{receipt,result:receipt.result}}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
 const origin=`http://127.0.0.1:${server.address().port}`,env={KUJO_ABILITY_GATEWAY_URL:origin,KUJO_ABILITY_GATEWAY_TOKEN:'fixture-secret'};
 return {root,env,state,input:{origin,tool:structuredClone(tool),input:{},invocation_id:'remote-fixture',idempotency_key:'remote-key',approval_id:'server-issued-fixture'}};
}
test('gateway discovery preserves canonical identity, schemas, effects and configured origin',async t=>{const f=await fixture(t);const listed=await listGateway({env:f.env});assert.deepEqual(listed.tools,[tool]);assert.equal(listed.origin,f.input.origin);assert.equal(f.state.posts,0);assert.equal(f.state.requests[0].headers.authorization,'Bearer fixture-secret');});
test('native outbound approval is separate from server approval and replay sends no new request',async t=>{
 const f=await fixture(t);const entry=(await loadCatalog()).abilities.find(a=>a.adapter==='gateway_call');const local=await runtimeAt(join(f.root,'local'),entry.definition,(input,ctx)=>callGateway(input,{env:f.env,signal:ctx.signal}));
 const controls={invocationId:'native-fixture',idempotencyKey:'native-key'};const denied=await local.execute({abilityId:entry.definition.id,input:f.input,controls});assert.equal(denied.code,'ability_approval_required');assert.equal(f.state.requests.length,0);
 const approval=await local.requestApproval({abilityId:entry.definition.id,input:f.input,invocationId:controls.invocationId});
 const changed=await local.execute({abilityId:entry.definition.id,input:{...f.input,input:{changed:true}},controls:{...controls,approvalId:approval.approval_id}});assert.equal(changed.ok,false);assert.equal(f.state.requests.length,0);
 const result=await local.execute({abilityId:entry.definition.id,input:f.input,controls:{...controls,approvalId:approval.approval_id}});assert.equal(result.ok,true);assert.equal(result.receipt.result.receipt.ability_id,definition.id);assert.equal(f.state.posts,1);const sent=f.state.requests.find(r=>r.raw);assert.equal(sent.headers['x-ability-approval'],'server-issued-fixture');assert.equal(sent.headers['idempotency-key'],'remote-key');assert.equal(JSON.parse(sent.raw).approval_id,'server-issued-fixture');assert.ok(!JSON.stringify(result).includes('fixture-secret'));
 const replay=await local.execute({abilityId:entry.definition.id,input:f.input,controls:{...controls,invocationId:'later'}});assert.equal(replay.replayed,true);assert.equal(f.state.posts,1);
});
test('changed destination or tool effects require new approval before remote execution',async t=>{const f=await fixture(t);await assert.rejects(callGateway({...f.input,origin:'http://127.0.0.1:1'},{env:f.env}),{code:'gateway_destination_changed'});f.state.tools[0].effects=[{kind:'delete',resource:'kujo.fixture.data'}];await assert.rejects(callGateway(f.input,{env:f.env}),{code:'gateway_descriptor_changed'});assert.equal(f.state.posts,0);});
test('invalid, mismatched, credential-echoing and approval-required receipts never report execution success',async t=>{
 for(const [mode,code]of [['invalid','gateway_receipt_invalid'],['mismatch','gateway_receipt_mismatch'],['echo','gateway_credential_echo'],['approval','gateway_execution_incomplete']]){const f=await fixture(t);f.state.mode=mode;await assert.rejects(callGateway(f.input,{env:f.env}),e=>e.code===code&&!e.message.includes('fixture-secret')&&(mode!=='approval'||e.details.receipt.status==='approval_required'));assert.equal(f.state.posts,1);}
});
test('unconfigured, non-HTTPS remote, redirect, oversized and cancelled discovery fail closed',async t=>{
 await assert.rejects(listGateway({env:{}}),{code:'gateway_not_configured'});await assert.rejects(listGateway({env:{KUJO_ABILITY_GATEWAY_URL:'http://example.com'}}),{code:'gateway_configuration'});
 const f=await fixture(t);const controller=new AbortController();controller.abort();await assert.rejects(listGateway({env:f.env,signal:controller.signal}),{name:'AbortError'});assert.equal(f.state.requests.length,0);
 f.state.mode='redirect';await assert.rejects(listGateway({env:f.env}),{code:'gateway_delivery_unknown'});assert.equal(f.state.requests.length,1);f.state.mode='oversized';await assert.rejects(listGateway({env:f.env}),{code:'gateway_response_limit'});assert.equal(f.state.requests.length,2);
});
