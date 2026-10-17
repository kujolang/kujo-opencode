import assert from 'node:assert/strict';
import {mkdtemp,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {handlers} from '../lib/executor.mjs';
import {workflowScenario} from './workflow-specialist-scenario.mjs';
const root=await realpath(await mkdtemp(join(tmpdir(),'kujo-workflow-specialist-')));
const source=await realpath(process.env.KUJO_TEST_DISPATCH_SOURCE||resolve(process.env.KUJO_SOURCE_ROOT||'..','dispatch'));
const adapters=handlers({project:root,runtime:null,config:{kujo_bin:process.env.KUJO_BIN||resolveKujoBinary(),sources:{dispatch:{path:source}}}});
const names={kujo_dispatch_validate:'dispatch',kujo_dispatch_run:'dispatch_run',kujo_dispatch_inspect:'dispatch_inspect',kujo_dispatch_runs:'dispatch_list'};
let steps=0;
for await(const step of workflowScenario(root)){
 steps++;await step.beforeDecision?.();if(['reject','cancel'].includes(step.decision)){await step.after();continue;}
 let result,error;try{result=await adapters[names[step.tool]](step.input,{});}catch(failed){error=failed;}
 if(step.expectedStatus==='failed')assert.ok(error);else if(error)throw error;
 await step.after(error?{error}:{result});
}
assert.equal(steps,13);
console.log(JSON.stringify({ok:true,root,source,steps,live_specialist:false,native_approval:false,native_cancellation:false}));
