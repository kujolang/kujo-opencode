import assert from 'node:assert/strict';
import {mkdtemp,realpath,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {handlers} from '../lib/executor.mjs';
import {shipScenario} from './ship-specialist-scenario.mjs';
const root=await realpath(await mkdtemp(join(tmpdir(),'kujo-ship-specialist-')));
const installed=process.env.KUJO_TEST_INSTALLATION?JSON.parse(await readFile(process.env.KUJO_TEST_INSTALLATION,'utf8')).sources:null;
const sources=installed||Object.fromEntries(await Promise.all(['shipcheck','eval','runledger'].map(async id=>[id,{path:await realpath(resolve(process.env.KUJO_SOURCE_ROOT||'..',id))}])));
const adapters=handlers({project:root,runtime:null,config:{kujo_bin:process.env.KUJO_BIN||resolveKujoBinary(),sources}});
const names={kujo_shipcheck_scan:'shipcheck',kujo_eval_run:'eval',kujo_runledger_start:'runledger_start',kujo_runledger_finish:'runledger_finish',kujo_runledger_report:'runledger',kujo_runledger_correlate:'runledger_correlate'};
let steps=0;
for await(const step of shipScenario(root)){
 steps++;await step.beforeDecision?.();if(step.decision==='reject'){await step.after();continue;}
 let result,error;try{result=await adapters[names[step.tool]](step.input,{});}catch(failed){error=failed;}
 if(step.expectedStatus==='failed')assert.ok(error);else if(error)throw error;
 await step.after(error?{error}:{result});
}
assert.equal(steps,8);
console.log(JSON.stringify({ok:true,root,sources:Object.fromEntries(['shipcheck','eval','runledger'].map(id=>[id,sources[id]])),steps,live_specialist:false,native_approval:false,published:false}));
