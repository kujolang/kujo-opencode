import {digest} from '../.generated/local-runtime.mjs';
import {validateAbilityReceipt} from '../.generated/gateway-contract.mjs';
const MAX_BYTES=256*1024;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=(code,message,details)=>Object.assign(new Error(message),{code,...(details?{details}:{})});
function origin(value){
 let url;try{url=new URL(value);}catch{throw fail('gateway_configuration','Set KUJO_ABILITY_GATEWAY_URL to a service origin.');}
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw fail('gateway_configuration','Gateway requires HTTPS or loopback HTTP and an origin without credentials, path, query or fragment.');
 return url.origin;
}
function configuration(env){if(!env.KUJO_ABILITY_GATEWAY_URL)throw fail('gateway_not_configured','Set KUJO_ABILITY_GATEWAY_URL and the application credentials in the OpenCode environment.');return origin(env.KUJO_ABILITY_GATEWAY_URL);}
async function request(base,path,{env,signal,body,headers={}}){
 signal?.throwIfAborted();const encoded=body?JSON.stringify(body):undefined;
 if(encoded&&Buffer.byteLength(encoded)>MAX_BYTES)throw fail('gateway_request_limit','Gateway request exceeds 256 KiB.');
 const credentials=env.KUJO_ABILITY_GATEWAY_TOKEN;
 let response;
 try{response=await fetch(base+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(30000)]),headers:{accept:'application/json','content-type':'application/json',...(credentials?{authorization:'Bearer '+credentials}:{}),...(env.KUJO_ABILITY_GATEWAY_AUDIENCE?{'x-kujo-audience':env.KUJO_ABILITY_GATEWAY_AUDIENCE}:{}),...headers},...(body?{body:encoded}:{})});}
 catch{throw fail('gateway_delivery_unknown','Gateway response was not confirmed. Inspect the invocation ID before retrying; no automatic retry was made.');}
 let bytes=0,chunks=[];try{for await(const chunk of response.body){bytes+=chunk.length;if(bytes>MAX_BYTES)throw Error('limit');chunks.push(chunk);}}catch{throw fail('gateway_response_limit','Gateway response could not be read within bounds; inspect the invocation before retrying.');}
 const raw=Buffer.concat(chunks).toString('utf8');if(credentials&&raw.includes(credentials))throw fail('gateway_credential_echo','Gateway response echoed a credential; content withheld.');
 let value;try{value=JSON.parse(raw);}catch{throw fail('gateway_response_invalid','Gateway returned invalid JSON.');}
 return {http:response.status,ok:response.ok,value};
}
function descriptor(tool){
 if(!object(tool)||!/^[A-Za-z0-9_-]{1,128}$/.test(tool.name||'')||!/^[a-z0-9][a-z0-9.-]{2,199}$/.test(tool.abilityId||'')||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(tool.abilityVersion||'')||!/^[a-f0-9]{64}$/.test(tool.abilityDigest||'')||!/^\/v1\/abilities\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\/run$/.test(tool.execution||'')||!object(tool.inputSchema)||!object(tool.outputSchema)||!Array.isArray(tool.effects)||!tool.effects.length||tool.effects.some(e=>!object(e)||!['read','write','delete','external'].includes(e.kind)||typeof e.resource!=='string'))throw fail('gateway_catalog_invalid','Gateway returned an invalid canonical tool descriptor.');
 return tool;
}
async function catalog(base,options){
 const r=await request(base,'/v1/ai/mcp/tools',options);if(!r.ok)throw fail('gateway_remote_rejected',`Gateway discovery returned HTTP ${r.http}; check application credentials and permissions.`);
 const data=r.value?.data??r.value;
 if(!object(data)||!Array.isArray(data.tools)||data.tools.length>256)throw fail('gateway_catalog_invalid','Gateway catalog must contain at most 256 tools.');
 const tools=data.tools.map(descriptor);if(new Set(tools.map(t=>t.name)).size!==tools.length)throw fail('gateway_catalog_invalid','Gateway returned duplicate tool names.');return tools;
}
export async function listGateway({env=process.env,signal}={}){
 const base=configuration(env);return {origin:base,tools:await catalog(base,{env,signal}),authority:'Application gateway owns authentication, tenant resolution, effects and server approval.'};
}
export async function callGateway(input,{env=process.env,signal}={}){
 const base=configuration(env);if(origin(input.origin)!==base)throw fail('gateway_destination_changed','Configured origin changed. Discover the gateway and request approval again.');
 const approved=descriptor(input.tool);
 const current=(await catalog(base,{env,signal})).find(t=>t.name===approved.name);
 if(!current||digest(current)!==digest(approved))throw fail('gateway_descriptor_changed','Gateway tool changed since review. Discover it and request approval again; execution was not sent.');
 for(const key of ['invocation_id','idempotency_key'])if(typeof input[key]!=='string'||!input[key].length||input[key].length>240||/[\r\n]/.test(input[key]))throw fail('gateway_input_invalid','Provide stable invocation_id and idempotency_key values of at most 240 characters.');
 if(!object(input.input))throw fail('gateway_input_invalid','Gateway input must be an object.');
 const approval=input.approval_id;
 if(approval!==undefined&&(typeof approval!=='string'||!approval.length||approval.length>255||/[\r\n]/.test(approval)))throw fail('gateway_input_invalid','Invalid server approval identifier.');
 const r=await request(base,current.execution,{env,signal,body:{input:input.input,invocation_id:input.invocation_id,...(approval?{approval_id:approval}:{})},headers:{'idempotency-key':input.idempotency_key,...(approval?{'x-ability-approval':approval}:{})}});
 const receipt=r.value?.data?.receipt??r.value?.receipt??r.value?.error?.details?.receipt;
 if(!validateAbilityReceipt(receipt).ok)throw fail('gateway_receipt_invalid',`Gateway returned HTTP ${r.http} without a valid canonical receipt. Inspect the invocation before retrying.`);
 if(receipt.invocation_id!==input.invocation_id||receipt.ability_id!==current.abilityId||receipt.ability_version!==current.abilityVersion||receipt.definition_digest!==current.abilityDigest)throw fail('gateway_receipt_mismatch','Gateway receipt does not match the reviewed invocation.');
 if(!r.ok||receipt.status!=='succeeded')throw fail('gateway_execution_incomplete',`Gateway execution status: ${receipt.status} (HTTP ${r.http}). Native approval does not issue application approval.`,{receipt});
 return {origin:base,receipt,result:receipt.result,remote_status:receipt.status};
}
