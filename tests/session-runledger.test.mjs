import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {manageSessionLedger,sessionLedgerDirectory,sessionLedgerStatus} from '../lib/session-runledger.mjs';
import {LocalAbilityRuntime,FileAbilityState} from '../.generated/local-runtime.mjs';
import {loadCatalog} from '../lib/catalog.mjs';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'kujo-session-ledger-')),sessionID='session_fixture',catalog=await loadCatalog();let state={state:'not_started',ledger_dir:sessionLedgerDirectory(sessionID)},writes=0,asks=0,deny=false;
 const abilities=catalog.abilities.filter(item=>['kujo.runledger.runs.start','kujo.runledger.runs.finish','kujo.opencode.runledger.correlate'].includes(item.definition.id)).map(item=>({...item,handler:async input=>{writes++;state={...state,state:input.status||state.state==='not_started'&&'in_progress'||state.state,run_id:'fixture-run',...(input.watchdog_trace_id?{record:{correlation:{watchdog_trace_id:input.watchdog_trace_id}}}:{})};return {run_id:'fixture-run'};}}));
 const runtime=new LocalAbilityRuntime({abilities,profiles:[{schema:'kujo.ability-profile/v1',id:'fixture',version:'1.0.0',description:'fixture',extends:[],ability_ids:abilities.map(item=>item.definition.id),metadata:{}}],profileId:'fixture',state:new FileAbilityState({statePath:join(root,'state.json'),receiptsPath:join(root,'receipts.jsonl')})});
 const app={runtime};const options={project:root,sessionID,openApp:async()=>app,sessionAtProject:async()=>({model:{providerID:'fixture',id:'selected'}}),inspect:async()=>({...state}),approve:async()=>{asks++;if(deny)throw Error('Human declined');}};
 return {options,counts:()=>({writes,asks}),deny:value=>{deny=value;},state:()=>state};
}
test('session RunLedger start and human verdict each require exact approval; repeated start is read-only',async()=>{
 const f=await fixture();assert.equal((await manageSessionLedger({...f.options,action:'status'})).state,'not_started');assert.deepEqual(f.counts(),{writes:0,asks:0});
 f.deny(true);await assert.rejects(manageSessionLedger({...f.options,action:'start'}),/declined/);assert.equal(f.counts().writes,0);
 f.deny(false);assert.equal((await manageSessionLedger({...f.options,action:'start'})).state,'in_progress');const before=f.counts();await manageSessionLedger({...f.options,action:'start'});assert.deepEqual(f.counts(),before);
 await assert.rejects(manageSessionLedger({...f.options,action:'finish'}),/explicit human/);
 assert.equal((await manageSessionLedger({...f.options,action:'finish',status:'partial'})).state,'partial');assert.equal(f.counts().writes,2);
 await assert.rejects(manageSessionLedger({...f.options,action:'finish',status:'pass'}),/in-progress/);assert.equal(f.counts().writes,2);
});
test('session RunLedger refuses missing models, hidden capabilities and cross-workspace access',async()=>{
 const f=await fixture();await assert.rejects(manageSessionLedger({...f.options,action:'start',sessionAtProject:async()=>({})}),/Select an OpenCode model/);
 await assert.rejects(manageSessionLedger({...f.options,action:'start',openApp:async()=>({runtime:{describe:()=>[]}})}),/Enable RunLedger/);
 await assert.rejects(manageSessionLedger({...f.options,action:'status',sessionAtProject:async()=>{throw Error('different workspace');}}),/different workspace/);assert.equal(f.counts().writes,0);
});
test('session RunLedger revalidates exposed digest after human approval',async()=>{
 const f=await fixture();let changed=false;const original=f.options.openApp;
 await assert.rejects(manageSessionLedger({...f.options,action:'start',approve:async()=>{changed=true;},openApp:async()=>changed?{runtime:{describe:()=>[]}}:original()}),/capability changed/);assert.equal(f.counts().writes,0);
});
test('session ledger directories reject invalid IDs and symlink traversal',async()=>{
 assert.throws(()=>sessionLedgerDirectory('../escape'));assert.notEqual(sessionLedgerDirectory('one'),sessionLedgerDirectory('two'));
 const project=await mkdtemp(join(tmpdir(),'kujo-ledger-path-')),outside=await mkdtemp(join(tmpdir(),'kujo-ledger-out-'));
 assert.equal((await sessionLedgerStatus({app:{},project,sessionID:'one'})).state,'not_started');
 await mkdir(join(project,'.kujo'));await symlink(outside,join(project,'.kujo/opencode-runledger'));await assert.rejects(sessionLedgerStatus({app:{},project,sessionID:'one'}),/symbolic/);
});

test('session correlation requires approval, preserves verdict and reconciles repeated linking',async()=>{
 const f=await fixture();await assert.rejects(manageSessionLedger({...f.options,action:'correlate'}),/Start/);await manageSessionLedger({...f.options,action:'start'});f.deny(true);await assert.rejects(manageSessionLedger({...f.options,action:'correlate'}),/declined/);assert.equal(f.state().record,undefined);f.deny(false);
 const linked=await manageSessionLedger({...f.options,action:'correlate'});assert.equal(linked.state,'in_progress');assert.match(linked.record.correlation.watchdog_trace_id,/^[a-f0-9]{32}$/);const before=f.counts();await manageSessionLedger({...f.options,action:'correlate'});assert.deepEqual(f.counts(),before);
});
