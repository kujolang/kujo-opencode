import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {mcpWorkflow,agentsSmoke} from '../lib/build-workflows.mjs';
const binary=resolveKujoBinary();
// Canonical integration checks live in E2E; these path/failure checks use a
// deliberately missing executable to ensure forbidden inputs never launch it.
test('MCP destination rejects existing outputs, escapes and symlink ancestors before executing',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-mcp-paths-'));await mkdir(join(project,'existing'));await symlink(join(project,'existing'),join(project,'link'));
 const opts={project,binary:'/missing/runtime',source:project};
 for(const output_dir of ['existing','../escape','link/nested'])await assert.rejects(mcpWorkflow({...opts,input:{output_dir}}));
 await assert.rejects(access(join(project,'new')));
});
test('MCP cancellation makes no output; execution failure retains the exclusive directory',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-mcp-failure-'));const controller=new AbortController();controller.abort();
 const opts={project,binary:'/missing/runtime',source:project,input:{output_dir:'generated'}};
 await assert.rejects(mcpWorkflow({...opts,signal:controller.signal}),{name:'AbortError'});await assert.rejects(access(join(project,'generated')));
 await assert.rejects(mcpWorkflow(opts),error=>error.details?.artifacts?.[0]===join(project,'generated'));await access(join(project,'generated'));
 await assert.rejects(mcpWorkflow(opts),{code:'kujo_output_exists'});
});

test('Agents smoke refuses malformed or unsuccessful fixture evidence even with exit zero',async()=>{
 const source=await mkdtemp(join(tmpdir(),'kujo-agents-contract-'));await mkdir(join(source,'examples'));
 const names=['hello_agent','tool_agent','approval_agent','retrieval_agent','handoff_agent','traced_agent','artifact_agent'];
 const good=Object.fromEntries(names.map(name=>[name,{ok:true,requires_network:false,status:name==='approval_agent'?'failed':'completed'}]));
 for(const value of ['invalid','null',JSON.stringify({}),JSON.stringify({...good,hello_agent:{ok:false,requires_network:false}}),JSON.stringify({...good,hello_agent:{ok:true,requires_network:true}})]){
  await writeFile(join(source,'examples/examples_smoke_runner.kujo'),`println(${JSON.stringify(value)})`);
  await assert.rejects(agentsSmoke({binary,source}),error=>['kujo_agents_evidence_invalid','kujo_agents_smoke_failed'].includes(error.code));
 }
 await writeFile(join(source,'examples/examples_smoke_runner.kujo'),`println(${JSON.stringify(JSON.stringify(good))})`);
 assert.equal((await agentsSmoke({binary,source})).examples.approval_agent.status,'failed');
});
