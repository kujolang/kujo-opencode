import {verifyStarterServers} from './starter-runtime-acceptance.mjs';
// Network gate: actual release tarballs, empty HOME/prefix, no sibling checkouts.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
const repo=resolve('.');
const root=await mkdtemp(join(tmpdir(),'kujo-opencode-packed-'));
const home=join(root,'home'), prefix=join(root,'prefix'), project=join(root,'project'), older=join(root,'older-project');
for (const dir of [home,prefix,project,older]) await mkdir(dir);
const env={...process.env,HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:join(home,'config'),XDG_DATA_HOME:join(home,'data'),XDG_CACHE_HOME:join(home,'cache'),KUJO_OPENCODE_HOME:join(home,'kujo'),npm_config_cache:join(home,'npm-cache'),npm_config_userconfig:join(home,'.npmrc')};
for (const key of ['KUJO_BIN','KUJO_SOURCE_ROOT','KUJO_OPENCODE_PROJECT','NODE_PATH','NPM_TOKEN','NODE_AUTH_TOKEN']) delete env[key];
async function command(bin,args,opts={}) { return exec(bin,args,{env,cwd:repo,timeout:900000,maxBuffer:8*1024*1024,...opts}); }
for (const dir of [project,older]) {
 await writeFile(join(dir,'README.md'),'# Fresh install fixture\n');
 await writeFile(join(dir,'LICENSE'),'MIT\n');
 await command('git',['init','-q'],{cwd:dir});
 await command('git',['add','.'],{cwd:dir});
 await command('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'],{cwd:dir});
}
const packed=JSON.parse((await command('npm',['pack','--json','--pack-destination',root])).stdout)[0];
const tarball=join(root,packed.filename);
// Real previous release, not a synthetic version field mutation.
const baseline=join(root,'baseline'); await mkdir(baseline);
await command('git',['archive','855524a5da804ae43088aa204350230e62616ab3','--format=tar','-o',join(root,'baseline.tar')]);
await command('tar',['-xf',join(root,'baseline.tar'),'-C',baseline]);
const oldPack=JSON.parse((await command('npm',['pack','--json','--pack-destination',root],{cwd:baseline})).stdout)[0];
await command('npm',['install','--prefix',prefix,join(root,oldPack.filename)]);
const cli=join(prefix,'node_modules/@kujolang/kujo-opencode/bin/kujo-opencode.mjs');
async function call(args,dir=project) { return JSON.parse((await command(process.execPath,[cli,...args,'--project',dir,'--json'])).stdout); }
console.log(`Isolated fixture: ${root}`);
await call(['setup']); await call(['setup'],older);
await call(['profile','kujo.profile.review']); await call(['disable','kujo.fence.architecture.check']);
await writeFile(join(env.KUJO_OPENCODE_HOME,'preserved-marker'),'keep');
const priorReceipts=await readFile(join(env.KUJO_OPENCODE_HOME,'receipts.jsonl'),'utf8');
await command('npm',['install','--prefix',prefix,tarball]);
const upgrade=await call(['update']); assert.equal(upgrade.profile,'kujo.profile.review'); assert.deepEqual(upgrade.disabled,['kujo.fence.architecture.check']);
assert.ok((await readFile(join(env.KUJO_OPENCODE_HOME,'receipts.jsonl'),'utf8')).startsWith(priorReceipts));
const oldCli=join(env.KUJO_OPENCODE_HOME,'runtime/0.1.0/bin/kujo-opencode.mjs');
assert.equal(JSON.parse((await command(process.execPath,[oldCli,'status','--project',older,'--json'])).stdout).ok,true);
assert.equal((await call(['demo'])).ok,true);
const fresh=join(root,'fresh'); await mkdir(fresh); await writeFile(join(fresh,'README.md'),'# Clean package fixture\n');
const freshHome=join(home,'fresh-kujo'); const previousHome=env.KUJO_OPENCODE_HOME; env.KUJO_OPENCODE_HOME=freshHome;
// This is the documented one-command tarball install path, with no global link.
await command('npm',['exec','--yes',`--package=${tarball}`,'--','kujo-opencode','setup','--project',fresh,'--json']);
assert.equal((await call(['demo'],fresh)).ok,true);
const installed=JSON.parse(await readFile(join(freshHome,'installation.json'),'utf8'));
assert.ok(Object.values(installed.sources).every(source=>source.mode==='pinned' && source.path.startsWith(freshHome)));
// Execute from the durable projection with no npm cache/package dependency.
const projectedCli=join(installed.projection_root,'bin/kujo-opencode.mjs');
assert.equal(JSON.parse((await command(process.execPath,[projectedCli,'status','--project',fresh,'--json'])).stdout).ok,true);
// Verify real runtime visibility, not only persisted override configuration.
await call(['enable','kujo.opencode.source.inspect'],fresh);
await writeFile(join(fresh,'override.kujo'),'print("override works")\n');
const appUrl=pathToFileURL(join(installed.projection_root,'lib/app.mjs')).href;
const probe=`const {createApp}=await import(${JSON.stringify(appUrl)});const app=await createApp(${JSON.stringify(fresh)});const result=await app.runtime.execute({abilityId:'kujo.opencode.source.inspect',input:{file:'override.kujo'}});console.log(JSON.stringify({ids:app.runtime.describe().map(item=>item.definition.id),ok:result.ok,receipt_id:result.receipt.receipt_id}));`;
const enabled=JSON.parse((await command(process.execPath,['--input-type=module','-e',probe])).stdout);
assert.ok(enabled.ids.includes('kujo.opencode.source.inspect'));assert.equal(enabled.ok,true);
const exported=JSON.parse((await command(process.execPath,[projectedCli,'evidence','--project',fresh,'--receipt',enabled.receipt_id,'--json'])).stdout);assert.equal(exported.receipts[0].receipt_id,enabled.receipt_id);assert.ok(exported.receipts[0].metadata.project_root);
await call(['disable','kujo.opencode.source.inspect'],fresh);
for(const id of ['kujo.opencode.source.preview','kujo.opencode.source.execute'])await call(['enable',id],fresh);
const executionProbe=`const {createApp}=await import(${JSON.stringify(appUrl)});const app=await createApp(${JSON.stringify(fresh)});const preview=await app.runtime.execute({abilityId:'kujo.opencode.source.preview',input:{mode:'run',entry:'override.kujo',files:['override.kujo']}});if(!preview.ok)throw Error(JSON.stringify(preview));const input=preview.receipt.result.execution_input;const controls={invocationId:'packed-source',idempotencyKey:'packed-source'};const pending=await app.runtime.execute({abilityId:'kujo.opencode.source.execute',input,controls});if(pending.code!=='ability_approval_required')throw Error('Expected approval');const approval=await app.runtime.requestApproval({abilityId:'kujo.opencode.source.execute',input,invocationId:controls.invocationId});const result=await app.runtime.execute({abilityId:'kujo.opencode.source.execute',input,controls:{...controls,approvalId:approval.approval_id}});console.log(JSON.stringify({ok:result.ok,stdout:result.receipt.result?.stdout,receipt:result.receipt.receipt_id}));`;
const execution=JSON.parse((await command(process.execPath,['--input-type=module','-e',executionProbe])).stdout);assert.equal(execution.ok,true);assert.match(execution.stdout,/override works/);
for(const id of ['kujo.opencode.source.preview','kujo.opencode.source.execute'])await call(['disable',id],fresh);

