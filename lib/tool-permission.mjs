import {setTimeout as delay} from 'node:timers/promises';

// Cancellation may leave permission.assert pending in OpenCode. Reject only this
// invocation's request; never answer another tool's request or grant permission.
export async function assertToolPermission(permission,input,signal){
 signal.throwIfAborted();
 let settled=false,cleanup,rejectCancellation;
 const pending=Promise.resolve().then(()=>permission.assert(input)).finally(()=>{settled=true;});
 const cancelled=new Promise((_,reject)=>{rejectCancellation=reject;});
 async function rejectOwned(){
  const deadline=AbortSignal.timeout(1500);
  try{
   while(!settled&&!deadline.aborted){
    const requests=await permission.list({sessionID:input.sessionID},{signal:deadline});
    const own=requests.find(request=>request.sessionID===input.sessionID&&request.action===input.action&&request.metadata?.project===input.metadata.project&&request.metadata?.invocation===input.metadata.invocation&&request.metadata?.digest===input.metadata.digest&&request.resources?.length===1&&request.resources[0]===input.resources[0]&&request.source?.type==='tool'&&request.source.id===input.source.id&&request.source.messageID===input.source.messageID);
    if(own){await permission.reply({sessionID:input.sessionID,requestID:own.id,decision:'reject'},{signal:deadline});return;}
    await delay(25,undefined,{signal:deadline});
   }
  }catch{/* Cancellation still stops execution if the host cannot clear its UI. */}
 }
 const onAbort=()=>{cleanup??=rejectOwned().finally(()=>rejectCancellation(signal.reason));};
 signal.addEventListener('abort',onAbort,{once:true});
 if(signal.aborted)onAbort();
 try{await Promise.race([pending,cancelled]);signal.throwIfAborted();}
 catch(error){signal.throwIfAborted();throw error;}
 finally{signal.removeEventListener('abort',onAbort);if(cleanup)await cleanup;}
}
