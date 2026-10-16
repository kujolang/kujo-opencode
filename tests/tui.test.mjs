import test from 'node:test';
import assert from 'node:assert/strict';
import {setupTui} from '../lib/tui.mjs';
import {scopedHostContext} from '../lib/plugin-scope.mjs';
import {homePaths,withDataRoot} from '../lib/paths.mjs';

function fixture({choices=[],profileError,waitStatus,evidenceReceipts=[]}={}) {
 const calls=[],alerts=[],toasts=[];let commands;
 const location={directory:'/fixture/project'};
 const ctx={location,client:{rpc:definition=>{
  assert.equal(definition.id,'kujo.control');
  return Object.fromEntries(['status','profile','evidence','specialist','capability','evidenceDetail','artifact','compare','lifecycle','runledger'].map(method=>[method,async(input,options)=>{
   calls.push({method,input,options});assert.deepEqual(options,{location});
   if(method==='status'){if(waitStatus)await waitStatus;return {capabilities:[{id:'kujo.test.check',name:'check',description:'Check repository',active:true,inherited:true,mode:'profile'}],project:location.directory,version:'0.2.0',profile:'kujo.profile.essentials',specialists:[{id:'kujo-browser',title:'Browser verification',profile:'ship',description:'Verify pages',abilities:['kujo.lens.page.check'],available:[],missing:['kujo.lens.page.check']}],profiles:[{id:'kujo.profile.review',label:'Review',description:'Review repository'}],tools:[{name:'check',description:'Check repository'}]};}
   if(method==='runledger'){if(input.action==='status')return {state:'in_progress',run_id:'fixture'};if(profileError)throw Error(profileError);return {state:input.status};}
   if(method==='lifecycle'){if(input.action==='status')return {enabled:false,pending:0};if(profileError)throw Error(profileError);return {enabled:input.action==='enable'};}
   if(method==='capability'){if(profileError)throw Error(profileError);return {active:input.mode!=='disabled'};}
   if(method==='profile'){if(profileError)throw Error(profileError);return {abilities:18};}
   if(method==='evidenceDetail')return {receipt:evidenceReceipts.find(item=>item.receipt_id===input.receiptID),artifacts:['/fixture/project/report.txt']};
   if(method==='artifact')return {kind:'file',content:'artifact text',notice:'Current contents'};
   if(method==='compare')return {same_ability:true,notice:'Timing is informational'};
   return {receipts:evidenceReceipts,coverage:'Recent retained evidence'};
  }]));
 }},ui:{router:{current:()=>({type:'session',sessionID:'fixture-session'})},dialog:{alert:async value=>alerts.push(value),select:async()=>choices.shift()},toast:{show:value=>toasts.push(value)}},keymap:{layer:factory=>{commands=factory().commands;}}};
 const cleanup=setupTui(ctx);
 return {calls,alerts,toasts,cleanup,run:id=>commands.find(c=>c.id===id).run()};
}
test('native UI is idle until invoked and routes status and evidence to its workspace',async()=>{
 const f=fixture({choices:['check','project']});assert.equal(f.calls.length,0);
 await f.run('kujo.status');assert.match(f.alerts[0].message,/Check repository/);
 await f.run('kujo.evidence');assert.match(f.alerts[1].message,/No receipts/);
 assert.deepEqual(f.calls.map(c=>c.method),['status','evidence']);
});
test('profile selection uses session-bound RPC; denied permission cannot report success',async()=>{
 const f=fixture({choices:['review'],profileError:'Human declined'});await f.run('kujo.profile');
 assert.deepEqual(f.calls[1].input,{sessionID:'fixture-session',profile:'review'});
 assert.equal(f.toasts.length,0);assert.match(f.alerts[0].message,/Human declined/);
 const cancel=fixture();await cancel.run('kujo.profile');assert.equal(cancel.calls.length,1);
});
test('unload suppresses late dialogs and future requests',async()=>{
 let release;const f=fixture({waitStatus:new Promise(resolve=>release=resolve)});
 const pending=f.run('kujo.status');f.cleanup();release();await pending;
 assert.equal(f.alerts.length,0);await f.run('kujo.evidence');assert.equal(f.calls.length,1);
});
test('overlapping host callbacks retain independent data roots without environment mutation',async()=>{
 const original=homePaths().root;const callbacks=[];
 for(const root of ['/tmp/kujo-root-a','/tmp/kujo-root-b']) {
  const ctx={rpc:{register:async(_definition,handlers)=>callbacks.push(handlers.status)}};
  const scoped=scopedHostContext(ctx,fn=>(...args)=>withDataRoot(root,()=>fn(...args)));
  await scoped.rpc.register({}, {status:async()=>{await new Promise(resolve=>setTimeout(resolve,5));return homePaths().root;}});
 }
 assert.deepEqual(await Promise.all(callbacks.map(fn=>fn())),['/tmp/kujo-root-a','/tmp/kujo-root-b']);
 assert.equal(homePaths().root,original);
});

