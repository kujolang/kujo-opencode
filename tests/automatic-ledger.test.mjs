import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {AutomaticLedger} from '../lib/automatic-ledger.mjs';
async function fixture(t){const home=await mkdtemp(join(tmpdir(),'kujo-auto-ledger-'));t.after(()=>rm(home,{recursive:true,force:true}));let starts=0,state='not_started',deny=false,current=true,notifications=[];const options={home,project:join(home,'project'),enabled:true,isCurrent:async()=>current,notify:async(_id,text)=>notifications.push(text),manage:async({action,signal})=>{signal?.throwIfAborted();if(action==='start'){starts++;if(deny)throw Error('Human declined');state='in_progress';}return {state};}};return {options,starts:()=>starts,notifications,state:()=>state,deny:()=>deny=true,change:()=>current=false};}
test('automatic tracking is off by default and never chooses a verdict',async t=>{
 const f=await fixture(t),off=new AutomaticLedger({...f.options,enabled:false});await off.before('one');await off.idle('one');assert.equal(f.starts(),0);assert.equal(f.notifications.length,0);
 const active=new AutomaticLedger(f.options);await active.before('one');assert.equal(f.starts(),1);await active.idle('one');await active.idle('one');assert.equal(f.notifications.length,1);assert.equal(f.state(),'in_progress');assert.match(f.notifications[0],/choose your verdict/);active.close();const restored=new AutomaticLedger(f.options);await restored.idle('one');assert.equal(f.notifications.length,1);restored.close();
});
test('declined start and finish reminders survive reload without repeated requests',async t=>{
 const f=await fixture(t);f.deny();let active=new AutomaticLedger(f.options);await active.before('one');await active.before('one');assert.equal(f.starts(),1);active.close();active=new AutomaticLedger(f.options);await active.before('one');assert.equal(f.starts(),1);await active.reset();active.close();active=new AutomaticLedger(f.options);await active.before('one');assert.equal(f.starts(),2);active.close();
});
test('overlapping requests start once and unload cannot complete an approved late write',async t=>{
 const f=await fixture(t);let release,entered;const ready=new Promise(r=>entered=r);let writes=0;const active=new AutomaticLedger({...f.options,manage:async({action,signal})=>{if(action==='status')return {state:'not_started'};entered();await new Promise(r=>release=r);signal.throwIfAborted();writes++;return {state:'in_progress'};}});
 const first=active.before('one');await ready;const second=active.before('one');active.close();release();await Promise.all([first,second]);assert.equal(writes,0);assert.equal(f.notifications.length,0);
});
test('request state is bounded and explicit reset preserves canonical record ownership',async t=>{
 const f=await fixture(t),active=new AutomaticLedger(f.options);for(let i=0;i<128;i++)assert.equal(await active.claim('s'+i,'start'),true);await assert.rejects(active.claim('overflow','start'),/limit/);await active.reset();assert.equal(await active.claim('overflow','start'),true);assert.equal(f.starts(),0);assert.equal((await active.recover()).recovered,false);active.close();
});
test('changed configuration suppresses new requests',async t=>{const f=await fixture(t),active=new AutomaticLedger(f.options);f.change();await active.before('one');assert.equal(f.starts(),0);active.close();});

test('session cancellation prevents a late approval from creating a record',async t=>{
 const f=await fixture(t);let release,entered;const ready=new Promise(r=>entered=r);let writes=0;const active=new AutomaticLedger({...f.options,manage:async({action,signal})=>{if(action==='status')return {state:'not_started'};entered();await new Promise(r=>release=r);signal.throwIfAborted();writes++;return {state:'in_progress'};}});
 const pending=active.before('one');await ready;active.cancel('one');release();await pending;assert.equal(writes,0);await active.before('one');assert.equal(writes,0);active.close();
});

test('native completion claims require a finished attempt and survive reload without choosing a verdict',async t=>{
 const f=await fixture(t);let offers=0;let active=new AutomaticLedger({...f.options,onFinish:async()=>offers++});
 await active.before('one');assert.equal((await active.review('one')).available,false);
 await active.idle('one');assert.equal(offers,1);assert.equal((await active.review('one')).available,true);assert.equal((await active.review('one')).available,false);
 active.close();active=new AutomaticLedger(f.options);assert.equal((await active.review('one')).available,false);assert.equal(f.state(),'in_progress');active.close();
});
