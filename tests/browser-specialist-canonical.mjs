import assert from 'node:assert/strict';
import {mkdtemp,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {handlers} from '../lib/executor.mjs';
import {lensBrowserStatus} from '../lib/lens.mjs';
import {browserScenario} from './browser-specialist-scenario.mjs';
const project=await realpath(await mkdtemp(join(tmpdir(),'kujo-browser-specialist-canonical-'))),lens=resolve('../lens');
assert.equal((await lensBrowserStatus(lens)).ready,true,'Canonical preflight requires an already installed real browser');
const adapters=handlers({project,runtime:null,config:{kujo_bin:resolveKujoBinary(),sources:{lens:{path:lens}}}});
const names={kujo_lens_flow_validate:'lens_flow_validate',kujo_lens_check:'lens_check'};
let steps=0;
for await(const step of browserScenario(project)){
 steps++;await step.beforeDecision?.();
 if(step.decision==='reject'){await step.after();continue;}
 let result,error;try{result=await adapters[names[step.tool]](step.input,{});}catch(failed){error=failed;}
 if(step.expectedStatus==='failed')assert.ok(error);else if(error)throw error;
 await step.after(error?{error}:{result});
}
assert.equal(steps,7);
console.log(JSON.stringify({ok:true,root:project,steps,canonical_tools:true,real_browser:true,live_specialist:false,native_approval:false}));
