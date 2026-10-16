import test from 'node:test';
import assert from 'node:assert/strict';
import {setupTui} from '../lib/tui.mjs';
import {scopedHostContext} from '../lib/plugin-scope.mjs';
import {homePaths,withDataRoot} from '../lib/paths.mjs';

function fixture({choices=[],profileError,waitStatus}={}) {
 const calls=[],alerts=[],toasts=[];let commands;
 const location={directory:'/fixture/project'};
 const ctx={location,client:{rpc:definition=>{
  assert.equal(definition.id,'kujo.control');
  return Object.fromEntries(['status','profile','evidence','specialist','capability'].map(method=>[method,async(input,options)=>{
   calls.push({method,input,options});assert.deepEqual(options,{location});
   if(method==='status'){if(waitStatus)await waitStatus;return {capabilities:[{id:'kujo.test.check',name:'check',description:'Check repository',active:true,inherited:true,mode:'profile'}],project:location.directory,version:'0.2.0',profile:'kujo.profile.essentials',specialists:[{id:'kujo-browser',title:'Browser verification',profile:'ship',description:'Verify pages',abilities:['kujo.lens.page.check'],available:[],missing:['kujo.lens.page.check']}],profiles:[{id:'kujo.profile.review',label:'Review',description:'Review repository'}],tools:[{name:'check',description:'Check repository'}]};}
   if(method==='capability'){if(profileError)throw Error(profileError);return {active:input.mode!=='disabled'};}
   if(method==='profile'){if(profileError)throw Error(profileError);return {abilities:18};}
   return {ok:true,receipt:{result:{receipts:[]}}};
  }]));
 }},ui:{router:{current:()=>({type:'session',sessionID:'fixture-session'})},dialog:{alert:async value=>alerts.push(value),select:async()=>choices.shift()},toast:{show:value=>toasts.push(value)}},keymap:{layer:factory=>{commands=factory().commands;}}};
 const cleanup=setupTui(ctx);
 return {calls,alerts,toasts,cleanup,run:id=>commands.find(c=>c.id===id).run()};
}
test('native UI is idle until invoked and routes status and evidence to its workspace',async()=>{
 const f=fixture({choices:['check']});assert.equal(f.calls.length,0);
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
