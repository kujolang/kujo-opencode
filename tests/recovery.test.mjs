import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {replaceDirectory,recoverDirectory} from '../lib/atomic-directory.mjs';

const root = () => mkdtemp(join(tmpdir(),'kujo-recovery-'));
async function populate(path) {await mkdir(path);await writeFile(join(path,'value'),'new');}
test('failed acquisition and every activation boundary preserve working bytes',async()=>{
 for(const failAt of ['locked','download','prepared','backed-up','installed']) {
  const dir=await root();const target=join(dir,'runtime');await mkdir(target);await writeFile(join(target,'value'),'old');
  await assert.rejects(replaceDirectory(target,async path=>{await populate(path);if(failAt==='download')throw Error('injected');},{checkpoint:async phase=>{if(phase===failAt)throw Error('injected');}}),/injected/);
  assert.equal(await readFile(join(target,'value'),'utf8'),'old');assert.deepEqual(await readdir(dir),['runtime']);
 }
});
test('concurrent installation cannot take over an active transaction',async()=>{
 const dir=await root();const target=join(dir,'runtime');let release;const hold=new Promise(resolve=>release=resolve);let entered;const ready=new Promise(resolve=>entered=resolve);
 const first=replaceDirectory(target,async path=>{await populate(path);entered();await hold;});await ready;
 await assert.rejects(replaceDirectory(target,populate),/already active/);
 await assert.rejects(recoverDirectory(target),/still running/);
 release();await first;assert.equal(await readFile(join(target,'value'),'utf8'),'new');
});
test('process death between backup and activation is recoverable without discarding old bytes',async()=>{
 const dir=await root();const target=join(dir,'runtime');await mkdir(target);await writeFile(join(target,'value'),'old');
 const moduleURL=new URL('../lib/atomic-directory.mjs',import.meta.url).href;
 const script=`import {replaceDirectory} from ${JSON.stringify(moduleURL)};import {mkdir,writeFile} from 'node:fs/promises';await replaceDirectory(${JSON.stringify(target)},async p=>{await mkdir(p);await writeFile(p+'/value','new')},{checkpoint:async phase=>{if(phase==='backed-up')process.exit(42)}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script]);const [code]=await once(child,'exit');assert.equal(code,42);
 assert.equal((await recoverDirectory(target)).recovered,true);assert.equal(await readFile(join(target,'value'),'utf8'),'old');assert.deepEqual(await readdir(dir),['runtime']);
 await replaceDirectory(target,populate);assert.equal(await readFile(join(target,'value'),'utf8'),'new');
});

test('death immediately after lock publication retains a complete recoverable owner',async()=>{
 const dir=await root();const target=join(dir,'runtime');
 const moduleURL=new URL('../lib/atomic-directory.mjs',import.meta.url).href;
 const script=`import {replaceDirectory} from ${JSON.stringify(moduleURL)};await replaceDirectory(${JSON.stringify(target)},async()=>{throw Error('must not populate')},{checkpoint:async phase=>{if(phase==='locked')process.exit(43)}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script]);const [code]=await once(child,'exit');assert.equal(code,43);
 const journal=JSON.parse(await readFile(`${target}.install-lock`,'utf8'));assert.equal(journal.phase,'preparing');assert.equal(journal.pid,child.pid);
 assert.equal((await recoverDirectory(target)).recovered,true);assert.deepEqual(await readdir(dir),[]);
 await replaceDirectory(target,populate);assert.equal(await readFile(join(target,'value'),'utf8'),'new');
});

test('legacy complete directory journals recover; ownerless legacy locks are preserved',async()=>{
 const dir=await root();const target=join(dir,'runtime');const lock=`${target}.install-lock`;
 const moduleURL=new URL('../lib/atomic-directory.mjs',import.meta.url).href;
 const child=spawn(process.execPath,['--input-type=module','-e',`import {replaceDirectory} from ${JSON.stringify(moduleURL)};await replaceDirectory(${JSON.stringify(target)},async()=>{},{checkpoint:async phase=>{if(phase==='locked')process.exit(44)}});`]);
 const [code]=await once(child,'exit');assert.equal(code,44);
 const journal=await readFile(lock,'utf8');await rm(lock);await mkdir(lock);await writeFile(join(lock,'owner.json'),journal);
 assert.equal((await recoverDirectory(target)).recovered,true);
 await mkdir(lock);await assert.rejects(recoverDirectory(target),/missing or invalid/);
 assert.deepEqual(await readdir(lock),[]);await assert.rejects(replaceDirectory(target,populate),/already active/);
});
