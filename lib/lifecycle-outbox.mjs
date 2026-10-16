import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,join,resolve,relative} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {replaceDirectory,recoverDirectory} from './atomic-directory.mjs';
import {safeOutputPath,safeExistingFile} from './paths.mjs';
const MAX_JOBS=128,MAX_ATTEMPTS=5,TTL=86400000,LEASE=15000;
const phases=new Set(['session.started','session.idle','session.cancelled','tool.started','tool.completed','tool.error','tool.cancelled','model.request','model.response','model.retry']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const identity=value=>typeof value==='string'&&/^[A-Za-z0-9_.:/-]{1,160}$/.test(value)?value:undefined;
export function lifecycleEndpoint(value='http://127.0.0.1:7700'){
 const url=new URL(value);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Lifecycle endpoint must be a loopback HTTP origin without credentials');return url.origin;
}
export function lifecycleMetadata(value){
 if(!value||!phases.has(value.phase)||!identity(value.sessionID))throw Error('Invalid lifecycle metadata');
 const result={phase:value.phase,sessionID:value.sessionID};
 for(const key of ['agent','tool','callID','messageID','receiptID','provider','model'])if(identity(value[key]))result[key]=value[key];
 if(Number.isInteger(value.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599)result.httpStatus=value.httpStatus;
 if(Number.isInteger(value.attempt)&&value.attempt>=0&&value.attempt<=1000)result.attempt=value.attempt;
 return result;
}
export function lifecycleBatch(job,projectKey,version=job.version||'unknown'){
 const event=lifecycleMetadata(job.event),observed=new Date(job.created).toISOString();
 const terminal=['tool.completed','tool.error','tool.cancelled','session.idle','session.cancelled'].includes(event.phase);
 const status=event.phase.endsWith('cancelled')?'cancelled':event.phase==='tool.error'?'error':event.phase==='tool.completed'?'ok':'unset';
 const attributes={'watchdog.outcome.code':status==='ok'?'success':status==='unset'?'unknown':status,'watchdog.outcome.terminal':terminal,'kujo.project.id':projectKey};
 for(const [key,name] of [['tool','gen_ai.tool.name'],['model','gen_ai.request.model'],['provider','gen_ai.provider.name'],['httpStatus','http.response.status_code'],['attempt','opencode.retry.attempt'],['messageID','opencode.message.id'],['receiptID','kujo.receipt.id']])if(event[key]!==undefined)attributes[name]=event[key];
 const references=[['session',event.sessionID],['agent',event.agent],['tool_call',event.callID]].filter(([,id])=>id).map(([type,id])=>({type,id}));
 return {schema_version:'watchdog.telemetry.v2',batch_id:`kujo-opencode-lifecycle:${job.id}`,sent_at:observed,producer:{name:'kujo-opencode',version,adapter_id:'kujo.opencode.lifecycle',adapter_version:'1.0.0',original_schema:'opencode.lifecycle/v1'},records:[{record_id:job.id,record_type:'event',trace_id:hash(projectKey+':'+event.sessionID).slice(0,32),observed_at:observed,kind:'internal',name:`opencode.${event.phase}`,status,source:{'watchdog.semantic_profile':'watchdog.observability.v1','application.name':'kujo-opencode','harness.name':'opencode','instrumentation.name':'kujo.opencode.lifecycle','instrumentation.version':'1.0.0'},references,attributes,content:[],privacy:{content_mode:'off',policy_version:'watchdog.privacy.v1',transformations:['metadata_only']}}]};
}
const empty=()=>({schema:'kujo.opencode.lifecycle-outbox/v1',jobs:[],delivered:0,discarded:0,last_code:null});
export class LifecycleOutbox{
 constructor({home,project,enabled=false,url,version='unknown',fetchImpl=fetch,now=Date.now,token=()=>process.env.WDG_API_AUTH_TOKEN}){
  this.home=resolve(home);this.projectKey=hash(resolve(project));this.root=join(this.home,'lifecycle',this.projectKey);this.enabled=enabled===true;this.url=lifecycleEndpoint(url);this.version=identity(version)||'unknown';this.fetch=fetchImpl;this.now=now;this.token=token;this.serial=Promise.resolve();this.closed=false;this.active=null;this.controller=null;
 }
 async read(){
  let handle;try{const file=await safeExistingFile(this.home,relative(this.home,join(this.root,'queue.json')));handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);}catch(error){if(error.code==='ENOENT')return empty();throw error;}
  let text;try{const buffer=Buffer.alloc(1048577);let length=0;while(length<buffer.length){const {bytesRead}=await handle.read(buffer,length,buffer.length-length,length);if(!bytesRead)break;length+=bytesRead;}if(length>1048576)throw Error('Lifecycle queue exceeds its storage bound');text=buffer.subarray(0,length).toString('utf8');}finally{await handle.close();}
  const state=JSON.parse(text);
  if(state.schema!=='kujo.opencode.lifecycle-outbox/v1'||!Array.isArray(state.jobs)||state.jobs.length>MAX_JOBS)throw Error('Invalid lifecycle queue');
  for(const job of state.jobs){if(!/^[a-f0-9-]{36}$/.test(job.id)||!Number.isFinite(job.created)||!Number.isInteger(job.attempts)||job.attempts<0||job.attempts>MAX_ATTEMPTS||!Number.isFinite(job.next)||!Number.isFinite(job.lease))throw Error('Invalid lifecycle job');if(!identity(job.version))throw Error('Invalid lifecycle producer version');lifecycleEndpoint(job.url);job.event=lifecycleMetadata(job.event);}
  return state;
 }
 async mutate(callback){
  const operation=async()=>{
   await mkdir(this.home,{recursive:true,mode:0o700});await safeOutputPath(this.home,join('lifecycle',this.projectKey));await mkdir(dirname(this.root),{recursive:true,mode:0o700});
   for(let attempt=0;attempt<4;attempt++){
    try{let result;await replaceDirectory(this.root,async stage=>{const state=await this.read();result=await callback(state);await mkdir(stage,{mode:0o700});const text=JSON.stringify(state);if(Buffer.byteLength(text)>1048576)throw Error('Lifecycle queue exceeds its storage bound');await writeFile(join(stage,'queue.json'),text,{mode:0o600});});return result;}
    catch(error){if(attempt===3||!error.message.startsWith('Installation is already active or interrupted:'))throw error;await delay(10*(attempt+1));}
   }
  };
  const result=this.serial.then(operation,operation);this.serial=result.catch(()=>{});return result;
 }
 async capture(raw){
  if(!this.enabled||this.closed)return {queued:false,reason:'disabled'};
  try{
   const event=lifecycleMetadata(raw),created=this.now(),id=randomUUID();
   return await this.mutate(state=>{this.expire(state);if(state.jobs.length>=MAX_JOBS){state.discarded++;state.last_code='queue_full';return {queued:false,reason:'queue_full'};}state.jobs.push({id,event,version:this.version,created,url:this.url,attempts:0,next:created,lease:0});return {queued:true,id};});
  }catch{return {queued:false,reason:'queue_unavailable'};}
 }
 expire(state){const keep=[];for(const job of state.jobs){if(job.created+TTL<=this.now()||(job.attempts>=MAX_ATTEMPTS&&job.lease<=this.now()))state.discarded++;else keep.push(job);}state.jobs=keep;}
 flush(){
  if(!this.enabled||this.closed)return Promise.resolve({sent:false,reason:'disabled'});
  if(this.active)return this.active;
  this.active=this.deliver().catch(()=>({sent:false,reason:'queue_unavailable'})).finally(()=>{this.active=null;});return this.active;
 }
 async deliver(){
  const leaseID=randomUUID();
  const job=await this.mutate(state=>{this.expire(state);const job=state.jobs.find(item=>item.url===this.url&&item.next<=this.now()&&item.lease<=this.now());if(!job)return null;job.attempts++;job.lease=this.now()+LEASE;job.leaseID=leaseID;return structuredClone(job);});
  if(!job)return {sent:false,reason:'idle'};
  const controller=new AbortController();this.controller=controller;const timer=setTimeout(()=>controller.abort(),5000);let accepted=false,permanent=false,code='transport_error';
  try{
   if(this.closed)controller.abort();const token=this.token();
   const response=await this.fetch(new URL('/telemetry/v2/batches',this.url),{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(lifecycleBatch(job,this.projectKey))});
   // Do not retain service response bodies or credentials, even on errors.
   await response.body?.cancel();accepted=response.ok;code=`http_${response.status}`;permanent=response.status>=400&&response.status<500&&![408,429].includes(response.status);
  }catch{code=controller.signal.aborted?'cancelled':'transport_error';}finally{clearTimeout(timer);this.controller=null;}
  await this.mutate(state=>{const current=state.jobs.find(item=>item.id===job.id&&item.leaseID===leaseID);if(!current)return;state.last_code=code;if(accepted||permanent||current.attempts>=MAX_ATTEMPTS){state.jobs=state.jobs.filter(item=>item!==current);if(accepted)state.delivered++;else state.discarded++;}else{current.lease=0;delete current.leaseID;current.next=this.now()+Math.min(60000,1000*2**(current.attempts-1));}});
  return {sent:accepted,reason:code,id:job.id};
 }
 async status(){if(!this.enabled)return {enabled:false,pending:0};try{const state=await this.read();return {enabled:true,pending:state.jobs.length,held_for_other_endpoint:state.jobs.filter(job=>job.url!==this.url).length,delivered:state.delivered,discarded:state.discarded,last_code:state.last_code};}catch{return {enabled:true,error:'queue_unavailable'};}}
 async recover(){if(!this.enabled)throw Error('Lifecycle delivery is disabled');return recoverDirectory(this.root);}
 async discard(){if(!this.enabled)throw Error('Lifecycle delivery is disabled');return this.mutate(state=>{const count=state.jobs.length;state.discarded+=count;state.jobs=[];state.last_code='discarded_by_user';return {discarded:count};});}
 async close(){this.closed=true;this.controller?.abort();await this.active;await this.serial;}
}
