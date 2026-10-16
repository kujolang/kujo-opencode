import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink,realpath,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {FileAbilityState,LocalAbilityRuntime} from '../.generated/local-runtime.mjs';
import {projectState} from '../lib/project-state.mjs';
const definition={schema:'kujo.ability/v1',id:'kujo.test.write',version:'1.0.0',title:'Fixture',description:'Write fixture',input_schema:{type:'object',properties:{},additionalProperties:false},output_schema:{type:'object'},effects:[{kind:'write',resource:'fixture'}],idempotency:{mode:'keyed'}};
const profiles=[{schema:'kujo.ability-profile/v1',id:'kujo.profile.test',version:'1.0.0',description:'Fixture',extends:[],ability_ids:[definition.id]}];
function runtime(state,handler=async()=>({ok:true})){return new LocalAbilityRuntime({abilities:[{definition,tool:{name:'fixture'},handler}],profiles,profileId:profiles[0].id,state});}
async function fixture(){const root=await mkdtemp(join(tmpdir(),'kujo-project-state-'));const a=join(root,'a'),b=join(root,'b');await mkdir(a);await mkdir(b);const home={root:join(root,'home'),state:join(root,'home/state.json'),receipts:join(root,'home/receipts.jsonl')};return {root,a,b,home};}
const request={abilityId:definition.id,input:{},controls:{invocationId:'same-invocation',idempotencyKey:'same-key'}};
const grant=r=>r.requestApproval({abilityId:definition.id,input:{},invocationId:request.controls.invocationId});
test('approvals and same-key outcomes are isolated by project; restart and aliases replay once',async()=>{
 const {root,a,b,home}=await fixture();let writesA=0,writesB=0;
 const stateA=await projectState(FileAbilityState,{project:a,home}),stateB=await projectState(FileAbilityState,{project:b,home});
 const first=runtime(stateA,async()=>({writes:++writesA})),second=runtime(stateB,async()=>({writes:++writesB}));
 const approval=await grant(first);
 const foreign=await second.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}});assert.equal(foreign.code,'ability_approval_invalid');assert.equal(writesB,0);
 const done=await first.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}});assert.equal(done.ok,true);
 const other=await second.execute(request);assert.equal(other.code,'ability_approval_required');assert.equal(other.replayed,undefined);
 const own=await grant(second);assert.equal((await second.execute({...request,controls:{...request.controls,approvalId:own.approval_id}})).ok,true);assert.equal(writesB,1);
 const alias=join(root,'alias');await symlink(a,alias);
 const restarted=runtime(await projectState(FileAbilityState,{project:alias,home}),async()=>{throw Error('must replay');});
 const replay=await restarted.execute(request);assert.equal(replay.replayed,true);assert.equal(replay.receipt.receipt_id,done.receipt.receipt_id);assert.equal(writesA,1);
 assert.equal(replay.receipt.metadata.project_root,await realpath(a));
 const lines=(await readFile(home.receipts,'utf8')).trim().split('\n').map(JSON.parse);const aRoot=await realpath(a),bRoot=await realpath(b);assert.ok(lines.some(r=>r.metadata.project_root===aRoot));assert.ok(lines.some(r=>r.metadata.project_root===bRoot));
});

test('legacy unscoped outcomes block retry; attributed completed outcomes replay only in their project',async()=>{
 for(const attributed of [false,true]){
  const {a,b,home}=await fixture();const root=await realpath(a);let writes=0;
  class LegacyState extends FileAbilityState {async appendReceipt(receipt){if(attributed)receipt.metadata.project_root=root;return super.appendReceipt(receipt);}}
  const legacy=runtime(new LegacyState({statePath:home.state,receiptsPath:home.receipts}),async()=>({writes:++writes}));
  const approval=await grant(legacy);const done=await legacy.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}});
  const current=runtime(await projectState(FileAbilityState,{project:a,home}),async()=>{throw Error('must not repeat');});
  const other=runtime(await projectState(FileAbilityState,{project:b,home}));
  if(attributed){const replay=await current.execute(request);assert.equal(replay.replayed,true);assert.equal(replay.receipt.receipt_id,done.receipt.receipt_id);assert.equal((await other.execute(request)).code,'ability_approval_required');}
  else {await assert.rejects(current.execute(request),{code:'kujo_legacy_outcome_unresolved'});await assert.rejects(other.execute(request),{code:'kujo_legacy_outcome_unresolved'});}
  assert.equal(writes,1);
 }
});
test('legacy approvals cannot authorize a scoped execution, and late legacy records cannot shadow scoped replay',async()=>{
 const {a,home}=await fixture();const old=runtime(new FileAbilityState({statePath:home.state,receiptsPath:home.receipts}));
 const approval=await grant(old);const current=runtime(await projectState(FileAbilityState,{project:a,home}));
 assert.equal((await current.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}})).code,'ability_approval_invalid');
 const own=await grant(current);const done=await current.execute({...request,controls:{...request.controls,approvalId:own.approval_id}});
 await old.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}});
 const replay=await current.execute(request);assert.equal(replay.replayed,true);assert.equal(replay.receipt.receipt_id,done.receipt.receipt_id);
});

test('an in-progress legacy execution remains unresolved rather than starting again after upgrade',async()=>{
 const {a,home}=await fixture();let release,entered;
 const hold=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 const legacy=runtime(new FileAbilityState({statePath:home.state,receiptsPath:home.receipts}),async()=>{entered();await hold;return {ok:true};});
 const approval=await grant(legacy);const running=legacy.execute({...request,controls:{...request.controls,approvalId:approval.approval_id}});await started;
 const current=runtime(await projectState(FileAbilityState,{project:a,home}),async()=>{throw Error('duplicate execution');});
 try{await assert.rejects(current.execute(request),{code:'kujo_legacy_outcome_unresolved'});}finally{release();await running;}
});