for(const id of ['kujo.opencode.mcp.preview','kujo.opencode.mcp.generate','kujo.opencode.agents.smoke'])await call(['enable',id],fresh);
const buildProbe=`const {createApp}=await import(${JSON.stringify(appUrl)});const app=await createApp(${JSON.stringify(fresh)});const preview=await app.runtime.execute({abilityId:'kujo.opencode.mcp.preview',input:{}});if(!preview.ok)throw Error(JSON.stringify(preview));for(const abilityId of ['kujo.opencode.mcp.generate','kujo.opencode.agents.smoke']){const controls={invocationId:abilityId,idempotencyKey:abilityId};const pending=await app.runtime.execute({abilityId,input:{},controls});if(pending.code!=='ability_approval_required')throw Error('Expected approval');const approval=await app.runtime.requestApproval({abilityId,input:{},invocationId:abilityId});const result=await app.runtime.execute({abilityId,input:{},controls:{...controls,approvalId:approval.approval_id}});if(!result.ok)throw Error(JSON.stringify(result));if(abilityId.endsWith('generate')&&!result.receipt.result.generated_tools)throw Error('No MCP tools generated');if(abilityId.endsWith('smoke')&&!result.receipt.result.examples.hello_agent.ok)throw Error('SDK smoke failed');}console.log('passed');`;
assert.match((await command(process.execPath,['--input-type=module','-e',buildProbe])).stdout,/passed/);
for(const id of ['kujo.opencode.mcp.preview','kujo.opencode.mcp.generate','kujo.opencode.agents.smoke'])await call(['disable',id],fresh);

