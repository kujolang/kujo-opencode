import assert from 'node:assert/strict';
import {readFile,access,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

export function assertProviderHealthy(messages) {
 const failed=messages.data?.find(item=>item.error?.type?.startsWith('provider.'));
 if(failed)throw Error(`Live provider failed before acceptance: ${failed.error.type} (HTTP ${failed.error.status ?? 'unknown'})`);
}

// Live-provider acceptance is explicit and separate from the offline gate.
// Decisions below apply only to sessions and artifacts created by this fixture.
export async function nativeModelAcceptance({api,project,dataRoot,model}) {
 project=await realpath(project);
 const split=model.indexOf('/');assert.ok(split>0,'model must be provider/id');
 const modelRef={providerID:model.slice(0,split),id:model.slice(split+1)};
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const waitFor=async(fn,label,health=async()=>{})=>{for(let i=0;i<240;i++){const result=await fn();if(result)return result;await health();await delay(500);}throw Error(`Timed out: ${label}`);};
 const health=async s=>assertProviderHealthy(await api(`/api/session/${s.id}/message?limit=5`));
 const session=async title=>(await api('/api/session',{title,location:{directory:project},model:modelRef,...(process.env.KUJO_TEST_AGENT?{agent:process.env.KUJO_TEST_AGENT}:{})})).data;
 const prompt=async(s,text)=>api(`/api/session/${s.id}/prompt`,{text},180000);
 console.log('Live acceptance: native read');
 const scan=await session('Kujo real native read acceptance');
 await prompt(scan,'Use kujo_shipcheck_scan exactly once with {"path":"."}. Do not use shell or any other tools. Report the receipt ID.');
 const scanReceipt=await waitFor(async()=> (await receipts()).find(r=>r.metadata?.session_id===scan.id&&r.ability_id==='kujo.shipcheck.repository.scan'&&r.status==='succeeded'),'native ShipCheck receipt',()=>health(scan));
 if(process.env.KUJO_TEST_AGENT)assert.equal(scanReceipt.metadata.agent_id,process.env.KUJO_TEST_AGENT);
 assert.equal(scanReceipt.surface,'plugin');assert.equal(scanReceipt.metadata.model_id,model);
 const evidence={read_receipt:scanReceipt.receipt_id};
 for(const decision of ['reject','once']) {
  console.log(`Live acceptance: native write ${decision}`);
  const s=await session(`Kujo native write ${decision}`);const ledger=`.native-${decision}`;
  const input={path:'.',provider:modelRef.providerID,model:modelRef.id,task:'Isolated native acceptance',ledger_dir:ledger};
  const inference=prompt(s,`Use kujo_runledger_start exactly once with ${JSON.stringify(input)}. Do not use other tools or retry. If permission is denied, stop and report the denial.`);
  let inferenceError;inference.catch(error=>{inferenceError=error;});
  const permission=await waitFor(async()=> (await api(`/api/session/${s.id}/permission`)).data.find(p=>p.action==='kujo.ability.approve'),'native Ability permission',()=>health(s));
  assert.equal(permission.metadata.ability,'kujo.runledger.runs.start');
  assert.deepEqual(permission.metadata.input,input);assert.deepEqual(permission.save,[]);
  await assert.rejects(access(join(project,ledger)),{code:'ENOENT'});
  await api(`/api/session/${s.id}/permission/${permission.id}/reply`,{decision});
  if(decision==='once') {
   const receipt=await waitFor(async()=> (await receipts()).find(r=>r.metadata?.session_id===s.id&&r.ability_id==='kujo.runledger.runs.start'&&r.status==='succeeded'),'approved native write receipt',()=>health(s));
   if(process.env.KUJO_TEST_AGENT)assert.equal(receipt.metadata.agent_id,process.env.KUJO_TEST_AGENT);
   assert.ok(receipt.approval_id);assert.equal(receipt.surface,'plugin');assert.equal(receipt.metadata.model_id,model);
   await access(join(project,ledger));evidence.write_receipt=receipt.receipt_id;
  } else {
   await inference;
   assert.equal(inferenceError,undefined);
   await assert.rejects(access(join(project,ledger)),{code:'ENOENT'});
   assert.equal((await receipts()).some(r=>r.metadata?.session_id===s.id&&r.status==='succeeded'),false);
   evidence.denied_without_write=true;
  }
  await inference;
 }
 return evidence;
}

export async function nativeFailureGuardAcceptance({api,project,dataRoot,model}) {
 const split=model.indexOf('/');assert.ok(split>0);
 const modelRef={providerID:model.slice(0,split),id:model.slice(split+1)};
 const session=(await api('/api/session',{title:'Kujo bounded failure guard acceptance',location:{directory:await realpath(project)},model:modelRef,agent:'build'})).data;
 const input={path:'.kujo-acceptance-missing-directory'};
 await assert.rejects(access(join(project,input.path)),{code:'ENOENT'});
 const inference=api(`/api/session/${session.id}/prompt`,{text:`This is an isolated failure-handling test. Call kujo_shipcheck_scan exactly three times sequentially, each with ${JSON.stringify(input)}. The path intentionally does not exist. Do not fix it, use another tool, or make a fourth call. After the third call, stop.`},180000);
 let inferenceError;inference.catch(error=>{inferenceError=error;});
 let notification;
 for(let attempt=0;attempt<240;attempt++){
  assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=10`));
  const inbox=await api(`/api/session/${session.id}/inbox`);
  if(JSON.stringify(inbox).includes('Kujo paused this session after three consecutive failures')){notification=true;break;}
  if(inferenceError)throw inferenceError;
  await delay(500);
 }
 assert.equal(notification,true,'Guard must acknowledge native interruption and deliver its non-resuming notice');
 await inference;
 const state=(await api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action:'status'}})).output;
 assert.equal(state.enabled,false,'Guard-only acceptance must not enable telemetry');
 assert.equal(state.intervention.interventions,1);assert.equal(state.intervention.attention,0);
 const receipts=(await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(r=>r.metadata?.session_id===session.id);
 const failures=receipts.filter(r=>r.ability_id==='kujo.shipcheck.repository.scan'&&r.status==='failed');
 assert.equal(failures.length,3,'Exactly three failed canonical scans, without automatic retries');
 assert.ok(failures.every(r=>r.surface==='plugin'&&r.metadata.model_id===model&&r.metadata.agent_id==='build'&&!r.approval_id));
 assert.equal(receipts.some(r=>r.status==='succeeded'),false);
 assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0);
 return {session_id:session.id,model,agent:'build',interventions:1,notification:true,telemetry_enabled:false,failed_receipts:failures.map(r=>r.receipt_id),approval_granted:false};
}
