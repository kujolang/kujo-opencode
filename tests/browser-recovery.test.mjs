import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,chmod,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {installLensBrowser,lensBrowserStatus,recoverLensBrowser} from '../lib/lens.mjs';
async function fixture(t,{fail=false,diagnostic=''}={}){
 const root=await mkdtemp(join(tmpdir(),'kujo-browser-recovery-'));t.after(()=>rm(root,{recursive:true,force:true}));const bridge=join(root,'bridge'),npm=join(root,'npm-fixture.cjs');
 await mkdir(join(bridge,'node_modules'),{recursive:true});await writeFile(join(bridge,'node_modules/previous'),'old');
 for(const name of ['package.json','package-lock.json'])await writeFile(join(bridge,name),'{}');
 const moduleText=`module.exports={chromium:{executablePath(){return '/nonexistent/fixture-browser'},async launch(){return {async close(){}}}}}`;
 await writeFile(npm,`#!/usr/bin/env node\nconst fs=require('node:fs');if(process.env.PLAYWRIGHT_SKIP_BROWSER_GC!=='1')process.exit(12);if(process.argv[2]==='ci'){fs.mkdirSync('node_modules/playwright-core',{recursive:true});fs.writeFileSync('node_modules/playwright-core/index.js',${JSON.stringify(moduleText)})}else if(${fail}){console.error(${JSON.stringify(diagnostic)});process.exit(13);}`);await chmod(npm,0o755);return {root,bridge,npm:[process.execPath,npm]};
}
test('physical bridge lock excludes aliases and refuses live recovery',async t=>{
 const {root,npm}=await fixture(t),alias=root+'-alias';await symlink(root,alias,'dir');t.after(()=>rm(alias,{force:true}));let release,entered;const held=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
 const first=installLensBrowser(root,{npmCommand:npm,checkpoint:async phase=>{if(phase==='locked'){entered();await held;}}});await ready;
 try{assert.equal((await lensBrowserStatus(alias)).state,'setup_busy_or_interrupted');await assert.rejects(installLensBrowser(alias,{npmCommand:npm}),/already active/);await assert.rejects(recoverLensBrowser(alias),/still running/);}finally{release();}
 assert.equal((await first).ready,true);assert.equal((await recoverLensBrowser(root)).recovered,false);
});
test('browser download failure restores previous dependencies and removes transaction',async t=>{
 const {root,bridge,npm}=await fixture(t,{fail:true});await assert.rejects(installLensBrowser(root,{npmCommand:npm}),{code:'chromium_failed'});assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');assert.deepEqual((await readdir(bridge)).sort(),['node_modules','package-lock.json','package.json']);
});
test('cancel after activation restores previous dependencies',async t=>{
 const {root,bridge,npm}=await fixture(t),controller=new AbortController();await assert.rejects(installLensBrowser(root,{npmCommand:npm,signal:controller.signal,checkpoint:async phase=>{if(phase==='installed')controller.abort();}}));assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');assert.equal((await recoverLensBrowser(root)).recovered,false);
});
test('dead installer after activation requires explicit recovery and permits retry',async t=>{
 const {root,bridge,npm}=await fixture(t),moduleURL=new URL('../lib/lens.mjs',import.meta.url).href;
 const child=spawn(process.execPath,['--input-type=module','-e',`import {installLensBrowser} from ${JSON.stringify(moduleURL)};await installLensBrowser(${JSON.stringify(root)},{npmCommand:${JSON.stringify(npm)},checkpoint:async phase=>{if(phase==='installed')process.exit(42)}});`]);const [code]=await once(child,'exit');assert.equal(code,42);
 assert.equal((await lensBrowserStatus(root)).state,'setup_busy_or_interrupted');assert.equal((await recoverLensBrowser(root)).recovered,true);assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');assert.equal((await installLensBrowser(root,{npmCommand:npm})).ready,true);
});
test('hermetic browser cache is rejected before dependencies change',async t=>{
 const {root,bridge,npm}=await fixture(t),moduleURL=new URL('../lib/lens.mjs',import.meta.url).href;
 const child=spawn(process.execPath,['--input-type=module','-e',`import {installLensBrowser} from ${JSON.stringify(moduleURL)};try{await installLensBrowser(${JSON.stringify(root)},{npmCommand:${JSON.stringify(npm)}});process.exitCode=1}catch(e){if(!e.message.includes('external browser cache'))process.exitCode=2}`],{env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:'0'}});const [code]=await once(child,'exit');assert.equal(code,0);assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');assert.equal((await recoverLensBrowser(root)).recovered,false);
});

test('installer storage and certificate failures preserve the prior install and withhold raw output',async t=>{
 for(const [diagnostic,code] of [['ENOSPC no space left on device private-token-123','install_disk_full'],['SELF_SIGNED_CERT_IN_CHAIN https://user:private-token-123@proxy.invalid','install_certificate']]){
  const {root,bridge,npm}=await fixture(t,{fail:true,diagnostic});
  await assert.rejects(installLensBrowser(root,{npmCommand:npm}),error=>error.code===code&&!error.message.includes('private-token')&&!error.message.includes('proxy.invalid'));
  assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');
  assert.equal((await recoverLensBrowser(root)).recovered,false);
 }
});
test('a missing npm executable gives actionable guidance without replacing dependencies',async t=>{
 const {root,bridge}=await fixture(t);
 await assert.rejects(installLensBrowser(root,{npmCommand:join(root,'missing-npm')}),{code:'install_npm_missing'});
 assert.equal(await readFile(join(bridge,'node_modules/previous'),'utf8'),'old');
});