for(const id of ['kujo.opencode.starter.preview','kujo.opencode.starter.create','kujo.opencode.starter.inspect'])await call(['enable',id],fresh);
const starterProbe=`const {createApp}=await import(${JSON.stringify(appUrl)});const app=await createApp(${JSON.stringify(fresh)});for(const kind of ['script','agent','api','mcp']){const preview=await app.runtime.execute({abilityId:'kujo.opencode.starter.preview',input:{kind,name:kind+'-starter'}});if(!preview.ok)throw Error(JSON.stringify(preview));const input=preview.receipt.result.creation_input;const controls={invocationId:kind,idempotencyKey:kind};const pending=await app.runtime.execute({abilityId:'kujo.opencode.starter.create',input,controls});if(pending.code!=='ability_approval_required')throw Error('Expected approval');const approval=await app.runtime.requestApproval({abilityId:'kujo.opencode.starter.create',input,invocationId:kind});const result=await app.runtime.execute({abilityId:'kujo.opencode.starter.create',input,controls:{...controls,approvalId:approval.approval_id}});if(!result.ok)throw Error(JSON.stringify(result));const inspected=await app.runtime.execute({abilityId:'kujo.opencode.starter.inspect',input});if(inspected.receipt.result.status!=='complete')throw Error('Starter inventory mismatch');}console.log('passed');`;
assert.match((await command(process.execPath,['--input-type=module','-e',starterProbe])).stdout,/passed/);
await verifyStarterServers(fresh,installed.kujo_bin);
for(const id of ['kujo.opencode.starter.preview','kujo.opencode.starter.create','kujo.opencode.starter.inspect'])await call(['disable',id],fresh);

const mcp=join(installed.projection_root,'bin/kujo-opencode-mcp.mjs');
const rpc=await new Promise((resolveResult,reject)=>{
 import('node:child_process').then(({spawn})=>{
  const child=spawn(process.execPath,[mcp],{env:{...env,KUJO_OPENCODE_PROJECT:fresh},stdio:['pipe','pipe','pipe']});
  let data='',errors=''; const timer=setTimeout(()=>{child.kill();reject(new Error('packed MCP timed out '+errors));},30000);
  child.stderr.on('data',chunk=>errors+=chunk); child.stdout.on('data',chunk=>{data+=chunk;if(data.includes('\n')){clearTimeout(timer);child.kill();resolveResult(JSON.parse(data.split('\n')[0]));}});
  child.on('error',reject); child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})+'\n');
 });
});
assert.equal(rpc.result.tools.length,5);
const verification={ok:true,root,tarball,upgrade:'0.1.0 -> 0.2.0',old_project_retained:true,fresh_sources:Object.keys(installed.sources).length,packed_mcp_tools:rpc.result.tools.length,fixture_workdirs_retained:process.env.KUJO_TEST_KEEP_FIXTURE==='1'};
await writeFile(join(root,'verification.json'),JSON.stringify(verification,null,2)+'\n');
// Keep the immutable tarballs and verification record, not hundreds of MiB of
// duplicate clones/caches after every successful run. Failures retain diagnosis.
if(!verification.fixture_workdirs_retained)for(const path of [home,prefix,project,older,baseline,fresh])await rm(path,{recursive:true,force:true});
console.log(JSON.stringify(verification));