test('specialist selection changes only the session agent and reports missing exposure',async()=>{
 const f=fixture({choices:['kujo-browser']});await f.run('kujo.specialist');
 assert.deepEqual(f.calls.map(call=>call.method),['status','specialist']);
 assert.deepEqual(f.calls[1].input,{sessionID:'fixture-session',agent:'kujo-browser'});
 assert.match(f.alerts[0].message,/unavailable/);assert.match(f.alerts[0].message,/ship/);
});

test('capability picker sends one scoped change and handles denial or cancellation',async()=>{
 const f=fixture({choices:['kujo.test.check','disabled']});await f.run('kujo.capabilities');
 assert.deepEqual(f.calls.map(c=>c.method),['status','capability']);
 assert.deepEqual(f.calls[1].input,{sessionID:'fixture-session',ability:'kujo.test.check',mode:'disabled'});assert.match(f.toasts[0].message,/off/);
 const deny=fixture({choices:['kujo.test.check','disabled'],profileError:'Human declined'});await deny.run('kujo.capabilities');assert.equal(deny.toasts.length,0);assert.match(deny.alerts[0].message,/declined/);
 for(const choices of [[],['kujo.test.check'],['kujo.test.check','profile']]){const cancel=fixture({choices});await cancel.run('kujo.capabilities');assert.equal(cancel.calls.length,1);}
});

test('session evidence selection sends an explicit session filter; cancel stays idle',async()=>{
 const f=fixture({choices:['session']});await f.run('kujo.evidence');
 assert.deepEqual(f.calls[0].input,{scope:'session',sessionID:'fixture-session'});
 const cancel=fixture();await cancel.run('kujo.evidence');assert.equal(cancel.calls.length,0);
});

test('evidence opens only server-selected artifacts and compares chosen receipt IDs',async()=>{
 const receipts=['r1','r2'].map(receipt_id=>({receipt_id,status:'succeeded',ability_id:'check',completed_at_ms:1,result:{ok:true}}));
 const artifact=fixture({choices:['project','r1','artifact:0'],evidenceReceipts:receipts});await artifact.run('kujo.evidence');
 assert.deepEqual(artifact.calls.map(c=>c.method),['evidence','evidenceDetail','artifact']);
 assert.deepEqual(artifact.calls[2].input,{receiptID:'r1',index:0});assert.match(artifact.alerts[0].message,/artifact text/);
 const compare=fixture({choices:['project','compare','r1','r2'],evidenceReceipts:receipts});await compare.run('kujo.evidence');
 assert.deepEqual(compare.calls[1].input,{left:'r1',right:'r2'});assert.match(compare.alerts[0].message,/informational/);
});

test('lifecycle picker requires deliberate action and reports denied activation',async()=>{
 const f=fixture({choices:['enable']});await f.run('kujo.lifecycle');assert.deepEqual(f.calls.map(call=>call.input.action),['status','enable']);assert.equal(f.calls[1].input.sessionID,'fixture-session');assert.match(f.alerts[0].message,/true/);
 const cancel=fixture();await cancel.run('kujo.lifecycle');assert.equal(cancel.calls.length,1);
 const denied=fixture({choices:['enable'],profileError:'Human declined'});await denied.run('kujo.lifecycle');assert.match(denied.alerts[0].message,/declined/);
});

test('session RunLedger UI asks for an explicit verdict and permits cancellation',async()=>{
 const f=fixture({choices:['finish','partial']});await f.run('kujo.runledger');assert.deepEqual(f.calls.map(call=>call.input.action),['status','finish']);assert.equal(f.calls[1].input.status,'partial');assert.match(f.alerts[0].message,/partial/);
 const cancel=fixture({choices:['finish']});await cancel.run('kujo.runledger');assert.equal(cancel.calls.length,1);
 const denied=fixture({choices:['finish','pass'],profileError:'Human declined'});await denied.run('kujo.runledger');assert.match(denied.alerts[0].message,/declined/);
});
