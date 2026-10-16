import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {run} from '../lib/process.mjs';
// Explicit network acceptance only: installs the canonical generator's pinned
// dependencies, then verifies fixture mode. Never included in offline npm test.
export async function verifyAgentStarter(project,binary,kennelSource){
 const cwd=join(project,'agent-starter'),home=join(project,'.agent-acceptance-home');await mkdir(home,{recursive:true});
 const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('KUJO_'))),HOME:home,USERPROFILE:home,KUJO_BIN:binary};
 const install=await run(binary,['run',join(kennelSource,'kennel.kujo'),'--interpreter','--','install','--project-dir',cwd],{cwd,env,timeoutMs:240000,maxBytes:65536,killTree:true});
 assert.equal(install.exitCode,0,JSON.stringify(install));assert.equal(install.signal,null);
 const execution=await run(binary,['agent','run','Hello','--json'],{cwd,env,timeoutMs:30000,maxBytes:65536,killTree:true});assert.equal(execution.exitCode,0,JSON.stringify(execution));assert.equal(execution.signal,null);
 const result=JSON.parse(execution.stdout);assert.equal(result.contract,'kujo-agent-run/v1');assert.equal(result.status,'ok');assert.equal(result.provider_mode,'fixture');assert.equal(result.output,'Owned agent fixture: Hello');
 return {provider_mode:result.provider_mode,output:result.output};
}
