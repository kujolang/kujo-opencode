// Actual canonical runtime preflight, not live-agent or approval acceptance.
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {inspectSource} from '../lib/source-tools.mjs';
import {previewExecution,executeSource} from '../lib/source-execution.mjs';
import {buildScenario} from './build-specialist-scenario.mjs';
const project=await mkdtemp(join(tmpdir(),'kujo-build-specialist-canonical-')),binary=resolveKujoBinary();
let steps=0;
for await(const step of buildScenario(project)) {
 steps++;
 if(step.decision==='reject'){await step.beforeDecision();await step.after();continue;}
 await step.beforeDecision?.();let result,error;
 try {
  if(step.tool==='kujo_source_preview')result=await previewExecution({project,binary,input:step.input});
  else if(step.tool==='kujo_source_execute')result=await executeSource({project,binary,input:step.input});
  else result=await inspectSource({project,binary,file:step.input.file,mode:step.tool==='kujo_source_inspect'?'inspect':'format'});
 }catch(failed){error=failed;}
 if(step.expectedStatus==='failed')assert.ok(error,'Expected a real canonical failure');else if(error)throw error;
 await step.after?.(error?{error}:{result});
}
assert.equal(steps,8);
console.log(JSON.stringify({ok:true,root:project,steps,canonical_runtime:true,live_specialist:false,native_approval:false}));
