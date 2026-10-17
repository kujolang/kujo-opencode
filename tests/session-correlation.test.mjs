import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionCorrelation} from '../lib/session-correlation.mjs';
import {lifecycleTraceID,lifecycleBatch,lifecycleMetadata} from '../lib/lifecycle-outbox.mjs';

test('correlation requires a canonical matching trace and caches only bounded identifiers',async()=>{
 let calls=0,now=0,trace;const project='/fixture/project',sessionID='session1';
 const cache=new SessionCorrelation({project,openApp:async()=>({}),now:()=>now,inspect:async()=>{calls++;return {run_id:'run1',record:{correlation:{watchdog_trace_id:trace}}};}});
 assert.equal(await cache.resolve(sessionID),undefined);trace=lifecycleTraceID(project,sessionID);assert.equal(await cache.resolve(sessionID),undefined);assert.equal(calls,1);
 cache.invalidate(sessionID);assert.equal(await cache.resolve(sessionID),'run1');now=6000;assert.equal(await cache.resolve(sessionID),'run1');assert.equal(calls,3);
 for(let i=0;i<130;i++)await cache.resolve('session'+i);assert.equal(cache.entries.size,128);cache.clear();assert.equal(cache.entries.size,0);
});
test('telemetry correlation shares trace derivation without turning idle into success',()=>{
 const project='/fixture/project',sessionID='session1',event=lifecycleMetadata({phase:'session.idle',sessionID,runID:'run1',record:'private'});
 const batch=lifecycleBatch({id:'fixture',created:0,event},projectHash(project));
 assert.equal(batch.records[0].trace_id,lifecycleTraceID(project,sessionID));assert.equal(batch.records[0].status,'unset');assert.ok(batch.records[0].references.some(r=>r.type==='run'&&r.id==='run1'));assert.deepEqual(batch.records[0].content,[]);
});
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
function projectHash(project){return createHash('sha256').update(resolve(project)).digest('hex');}
test('unavailable or mismatched ledgers omit correlation and cancellation stops lookup',async()=>{
 const cache=new SessionCorrelation({project:'/fixture',openApp:async()=>{throw Error('private failure');}});assert.equal(await cache.resolve('session1'),undefined);const stop=new AbortController();stop.abort();await assert.rejects(cache.resolve('session2',stop.signal));
});

test('host execution completion is not task success, while host failure remains an error event',()=>{
 for(const [phase,status]of [['session.completed','unset'],['session.error','error']]){const batch=lifecycleBatch({id:'fixture',created:0,event:{phase,sessionID:'session1'}},projectHash('/fixture'));assert.equal(batch.records[0].status,status);assert.equal(batch.records[0].attributes['watchdog.outcome.terminal'],true);}
});
