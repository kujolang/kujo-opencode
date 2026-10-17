import assert from 'node:assert/strict';
import {access,readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {assertProviderHealthy} from './native-model-acceptance.mjs';
export async function nativeCancellationAcceptance({api,project,dataRoot,model,watchdog,interrupt}){
 const split=model.indexOf('/'),modelRef={providerID:model.slice(0,split),id:model.slice(split+1)};
 const session=(await api('/api/session',{title:'Cancel a pending native effect',location:{directory:await realpath(project)},agent:'build',model:modelRef})).data;
 const directory='.cancel-telemetry';const input={path:'.',provider:modelRef.providerID,model:modelRef.id,task:'Verify cancellation before a RunLedger write',ledger_dir:directory};
 const absent=()=>assert.rejects(access(join(project,directory)),{code:'ENOENT'});
 await absent();
 const wait=async(fn,label)=>{for(let i=0;i<120;i++){const result=await fn();if(result)return result;assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=10`));await delay(500);}throw Error('Timed out: '+label);};
 await api(`/api/session/${session.id}/prompt`,{text:`Please start a RunLedger record for this project using kujo_runledger_start with ${JSON.stringify(input)}. This is an isolated check of cancelling at the approval screen, before any ledger write. The project nickname is Silver Meadow 23.`},180000);
 const permission=await wait(async()=> (await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.ability.approve'),'pending native effect permission');
 assert.equal(permission.metadata.ability,'kujo.runledger.runs.start');assert.deepEqual(permission.metadata.input,input);assert.deepEqual(permission.save,[]);
 await absent();
 await interrupt(session.id);
 await api(`/api/experimental/session/${session.id}/wait`,{},15000);
 await absent();
 const records=async()=> (await watchdog.records()).filter(r=>r.references.some(ref=>ref.type==='session'&&ref.id===session.id));
 await wait(async()=> (await records()).some(r=>r.name==='opencode.session.cancelled'),'canonical cancellation telemetry');
 const events=await records(),cancelled=events.filter(r=>r.name==='opencode.session.cancelled');
 assert.equal(cancelled.length,1);assert.equal(cancelled[0].status,'cancelled');assert.equal(cancelled[0].attributes['watchdog.outcome.terminal'],true);
 const owned=events.filter(r=>r.references.some(ref=>ref.type==='tool_call'&&ref.id===permission.source.id));
 assert.ok(owned.some(r=>r.name==='opencode.tool.started'&&r.attributes['gen_ai.tool.name']==='kujo_runledger_start'));
 // The model may finish native tool discovery before requesting the effect.
 // Only this exact interrupted call must have no successful completion.
 assert.ok(!owned.some(r=>r.name==='opencode.tool.completed'));
 assert.ok(events.every(r=>r.content.length===0&&r.privacy.content_mode==='off'));
 assert.ok(!/silver meadow 23/i.test(JSON.stringify(events)));
 const receipts=(await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(r=>r.metadata?.session_id===session.id);
 assert.ok(receipts.some(r=>r.status==='approval_required'));assert.ok(receipts.every(r=>r.status!=='succeeded'&&!r.approval_id));
 const remaining=(await api(`/api/session/${session.id}/permission`)).data;
 assert.equal(remaining.length,0,'Cancellation must clear the pending native effect request');
 return {watchdog:watchdog.provenance,session_id:session.id,model,agent:'build',permission_requested:true,approval_granted:false,effect_absent:true,remaining_permissions:remaining.length,cancellation_records:cancelled.length,receipt_ids:receipts.map(r=>r.receipt_id),metadata_only:true,events};
}
