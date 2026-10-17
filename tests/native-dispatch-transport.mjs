import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir,access,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {assertProviderHealthy} from './native-model-acceptance.mjs';

// Review the fixture's embedded JSON semantically while preserving every other
// field. The narrow grammar refuses duplicate/extra keys and changed values;
// execution still uses the host's original request and its exact approval ID.
export function assertDispatchReviewedInput(actual,expected) {
 if(Object.hasOwn(expected,'input_json')) {
  assert.equal(typeof actual.input_json,'string');
  assert.match(actual.input_json,/^\s*\{\s*"recovery_case"\s*:\s*"lost-native-approval-reply"\s*\}\s*$/);
  assert.deepEqual(JSON.parse(actual.input_json),JSON.parse(expected.input_json));
  assert.deepEqual({...actual,input_json:expected.input_json},expected);
 } else assert.deepEqual(actual,expected);
}

// Fault only the owned host's one-time approval reply. This does not claim loss
// of a model-provider response or arbitrary exactly-once workflow execution.
export async function nativeDispatchTransport({api,project,dataRoot,model,loseApprovalReply,interrupt}) {
 project=await realpath(project);
 const path='dispatch-transport',root=join(project,path);await mkdir(root);
 await writeFile(join(root,'workflow.json'),JSON.stringify({id:'transport',name:'Native transport recovery',input_schema:{type:'dict',required:['recovery_case']},tools:['timestamp_tool'],output_schema:{type:'dict'},default_retry_policy:{max_attempts:1,base_delay_ms:0,max_delay_ms:0},steps:[{id:'stamp',name:'stamp',type:'tool',tool_name:'timestamp_tool',input_from:['input'],output_key:'stamp'}]}),{flag:'wx'});
 const split=model.indexOf('/');assert.ok(split>0);
 const session=(await api('/api/session',{title:'Dispatch approval transport recovery',location:{directory:project},agent:'build',model:{providerID:model.slice(0,split),id:model.slice(split+1)}})).data;
 assert.equal((await api(`/api/session/${session.id}`)).data.agent,'build');
 const rows=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.metadata?.session_id===session.id);
 let transport;const reviewedInputs=[];
 async function operation(tool,ability,input,beforeDecision,lose=false) {
  const before=new Set((await rows()).map(r=>r.receipt_id));
  const fresh=async()=> (await rows()).filter(r=>!before.has(r.receipt_id));
  let failure,permissionID;
  const fields={...input};delete fields.input_json;
  const details=JSON.stringify(fields)+(Object.hasOwn(input,'input_json')?'\nThe input_json field must contain this literal JSON text (not backslash-escaped text):\n'+input.input_json:'');
  const request=api(`/api/session/${session.id}/prompt`,{text:`Please use ${tool} for this isolated Dispatch recovery check. Inputs: ${details}\nPreserve every supplied input field. Report its receipt and stop after this operation. Do not rerun the workflow to discover its result.`},180000).catch(error=>{failure=error;});
  try {
   const deadline=Date.now()+180000;let terminal;
   while(Date.now()<deadline){
    if(failure)throw failure;
    assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
    const observed=await fresh();
    for(const row of observed){assert.equal(row.surface,'plugin');assert.equal(row.metadata.agent_id,'build');assert.equal(row.metadata.model_id,model);assert.equal(row.metadata.project_root,project);assert.ok([ability,'kujo.ability.catalog.list','kujo.ability.receipts.list'].includes(row.ability_id),'Unexpected operation during recovery');}
    for(const permission of (await api(`/api/session/${session.id}/permission`)).data){
     assert.equal(permission.action,'kujo.ability.approve');assert.equal(permission.metadata.ability,ability);assertDispatchReviewedInput(permission.metadata.input,input);assert.deepEqual(permission.save,[]);
     if(permissionID){assert.equal(permission.id,permissionID);continue;}
     assert.ok(observed.some(r=>r.ability_id===ability&&r.status==='approval_required'));
     await beforeDecision();permissionID=permission.id;reviewedInputs.push({ability,input:permission.metadata.input});
     if(lose)transport=await loseApprovalReply(session.id,permission.id);
     else await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision:'once'});
    }
    const results=(await fresh()).filter(r=>r.ability_id===ability&&['succeeded','failed'].includes(r.status));assert.ok(results.length<=1,'Duplicate effect or automatic retry');
    if(results.length){terminal=results[0];break;}await delay(500);
   }
   await api(`/api/experimental/session/${session.id}/wait`,{},180000);await request;if(failure)throw failure;
   assertProviderHealthy(await api(`/api/session/${session.id}/message?limit=100`));
   assert.ok(permissionID&&terminal,'Expected approved operation did not complete');assert.equal(terminal.status,'succeeded');assert.ok(terminal.approval_id);
   assert.equal((await fresh()).filter(r=>r.ability_id===ability&&['succeeded','failed'].includes(r.status)).length,1);
   assert.ok((await fresh()).every(r=>[ability,'kujo.ability.catalog.list','kujo.ability.receipts.list'].includes(r.ability_id)),'Unrequested late operation');
   assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0);
   return terminal;
  }catch(error){await interrupt(session.id).catch(()=>{});await request;throw error;}
 }
 console.log('Dispatch transport: run with lost approval reply');
 const output=join(root,'runs');const absent=()=>assert.rejects(access(output),{code:'ENOENT'});
 const run=await operation('kujo_dispatch_run','kujo.dispatch.workflow.run',{path,workflow_file:'workflow.json',topic:'Recover the retained run after an approval reply is lost',input_json:'{"recovery_case":"lost-native-approval-reply"}',output_dir:'runs'},absent,true);
 assert.equal(transport.forwarded_requests,1);assert.equal(transport.client_response_lost,true);
 const dirs=(await readdir(output,{withFileTypes:true})).filter(x=>x.isDirectory()&&!x.name.startsWith('.'));assert.equal(dirs.length,1);
 const runID=dirs[0].name,statePath=join(output,runID,'state.json'),bytes=await readFile(statePath,'utf8'),state=JSON.parse(bytes);
 assert.equal(state.status,'completed');assert.equal(state.options.auto_approve,false);assert.ok(state.steps.every(s=>s.attempts===1));
 const unchanged=async()=>assert.equal(await readFile(statePath,'utf8'),bytes);
 console.log('Dispatch transport: find retained run without retry');
 const listed=await operation('kujo_dispatch_runs','kujo.dispatch.runs.list',{path,output_dir:'runs',limit:50,offset:0},unchanged);
 assert.equal(listed.result.structured.filtered_total,1);assert.equal(listed.result.structured.runs[0].run_id,runID);await unchanged();
 console.log('Dispatch transport: inspect retained run');
 const inspected=await operation('kujo_dispatch_inspect','kujo.dispatch.run.inspect',{path,output_dir:'runs',run_id:runID},unchanged);
 assert.equal(inspected.result.structured.run_id,runID);assert.equal(inspected.result.structured.summary.status,'completed');await unchanged();
 assert.equal((await rows()).filter(r=>r.ability_id==='kujo.dispatch.workflow.run'&&r.status==='succeeded').length,1);
 return {scope:'Native one-time approval HTTP reply lost; retained Dispatch run discovered and inspected without workflow retry',agent:'build',model,session_id:session.id,transport,reviewed_inputs:reviewedInputs,run_id:runID,receipt_ids:[run.receipt_id,listed.receipt_id,inspected.receipt_id],workflow_executions:1,canonical_state_unchanged_by_reconciliation:true};
}
