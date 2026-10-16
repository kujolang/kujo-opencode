import {loadProjectConfig} from "../lib/app.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,lstat,symlink,readlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {activateProjectFiles,recoverProjectFiles} from '../lib/project-activation.mjs';
const paths=['.kujo/opencode.json','.opencode/plugin.ts'];
const plans=paths.map(path=>({path,content:'new'}));
async function fixture(){const root=await mkdtemp(join(tmpdir(),'kujo-project-activation-'));for(const path of paths){await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),'old');}await writeFile(join(root,'unrelated'),'keep');return root;}
async function old(root){for(const path of paths)assert.equal(await readFile(join(root,path),'utf8'),'old');assert.equal(await readFile(join(root,'unrelated'),'utf8'),'keep');}
test('every multi-file activation failure restores configuration and projections together',async()=>{
 for(const phase of ['prepared','backed-up:0','installed:0','backed-up:1','installed:1']){
  const root=await fixture();await assert.rejects(activateProjectFiles(root,plans,paths,{checkpoint:async step=>{if(step===phase)throw Error('injected');}}),/injected/);await old(root);
  await assert.rejects(lstat(join(root,'.kujo/opencode-activation.json')),{code:'ENOENT'});
 }
});
test('project activation serializes competing writers and refuses live recovery',async()=>{
 const root=await fixture();let entered,release;const ready=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 const active=activateProjectFiles(root,plans,paths,{checkpoint:async step=>{if(step==='prepared'){entered();await hold;}}});await ready;
 await assert.rejects(activateProjectFiles(root,plans,paths),/active or interrupted/);await assert.rejects(loadProjectConfig(root),/active or interrupted/);await assert.rejects(recoverProjectFiles(root,paths),/still running/);release();await active;
});
async function crash(root){
 const module=new URL('../lib/project-activation.mjs',import.meta.url).href;
 const script=`import {activateProjectFiles} from ${JSON.stringify(module)};await activateProjectFiles(${JSON.stringify(root)},${JSON.stringify(plans)},${JSON.stringify(paths)},{checkpoint:async step=>{if(step==='installed:0')process.exit(42)}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script]);const [code]=await once(child,'exit');assert.equal(code,42);
}
test('crashed project activation restores all old bytes and is retryable',async()=>{
 const root=await fixture();await crash(root);assert.equal((await recoverProjectFiles(root,paths)).recovered,true);await old(root);await activateProjectFiles(root,plans,paths);for(const path of paths)assert.equal(await readFile(join(root,path),'utf8'),'new');
});
test('recovery preserves edits made after a crash and retains its journal',async()=>{
 const root=await fixture();await crash(root);await writeFile(join(root,paths[0]),'human edit');
 await assert.rejects(recoverProjectFiles(root,paths),/Recovery conflict/);assert.equal(await readFile(join(root,paths[0]),'utf8'),'human edit');assert.ok(await lstat(join(root,'.kujo/opencode-activation.json')));
});

test('a stale configuration precondition fails before changing projection bytes',async()=>{
 const root=await fixture();await assert.rejects(activateProjectFiles(root,plans,paths,{precondition:async()=>{throw Error('configuration changed');}}),/configuration changed/);await old(root);
 await activateProjectFiles(root,plans,paths);
});

test('rollback restores removed symlinks without touching their external content',async()=>{
 const root=await fixture(),external=await mkdtemp(join(tmpdir(),'kujo-projection-source-'));
 await writeFile(join(external,'SKILL.md'),'canonical');await symlink(external,join(root,'skill'));
 const allowed=[...paths,'skill','new-file'];
 await assert.rejects(activateProjectFiles(root,[{path:'skill',remove:true},{path:'new-file',content:'new'}],allowed,{checkpoint:async step=>{if(step==='installed:1')throw Error('injected');}}),/injected/);
 assert.equal(await readlink(join(root,'skill')),external);assert.equal(await readFile(join(external,'SKILL.md'),'utf8'),'canonical');
 await assert.rejects(lstat(join(root,'new-file')),{code:'ENOENT'});
});
