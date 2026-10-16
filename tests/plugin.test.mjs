import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setupPlugin} from '../lib/plugin.mjs';
import {LocalAbilityRuntime,FileAbilityState} from '../.generated/local-runtime.mjs';

test('native host bridge requires a fresh decision, binds workspace, and disposes registrations',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-native-'));let executions=0,grants=0,disposed=0,deny=false;const tools=new Map(),commands=new Map();let hook;
 const definition={schema:'kujo.ability/v1',id:'kujo.test.write',version:'1.0.0',title:'Write fixture',description:'Test native approval',input_schema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false},output_schema:{type:'object'},effects:[{kind:'write',resource:'fixture'}],idempotency:{mode:'keyed'}};
 const profiles=[{schema:'kujo.ability-profile/v1',id:'kujo.profile.test',version:'1.0.0',description:'fixture',default:true,extends:[],ability_ids:[definition.id],metadata:{}}];
 const runtime=new LocalAbilityRuntime({abilities:[{definition,tool:{name:'native_fixture',description:'fixture'},handler:async input=>{executions++;return input;}}],profiles,profileId:profiles[0].id,state:new FileAbilityState({statePath:join(project,'state'),receiptsPath:join(project,'receipts')})});
 const app={runtime,config:{profile:profiles[0].id},catalog:{profiles},paths:{root:project}};
 const registration=()=>({dispose:async()=>{disposed++;}});
 const ctx={rpc:{register:async()=>registration()},location:{directory:project},session:{get:async()=>({location:{directory:project}}),synthetic:async()=>{}},permission:{hook:async (name,callback)=>{hook=callback;return registration();},assert:async input=>{const decision={...input,effect:'allow'};hook(decision);assert.equal(decision.effect,'ask');assert.deepEqual(input.save,[]);assert.equal(executions,grants);if(deny)throw Error('Human declined');grants++;}},tool:{transform:async fn=>{fn({add:tool=>tools.set(tool.name,tool)});return registration();}},command:{transform:async fn=>{fn({add:command=>commands.set(command.name,command)});return registration();}}};
 const cleanup=await setupPlugin(ctx,{openApp:async()=>app});
 const context={sessionID:'test-session',agent:'build',messageID:'message',id:'call',signal:new AbortController().signal};
 assert.equal(JSON.parse((await tools.get('native_fixture').execute({value:'first'},context)).content).ok,true);assert.equal(executions,1);
 deny=true;await assert.rejects(tools.get('native_fixture').execute({value:'declined'},context),/declined/);assert.equal(executions,1);
 const controller=new AbortController();controller.abort();await assert.rejects(tools.get('native_fixture').execute({value:'cancelled'},{...context,signal:controller.signal}));assert.equal(executions,1);
 ctx.session.get=async()=>({location:{directory:tmpdir()}});await assert.rejects(tools.get('native_fixture').execute({value:'escape'},context),/different workspace/);assert.equal(executions,1);
 assert.deepEqual([...commands.keys()],['kujo-status','kujo-evidence','kujo-profile']);
 await cleanup();assert.equal(disposed,4);
});
