import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {assertToolPermission} from '../lib/tool-permission.mjs';
const input={sessionID:'session',action:'kujo.ability.approve',resources:['invocation'],save:[],source:{type:'tool',messageID:'message',id:'call'},metadata:{project:'/fixture',invocation:'invocation',digest:'digest'}};
test('cancellation rejects only the exact owned permission, even when publication is delayed',async()=>{
 const controller=new AbortController(),calls=[];let publish,deny;const requests=[{...input,id:'other',metadata:{...input.metadata,invocation:'unrelated'}}];
 const pending=assertToolPermission({assert:()=>new Promise((_,reject)=>{deny=reject;publish=()=>requests.push({...input,id:'owned'});}),list:async()=>requests,reply:async value=>{calls.push(value);deny(Error('Rejected'));}},input,controller.signal);
 await delay(0);const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();await delay(35);publish();await rejected;
 assert.deepEqual(calls,[{sessionID:'session',requestID:'owned',decision:'reject'}]);
});
test('normal decisions keep host semantics and completed requests are not touched by later aborts',async()=>{
 const controller=new AbortController();let reads=0;
 await assertToolPermission({assert:async()=>{},list:async()=>{reads++;}},input,controller.signal);controller.abort();await delay(0);assert.equal(reads,0);
 const rejection=Error('Human declined');await assert.rejects(assertToolPermission({assert:async()=>{throw rejection;}},input,new AbortController().signal),error=>error===rejection);
});
test('failed host cleanup cannot permit execution or turn cancellation into approval',async()=>{
 const controller=new AbortController();let reply=false;
 const pending=assertToolPermission({assert:()=>new Promise(()=>{}),list:async()=>{throw Error('Disconnected');},reply:async()=>reply=true},input,controller.signal);
 const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();await rejected;assert.equal(reply,false);
});
