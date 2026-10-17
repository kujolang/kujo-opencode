import test from 'node:test';
import assert from 'node:assert/strict';
import {approvalSections,reviewPages} from '../lib/approval-review.mjs';
import {setupTui} from '../lib/tui.mjs';
import {scopedHostContext} from '../lib/plugin-scope.mjs';
import {homePaths,withDataRoot} from '../lib/paths.mjs';

function fixture({choices=[],prompts=[],profileError,waitStatus,evidenceReceipts=[],home=false,waitCreate,selectedModel,ledgerState='in_progress',services=[],pendingPermissions=[],waitSelect,canonicalProject}={}) {
 const calls=[],alerts=[],toasts=[],selections=[],handlers=new Map();let clears=0;let commands,eventHandler,stopped=false,route=home?{type:'home'}:{type:'session',sessionID:'fixture-session'};
 const location={directory:'/fixture/project'};
 const ctx={location,data:{on:(name,handler)=>{handlers.set(name,handler);return ()=>handlers.delete(name);},session:{status:()=> 'idle',sync:async()=>{},permission:{sync:async()=>{},list:()=>pendingPermissions}}},client:{session:{create:async input=>{calls.push({method:'createSession',input});if(waitCreate)await waitCreate;return {id:'new-session'};},switchModel:async input=>calls.push({method:'switchModel',input})},rpc:definition=>{
  assert.equal(definition.id,'kujo.control');
  return {events:{on:(_name,handler)=>{eventHandler=handler;return ()=>stopped=true;}},...Object.fromEntries(['completion','status','profile','evidence','specialist','capability','evidenceDetail','artifact','compare','lifecycle','runledger','browser','knowledge'].map(method=>[method,async(input,options)=>{
   calls.push({method,input,options});assert.deepEqual(options,{location});
   if(method==='completion')return {available:true,run_id:'fixture'};
   if(method==='knowledge')return input.action==='preview'?{files:[{path:'guide.md'}],bytes:12,digest:'a'.repeat(64),exclusions:['dotfiles'],index_input:{name:input.name,path:input.path,digest:'a'.repeat(64)}}:{state:'current'};
   if(method==='status'){if(waitStatus)await waitStatus;return {services,capabilities:[{id:'kujo.test.check',name:'check',description:'Check repository',active:true,inherited:true,mode:'profile'}],project:canonicalProject||location.directory,version:'0.2.0',profile:'kujo.profile.essentials',specialists:[{id:'kujo-browser',title:'Browser verification',profile:'ship',description:'Verify pages',abilities:['kujo.lens.page.check'],available:[],missing:['kujo.lens.page.check']}],profiles:[{id:'kujo.profile.review',label:'Review',description:'Review repository'}],tools:[{name:'check',description:'Check repository'}]};}
   if(method==='browser'){if(['status','refresh'].includes(input.action))return {ready:false,state:'dependencies_missing',capabilities:[]};if(profileError)throw Error(profileError);return {ready:false,state:'installing'};}
   if(method==='runledger'){if(input.action==='status')return {state:ledgerState,run_id:ledgerState==='not_started'?undefined:'fixture'};if(profileError)throw Error(profileError);return {state:input.status};}
   if(method==='lifecycle'){if(input.action==='status')return {enabled:false,pending:0};if(profileError)throw Error(profileError);return {enabled:input.action==='enable'};}
   if(method==='capability'){if(profileError)throw Error(profileError);return {active:input.mode!=='disabled'};}
   if(method==='profile'){if(profileError)throw Error(profileError);return {abilities:18};}
   if(method==='evidenceDetail')return {receipt:evidenceReceipts.find(item=>item.receipt_id===input.receiptID),artifacts:['/fixture/project/report.txt']};
   if(method==='artifact')return {kind:'file',content:'artifact text',notice:'Current contents'};
   if(method==='compare')return {same_ability:true,notice:'Timing is informational'};
   return {receipts:evidenceReceipts,coverage:'Recent retained evidence'};
  }]))};
 }},ui:{model:{current:()=>selectedModel},router:{current:()=>route,navigate:next=>{route=next;}},dialog:{clear:()=>{clears++;},prompt:async()=>prompts.shift(),alert:async value=>alerts.push(value),select:async value=>{selections.push(value);if(waitSelect)await waitSelect;return choices.shift();}},toast:{show:value=>toasts.push(value)}},keymap:{layer:factory=>{commands=factory().commands;}}};
 const cleanup=setupTui(ctx);
 return {calls,alerts,toasts,selections,clears:()=>clears,emit:async(type,data,directory=location.directory)=>handlers.get(type)?.({...(directory===null?{}:{location:{directory}}),data}),cleanup,route:()=>route,navigate:next=>{route=next;},event:async(sessionID='fixture-session',directory=location.directory)=>{if(!stopped)await eventHandler({location:{directory},data:{sessionID}});},run:id=>commands.find(c=>c.id===id).run()};
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

test('browser readiness offers explicit background installation and handles denial',async()=>{
 const f=fixture({choices:['install']});await f.run('kujo.browser');assert.deepEqual(f.calls.map(call=>call.input.action),['status','install']);assert.match(f.alerts[0].message,/Reopen Browser readiness/);
 const cancel=fixture();await cancel.run('kujo.browser');assert.equal(cancel.calls.length,1);
 const denied=fixture({choices:['install'],profileError:'Human declined'});await denied.run('kujo.browser');assert.match(denied.alerts[0].message,/declined/);
});

test('knowledge menu requires explicit corpus review before indexing and retains session scope',async()=>{
 const f=fixture({prompts:['manual','docs'],choices:['preview','index']});await f.run('kujo.knowledge');assert.deepEqual(f.calls.map(c=>c.input.action),['preview','index']);assert.deepEqual(f.calls[1].input,{sessionID:'fixture-session',action:'index',name:'manual',path:'docs',digest:'a'.repeat(64)});assert.match(f.alerts[0].message,/guide.md/);
 const cancel=fixture({prompts:['manual','docs'],choices:['preview','cancel']});await cancel.run('kujo.knowledge');assert.equal(cancel.calls.length,1);
 const question=fixture({prompts:['manual','How do modules work?'],choices:['query']});await question.run('kujo.knowledge');assert.equal(question.calls[0].input.question,'How do modules work?');
});

 test('automatic completion is workspace/session scoped and offers evidence before an explicit verdict',async()=>{
  const f=fixture({choices:['evidence','finish','partial']});
  await f.event('another-session');await f.event('fixture-session','/another-project');assert.equal(f.calls.length,0);
  await f.event();assert.deepEqual(f.calls.map(c=>c.method),['completion','evidence','runledger']);
  assert.deepEqual(f.calls[1].input,{scope:'session',sessionID:'fixture-session'});
  assert.deepEqual(f.calls[2].input,{sessionID:'fixture-session',action:'finish',status:'partial'});
  assert.equal(f.alerts[0].title,'Recorded session evidence');
  f.cleanup();await f.event();assert.equal(f.calls.length,3);
 });
 test('automatic completion dismissal and verdict cancellation never finish; denied finish reports inspection',async()=>{
  for(const choices of [[],['later'],['finish']]){const f=fixture({choices});await f.event();assert.deepEqual(f.calls.map(c=>c.method),['completion']);}
  const denied=fixture({choices:['finish','pass'],profileError:'Human declined'});await denied.event();assert.match(denied.alerts[0].message,/Human declined/);assert.equal(denied.toasts.length,0);
 });

test('home-screen setup creates a project session only after selection and continues without inference',async()=>{
 const f=fixture({home:true,choices:['create','review']});await f.run('kujo.profile');
 assert.deepEqual(f.calls.map(c=>c.method),['createSession','status','profile']);
 assert.deepEqual(f.calls[0].input,{title:'Kujo workspace',location:{directory:'/fixture/project'}});
 assert.deepEqual(f.route(),{type:'session',sessionID:'new-session'});
 assert.equal(f.calls[2].input.sessionID,'new-session');
 for(const choices of [[],['cancel']]){const cancel=fixture({home:true,choices});await cancel.run('kujo.profile');assert.equal(cancel.calls.length,0);assert.equal(cancel.route().type,'home');}
});
test('unload during session creation does not navigate or continue setup',async()=>{
 let release;const f=fixture({home:true,choices:['create'],waitCreate:new Promise(r=>release=r)});
 const pending=f.run('kujo.profile');await new Promise(r=>setImmediate(r));f.cleanup();release();await pending;
 assert.deepEqual(f.calls.map(c=>c.method),['createSession']);assert.equal(f.route().type,'home');
});

test('home session creation persists the model and variant visible in the prompt without inference',async()=>{
 const f=fixture({home:true,choices:['create'],selectedModel:{providerID:'fixture-provider',modelID:'fixture-model',variant:'reasoning'}});await f.run('kujo.profile');
 assert.deepEqual(f.calls[0].input.model,{providerID:'fixture-provider',id:'fixture-model',variant:'reasoning'});
 assert.deepEqual(f.calls.map(c=>c.method),['createSession','status']);
});

test('manual ledger start persists the visible prompt model before requesting the canonical operation',async()=>{
 const f=fixture({choices:['start'],ledgerState:'not_started',selectedModel:{providerID:'fixture',modelID:'selected'}});await f.run('kujo.runledger');
 assert.deepEqual(f.calls.map(c=>c.method),['runledger','switchModel','runledger']);
 assert.deepEqual(f.calls[1].input,{sessionID:'fixture-session',model:{providerID:'fixture',id:'selected'}});
 assert.equal(f.calls[2].input.action,'start');
});

test('completion arriving during another Kujo dialog is coalesced and presented after it closes',async()=>{
 let release;const f=fixture({choices:[undefined,'later'],waitStatus:new Promise(r=>release=r)});
 const status=f.run('kujo.status');await new Promise(r=>setImmediate(r));await f.event();await f.event();
 assert.deepEqual(f.calls.map(c=>c.method),['status']);release();await status;
 assert.deepEqual(f.calls.map(c=>c.method),['status','completion']);
});
test('queued completion cannot follow the user into another session or survive unload',async()=>{
 for(const unload of [false,true]){
  let release;const f=fixture({waitStatus:new Promise(r=>release=r)});const status=f.run('kujo.status');await new Promise(r=>setImmediate(r));await f.event();
  if(unload)f.cleanup();else f.navigate({type:'session',sessionID:'other'});
  release();await status;assert.deepEqual(f.calls.map(c=>c.method),['status']);
 }
});

test('service setup is readable from home without creating a session or invoking a service',async()=>{
 const f=fixture({home:true,choices:['services','leash'],services:[{id:'leash',title:'Leash',configured:false,enabled:false,reason:'No service configured',setup:'Set KUJO_LEASH_URL and KUJO_LEASH_TOKEN',use:'Delivery requires approval'}]});
 await f.run('kujo.menu');assert.deepEqual(f.calls.map(c=>c.method),['status']);assert.match(f.alerts[0].message,/connection not checked/);assert.match(f.alerts[0].message,/KUJO_LEASH_TOKEN/);assert.match(f.alerts[0].message,/select Full/);
});

const approval={id:'permission-fixture',sessionID:'fixture-session',action:'kujo.ability.approve',metadata:{project:'/fixture/project',ability:'kujo.opencode.leash.deliver',input:{origin:'http://127.0.0.1:4321',event:{summary:'fixture only'}},effects:['network'],invocation:'invocation-fixture',digest:'a'.repeat(64)}};
test('native approval review shows the exact operation without replying or invoking RPC',async()=>{
 const f=fixture({choices:['0','1','2','3','return']});await f.emit('permission.asked',approval);
 assert.equal(f.calls.length,0);assert.deepEqual(f.alerts.map(a=>a.message),['kujo.opencode.leash.deliver','http://127.0.0.1:4321','["network"]',reviewPages(JSON.stringify(approval.metadata.input))[0]]);
 assert.match(f.selections[0].options.at(-1).description,/Nothing approved/);
 await f.emit('permission.asked',approval);assert.equal(f.alerts.length,4);
});
test('approval review ignores other workspaces, sessions and non-Kujo permissions',async()=>{
 const f=fixture();
 await f.emit('permission.asked',approval,'/other');
 await f.emit('permission.asked',{...approval,sessionID:'other'});
 await f.emit('permission.asked',{...approval,action:'shell'});
 await f.emit('permission.asked',{...approval,metadata:{...approval.metadata,project:'/other'}});
 assert.equal(f.selections.length,0);assert.deepEqual(f.calls.map(c=>c.method),['status']);
});
test('approval review queues behind a Kujo dialog and drops resolved requests',async()=>{
 let release;const f=fixture({waitStatus:new Promise(r=>release=r)});
 const status=f.run('kujo.status');await new Promise(r=>setImmediate(r));
 await f.emit('permission.asked',approval);assert.equal(f.selections.length,0);
 await f.emit('permission.replied',{requestID:approval.id});release();await status;
 assert.equal(f.selections.filter(s=>s.title==='Review Kujo operation').length,0);
 const other=fixture({choices:['return']});await other.emit('permission.asked',approval);
 assert.equal(other.selections[0].title,'Review Kujo operation');
});
test('resolution, navigation and unload dismiss only the owned approval review',async()=>{
 for(const action of ['reply','navigate','unload']){
  let release;const f=fixture({waitSelect:new Promise(r=>release=r)});
  const pending=f.emit('permission.asked',approval);await new Promise(r=>setImmediate(r));
  if(action==='reply')await f.emit('permission.replied',{requestID:approval.id});
  if(action==='navigate'){f.navigate({type:'session',sessionID:'other'});await f.emit('session.viewed',{sessionID:'other'},'/other');}
  if(action==='unload')f.cleanup();
  release();await pending;assert.equal(f.clears(),1);assert.equal(f.alerts.length,0);
 }
});
test('reopened approval reads current host requests and exact input pages never truncate',async()=>{
 const f=fixture({pendingPermissions:[approval],choices:['return']});await f.run('kujo.approval');assert.deepEqual(f.calls.map(c=>c.method),['status']);assert.equal(f.selections[0].title,'Review Kujo operation');
 const input='a'.repeat(2000)+'\u001b[31m'+'\u202e'+'finish';
 const section=approvalSections({...approval,metadata:{...approval.metadata,input}}).find(s=>s.title==='Exact input');
 const pages=reviewPages(section.text);assert.ok(pages.length>1);assert.equal(pages.join('').replaceAll('\n',''),section.text);assert.ok(pages.every(p=>p.split('\n').length<=6&&p.split('\n').every(l=>Array.from(l).length<=36)));assert.ok(!section.text.includes('\u001b'));assert.ok(!section.text.includes('\u202e'));
});

test('canonical project aliases are resolved through workspace-bound status before review',async()=>{
 const f=fixture({canonicalProject:'/canonical/project',choices:['return']});
 await f.emit('permission.asked',{...approval,metadata:{...approval.metadata,project:'/canonical/project'}});
 assert.deepEqual(f.calls.map(c=>c.method),['status']);assert.equal(f.selections[0].title,'Review Kujo operation');
});

test('approval summaries retain friendly titles and wide text stays within the page width',()=>{
 assert.match(approvalSections({...approval,metadata:{...approval.metadata,title:'Submit a Leash intervention'}})[0].text,/Submit a Leash intervention \(kujo.opencode.leash.deliver\)/);
 const original='界'.repeat(70)+'end';const pages=reviewPages(original);
 assert.equal(pages.join('').replaceAll('\n',''),original);
 for(const line of pages.join('\n').split('\n'))assert.ok(Array.from(line).reduce((n,c)=>n+(c.codePointAt(0)<128?1:2),0)<=36);
});

test('a reply during canonical workspace lookup suppresses the late review',async()=>{
 let release;const f=fixture({canonicalProject:'/canonical/project',waitStatus:new Promise(r=>release=r)});
 const pending=f.emit('permission.asked',{...approval,metadata:{...approval.metadata,project:'/canonical/project'}});
 await new Promise(r=>setImmediate(r));await f.emit('permission.replied',{requestID:approval.id});release();await pending;
 assert.equal(f.selections.length,0);
});

test('session-scoped permission events without an optional location still receive review',async()=>{
 const f=fixture({choices:['return']});await f.emit('permission.asked',approval,null);
 assert.equal(f.selections[0].title,'Review Kujo operation');assert.equal(f.calls.length,0);
});
