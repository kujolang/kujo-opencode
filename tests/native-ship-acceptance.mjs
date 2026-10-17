import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {specialistSession,specialistStep} from './native-specialist-runner.mjs';
import {shipScenario} from './ship-specialist-scenario.mjs';
export async function nativeShipAcceptance({api,project,dataRoot,model,interrupt}) {
 project=await realpath(project);
 const session=await specialistSession({api,project,model,agent:'kujo-ship'});
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const steps=[];
 for await(const step of shipScenario(project,{provider:model.slice(0,model.indexOf('/')),model:model.slice(model.indexOf('/')+1)}))steps.push(await specialistStep({api,session,receipts,step,interrupt}));
 return {agent:session.agent,model,session_id:session.id,scope:'informational release scan, actual passing/failing Eval and linked RunLedger; no publication',steps};
}
