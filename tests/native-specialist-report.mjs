// Acceptance-only: verify model-authored evidence without supplying the answers.
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {assertProviderHealthy} from './native-model-acceptance.mjs';

export function validateSpecialistReport(text,steps) {
 const report=JSON.parse(text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/,'$1'));
 assert.ok(Array.isArray(report.operations),'Report must enumerate operations');
 assert.equal(report.operations.length,steps.length,'Report omitted or invented operations');
 const operations=[...report.operations];
 if(steps[0]?.concurrent_group==='review-opening'){
  assert.equal(steps[1]?.concurrent_group,'review-opening');
  assert.deepEqual(steps.slice(0,2).map(step=>step.ability).sort(),['kujo.changebucket.changes.measure','kujo.patchbrief.changes.summarize']);
  const opening=operations.slice(0,2);
  assert.equal(new Set(opening.map(row=>row.ability)).size,2,'Duplicate opening check');
  for(let i=0;i<2;i++){operations[i]=opening.find(row=>row.ability===steps[i].ability);assert.ok(operations[i],'Missing opening check');}
 }
 for(const [index,step] of steps.entries()) {
  const row=operations[index];
  assert.equal(row.ability,step.ability,'Report changed operation order or identity');
  const outcome=step.decision==='reject'?'rejected':step.decision==='cancel'?'cancelled':step.expected_status;
  assert.equal(row.outcome,outcome,'Report concealed failure or denied execution');
  assert.ok(Array.isArray(row.receipt_ids)&&row.receipt_ids.length,'Every operation requires evidence');
  assert.equal(new Set(row.receipt_ids).size,row.receipt_ids.length,'Duplicate citations');
  for(const id of row.receipt_ids)assert.ok(step.receipt_ids.includes(id),'Fabricated or unrelated receipt citation');
  if(step.terminal_receipt)assert.ok(row.receipt_ids.includes(step.terminal_receipt),'Terminal evidence required');
  assert.equal(typeof row.explanation,'string');assert.ok(row.explanation.trim(),'Explain the result');
 }
 assert.equal(typeof report.limitations,'string');assert.ok(report.limitations.trim(),'State verification limits');
 return report;
}

export async function specialistReport({api,journey,receipts,interrupt,timeoutMs=180000,pollMs=500}) {
 const id=journey.session_id;
 const owned=async()=> (await receipts()).filter(row=>row.metadata?.session_id===id).map(row=>row.receipt_id).sort();
 const before=await owned();
 const previous=new Set((await api(`/api/session/${id}/message?limit=100`)).data.map(row=>row.id));
 let settled=false,error;
 const pending=api(`/api/session/${id}/prompt`,{text:'Summarize this acceptance session using only the existing conversation evidence. Do not call tools or request permission. Return JSON only: {"operations":[{"ability":"exact Ability ID","outcome":"succeeded|failed|rejected|cancelled","receipt_ids":["actual receipt ID"],"explanation":"what happened"}],"limitations":"what this session did not verify"}. Exclude preparatory catalog and receipt-list reads from the operations array. Use the receipt-list evidence to cite approval-required receipts for rejected requests; distinguish rejection from a failed execution. Include every requested substantive operation in chronological order, including repeated operations, failures and denied/cancelled requests. Independent read-only opening checks requested together may appear in either order. Cite terminal receipts for executed operations. Do not invent evidence or claim overall release readiness.'},timeoutMs).catch(e=>{error=e;}).finally(()=>{settled=true;});
 try {
  const deadline=Date.now()+timeoutMs;
  do {
   assert.equal((await api(`/api/session/${id}/permission`)).data.length,0,'Report requested unexpected permission');
   assert.deepEqual(await owned(),before,'Report executed an unexpected operation');
   assertProviderHealthy(await api(`/api/session/${id}/message?limit=100`));
   if(settled)break;
   await delay(pollMs);
  }while(Date.now()<deadline);
  assert.ok(settled,'Report timed out');await pending;if(error)throw error;
  await api(`/api/experimental/session/${id}/wait`,{},timeoutMs);
  assert.equal((await api(`/api/session/${id}/permission`)).data.length,0,'Report requested unexpected permission');
  assert.deepEqual(await owned(),before,'Report executed an unexpected operation');
  const messages=await api(`/api/session/${id}/message?limit=100`);assertProviderHealthy(messages);
  const answers=messages.data.filter(row=>!previous.has(row.id)&&row.type==='assistant');
  assert.ok(answers.length,'Missing model report');
  for(const answer of answers){
   assert.equal(answer.agent,journey.agent);assert.equal(`${answer.model.providerID}/${answer.model.id}`,journey.model);
   assert.ok(answer.content.every(part=>part.type!=='tool'),'Report called an unexpected tool');
  }
  const text=answers.flatMap(row=>row.content.filter(part=>part.type==='text').map(part=>part.text)).join('\n');
  return {message_ids:answers.map(row=>row.id),...validateSpecialistReport(text,journey.steps)};
 }catch(error){await interrupt(id).catch(()=>{});throw error;}
}
