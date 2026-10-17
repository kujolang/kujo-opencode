import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
export async function* workflowScenario(project) {
 const path='specialist-workflow',root=join(project,path);await mkdir(root);
 const stamp=id=>({id,name:id,type:'tool',tool_name:'timestamp_tool',input_from:['input'],output_key:id});
 const base={id:'specialist-workflow',name:'Bounded Workflow fixture',input_schema:{type:'dict'},tools:['timestamp_tool'],output_schema:{type:'dict'},default_retry_policy:{max_attempts:1,base_delay_ms:0,max_delay_ms:0}};
 const workflows={
  'complete.json':{...base,steps:[stamp('complete')]},
  'checkpoint.json':{...base,steps:[stamp('before'),{id:'human',name:'Human checkpoint',type:'approval',approval_required:true,approval_gate:{reason:'Human review required',summary:'Do not auto-approve'},input_from:['before'],output_key:'decision'},stamp('after')]},
  'failed.json':{...base,steps:[{...stamp('bad-output'),output_schema:{type:'dict',required:['missing_field']}}]},
  'invalid.json':{...base,steps:[{id:'invalid',type:'unknown'}]}
 };
 for(const [name,workflow] of Object.entries(workflows))await writeFile(join(root,name),JSON.stringify(workflow),{flag:'wx'});
 const absent=async name=>assert.equal(await stat(join(root,name)).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}),false);
 yield {ability:'kujo.dispatch.workflow.validate',tool:'kujo_dispatch_validate',input:{path,workflow_file:'complete.json'},after:async receipt=>assert.equal(receipt.result.exit_code,0)};
 const run={ability:'kujo.dispatch.workflow.run',tool:'kujo_dispatch_run'};
 for(const decision of ['reject','cancel'])yield {...run,input:{path,workflow_file:'complete.json',topic:'No execution without approval',input_json:'{}',output_dir:decision},decision,beforeDecision:()=>absent(decision),after:()=>absent(decision)};
 for(const [file,output,status] of [['complete.json','complete','completed'],['checkpoint.json','checkpoint','paused'],['failed.json','failed','failed']]){
  let runID,statePath,stateBytes,state,control;
  yield {...run,input:{path,workflow_file:file,topic:'Bounded explicit Workflow acceptance',input_json:'{}',output_dir:output},decision:'once',expectedStatus:status==='failed'?'failed':'succeeded',beforeDecision:()=>absent(output),after:async receipt=>{
   if(status==='failed'){assert.equal(receipt.error.code,'kujo_command_failed');assert.notEqual(receipt.error.details.exit_code,0);}else assert.equal(receipt.result.exit_code,0);
   const dirs=(await readdir(join(root,output),{withFileTypes:true})).filter(entry=>entry.isDirectory()&&!entry.name.startsWith('.'));assert.equal(dirs.length,1);
   runID=dirs[0].name;statePath=join(root,output,runID,'state.json');stateBytes=await readFile(statePath,'utf8');state=JSON.parse(stateBytes);
   assert.equal(state.run_id,runID);assert.equal(state.status,status);assert.equal(state.options.auto_approve,false);
   assert.ok(state.steps.every(step=>step.attempts<=1),'No automatic retry');
   if(status==='paused'){assert.equal(state.approvals[0].decision,'pending');assert.equal(state.steps[2].attempts,0);assert.equal(state.data.after,undefined);}
   if(status==='failed')assert.ok(state.errors.length>0);
  }};
  yield {ability:'kujo.dispatch.runs.list',tool:'kujo_dispatch_runs',input:{path,output_dir:output,limit:50,offset:0},decision:'once',beforeDecision:async()=>assert.equal(await readFile(statePath,'utf8'),stateBytes),after:async receipt=>{assert.equal(receipt.result.structured.filtered_total,1);assert.equal(receipt.result.structured.runs[0].run_id,runID);assert.equal(await readFile(statePath,'utf8'),stateBytes);}};
  // Reconciliation observes the retained run; it never repeats the workflow.
  yield {ability:'kujo.dispatch.run.inspect',tool:'kujo_dispatch_inspect',input:{path,output_dir:output,run_id:runID},decision:'once',beforeDecision:async()=>assert.equal(await readFile(statePath,'utf8'),stateBytes),after:async receipt=>{
   const result=receipt.result.structured;control=result.control;assert.equal(result.command,'inspect');assert.equal(result.ok,true);assert.equal(result.run_id,runID);assert.equal(result.summary.status,status);
   assert.equal(await readFile(statePath,'utf8'),stateBytes,'Inspection must not change run decisions or step state');
   assert.deepEqual(result.steps.map(step=>[step.id,step.status,step.attempts]),state.steps.map(step=>[step.id,step.status,step.attempts]));
   if(status==='paused')assert.equal(result.approvals[0].decision,'pending');
  }};
  if(status==='paused'){
   assert.equal(control.available,true);
   const event=control.human_intervention;
   const input={path,output_dir:output,run_id:runID,step_id:event.run.step_id,event_id:event.event_id,decision_id:event.security.decision_id,expected_revision:control.state_revision,decision:'approve',response:'Explicit isolated acceptance decision'};
   const decision={ability:'kujo.dispatch.checkpoint.decide',tool:'kujo_dispatch_decide'};
   const unchanged=async()=>assert.equal(await readFile(statePath,'utf8'),stateBytes);
   yield {...decision,input,decision:'reject',beforeDecision:unchanged,after:unchanged};
   yield {...decision,input:{...input,expected_revision:input.expected_revision+1},decision:'once',expectedStatus:'failed',beforeDecision:unchanged,after:async receipt=>{assert.equal(receipt.error.code,'dispatch_checkpoint_changed');await unchanged();}};
   // A stale decision requires a fresh canonical inspection before resubmission.
   // Give the model that evidence too, rather than asking it to ignore recovery guidance.
   yield {ability:'kujo.dispatch.run.inspect',tool:'kujo_dispatch_inspect',input:{path,output_dir:output,run_id:runID},decision:'once',beforeDecision:unchanged,after:async receipt=>{
    const refreshed=receipt.result.structured.control;assert.equal(refreshed.available,true);assert.equal(refreshed.run_status,'paused');
    const pending=refreshed.human_intervention;
    Object.assign(input,{step_id:pending.run.step_id,event_id:pending.event_id,decision_id:pending.security.decision_id,expected_revision:refreshed.state_revision});
    await unchanged();
   }};
   yield {...decision,input,decision:'once',beforeDecision:unchanged,after:async receipt=>{assert.equal(receipt.result.exit_code,0);const completed=JSON.parse(await readFile(statePath,'utf8'));assert.equal(completed.status,'completed');assert.equal(completed.steps.at(-1).attempts,1);stateBytes=await readFile(statePath,'utf8');}};
   yield {ability:'kujo.dispatch.run.inspect',tool:'kujo_dispatch_inspect',input:{path,output_dir:output,run_id:runID},decision:'once',beforeDecision:unchanged,after:async receipt=>{assert.equal(receipt.result.structured.control.run_status,'completed');await unchanged();}};
  }

 }
 yield {ability:'kujo.dispatch.workflow.validate',tool:'kujo_dispatch_validate',input:{path,workflow_file:'invalid.json'},expectedStatus:'failed',after:async receipt=>assert.equal(receipt.error.code,'kujo_command_failed')};
}
