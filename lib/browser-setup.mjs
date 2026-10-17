import {installLensBrowser,lensBrowserStatus} from './lens.mjs';
// Native setup is explicit and returns promptly. The UI can inspect/cancel the
// bounded job instead of holding an RPC request throughout a browser download.
export class BrowserSetup {
 constructor({install=installLensBrowser,probe=lensBrowserStatus}={}){this.install=install;this.probe=probe;this.job=null;this.closed=false;}
 async status(root){if(this.job?.running)return {...this.job.status,...(this.job.root!==root?{source_changed:true}:{})};if(this.job?.root===root)return {...this.job.status};return this.probe(root);}
 start(root){
  if(this.closed)throw Error('Browser setup has closed');
  if(this.job?.running)throw Error('A browser installation is already running; inspect or cancel it first');
  const controller=new AbortController(),job={root,controller,running:true,status:{ready:false,state:'installing',phase:'dependencies'}};this.job=job;
  job.promise=Promise.resolve().then(()=>this.install(root,{signal:controller.signal,onPhase:phase=>{job.status={ready:false,state:'installing',phase};}})).then(status=>{job.status=status;},error=>{job.status={ready:false,state:controller.signal.aborted?'cancelled':'failed',code:controller.signal.aborted?'cancelled':error.code||'install_failed'};}).finally(()=>{job.running=false;});
  return {...job.status};
 }
 async cancel(){if(!this.job?.running)return {cancelled:false};this.job.controller.abort();await this.job.promise;return {cancelled:true,...this.job.status};}
 async close(){this.closed=true;await this.cancel();}
 async refresh(root){if(this.job?.running)return this.status(root);this.job=null;return this.probe(root);}
}
