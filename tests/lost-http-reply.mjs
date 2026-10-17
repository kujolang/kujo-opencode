// Test-only loopback fault: forward once, consume the completed host response,
// then close the client socket without sending any response bytes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
export async function lostHttpReply({url,authorization,body,timeoutMs=30000}) {
 const target=new URL(url);assert.equal(target.protocol,'http:');assert.equal(target.hostname,'127.0.0.1');
 let calls=0,upstreamStatus=null,upstreamComplete=false,upstreamError;
 const server=createServer(async(req,res)=>{
  try {
   assert.equal(++calls,1,'Fault must never retry the mutation');
   for await(const chunk of req)void chunk;
   const response=await fetch(target,{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
   upstreamStatus=response.status;await response.arrayBuffer();upstreamComplete=true;
  }catch(error){upstreamError=error;}finally{res.destroy();}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 let clientError;
 try {
  try{await fetch(`http://127.0.0.1:${server.address().port}/`,{method:'POST',body:'owned transport fixture',signal:AbortSignal.timeout(timeoutMs+1000)});}catch(error){clientError=error;}
  if(upstreamError)throw upstreamError;
  assert.ok(clientError,'Client unexpectedly received a reply');
  assert.ok(upstreamComplete,'Fault must follow completed upstream response');
  assert.ok(upstreamStatus>=200&&upstreamStatus<300,'Upstream operation must complete successfully');
  assert.equal(calls,1);
  return {forwarded_requests:calls,upstream_status:upstreamStatus,upstream_response_consumed:true,client_response_lost:true};
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
