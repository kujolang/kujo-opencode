// Thin transport for the canonical Leash intervention endpoint. Leash owns
// event validation, routing and decisions; native permissions remain separate.
export const MAX_LEASH_BYTES=64*1024;
function failure(code,message){return Object.assign(new Error(message),{code});}
function endpoint(value){
 let url;try{url=new URL(value);}catch{throw failure('leash_configuration','Set KUJO_LEASH_URL to a loopback HTTP or HTTPS service origin.');}
 const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw failure('leash_configuration','Leash requires an origin without credentials, path, query or fragment; remote origins require HTTPS.');
 return url.origin;
}
export function leashStatus(env=process.env){
 if(!env.KUJO_LEASH_URL)return {configured:false,reason:'Set KUJO_LEASH_URL and KUJO_LEASH_TOKEN in the OpenCode environment. No request was sent.'};
 const origin=endpoint(env.KUJO_LEASH_URL);
 return {configured:Boolean(env.KUJO_LEASH_TOKEN),origin,reason:env.KUJO_LEASH_TOKEN?'Ready for an explicitly approved intervention submission.':'Set KUJO_LEASH_TOKEN to a registered-device JWT in the OpenCode environment.',native_permissions:'unchanged',network_requested:false};
}
export async function deliverLeash(input,{signal,env=process.env}={}){
 const status=leashStatus(env);
 if(!status.configured)throw failure('leash_not_configured',status.reason);
 // The destination is part of the approved input, not an ambient redirectable
 // setting. Changing configuration during approval requires a new request.
 if(endpoint(input.origin)!==status.origin)throw failure('leash_destination_changed','The approved origin differs from KUJO_LEASH_URL. Inspect service status and request approval again.');
 if(!input.event||typeof input.event!=='object'||Array.isArray(input.event))throw failure('leash_event_invalid','Supply the canonical Leash intervention event object.');
 const body=JSON.stringify(input.event);
 if(Buffer.byteLength(body)>MAX_LEASH_BYTES)throw failure('leash_request_limit','Leash intervention payload exceeds 64 KiB.');
 signal?.throwIfAborted();
 const requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(15000)]);
 let response;
 try{response=await fetch(new URL('/v1/intervention-events',status.origin),{method:'POST',redirect:'error',signal:requestSignal,headers:{authorization:`Bearer ${env.KUJO_LEASH_TOKEN}`,'content-type':'application/json',...(env.KUJO_LEASH_AUDIENCE?{'x-kujo-audience':env.KUJO_LEASH_AUDIENCE}:{})},body});}
 catch{throw failure('leash_delivery_unknown','Leash delivery could not be confirmed. Inspect the event ID in Leash before resubmitting; no automatic retry was made.');}
 // Never echo remote diagnostic bodies or credentials into canonical receipts.
 // Retain only the canonical receipt fields required to reconcile this event.
 let bytes=0,chunks=[];
 try{for await(const chunk of response.body){bytes+=chunk.length;if(bytes>MAX_LEASH_BYTES)throw Error('limit');chunks.push(chunk);}}
 catch{throw failure('leash_delivery_unknown','Leash response could not be read within bounds. Inspect the event ID before resubmitting.');}
 if(!response.ok)throw failure('leash_remote_rejected',response.status===401?'Leash rejected authentication (HTTP 401). Set KUJO_LEASH_TOKEN to a valid registered-device JWT; bootstrap tokens cannot submit events. No automatic retry was made.':`Leash returned HTTP ${response.status}. Inspect the service before resubmitting; no automatic retry was made.`);
 let result;try{result=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw failure('leash_delivery_unknown','Leash returned invalid JSON. Inspect the event ID before resubmitting.');}
 const eventId=input.event.request_id||input.event.event_id;
 if(typeof eventId!=='string'||result?.event_id!==eventId||!['awaiting_decision','delivered','delivery_failed','partially_delivered','duplicate'].includes(result.status))throw failure('leash_delivery_unknown','Leash acknowledgement did not match the submitted event. Inspect the event ID before resubmitting.');
 return {origin:status.origin,event_id:eventId,status:result.status,http_status:response.status,native_permissions:'unchanged',human_decision:'not_observed'};
}
