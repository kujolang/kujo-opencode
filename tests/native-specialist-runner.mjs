// Live host orchestration only. The caller owns the isolated project and declares
// each exact operation; this never grants permissions in an existing user session.
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {specialists,assertSpecialistAbility} from '../lib/specialists.mjs';
import {assertProviderHealthy} from './native-model-acceptance.mjs';

export async function specialistSession({api,project,model,agent}) {
 assert.ok(specialists.some(item=>item.id===agent),'Use an actual Kujo specialist');
 const split=model.indexOf('/');assert.ok(split>0&&split<model.length-1,'Explicit provider/model required');
 const session=(await api('/api/session',{title:`Isolated ${agent} acceptance`,location:{directory:project},agent,model:{providerID:model.slice(0,split),id:model.slice(split+1)}})).data;
 const actual=(await api(`/api/session/${session.id}`)).data;
 assert.equal(actual.agent,agent,'Host must retain the requested specialist; no Build fallback');
 return {id:session.id,agent,model,project,inspectDeclineEvidence:true};
}

export async function specialistStep({api,session,receipts,step,interrupt,timeoutMs=180000,pollMs=500}) {
 const {ability,tool,input,decision='none',expectedStatus='succeeded'}=step;
 assert.equal(typeof interrupt,'function','Owned session cleanup is mandatory');
 assert.ok(specialists.some(item=>item.id===session.agent),'Step requires a Kujo specialist session');
 assertSpecialistAbility(session.agent,ability);
 assert.ok(['none','once','reject','cancel'].includes(decision));
 assert.ok(['succeeded','failed'].includes(expectedStatus));
 if(decision!=='none')assert.equal(typeof step.beforeDecision,'function','Effects need an explicit pre-decision invariant');
 if(decision==='reject'||decision==='cancel')assert.equal(typeof step.after,'function','Denied effects need a post-condition');
 const owned=async()=> (await receipts()).filter(r=>r.metadata?.session_id===session.id);
 const before=new Set((await owned()).map(r=>r.receipt_id));
 const fresh=async()=> (await owned()).filter(r=>!before.has(r.receipt_id));
 const validateRows=rows=> {
   for(const receipt of rows) {
    assert.equal(receipt.surface,'plugin');assert.equal(receipt.metadata.agent_id,session.agent);
    assert.equal(receipt.metadata.model_id,session.model);assert.equal(receipt.metadata.project_root,session.project);
    assertSpecialistAbility(session.agent,receipt.ability_id);
    assert.ok([ability,'kujo.ability.catalog.list','kujo.ability.receipts.list'].includes(receipt.ability_id),'Unrequested operation executed');
   }
 };
 let requestError,requestSettled=false;
 const request=api(`/api/session/${session.id}/prompt`,{text:`New independent acceptance request after ${before.size} recorded receipts. Any earlier refusal applies only to that earlier request; ask for a fresh native decision for this request and never reuse a grant. Call ${tool} exactly once with ${JSON.stringify(input)}. Use no other operation. Preserve the input exactly. If refused or failed, stop without retry. Report the canonical receipt and any limitation.`},timeoutMs).then(()=>{requestSettled=true;},error=>{requestError=error;requestSettled=true;});
 const deadline=Date.now()+timeoutMs;let permissionID,terminal;
 try {
  while(Date.now()<deadline) {
   assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
   if(requestError)throw requestError;
   const observed=await fresh();validateRows(observed);
   const pending=(await api(`/api/session/${session.id}/permission`)).data;
   for(const permission of pending) {
    assert.equal(permission.action,'kujo.ability.approve','Unexpected native permission');
    assert.equal(permission.metadata.ability,ability,'Never grant another operation');
    assert.deepEqual(permission.metadata.input,input,'Never grant model-altered fixture input');
    assert.deepEqual(permission.save,[],'No persistent grants');
    assert.notEqual(decision,'none','Read-only step unexpectedly requires approval');
    if(permissionID){assert.equal(permission.id,permissionID,'Unexpected second permission');continue;}
    assert.ok(observed.some(r=>r.ability_id===ability&&r.status==='approval_required'),'Canonical pending receipt must precede a grant');
    await step.beforeDecision();permissionID=permission.id;
    if(decision==='cancel') {assert.equal(typeof interrupt,'function');await interrupt(session.id);}
    else await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision});
   }
   const rows=await fresh();
   validateRows(rows);
   const results=rows.filter(r=>r.ability_id===ability&&['succeeded','failed'].includes(r.status));
   assert.ok(results.length<=1,'No automatic retry or duplicate operation');
   if(results.length){terminal=results[0];break;}
   if(permissionID&&['reject','cancel'].includes(decision)&&requestSettled)break;
   await delay(pollMs);
  }
  await api(`/api/experimental/session/${session.id}/wait`,{},Math.max(1000,deadline-Date.now()));
  await request;
  if(requestError)throw requestError;
  assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
  const rows=await fresh(),results=rows.filter(r=>r.ability_id===ability&&['succeeded','failed'].includes(r.status));
  validateRows(rows);
  if(['reject','cancel'].includes(decision)) {
   assert.ok(permissionID,'Expected pending permission was never observed');
   assert.equal(results.length,0,'Denied operation must not execute');
   assert.ok(rows.some(r=>r.ability_id===ability&&r.status==='approval_required'));
   assert.ok(rows.filter(r=>r.ability_id===ability).every(r=>!r.approval_id));
  } else {
   assert.ok(terminal,'Timed out waiting for canonical specialist receipt');
   assert.equal(results.length,1);assert.equal(terminal.status,expectedStatus);
   if(decision==='once'){assert.ok(permissionID);assert.ok(terminal.approval_id);}
   else assert.ok(!terminal.approval_id,'Read-only step cannot carry a grant');
  }
  assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0);
  await step.after?.(terminal,rows);
  if(session.inspectDeclineEvidence&&['reject','cancel'].includes(decision))await specialistStep({api,session,receipts,interrupt,timeoutMs,pollMs,step:{ability:'kujo.ability.receipts.list',tool:'kujo_ability_receipts',input:{limit:1,include_result:false}}});
  return {agent:session.agent,model:session.model,ability,decision,expected_status:expectedStatus,receipt_ids:rows.filter(r=>r.ability_id===ability).map(r=>r.receipt_id),terminal_receipt:terminal?.receipt_id??null};
 } catch(error) {
  // A failed assertion cannot leave an owned model session requesting effects.
  if(interrupt)await interrupt(session.id).catch(()=>{});
  throw error;
 }
}

