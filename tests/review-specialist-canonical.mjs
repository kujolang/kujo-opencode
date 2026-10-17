import assert from 'node:assert/strict';
import {mkdtemp,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {handlers} from '../lib/executor.mjs';
import {reviewScenario} from './review-specialist-scenario.mjs';
const project=await realpath(await mkdtemp(join(tmpdir(),'kujo-review-specialist-canonical-')));
const adapters=handlers({project,runtime:null,config:{kujo_bin:resolveKujoBinary(),sources:Object.fromEntries(['patchbrief','changebucket','spec'].map(id=>[id,{path:resolve('..',id)}]))}});
const names={kujo_patchbrief_summarize:'patchbrief',kujo_changebucket_measure:'changebucket',kujo_spec_validate:'spec'};
let steps=0;
for await(const step of reviewScenario(project)){
 steps++;let result,error;try{result=await adapters[names[step.tool]](step.input,{});}catch(failed){error=failed;}
 if(step.expectedStatus==='failed')assert.ok(error);else if(error)throw error;
 await step.after(error?{error}:{result});
}
assert.equal(steps,4);
console.log(JSON.stringify({ok:true,root:project,steps,canonical_tools:true,live_specialist:false}));
