import {cp,link,lstat,mkdir,readFile,readlink,readdir,rename,rm,symlink,writeFile,realpath} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {writeJson} from './io.mjs';
import {safeOutputPath} from './paths.mjs';
const schema='kujo.opencode.project-activation/v1';
async function exists(path){try{await lstat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function digest(path,budget={count:0}) {
 if(++budget.count>5000)throw Error('Projection contains too many entries');
 const stat=await lstat(path);const hash=createHash('sha256');
 if(stat.isSymbolicLink())return hash.update('link:'+await readlink(path)).digest('hex');
 if(stat.isFile()){if(stat.size>16*1024*1024)throw Error('Projection file is too large');return hash.update('file:').update(await readFile(path)).digest('hex');}
 if(!stat.isDirectory())throw Error('Unsupported projection file type');
 for(const name of (await readdir(path)).sort())hash.update(JSON.stringify(name)+':'+await digest(join(path,name),budget));
 return hash.digest('hex');
}
const lockPath=root=>join(root,'.kujo','opencode-activation.json');
const stagePath=(root,id)=>join(root,'.kujo',`opencode-activation-${id}`);
async function validate(root,journal,allowed) {
 if(journal.schema!==schema||journal.root!==root||!Number.isSafeInteger(journal.pid)||journal.pid<=0||!/^[a-f0-9-]{36}$/.test(journal.id)||!['preparing','applying','committed'].includes(journal.phase)||!Array.isArray(journal.entries)||journal.entries.length>256)throw Error('Invalid project activation journal');
 const seen=new Set();
 for(const item of journal.entries){
  if(!allowed.includes(item.path)||seen.has(item.path)||![item.before,item.after].every(value=>value===null||/^[a-f0-9]{64}$/.test(value)))throw Error('Invalid project activation target');
  seen.add(item.path);await safeOutputPath(root,dirname(join(root,item.path)));
 }
 await safeOutputPath(root,stagePath(root,journal.id));
}
async function rollback(root,journal) {
 const stage=stagePath(root,journal.id);const states=[];
 // Verify every target before restoring any: edits after a crash are preserved
 // as conflicts for review, never silently discarded by recovery.
 for(let i=0;i<journal.entries.length;i++){
  const item=journal.entries[i],target=join(root,item.path),backup=join(stage,`old-${i}`);
  const saved=await exists(backup),current=await exists(target)?await digest(target):null;
  if(saved){
   if(await digest(backup)!==item.before)throw Error(`Recovery backup changed: ${item.path}`);
   if(current!==null&&current!==item.after)throw Error(`Recovery conflict; preserve and inspect changed file: ${item.path}`);
  }else if(item.before!==null){
   if(current!==item.before)throw Error(`Recovery conflict; original projection missing or changed: ${item.path}`);
  }else if(current!==null&&current!==item.after)throw Error(`Recovery conflict; new projection changed: ${item.path}`);
  states.push({target,backup,saved,remove:!saved&&item.before===null&&current!==null});
 }
 for(const state of states.reverse()){
  if(state.saved){await rm(state.target,{recursive:true,force:true});await rename(state.backup,state.target);}
  else if(state.remove)await rm(state.target,{recursive:true,force:true});
 }
}
export async function activateProjectFiles(project,plans,allowed,{checkpoint=async()=>{},precondition=async()=>{}}={}) {
 const root=await realpath(project),id=randomUUID(),stage=stagePath(root,id),lock=lockPath(root);
 await safeOutputPath(root,lock);await mkdir(dirname(lock),{recursive:true});
 const journal={schema,root,id,pid:process.pid,phase:'preparing',entries:[]};
 const claim=`${lock}.claim-${id}`;
 await writeFile(claim,JSON.stringify(journal),{mode:0o600,flag:'wx'});
 try{await link(claim,lock);}catch(error){if(error.code==='EEXIST')throw Error('Project activation is active or interrupted; run kujo-opencode recover --project DIR');throw error;}finally{await rm(claim,{force:true});}
 let applied=false,committed=false,clean=false;
 try{
  await precondition();
  await mkdir(stage,{mode:0o700});
  for(let i=0;i<plans.length;i++){
   const plan=plans[i];if(!allowed.includes(plan.path)||plans.slice(0,i).some(p=>p.path===plan.path))throw Error('Invalid project activation plan');
   const target=join(root,plan.path),next=join(stage,`new-${i}`);
   await safeOutputPath(root,dirname(target));
   const before=await exists(target)?await digest(target):null;
   if(plan.link){try{await symlink(plan.link,next,process.platform==='win32'?'junction':'dir');}catch{await cp(plan.link,next,{recursive:true});}}
   else if(plan.content!==undefined)await writeFile(next,plan.content,{mode:0o600});
   else if(!plan.remove)throw Error('Missing project activation content');
   journal.entries.push({path:plan.path,before,after:plan.remove?null:await digest(next)});
  }
  await validate(root,journal,allowed);await checkpoint('prepared');
  journal.phase='applying';await writeJson(lock,journal);applied=true;
  for(let i=0;i<plans.length;i++){
   const item=journal.entries[i],target=join(root,item.path);
   const current=await exists(target)?await digest(target):null;
   if(current!==item.before)throw Error(`Projection changed during preparation: ${item.path}`);
   await mkdir(dirname(target),{recursive:true});
   if(item.before!==null)await rename(target,join(stage,`old-${i}`));
   await checkpoint(`backed-up:${i}`);
   if(item.after!==null)await rename(join(stage,`new-${i}`),target);
   await checkpoint(`installed:${i}`);
  }
  journal.phase='committed';await writeJson(lock,journal);committed=true;clean=true;
 }catch(error){if(applied&&!committed)await rollback(root,journal);clean=true;throw error;}
 finally{if(clean){await rm(stage,{recursive:true,force:true});await rm(lock,{force:true});}}
}
export async function recoverProjectFiles(project,allowed) {
 const root=await realpath(project),lock=lockPath(root);await safeOutputPath(root,lock);
 if(!await exists(lock))return {recovered:false};
 const journal=JSON.parse(await readFile(lock,'utf8'));await validate(root,journal,allowed);
 try{process.kill(journal.pid,0);throw Error('Project activation owner is still running');}catch(error){if(error.code!=='ESRCH')throw error;}
 if(journal.phase==='applying')await rollback(root,journal);
 await rm(stagePath(root,journal.id),{recursive:true,force:true});await rm(lock,{force:true});return {recovered:true};
}
