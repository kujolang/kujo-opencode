import assert from 'node:assert/strict';
import {mkdtemp,realpath,writeFile,readFile,readdir,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {handlers} from '../lib/executor.mjs';
const root=await realpath(await mkdtemp(join(tmpdir(),'kujo-dispatch-lost-response-')));
const source=await realpath(process.env.KUJO_TEST_DISPATCH_SOURCE||resolve(process.env.KUJO_SOURCE_ROOT||'..','dispatch'));
const adapters=handlers({project:root,runtime:null,config:{kujo_bin:process.env.KUJO_BIN||resolveKujoBinary(),sources:{dispatch:{path:source}}}});
await writeFile(join(root,'workflow.json'),JSON.stringify({id:'lost-response',name:'Lost response',input_schema:{type:'dict'},tools:['timestamp_tool'],steps:[{id:'once',name:'Execute once',type:'tool',tool_name:'timestamp_tool',input_from:['input'],output_key:'stamp'}]}));
let calls=0;
async function loseResult(){calls++;await adapters.dispatch_run({path:'.',workflow_file:'workflow.json',topic:'Lost response fixture',output_dir:'runs'},{});throw Object.assign(Error('Injected loss after canonical operation completed'),{code:'fixture_response_lost'});}
await assert.rejects(loseResult(),{code:'fixture_response_lost'});
// No run ID or successful return value is available from the failed request.
const listInput={path:'.',output_dir:'runs',limit:50,offset:0};
const found=(await adapters.dispatch_list(listInput,{})).structured;
assert.equal(found.filtered_total,1);assert.equal(found.runs.length,1);const id=found.runs[0].run_id;
const statePath=join(root,'runs',id,'state.json'),before=await readFile(statePath,'utf8');
const inspected=(await adapters.dispatch_inspect({path:'.',output_dir:'runs',run_id:id},{})).structured;
assert.equal(inspected.run_id,id);assert.equal(inspected.summary.status,'completed');assert.equal(inspected.steps[0].attempts,1);assert.equal(calls,1);
// Exercise canonical recovery of a missing index without replaying work.
await unlink(join(root,'runs/.dispatch-run-index.json'));
const rebuilt=(await adapters.dispatch_list(listInput,{})).structured;assert.equal(rebuilt.runs[0].run_id,id);assert.equal(rebuilt.diagnostics.index_source,'scan');
assert.equal(await readFile(statePath,'utf8'),before);assert.equal(calls,1);
assert.equal((await readdir(join(root,'runs'),{withFileTypes:true})).filter(entry=>entry.isDirectory()&&entry.name.startsWith('run-')).length,1);
console.log(JSON.stringify({ok:true,root,source,run_id:id,execution_calls:calls,result_loss_injected:true,index_rebuilt:true,live_specialist:false,native_transport_loss:false}));
