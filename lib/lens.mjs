import {join} from 'node:path';
import {run} from './process.mjs';
import {nodeCommand} from './node-command.mjs';

const PROBE=`(async()=>{let c;try{c=require('playwright-core').chromium}catch{console.log(JSON.stringify({ready:false,state:'dependencies_missing'}));return}let browser;try{browser=await c.launch({headless:true,timeout:8000});await browser.close();browser=null;const p=c.executablePath();console.log(JSON.stringify({ready:true,state:'ready',...(require('node:fs').existsSync(p)?{executable:p}:{mode:'headless-shell'})}))}catch{try{await browser?.close()}catch{}console.log(JSON.stringify({ready:false,state:'launch_failed'}))}})().catch(()=>process.exitCode=1)`;
export async function lensBrowserStatus(lensRoot,options={}){
 const bridge=join(lensRoot,'bridge');
 try{
  options.signal?.throwIfAborted();
  const result=await run(options.nodeCommand||nodeCommand(),['-e',PROBE],{cwd:bridge,signal:options.signal,killTree:true,timeoutMs:12000,maxBytes:16384});
  const status=JSON.parse(result.stdout);
  if(result.exitCode!==0||!['ready','dependencies_missing','launch_failed'].includes(status.state))throw Error('Probe failed');
  return {...status,bridge};
 }catch(error){if(options.signal?.aborted)throw error;return {ready:false,state:'probe_failed',bridge};}
}
export async function installLensBrowser(lensRoot,options={}){
 const bridge=join(lensRoot,'bridge'),npm=options.npmCommand||(process.platform==='win32'?'npm.cmd':'npm');
 async function step(phase,args,timeoutMs){
  options.signal?.throwIfAborted();options.onPhase?.(phase);
  const result=await run(npm,args,{cwd:bridge,signal:options.signal,killTree:true,timeoutMs,maxBytes:2*1024*1024});
  if(result.exitCode!==0)throw Object.assign(Error(phase==='dependencies'?'Lens bridge dependency installation failed; check npm connectivity and retry.':'Chromium installation failed; check download connectivity and retry.'),{code:phase+'_failed'});
 }
 await step('dependencies',['ci','--omit=dev','--ignore-scripts'],300000);
 await step('chromium',['run','install-browser'],600000);
 options.onPhase?.('verifying');const status=await lensBrowserStatus(lensRoot,options);
 if(!status.ready)throw Object.assign(Error('Chromium could not launch. Check operating-system browser dependencies before retrying.'),{code:'launch_failed'});
 return status;
}
