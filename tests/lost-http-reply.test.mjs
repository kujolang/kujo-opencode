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

// The live Dispatch fixture may grant only its exact isolated request.
// These negative cases exercise the controller without a model or service.
for(const mismatch of ['ability','input','persistent','provider'])test(`Dispatch transport fixture refuses ${mismatch} mismatch before approval`,async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {nativeDispatchTransport}=await import('./native-dispatch-transport.mjs');
 const root=await mkdtemp(join(tmpdir(),'kujo-dispatch-controller-')),project=join(root,'project'),dataRoot=join(root,'data');
 await mkdir(project);await mkdir(dataRoot);await writeFile(join(dataRoot,'receipts.jsonl'),'');
 const {realpath}=await import('node:fs/promises');const canonical=await realpath(project);
 let interrupted=0,granted=0;
 const input={path:'dispatch-transport',workflow_file:'workflow.json',topic:'Recover the retained run after an approval reply is lost',input_json:'{"recovery_case":"lost-native-approval-reply"}',output_dir:'runs'};
 const api=async(path,body)=>{
  if(path==='/api/session')return {data:{id:'owned'}};
  if(path==='/api/session/owned')return {data:{id:'owned',agent:'build'}};
  if(path.endsWith('/prompt')){await writeFile(join(dataRoot,'receipts.jsonl'),JSON.stringify({receipt_id:'pending',ability_id:'kujo.dispatch.workflow.run',status:'approval_required',surface:'plugin',metadata:{session_id:'owned',agent_id:'build',model_id:'provider/model',project_root:canonical}})+'\n');return {};}
  if(path.includes('/message?'))return {data:mismatch==='provider'?[{error:{type:'provider.auth',status:403}}]:[]};
  if(path.endsWith('/permission'))return {data:[{id:'permission',action:'kujo.ability.approve',save:mismatch==='persistent'?['*']:[],metadata:{ability:mismatch==='ability'?'kujo.other':'kujo.dispatch.workflow.run',input:mismatch==='input'?{...input,output_dir:'elsewhere'}:input}}]};
  if(path.endsWith('/reply')){granted++;throw Error('Unexpected grant');}
  throw Error('Unexpected fixture API '+path);
 };
 try {
  await assert.rejects(nativeDispatchTransport({api,project,dataRoot,model:'provider/model',loseApprovalReply:async()=>{granted++;throw Error('Unexpected grant');},interrupt:async id=>{assert.equal(id,'owned');interrupted++;}}),mismatch==='provider'?/provider.auth/:{code:'ERR_ASSERTION'});
  assert.equal(granted,0);assert.equal(interrupted,1);
 } finally {await rm(root,{recursive:true,force:true});}
});

test('Dispatch input review accepts only harmless embedded JSON whitespace',async()=>{
 const {assertDispatchReviewedInput}=await import('./native-dispatch-transport.mjs');
 const expected={path:'owned',input_json:'{"recovery_case":"lost-native-approval-reply"}'};
 assertDispatchReviewedInput({...expected,input_json:' { "recovery_case": "lost-native-approval-reply" } '},expected);
 for(const input_json of ['{}','{"recovery_case":"different"}','{"recovery_case":"lost-native-approval-reply","extra":1}','{"recovery_case":"lost-native-approval-reply","recovery_case":"lost-native-approval-reply"}'])assert.throws(()=>assertDispatchReviewedInput({...expected,input_json},expected),{code:'ERR_ASSERTION'});
 assert.throws(()=>assertDispatchReviewedInput({...expected,path:'elsewhere'},expected),{code:'ERR_ASSERTION'});
 assert.throws(()=>assertDispatchReviewedInput({path:'owned'},expected),{code:'ERR_ASSERTION'});
});
