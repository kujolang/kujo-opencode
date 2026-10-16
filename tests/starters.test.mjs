import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,symlink,lstat,rmdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {previewStarter,createStarter,inspectStarter} from '../lib/starters.mjs';
const binary=resolveKujoBinary();
async function fixture(){return {project:await mkdtemp(join(tmpdir(),'kujo-starter-unit-')),binary,sources:{}};}
test('canonical script and agent previews are reproducible and create reviewed bytes without running them',async()=>{
 for(const kind of ['script','agent']){
  const opts=await fixture();const input={kind,name:'example'};const preview=await previewStarter({...opts,input});assert.equal(preview.digest,(await previewStarter({...opts,input})).digest);
  await assert.rejects(readFile(join(opts.project,'example',preview.entrypoint)),{code:'ENOENT'});
  const created=await createStarter({...opts,input:preview.creation_input});assert.equal(created.digest,preview.digest);
  for(const directory of preview.directories)assert.equal((await lstat(join(opts.project,'example',directory))).isDirectory(),true);
  for(const file of preview.files)assert.equal(await readFile(join(opts.project,'example',file.path),'utf8'),file.content);
  assert.equal((await inspectStarter({...opts,input:preview.creation_input})).status,'complete');
  if(kind==='agent'){assert.ok(preview.directories.includes('agent/tools'));await rmdir(join(opts.project,'example/agent/tools'));assert.equal((await inspectStarter({...opts,input:preview.creation_input})).status,'partial');await mkdir(join(opts.project,'example/agent/tools'));}
  await assert.rejects(createStarter({...opts,input:preview.creation_input}),{code:'kujo_output_exists'});await assert.rejects(previewStarter({...opts,input}),{code:'kujo_output_exists'});
  await writeFile(join(opts.project,'example',preview.entrypoint),'changed');assert.equal((await inspectStarter({...opts,input:preview.creation_input})).status,'changed');
 }
});
test('starter requests reject escapes, changed digests, symlink destinations and pre-cancellation',async()=>{
 const opts=await fixture();await mkdir(join(opts.project,'target'));await symlink(join(opts.project,'target'),join(opts.project,'link'));
 for(const input of [{kind:'script',name:'../escape'},{kind:'script',name:'valid',output_dir:'../escape'},{kind:'script',name:'valid',output_dir:'link/new'}])await assert.rejects(previewStarter({...opts,input}));
 const plan=await previewStarter({...opts,input:{kind:'script',name:'safe'}});
 await assert.rejects(createStarter({...opts,input:{...plan.creation_input,digest:'0'.repeat(64)}}),{code:'kujo_starter_changed'});
 const controller=new AbortController();controller.abort();await assert.rejects(createStarter({...opts,input:plan.creation_input,signal:controller.signal}),{name:'AbortError'});
 assert.equal((await inspectStarter({...opts,input:plan.creation_input})).status,'missing');
});
test('concurrent creation has one winner and preserves its complete output',async()=>{
 const opts=await fixture();const plan=await previewStarter({...opts,input:{kind:'agent',name:'race'}});
 const outcomes=await Promise.allSettled([createStarter({...opts,input:plan.creation_input}),createStarter({...opts,input:plan.creation_input})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'kujo_output_exists');assert.equal((await inspectStarter({...opts,input:plan.creation_input})).status,'complete');
});
test('real process interruption leaves inspectable partial output and never overwrites it',async()=>{
 const opts=await fixture();const plan=await previewStarter({...opts,input:{kind:'agent',name:'interrupted'}});
 const script=`import {createStarter} from ${JSON.stringify(pathToFileURL(resolve('lib/starters.mjs')).href)};await createStarter({...${JSON.stringify({...opts,input:plan.creation_input})},checkpoint:async n=>{if(n===1)process.exit(23)}});`;
 await assert.rejects(promisify(execFile)(process.execPath,['--input-type=module','-e',script]),error=>error.code===23);
 const state=await inspectStarter({...opts,input:plan.creation_input});assert.equal(state.status,'partial');assert.equal(state.files.filter(file=>file.status==='matching').length,1);
 await assert.rejects(createStarter({...opts,input:plan.creation_input}),{code:'kujo_output_exists'});
});
test('application starter refuses absent or modified pinned source before project writes',async()=>{
 const opts=await fixture();await assert.rejects(previewStarter({...opts,input:{kind:'api',name:'api'}}),/Pinned starter component/);
 const source=join(opts.project,'source');await mkdir(source);await writeFile(join(source,'LICENSE'),'changed');const components=JSON.parse(await readFile('catalog/starter-components.json','utf8'));const component=components.components.find(c=>c.id==='crud-api');
 await assert.rejects(previewStarter({...opts,sources:{'crud-api':{path:source,commit:component.gitCommit}},input:{kind:'api',name:'api'}}),/Canonical starter bytes changed/);
});
