import {createHash} from 'node:crypto';
import {mkdir,open,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {replaceDirectory,recoverDirectory} from './atomic-directory.mjs';
import {safeExistingFile,safeOutputPath} from './paths.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
// Durable request markers prevent an opt-in observer from repeating a declined
// or uncertain request after reconnect/reload. Canonical records own outcomes.
export class AutomaticLedger {
 constructor({home,project,enabled=false,manage,notify,isCurrent,onFinish=async()=>{}}){Object.assign(this,{home:resolve(home),project:resolve(project),enabled,manage,notify,isCurrent,onFinish});this.root=join(this.home,'session-tracking',hash(this.project));this.pending=new Map();this.controllers=new Map();this.attempted=new Set();this.capacityNotified=false;this.closed=false;this.stop=new AbortController();}
 async claim(sessionID,phase){
  if(!['start','finish','review'].includes(phase))throw Error('Invalid automatic ledger request phase');
  if(typeof sessionID!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(sessionID))throw Error('Invalid automatic ledger session');
  await mkdir(this.home,{recursive:true,mode:0o700});await safeOutputPath(this.home,this.root);let claimed=false;
  await replaceDirectory(this.root,async stage=>{
   let state={schema:'kujo.opencode.automatic-ledger/v1',sessions:{}};
   let file;try{file=await safeExistingFile(this.home,relative(this.home,join(this.root,'requests.json')));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(file){const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{if((await handle.stat()).size>65536)throw Error('Automatic ledger request state exceeds limit');const buffer=Buffer.alloc(65537);let size=0;while(size<buffer.length){const r=await handle.read(buffer,size,buffer.length-size,size);if(!r.bytesRead)break;size+=r.bytesRead;}if(size>65536)throw Error('Automatic ledger request state exceeds limit');state=JSON.parse(buffer.subarray(0,size).toString());}finally{await handle.close();}}
   if(state.schema!=='kujo.opencode.automatic-ledger/v1'||!state.sessions||typeof state.sessions!=='object'||Array.isArray(state.sessions)||Object.keys(state.sessions).length>128)throw Error('Invalid automatic ledger request state');
   for(const [key,value]of Object.entries(state.sessions))if(!/^[a-f0-9]{64}$/.test(key)||!value||typeof value!=='object'||Object.keys(value).some(k=>!['start','finish','review'].includes(k))||Object.values(value).some(v=>v!==true))throw Error('Invalid automatic ledger request marker');
   const key=hash(sessionID);if(!state.sessions[key]&&Object.keys(state.sessions).length>=128)throw Object.assign(Error('Automatic tracking request limit reached; use manual Session RunLedger'),{code:'tracking_limit'});
   const entry=state.sessions[key]||{};if(!entry[phase]&&(phase!=='review'||entry.finish)){entry[phase]=true;state.sessions[key]=entry;claimed=true;}
   await mkdir(stage,{mode:0o700});await writeFile(join(stage,'requests.json'),JSON.stringify(state),{mode:0o600});
  });return claimed;
 }
 async active(){return this.enabled&&!this.closed&&await this.isCurrent();}
 before(sessionID){
  if(!this.enabled||this.closed)return Promise.resolve();if(this.pending.has(sessionID))return this.pending.get(sessionID);if(this.attempted.has(sessionID))return Promise.resolve();if(this.attempted.size>=128){if(this.capacityNotified)return Promise.resolve();this.capacityNotified=true;return this.active().then(active=>active?this.notify(sessionID,'Automatic tracking reached its 128-session limit. Use manual Session RunLedger, or explicitly reset tracking requests in Lifecycle controls.'):undefined).catch(()=>{});}this.attempted.add(sessionID);
  const controller=new AbortController();this.controllers.set(sessionID,controller);const signal=AbortSignal.any([this.stop.signal,controller.signal]);
  const work=(async()=>{try{
   if(!await this.active())return;
   const state=await this.manage({action:'status',sessionID,signal});if(state.state!=='not_started')return;
   if(!await this.claim(sessionID,'start')||!await this.active())return;
   const result=await this.manage({action:'start',sessionID,signal});
   if(result.state==='model_required'&&await this.active())await this.notify(sessionID,'Select a model in OpenCode, then start tracking from /kujo → Session RunLedger. No record was created.');
   if(result.state==='attention'&&await this.active())await this.notify(sessionID,'Automatic RunLedger start needs inspection. Open /kujo → Session RunLedger; it will not be retried automatically.');
  }catch(error){if(await this.active().catch(()=>false))await this.notify(sessionID,error.code==='tracking_limit'?'Automatic tracking reached its 128-session limit. Use manual Session RunLedger, or explicitly reset tracking requests in Lifecycle controls.':'RunLedger tracking was not started or is uncertain. Inspect /kujo → Session RunLedger. Declined or uncertain requests are not automatically retried. Use Lifecycle controls if its request journal needs recovery or reset.').catch(()=>{});}})().finally(()=>{this.pending.delete(sessionID);this.controllers.delete(sessionID);});
  this.pending.set(sessionID,work);return work;
 }
 async idle(sessionID){
  try{if(!await this.active()||this.pending.has(sessionID))return;const state=await this.manage({action:'status',sessionID,signal:this.stop.signal});if(state.state!=='in_progress'||!await this.active())return;
   const first=await this.claim(sessionID,'finish');
   if(!await this.active())return;
   await this.onFinish(sessionID).catch(()=>{});
   if(!first)return;
   await this.notify(sessionID,'Your session RunLedger record is still in progress. When this attempt is finished, open /kujo → Session RunLedger → Finish this session run, choose your verdict, and approve the final snapshot. Idle or interruption does not establish success.');
  }catch{/* A reminder must not fail session completion. */}
 }
 async review(sessionID){
  if(!await this.active())return {available:false};
  const state=await this.manage({action:'status',sessionID,signal:this.stop.signal});
  if(state.state!=='in_progress'||!await this.active()||!await this.claim(sessionID,'review'))return {available:false};
  return {available:true,run_id:state.run_id};
 }
 cancel(sessionID){this.controllers.get(sessionID)?.abort();}
 async recover(){await safeOutputPath(this.home,this.root);return recoverDirectory(this.root);}
 async reset(){await mkdir(this.home,{recursive:true,mode:0o700});await safeOutputPath(this.home,this.root);await replaceDirectory(this.root,async stage=>{await mkdir(stage,{mode:0o700});await writeFile(join(stage,'requests.json'),JSON.stringify({schema:'kujo.opencode.automatic-ledger/v1',sessions:{}}),{mode:0o600});});return {reset:true};}
 close(){this.closed=true;this.stop.abort();}
}
