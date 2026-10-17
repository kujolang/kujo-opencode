import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {specialistSession,specialistStep} from './native-specialist-runner.mjs';
import {buildScenario} from './build-specialist-scenario.mjs';
export async function nativeBuildAcceptance({api,project,dataRoot,model,interrupt}) {
 project=await realpath(project);
 const session=await specialistSession({api,project,model,agent:'kujo-build'});
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const steps=[];
 for await(const step of buildScenario(project))steps.push(await specialistStep({api,session,receipts,step,interrupt}));
 return {agent:session.agent,model,session_id:session.id,scope:'reviewed imported test snapshots; no OS sandbox claim',steps};
}
