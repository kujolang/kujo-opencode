// Network gate: actual release tarballs, empty HOME/prefix, no sibling checkouts.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
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
const probe=`const {createApp}=await import(${JSON.stringify(appUrl)});const app=await createApp(${JSON.stringify(fresh)});const result=await app.runtime.execute({abilityId:'kujo.opencode.source.inspect',input:{file:'override.kujo'}});console.log(JSON.stringify({ids:app.runtime.describe().map(item=>item.definition.id),ok:result.ok}));`;
const enabled=JSON.parse((await command(process.execPath,['--input-type=module','-e',probe])).stdout);
assert.ok(enabled.ids.includes('kujo.opencode.source.inspect'));assert.equal(enabled.ok,true);
await call(['disable','kujo.opencode.source.inspect'],fresh);
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
console.log(JSON.stringify({ok:true,root,tarball,upgrade:'0.1.0 -> 0.2.0',old_project_retained:true,fresh_sources:Object.keys(installed.sources).length,packed_mcp_tools:rpc.result.tools.length}));
