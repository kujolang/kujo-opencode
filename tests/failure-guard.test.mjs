import test from 'node:test';
import assert from 'node:assert/strict';
import {FailureGuard} from '../lib/failure-guard.mjs';
const event=(callID,extra={})=>({phase:'tool.error',sessionID:'session',tool:'fixture',callID,...extra});
test('guard is opt-in and pauses only once after three distinct consecutive failures',async()=>{
 const pauses=[],notes=[];const options={interrupt:async id=>pauses.push(id),notify:async(id,text)=>notes.push({id,text})};
 const off=new FailureGuard(options);for(const id of ['a','b','c'])await off.observe(event(id));assert.equal(pauses.length,0);
 const guard=new FailureGuard({...options,enabled:true});await guard.observe(event('a'));await guard.observe(event('a'));await guard.observe(event('b'));assert.equal(pauses.length,0);
 await Promise.all([guard.observe(event('c')),guard.observe(event('d'))]);assert.deepEqual(pauses,['session']);assert.equal(notes.length,1);assert.match(notes[0].text,/No tool was retried/);assert.equal(guard.status().interventions,1);
});
test('success, different tools and expired windows reset consecutive failures',async()=>{
 let now=0,paused=0;const guard=new FailureGuard({enabled:true,now:()=>now,interrupt:async()=>{paused++;},notify:async()=>{}});
 await guard.observe(event('a'));await guard.observe(event('b'));await guard.observe(event('c',{phase:'tool.completed'}));await guard.observe(event('d'));await guard.observe(event('e',{tool:'another'}));await guard.observe(event('f'));now=300001;await guard.observe(event('g'));await guard.observe(event('h'));assert.equal(paused,0);await guard.observe(event('i'));assert.equal(paused,1);
});
test('guard caps tracked sessions, reports failed intervention and stops after close',async()=>{
 const guard=new FailureGuard({enabled:true,interrupt:async()=>{throw Error('private error');},notify:async()=>{throw Error('must not notify');}});
 for(let i=0;i<128;i++)await guard.observe(event('a',{sessionID:`session-${i}`}));await guard.observe(event('a',{sessionID:'overflow'}));assert.equal(guard.status().tracked_sessions,128);assert.equal(guard.status().dropped,1);
 await guard.observe(event('b',{sessionID:'session-0'}));await guard.observe(event('c',{sessionID:'session-0'}));assert.equal(guard.status().attention,1);assert.equal(JSON.stringify(guard.status()).includes('private'),false);
 guard.close();const before=guard.status();await guard.observe(event('d'));assert.deepEqual(guard.status(),before);
});

test('all three failures must fall within the same five-minute window',async()=>{
 let now=0,paused=0;const guard=new FailureGuard({enabled:true,now:()=>now,interrupt:async()=>{paused++;},notify:async()=>{}});
 await guard.observe(event('a'));now=240000;await guard.observe(event('b'));now=480000;await guard.observe(event('c'));assert.equal(paused,0);await guard.observe(event('d'));await guard.observe(event('e'));assert.equal(paused,1);
});
