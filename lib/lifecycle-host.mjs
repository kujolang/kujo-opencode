import {setTimeout as delay} from 'node:timers/promises';
import {LifecycleOutbox,lifecycleEndpoint} from './lifecycle-outbox.mjs';

export function lifecycleConfig(value) {
 if(value===undefined)return {enabled:false,url:lifecycleEndpoint()};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['enabled','url'].includes(key))||typeof value.enabled!=='boolean')throw Error('Invalid lifecycle configuration');
 return {enabled:value.enabled,url:lifecycleEndpoint(value.url)};
}

// Observers never read prompt, tool input/output, model headers or error text.
export async function startLifecycle({ctx,home,project,version,config,sessionAtProject,isCurrent,makeOutbox=options=>new LifecycleOutbox(options),interval=1000}) {
 const settings=lifecycleConfig(config),box=makeOutbox({home,project,version,...settings});
 const registrations=[],stop=new AbortController();let worker,events,closed=false;
 async function capture(event) {
  if(closed||!settings.enabled)return;
  try {if(!await isCurrent(settings))return;await sessionAtProject(event.sessionID);if(!closed)await box.capture(event);}catch{/* Observability must not fail the user's work. */}
 }
 async function flush(){if(closed)return {sent:false,reason:'disabled'};try {if(!await isCurrent(settings))return {sent:false,reason:'configuration_changed'};return await box.flush();}catch{return {sent:false,reason:'queue_unavailable'};}}
 async function close(){if(closed)return;closed=true;stop.abort();await box.close();for(const registration of registrations.reverse())await registration.dispose();await Promise.allSettled([worker,events]);}
 const controls={status:()=>box.status(),flush,recover:()=>box.recover(),discard:()=>box.discard(),close};
 if(!settings.enabled)return controls;
 try {
  const model=(event,phase)=>({phase,sessionID:event.sessionID,agent:event.agent,provider:event.model?.providerID,model:event.model?.id});
  registrations.push(await ctx.tool.hook('execute.before',event=>capture({phase:'tool.started',sessionID:event.sessionID,agent:event.agent,tool:event.tool,callID:event.id,messageID:event.messageID})));
  registrations.push(await ctx.tool.hook('execute.after',event=>capture({phase:event.status==='completed'?(event.result?.metadata?.ok===false?'tool.error':'tool.completed'):'tool.error',sessionID:event.sessionID,agent:event.agent,tool:event.tool,callID:event.id,messageID:event.messageID,receiptID:event.status==='completed'?event.result?.metadata?.receipt_id:undefined})));
  registrations.push(await ctx.session.hook('model.request',event=>capture(model(event,'model.request'))));
  registrations.push(await ctx.session.hook('http.response',event=>capture({...model(event,'model.response'),httpStatus:event.response.status})));
  registrations.push(await ctx.session.hook('retry',event=>capture({...model(event,'model.retry'),attempt:event.attempt})));
  events=(async()=>{while(!closed){try{for await(const event of ctx.event.subscribe({signal:stop.signal})){
   if(closed)break;if(event.type==='session.execution.started')await capture({phase:'session.started',sessionID:event.data?.sessionID});
   if(event.type==='session.execution.interrupted')await capture({phase:'session.cancelled',sessionID:event.data?.sessionID});
   if(event.type==='session.status'&&event.data?.status?.type==='idle')await capture({phase:'session.idle',sessionID:event.data.sessionID});
  }}catch{}if(!closed)await delay(interval,undefined,{signal:stop.signal}).catch(()=>{});}})();
  worker=(async()=>{while(!closed){await flush();if(!closed)await delay(interval,undefined,{signal:stop.signal}).catch(()=>{});}})();
  return controls;
 }catch(error){await close();throw error;}
}
