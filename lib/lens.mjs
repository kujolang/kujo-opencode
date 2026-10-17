import {mkdir,copyFile,readdir,rename,rm,realpath,lstat} from 'node:fs/promises';
import {replaceDirectory,recoverDirectory} from './atomic-directory.mjs';
import {join,dirname} from 'node:path';
import {run} from './process.mjs';
import {browserInstallError} from './browser-failure.mjs';
import {nodeCommand} from './node-command.mjs';

const PROBE=`(async()=>{let c;try{c=require('playwright-core').chromium}catch{console.log(JSON.stringify({ready:false,state:'dependencies_missing'}));return}let browser;try{browser=await c.launch({headless:true,timeout:8000});await browser.close();browser=null;const p=c.executablePath();console.log(JSON.stringify({ready:true,state:'ready',...(require('node:fs').existsSync(p)?{executable:p}:{mode:'headless-shell'})}))}catch{try{await browser?.close()}catch{}console.log(JSON.stringify({ready:false,state:'launch_failed'}))}})().catch(()=>process.exitCode=1)`;
export async function lensBrowserStatus(lensRoot,options={}){
 const bridge=join(lensRoot,'bridge');
 try{
  options.signal?.throwIfAborted();
  if(!options.ignoreInstallLock){try{await lstat(join(bridge,'node_modules.install-lock'));return {ready:false,state:'setup_busy_or_interrupted',bridge};}catch(error){if(error.code!=='ENOENT')throw error;}}
  const result=await run(options.nodeCommand||nodeCommand(),['-e',PROBE],{cwd:bridge,signal:options.signal,killTree:true,timeoutMs:12000,maxBytes:16384});
  const status=JSON.parse(result.stdout);
  if(result.exitCode!==0||!['ready','dependencies_missing','launch_failed'].includes(status.state))throw Error('Probe failed');
  return {...status,bridge};
 }catch(error){if(options.signal?.aborted)throw error;return {ready:false,state:'probe_failed',bridge};}
}
export async function installLensBrowser(lensRoot,options={}){
 const bridge=await realpath(join(lensRoot,'bridge')),npm=options.npmCommand||(process.platform==='win32'?'npm.cmd':'npm');
 if(process.env.PLAYWRIGHT_BROWSERS_PATH==='0')throw Error('Recoverable shared browser setup requires an external browser cache. Unset PLAYWRIGHT_BROWSERS_PATH=0 before installing.');
 async function step(phase,args,cwd,timeoutMs){
  options.signal?.throwIfAborted();options.onPhase?.(phase);
  let result;
  try{result=await run(npm,args,{cwd,signal:options.signal,killTree:true,timeoutMs,maxBytes:2*1024*1024,env:{...process.env,PLAYWRIGHT_SKIP_BROWSER_GC:'1'}});}
  catch(error){if(options.signal?.aborted)throw error;throw browserInstallError(phase,{error});}
  if(result.exitCode!==0)throw browserInstallError(phase,{result});
 }
 let status;
 try{await replaceDirectory(join(bridge,'node_modules'),async staged=>{
  // npm writes only its unique staging workspace. A dead parent's orphan npm
  // process cannot modify the active bridge dependency tree.
  const workspace=join(staged,'.kujo-browser-work');await mkdir(workspace,{recursive:true});
  for(const file of ['package.json','package-lock.json'])await copyFile(join(bridge,file),join(workspace,file));
  await step('dependencies',['ci','--omit=dev','--ignore-scripts'],workspace,300000);
  for(const name of await readdir(join(workspace,'node_modules')))await rename(join(workspace,'node_modules',name),join(staged,name));
  await rm(workspace,{recursive:true});
 },{checkpoint:async phase=>{
  await options.checkpoint?.(phase);
  if(phase==='installed'){
   // Activation is still reversible here. Keep prior browser cache versions so
   // rollback can retain a working older dependency/browser combination.
   await step('chromium',['run','install-browser'],bridge,600000);
   options.onPhase?.('verifying');status=await lensBrowserStatus(dirname(bridge),{...options,ignoreInstallLock:true});
   if(!status.ready)throw Object.assign(Error('Chromium could not launch. Prior dependencies were restored; check operating-system browser dependencies.'),{code:'launch_failed'});
  }
 }});}catch(error){
  if(['ENOSPC','EDQUOT','EACCES','EPERM'].includes(error.code))throw browserInstallError('dependencies',{error});
  throw error;
 }
 return status;
}
export async function recoverLensBrowser(lensRoot){
 const bridge=await realpath(join(lensRoot,'bridge'));
 return recoverDirectory(join(bridge,'node_modules'));
}
