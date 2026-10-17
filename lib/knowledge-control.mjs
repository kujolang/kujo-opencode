import {randomUUID} from 'node:crypto';
import {principal} from './approvals.mjs';
export async function manageKnowledge({action,sessionID,name,path,digest,question,project,openApp,sessionAtProject,approve,signal}){
 await sessionAtProject(sessionID);if(!['preview','index','status','query','recover'].includes(action))throw Error('Unknown knowledge action');
 const abilityId=`kujo.opencode.knowledge.${action}`,input={...(name?{name}:{}),...(path?{path}:{}),...(digest?{digest}:{}),...(question?{question}:{})};
 const app=await openApp(project),item=app.runtime.describe().find(item=>item.definition.id===abilityId);
 if(!item)throw Error('Enable the offline knowledge capabilities in /kujo, or choose Full');
 const identity=`opencode-knowledge:${randomUUID()}`,controls={principal,host:'opencode',surface:'plugin',sessionId:sessionID,invocationId:identity,idempotencyKey:identity};
 let result=await app.runtime.execute({abilityId,input,controls,signal});
 if(result.code==='ability_approval_required'){
  await approve({sessionID,ability:abilityId,input,digest:item.definitionDigest,effects:item.definition.effects,invocation:identity});
  signal?.throwIfAborted();await sessionAtProject(sessionID);const after=await openApp(project);
  if(!after.runtime.describe().some(candidate=>candidate.definition.id===abilityId&&candidate.definitionDigest===item.definitionDigest))throw Error('Knowledge capability changed during approval');
  const grant=await after.runtime.requestApproval({abilityId,input,invocationId:identity,principal});result=await after.runtime.execute({abilityId,input,controls:{...controls,approvalId:grant.approval_id},signal});
 }
 if(!result.ok)throw Error(result.error?.message||result.message||`Knowledge operation needs attention (${result.code}); inspect its receipt before retrying`);
 return {...result.receipt.result,receipt_id:result.receipt.receipt_id};
}
