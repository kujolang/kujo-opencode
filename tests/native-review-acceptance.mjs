import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {specialistSession,specialistStep,specialistReviewOpening} from './native-specialist-runner.mjs';
import {reviewScenario} from './review-specialist-scenario.mjs';
export async function nativeReviewAcceptance({api,project,dataRoot,model,interrupt}) {
 project=await realpath(project);
 const session=await specialistSession({api,project,model,agent:'kujo-review'});
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const scenario=reviewScenario(project);
 const opening=[(await scenario.next()).value,(await scenario.next()).value];
 const steps=await specialistReviewOpening({api,session,receipts,steps:opening,interrupt});
 for await(const step of scenario)steps.push(await specialistStep({api,session,receipts,step,interrupt}));
 return {agent:session.agent,model,session_id:session.id,scope:'real Git diff, heuristic footprint and contract validation; no review approval manufactured',steps};
}
