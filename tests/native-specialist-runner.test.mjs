import test from 'node:test';
import assert from 'node:assert/strict';
import {specialistSession,specialistStep,specialistReviewOpening} from './native-specialist-runner.mjs';
const ability='kujo.runledger.runs.start',input={path:'.',task:'Owned fixture'};
function fixture({altered=false,providerError=false,wrongAgent=false,lateUnexpected=false}={}) {
 const session={id:'owned',agent:'kujo-ship',model:'opencode/explicit-test-model',project:'/owned'};
 let rows=[],pending=[],replies=[],interrupted=0;
 const receipt=(status,id='receipt')=>({receipt_id:id,ability_id:ability,status,surface:'plugin',metadata:{session_id:'owned',agent_id:wrongAgent?'build':session.agent,model_id:session.model,project_root:session.project},...(status==='succeeded'?{approval_id:'one-time'}:{})});
 const api=async(path,body)=>{
  if(path.endsWith('/prompt')){rows=[receipt('approval_required','pending')];pending=[{id:'permission',action:'kujo.ability.approve',save:[],metadata:{ability,input:altered?{path:'elsewhere'}:input}}];return {};}
  if(path.includes('/message'))return {data:providerError?[{error:{type:'provider.auth',status:403}}]:[]};
  if(path.endsWith('/permission'))return {data:pending};
  if(path.endsWith('/reply')){replies.push(body.decision);pending=[];if(body.decision==='once')rows.push(receipt('succeeded'));return {};}
  if(path.endsWith('/wait')){if(lateUnexpected)rows.push({...receipt('succeeded','unexpected'),ability_id:'kujo.opencode.gateway.call'});return {};}
  throw Error('Unexpected fixture API '+path);
 };
 return {session,api,receipts:async()=>rows,interrupt:async()=>{interrupted++;pending=[];},state:()=>({rows,replies,interrupted})};
}
const step=(decision='once')=>({ability,tool:'kujo_runledger_start',input,decision,beforeDecision:async()=>{},after:async()=>{}});
test('specialist session refuses native fallback to ordinary Build',async()=>{
 const api=async(path)=>({data:path==='/api/session'?{id:'owned'}:{agent:'build'}});
 await assert.rejects(specialistSession({api,project:'/owned',model:'opencode/free',agent:'kujo-ship'}),/no Build fallback/);
});
test('exact isolated one-time request produces scoped evidence',async()=>{
 const f=fixture();const result=await specialistStep({...f,step:step(),pollMs:0});assert.equal(result.agent,'kujo-ship');assert.equal(result.terminal_receipt,'receipt');assert.deepEqual(f.state().replies,['once']);
});
test('model-altered input never receives a grant and owned session is interrupted',async()=>{
 const f=fixture({altered:true});await assert.rejects(specialistStep({...f,step:step(),pollMs:0}),/model-altered/);assert.deepEqual(f.state().replies,[]);assert.equal(f.state().interrupted,1);
});
test('provider rejection is failure, never a passing empty journey',async()=>{
 const f=fixture({providerError:true});await assert.rejects(specialistStep({...f,step:step(),pollMs:0}),/provider.auth/);assert.deepEqual(f.state().replies,[]);assert.equal(f.state().interrupted,1);
});
test('ordinary Build receipts cannot certify a scoped specialist',async()=>{
 const f=fixture({wrongAgent:true});await assert.rejects(specialistStep({...f,step:step(),pollMs:0}));assert.deepEqual(f.state().replies,[]);assert.equal(f.state().interrupted,1);
});
test('late out-of-scope execution invalidates the journey after host wait',async()=>{
 const f=fixture({lateUnexpected:true});await assert.rejects(specialistStep({...f,step:step(),pollMs:0}),{code:'kujo_specialist_scope'});assert.equal(f.state().interrupted,1);
});
for(const decision of ['reject','cancel'])test(`${decision} requires no executed effect and checks the post-condition`,async()=>{
 const f=fixture();let checked=false;const s=step(decision);s.after=async()=>{checked=true;assert.ok(f.state().rows.every(r=>r.status==='approval_required'));};
 const result=await specialistStep({...f,step:s,pollMs:0});assert.equal(result.terminal_receipt,null);assert.ok(checked);assert.deepEqual(f.state().replies,decision==='reject'?['reject']:[]);
});
test('an empty completed model response cannot pass a receipt-required step',async()=>{
 let interrupted=false;
 const session={id:'empty',agent:'kujo-ship',model:'opencode/test',project:'/owned'};
 const api=async path=>path.endsWith('/permission')||path.includes('/message')?{data:[]}:{};
 await assert.rejects(specialistStep({api,session,receipts:async()=>[],step:{ability:'kujo.shipcheck.repository.scan',tool:'kujo_shipcheck_scan',input:{path:'.'}},interrupt:async()=>{interrupted=true;},timeoutMs:5,pollMs:0}),/canonical specialist receipt/);
 assert.ok(interrupted);
});

