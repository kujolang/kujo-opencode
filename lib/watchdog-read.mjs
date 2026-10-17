// Read only the explicitly configured Watchdog API. This does not configure
// lifecycle delivery, start services, ingest telemetry or forward model calls.
const failure=(code,message)=>Object.assign(new Error(message),{code});
function serviceOrigin(value){
 let url;try{url=new URL(value);}catch{throw failure('watchdog_configuration','Set KUJO_WATCHDOG_URL to a Watchdog service origin.');}
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw failure('watchdog_configuration','Watchdog reads require HTTPS or loopback HTTP and an origin without credentials, path, query or fragment.');
 return url.origin;
}
export function watchdogReadStatus(env=process.env){
 if(!env.KUJO_WATCHDOG_URL)return {configured:false,reason:'Set KUJO_WATCHDOG_URL before requesting Watchdog reads.'};
 return {configured:true,origin:serviceOrigin(env.KUJO_WATCHDOG_URL),credentials_supplied:Boolean(env.KUJO_WATCHDOG_TOKEN),reason:'The service checks API credentials when invoked. Lifecycle delivery is configured separately.'};
}
export async function readWatchdog(input={}, {env=process.env,signal}={}){
 const state=watchdogReadStatus(env);if(!state.configured)throw failure('watchdog_not_configured',state.reason);
 const path=input.path??'/healthz';
 if(typeof path!=='string'||path.length>2048||!path.startsWith('/')||path.startsWith('//')||/[\\\r\n\x00]/.test(path))throw failure('watchdog_path_forbidden','Use an absolute Watchdog API path of at most 2048 characters.');
 const url=new URL(path,state.origin);
 if(url.origin!==state.origin||url.hash||/%2f|%5c/i.test(url.pathname)||!(url.pathname.startsWith('/api/')||['/healthz','/readyz'].includes(url.pathname)))throw failure('watchdog_path_forbidden','Watchdog reads accept /api/*, /healthz and /readyz only. Proxy and model routes are not exposed.');
 signal?.throwIfAborted();
 const token=env.KUJO_WATCHDOG_TOKEN;let response;
 try{response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(15000)]),headers:{accept:'application/json',...(token?{authorization:'Bearer '+token}:{}),...(env.KUJO_WATCHDOG_AUDIENCE?{'x-kujo-audience':env.KUJO_WATCHDOG_AUDIENCE}:{})}});}
 catch{throw failure('watchdog_read_failed','Watchdog read did not complete. Check the configured origin and service; no automatic retry was made.');}
 let count=0,chunks=[];try{for await(const chunk of response.body){count+=chunk.length;if(count>256*1024)throw Error('limit');chunks.push(chunk);}}catch{throw failure('watchdog_response_limit','Watchdog response exceeded the read limit or was interrupted. Use a smaller limit or narrower filters.');}
 if(!response.ok)throw failure('watchdog_remote_rejected',`Watchdog returned HTTP ${response.status}. Check KUJO_WATCHDOG_TOKEN and service permissions.`);
 const text=Buffer.concat(chunks).toString('utf8');if(token&&text.includes(token))throw failure('watchdog_credential_echo','Watchdog response echoed a credential; content withheld.');
 let body;try{body=JSON.parse(text);}catch{body=text;}
 return {origin:state.origin,path:url.pathname+url.search,http_status:response.status,body,operation:'read',lifecycle_changed:false};
}