// Review's opening instruction requests these two read-only checks together.
// Verify both explicitly instead of treating one as an unsolicited side effect.
export async function specialistReviewOpening({api,session,receipts,steps,interrupt,timeoutMs=180000,pollMs=500}) {
 assert.equal(session.agent,'kujo-review');assert.equal(typeof interrupt,'function');
 assert.deepEqual(steps.map(step=>[step.ability,step.tool,step.decision??'none']),[
  ['kujo.patchbrief.changes.summarize','kujo_patchbrief_summarize','none'],
  ['kujo.changebucket.changes.measure','kujo_changebucket_measure','none']]);
 const owned=async()=> (await receipts()).filter(r=>r.metadata?.session_id===session.id);
 const before=new Set((await owned()).map(r=>r.receipt_id));
 const fresh=async()=> (await owned()).filter(r=>!before.has(r.receipt_id));
 const allowed=[...steps.map(step=>step.ability),'kujo.ability.catalog.list','kujo.ability.receipts.list'];
 const validate=rows=>{for(const row of rows){
  assert.ok(allowed.includes(row.ability_id),'Unrequested operation executed');
  assert.equal(row.surface,'plugin');assert.equal(row.metadata.agent_id,session.agent);
  assert.equal(row.metadata.model_id,session.model);assert.equal(row.metadata.project_root,session.project);
  assert.equal(row.status,'succeeded');assert.ok(!row.approval_id,'Read-only review cannot carry a grant');
 }for(const step of steps)assert.ok(rows.filter(r=>r.ability_id===step.ability).length<=1,'No duplicate review operation');};
 let settled=false,requestError;
 const request=api(`/api/session/${session.id}/prompt`,{text:`Perform the two opening read-only review checks, each exactly once: ${JSON.stringify(steps.map(({tool,input})=>({tool,input})))}. These are the complete requested operations. Preserve their inputs, use no other substantive operation, do not retry, and report the canonical receipts and limitations.`},timeoutMs).catch(error=>{requestError=error;}).finally(()=>{settled=true;});
 try {
  const deadline=Date.now()+timeoutMs;
  while(!settled&&Date.now()<deadline){
   assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
   assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0,'Read-only review requested permission');
   validate(await fresh());await delay(pollMs);
  }
  assert.ok(settled,'Review opening timed out');await request;if(requestError)throw requestError;
  await api(`/api/experimental/session/${session.id}/wait`,{},Math.max(1000,deadline-Date.now()));
  assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
  assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0);
  const rows=await fresh();validate(rows);const results=[];
  for(const step of steps){const matches=rows.filter(r=>r.ability_id===step.ability);assert.equal(matches.length,1,'Each requested review check needs a receipt');const row=matches[0];await step.after?.(row,rows);results.push({concurrent_group:'review-opening',agent:session.agent,model:session.model,ability:step.ability,decision:'none',expected_status:'succeeded',receipt_ids:[row.receipt_id],terminal_receipt:row.receipt_id});}
  return results.sort((a,b)=>rows.findIndex(row=>row.receipt_id===a.terminal_receipt)-rows.findIndex(row=>row.receipt_id===b.terminal_receipt));
 }catch(error){await interrupt(session.id).catch(()=>{});throw error;}
}
