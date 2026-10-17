import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {BrowserSetup} from '../lib/browser-setup.mjs';
import {lensBrowserStatus} from '../lib/lens.mjs';
import {nodeCommand} from '../lib/node-command.mjs';

test('existing Chromium path alone does not establish browser readiness',async()=>{
 const root=await mkdtemp(join(tmpdir(),'kujo-browser-unusable-')),moduleRoot=join(root,'bridge/node_modules/playwright-core'),executable=join(root,'chromium');await mkdir(moduleRoot,{recursive:true});await writeFile(executable,'not executable');
 await writeFile(join(moduleRoot,'index.js'),`module.exports={chromium:{executablePath(){return ${JSON.stringify(executable)}},async launch(){throw Error('private launch detail')}}};`);
 const status=await lensBrowserStatus(root);assert.equal(status.ready,false);assert.equal(status.state,'launch_failed');assert.equal(JSON.stringify(status).includes('private'),false);
});
test('native browser install is bounded, observable, single-flight and abortable',async()=>{
 let calls=0,probes=0;const setup=new BrowserSetup({probe:async()=>{probes++;return {ready:false,state:'dependencies_missing'};},install:async(_root,{signal,onPhase})=>{calls++;onPhase('chromium');await new Promise((resolve,reject)=>signal.aborted?reject(Error('cancelled')):signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));}});
 assert.equal((await setup.status('/fixture')).state,'dependencies_missing');assert.equal(calls,0);
 assert.equal(setup.start('/fixture').state,'installing');await Promise.resolve();assert.equal((await setup.status('/fixture')).phase,'chromium');assert.throws(()=>setup.start('/fixture'),/already running/);
 assert.equal((await setup.cancel()).state,'cancelled');assert.equal((await setup.refresh('/fixture')).state,'dependencies_missing');assert.equal(probes,2);await setup.close();assert.throws(()=>setup.start('/fixture'),/closed/);
});
test('completed installation is re-probed only when requested; failures omit raw command output',async()=>{
 const setup=new BrowserSetup({install:async()=>({ready:true,state:'ready'}),probe:async()=>({ready:false,state:'launch_failed'})});setup.start('/fixture');await setup.job.promise;assert.equal((await setup.status('/fixture')).ready,true);assert.equal((await setup.refresh('/fixture')).ready,false);await setup.close();
 const failed=new BrowserSetup({install:async()=>{throw Error('secret command output');}});failed.start('/fixture');await failed.job.promise;assert.deepEqual(await failed.status('/fixture'),{ready:false,state:'failed',code:'install_failed'});await failed.close();
});
test('host executables are never used as Node interpreters',()=>{
 assert.equal(nodeCommand('/usr/local/bin/node'),'/usr/local/bin/node');assert.equal(nodeCommand('/Applications/OpenCode/opencode'),process.platform==='win32'?'node.exe':'node');
});
