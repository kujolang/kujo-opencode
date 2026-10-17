import {AutomaticLedger} from './automatic-ledger.mjs';
import {FailureGuard} from './failure-guard.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {LifecycleOutbox,lifecycleEndpoint,lifecycleMetadata} from './lifecycle-outbox.mjs';

export function lifecycleConfig(value) {
 if(value===undefined)return {enabled:false,url:lifecycleEndpoint(),intervention:false,runledger:false};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['enabled','url','intervention','runledger'].includes(key))||typeof value.enabled!=='boolean'||(value.runledger!==undefined&&typeof value.runledger!=='boolean')||(value.intervention!==undefined&&typeof value.intervention!=='boolean'))throw Error('Invalid lifecycle configuration');
 return {enabled:value.enabled,url:lifecycleEndpoint(value.url),intervention:value.intervention===true,runledger:value.runledger===true};
}

// Observers never read prompt, tool input/output, model headers or error text.
export async function startLifecycle({ctx,home,project,version,config,sessionAtProject,isCurrent,resolveRun=async()=>undefined,onFinish=async()=>{},manageLedger=async()=>{throw Error('Session tracking unavailable');},makeOutbox=options=>new LifecycleOutbox(options),interval=1000}) {
 const settings=lifecycleConfig(config),box=makeOutbox({home,project,version,...settings});
 const guard=new FailureGuard({enabled:settings.intervention,interrupt:async sessionID=>{await sessionAtProject(sessionID);if(closed||!await isCurrent(settings))return false;return ctx.session.interrupt({sessionID,resume:false});},notify:async(sessionID,text)=>{await sessionAtProject(sessionID);if(closed||!await isCurrent(settings))return;return ctx.session.synthetic({sessionID,text,resume:false});}});
 const automatic=new AutomaticLedger({home,project,enabled:settings.runledger,manage:manageLedger,onFinish,isCurrent:()=>isCurrent(settings),notify:async(sessionID,text)=>{await sessionAtProject(sessionID);if(!closed&&await isCurrent(settings))await ctx.session.synthetic({sessionID,text,resume:false});}});
 const registrations=[],stop=new AbortController();let worker,events,closed=false;
 async function capture(event) {
  if(closed||(!settings.enabled&&!settings.intervention&&!settings.runledger))return;
  try {if(!await isCurrent(settings))return;await sessionAtProject(event.sessionID);if(!closed){const metadata=lifecycleMetadata(event);if(settings.enabled){const runID=await resolveRun(event.sessionID,stop.signal).catch(()=>undefined);if(!closed&&await isCurrent(settings))await box.capture({...metadata,runID});}void guard.observe(metadata);}}catch{/* Observability must not fail the user's work. */}
 }
 async function flush(){if(closed)return {sent:false,reason:'disabled'};try {if(!await isCurrent(settings))return {sent:false,reason:'configuration_changed'};return await box.flush();}catch{return {sent:false,reason:'queue_unavailable'};}}
 async function retry(){if(closed)return {sent:false,reason:'disabled'};if(!await isCurrent(settings))return {sent:false,reason:'configuration_changed'};return box.retry();}
 async function close(){if(closed)return;closed=true;automatic.close();guard.close();stop.abort();await box.close();for(const registration of registrations.reverse())await registration.dispose();await Promise.allSettled([worker,events]);}
 const controls={status:async()=>({...await box.status(),intervention:guard.status(),runledger:{enabled:settings.runledger}}),review:sessionID=>automatic.review(sessionID),flush,retry,recover:()=>box.recover(),discard:()=>box.discard(),recover_tracking:()=>automatic.recover(),reset_tracking:()=>automatic.reset(),close};
 if(!settings.enabled&&!settings.intervention&&!settings.runledger)return controls;
 try {
  const model=(event,phase)=>({phase,sessionID:event.sessionID,agent:event.agent,provider:event.model?.providerID,model:event.model?.id});
  registrations.push(await ctx.tool.hook('execute.before',event=>capture({phase:'tool.started',sessionID:event.sessionID,agent:event.agent,tool:event.tool,callID:event.id,messageID:event.messageID})));
  registrations.push(await ctx.tool.hook('execute.after',event=>capture({phase:event.status==='completed'?(event.result?.metadata?.ok===false?'tool.error':'tool.completed'):'tool.error',sessionID:event.sessionID,agent:event.agent,tool:event.tool,callID:event.id,messageID:event.messageID,receiptID:event.status==='completed'?event.result?.metadata?.receipt_id:undefined})));
  registrations.push(await ctx.session.hook('model.request',async event=>{try{await sessionAtProject(event.sessionID);await automatic.before(event.sessionID);}catch{}await capture(model(event,'model.request'));}));
  registrations.push(await ctx.session.hook('http.response',event=>capture({...model(event,'model.response'),httpStatus:event.response.status})));
  registrations.push(await ctx.session.hook('retry',event=>capture({...model(event,'model.retry'),attempt:event.attempt})));
  events=(async()=>{while(!closed){try{for await(const event of ctx.event.subscribe({signal:stop.signal})){
   if(closed)break;if(event.type==='session.execution.started')await capture({phase:'session.started',sessionID:event.data?.sessionID});
   if(event.type==='session.execution.interrupted'){automatic.cancel(event.data?.sessionID);await capture({phase:'session.cancelled',sessionID:event.data?.sessionID});await automatic.idle(event.data?.sessionID);}
   if(['session.execution.succeeded','session.execution.failed'].includes(event.type)){await capture({phase:event.type==='session.execution.failed'?'session.error':'session.completed',sessionID:event.data?.sessionID});await automatic.idle(event.data?.sessionID);}
   if(event.type==='session.status'&&event.data?.status?.type==='idle'){await capture({phase:'session.idle',sessionID:event.data.sessionID});await automatic.idle(event.data.sessionID);}
  }}catch{}if(!closed)await delay(interval,undefined,{signal:stop.signal}).catch(()=>{});}})();
  worker=(async()=>{while(!closed){await flush();if(!closed)await delay(interval,undefined,{signal:stop.signal}).catch(()=>{});}})();
  return controls;
 }catch(error){await close();throw error;}
}
