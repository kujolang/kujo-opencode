import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// Live-provider acceptance is explicit and separate from the offline gate.
// Decisions below apply only to sessions and artifacts created by this fixture.
export async function nativeModelAcceptance({api,project,dataRoot,model}) {
 const split=model.indexOf('/');assert.ok(split>0,'model must be provider/id');
 const modelRef={providerID:model.slice(0,split),id:model.slice(split+1)};
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const waitFor=async(fn,label)=>{for(let i=0;i<240;i++){const result=await fn();if(result)return result;await delay(500);}throw Error(`Timed out: ${label}`);};
 const session=async title=>(await api('/api/session',{title,location:{directory:project},model:modelRef})).data;
 const prompt=async(s,text)=>api(`/api/session/${s.id}/prompt`,{text},180000);
 console.log('Live acceptance: native read');
 const scan=await session('Kujo real native read acceptance');
 await prompt(scan,'Use kujo_shipcheck_scan exactly once with {"path":"."}. Do not use shell or any other tools. Report the receipt ID.');
 const scanReceipt=await waitFor(async()=> (await receipts()).find(r=>r.metadata?.session_id===scan.id&&r.ability_id==='kujo.shipcheck.repository.scan'&&r.status==='succeeded'),'native ShipCheck receipt');
 assert.equal(scanReceipt.surface,'plugin');assert.equal(scanReceipt.metadata.model_id,model);
 const evidence={read_receipt:scanReceipt.receipt_id};
 for(const decision of ['reject','once']) {
  console.log(`Live acceptance: native write ${decision}`);
  const s=await session(`Kujo native write ${decision}`);const ledger=`.native-${decision}`;
  const input={path:'.',provider:modelRef.providerID,model:modelRef.id,task:'Isolated native acceptance',ledger_dir:ledger};
  const inference=prompt(s,`Use kujo_runledger_start exactly once with ${JSON.stringify(input)}. Do not use other tools or retry. If permission is denied, stop and report the denial.`);
  let inferenceError;inference.catch(error=>{inferenceError=error;});
  const permission=await waitFor(async()=> (await api(`/api/session/${s.id}/permission`)).data.find(p=>p.action==='kujo.ability.approve'),'native Ability permission');
  assert.equal(permission.metadata.ability,'kujo.runledger.runs.start');
  assert.deepEqual(permission.metadata.input,input);assert.deepEqual(permission.save,[]);
  await assert.rejects(access(join(project,ledger)),{code:'ENOENT'});
  await api(`/api/session/${s.id}/permission/${permission.id}/reply`,{decision});
  if(decision==='once') {
   const receipt=await waitFor(async()=> (await receipts()).find(r=>r.metadata?.session_id===s.id&&r.ability_id==='kujo.runledger.runs.start'&&r.status==='succeeded'),'approved native write receipt');
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
