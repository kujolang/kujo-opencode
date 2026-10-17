import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {lostHttpReply} from './lost-http-reply.mjs';
for(const status of [200,500])test(`real socket loss with upstream ${status}`,async()=>{
 let calls=0;
 const server=createServer(async(req,res)=>{calls++;let text='';for await(const c of req)text+=c;assert.deepEqual(JSON.parse(text),{action:'start'});res.writeHead(status);res.end(JSON.stringify({secret:'must never reach caller'}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try {
  const operation=lostHttpReply({url:`http://127.0.0.1:${server.address().port}/`,authorization:'fixture',body:{action:'start'}});
  if(status===200){const evidence=await operation;assert.equal(evidence.client_response_lost,true);assert.equal(JSON.stringify(evidence).includes('secret'),false);}
  else await assert.rejects(operation,/successfully/);
  assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('fault injection cannot target an external host',async()=>assert.rejects(lostHttpReply({url:'https://example.com',body:{}})));