test('ordinary Build cannot be supplied directly as a specialist session',async()=>{
 const f=fixture();f.session.agent='build';await assert.rejects(specialistStep({...f,step:step()}),/Kujo specialist session/);assert.deepEqual(f.state().replies,[]);
});

test('decline evidence is read with a bounded query and never grants an effect',async()=>{
 const f=fixture();f.session.inspectDeclineEvidence=true;
 const original=f.api;let evidence=false;const prompts=[];
 const listed={receipt_id:'list-receipt',ability_id:'kujo.ability.receipts.list',status:'succeeded',surface:'plugin',metadata:{session_id:'owned',agent_id:f.session.agent,model_id:f.session.model,project_root:f.session.project}};
 const api=async(path,body)=>{
  if(path.endsWith('/prompt')){
   prompts.push(body.text);
   if(body.text.includes('Call kujo_ability_receipts exactly once')){assert.ok(body.text.includes('{"limit":1,"include_result":false}'));evidence=true;return {};}
  }
  return original(path,body);
 };
 const result=await specialistStep({...f,api,receipts:async()=>[...f.state().rows,...(evidence?[listed]:[])],step:step('reject'),pollMs:0});
 assert.deepEqual(f.state().replies,['reject']);assert.equal(evidence,true);assert.equal(prompts.length,2);
 assert.deepEqual(result.receipt_ids,['pending']);assert.equal(result.terminal_receipt,null);
});

function reviewOpeningFixture(mode='valid') {
 const session={id:'review-owned',agent:'kujo-review',model:'openai/test',project:'/fixture'};
 const steps=[{ability:'kujo.patchbrief.changes.summarize',tool:'kujo_patchbrief_summarize',input:{path:'review',format:'json'}},{ability:'kujo.changebucket.changes.measure',tool:'kujo_changebucket_measure',input:{path:'review',base:'HEAD'}}];
 let rows=[],interrupted=false;const api=async(path,body)=>{
  if(path.endsWith('/prompt')){for(const step of steps)assert.ok(body.text.includes(JSON.stringify({tool:step.tool,input:step.input})));rows=steps.map((step,i)=>({receipt_id:'r'+i,ability_id:step.ability,status:'succeeded',surface:'plugin',metadata:{session_id:session.id,agent_id:session.agent,model_id:session.model,project_root:session.project}}));if(mode==='missing')rows.pop();if(mode==='duplicate')rows.push({...rows[0],receipt_id:'extra'});if(mode==='unexpected')rows.push({...rows[0],ability_id:'kujo.fence.architecture.check'});if(mode==='wrong-model')rows[0].metadata.model_id='other';return {};}
  if(path.endsWith('/permission'))return {data:mode==='permission'?[{id:'never-granted'}]:[]};
  if(path.includes('/message'))return {data:[]};
  if(path.endsWith('/wait'))return {};
  throw Error('Unexpected API '+path);
 };
 return {api,session,steps,receipts:async()=>rows,interrupt:async()=>{interrupted=true;},wasInterrupted:()=>interrupted,pollMs:0};
}
test('review opening explicitly requests and verifies both canonical read-only checks',async()=>{
 const f=reviewOpeningFixture();const rows=await specialistReviewOpening(f);assert.deepEqual(rows.map(r=>r.ability),f.steps.map(s=>s.ability));assert.equal(f.wasInterrupted(),false);
});
for(const mode of ['missing','duplicate','unexpected','wrong-model','permission'])test(`review opening rejects ${mode} evidence without granting effects`,async()=>{
 const f=reviewOpeningFixture(mode);await assert.rejects(specialistReviewOpening(f));assert.equal(f.wasInterrupted(),true);
});
