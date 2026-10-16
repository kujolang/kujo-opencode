import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {previewExecution,executeSource} from '../lib/source-execution.mjs';
const binary=resolveKujoBinary();
const root=()=>mkdtemp(join(tmpdir(),'kujo-execute-'));
test('reviewed source executes canonical runtime from retained snapshot and rejects changed bytes',async()=>{
 const project=await root();await writeFile(join(project,'main.kujo'),'println("reviewed")\nwrite_file("output.txt", "result")\n');
 const preview=await previewExecution({project,binary,input:{mode:'run',entry:'main.kujo',files:['main.kujo']}});
 await assert.rejects(readFile(join(project,'output.txt')),{code:'ENOENT'});
 const result=await executeSource({project,binary,input:preview.execution_input});assert.match(result.stdout,/reviewed/);assert.equal(result.passed,true);assert.equal(await readFile(join(result.artifacts[0],'output.txt'),'utf8'),'result');await assert.rejects(readFile(join(project,'output.txt')),{code:'ENOENT'});
 await writeFile(join(project,'main.kujo'),'println("changed")');await assert.rejects(executeSource({project,binary,input:preview.execution_input}),{code:'kujo_source_changed'});
});
test('canonical test command preserves passing and failing snapshot evidence',async()=>{
 const project=await root();await mkdir(join(project,'tests'));await mkdir(join(project,'src'));await writeFile(join(project,'src/helper.kujo'),'export func greeting() { return "expected" }\n');await writeFile(join(project,'tests/smoke.kujo'),'from src.helper import greeting\nprintln(greeting())\n');await writeFile(join(project,'tests/smoke.out'),'expected\n');
 const input={mode:'test',files:['tests/smoke.kujo','tests/smoke.out','src/helper.kujo']};
 const preview=await previewExecution({project,binary,input});const result=await executeSource({project,binary,input:preview.execution_input});assert.equal(result.passed,true);
 await writeFile(join(project,'tests/smoke.out'),'wrong\n');const failed=await previewExecution({project,binary,input});await assert.rejects(executeSource({project,binary,input:failed.execution_input}),error=>error.code==='kujo_source_execution_failed'&&error.details.exit_code!==0&&error.details.artifacts.length===1);
});
test('execution rejects path escapes, symlinks, duplicates and cancellation before creating outputs',async()=>{
 const project=await root();await writeFile(join(project,'main.kujo'),'println("safe")');await symlink(join(project,'main.kujo'),join(project,'link.kujo'));
 for(const files of [['../main.kujo'],['link.kujo'],['main.kujo','main.kujo']])await assert.rejects(previewExecution({project,binary,input:{mode:'run',entry:files[0],files}}));
 const plan=await previewExecution({project,binary,input:{mode:'run',entry:'main.kujo',files:['main.kujo']}});const controller=new AbortController();controller.abort();await assert.rejects(executeSource({project,binary,input:plan.execution_input,signal:controller.signal}));
 await assert.rejects(readFile(join(project,'.kujo/executions')),{code:'ENOENT'});
});

test('runtime digest changes cannot execute and failing programs retain output evidence',async()=>{
 const project=await root();await writeFile(join(project,'main.kujo'),'println("before failure")\nexit(7)\n');
 const plan=await previewExecution({project,binary,input:{mode:'run',entry:'main.kujo',files:['main.kujo']}});
 await assert.rejects(executeSource({project,binary,input:{...plan.execution_input,runtime_sha256:'0'.repeat(64)}}),{code:'kujo_runtime_changed'});
 await assert.rejects(executeSource({project,binary,input:plan.execution_input}),error=>error.code==='kujo_source_execution_failed'&&error.details.exit_code===7&&error.details.stdout.includes('before failure'));
});
test('cancelled process supervision terminates descendants before they can write later',async()=>{
 const {run}=await import('../lib/process.mjs');const {setTimeout:delay}=await import('node:timers/promises');const project=await root();const ready=join(project,'ready'),leak=join(project,'leak');
 const childCode=`const fs=require('fs');fs.writeFileSync(${JSON.stringify(ready)},'ready');setTimeout(()=>fs.writeFileSync(${JSON.stringify(leak)},'leak'),1000);`;
 const parentCode=`require('child_process').spawn(process.execPath,['-e',${JSON.stringify(childCode)}],{stdio:'ignore'});setInterval(()=>{},1000);`;
 const controller=new AbortController();const running=run(process.execPath,['-e',parentCode],{killTree:true,signal:controller.signal,timeoutMs:5000});const outcome=running.catch(error=>error);
 let started=false;for(let i=0;i<100;i++){try{await readFile(ready);started=true;break;}catch{await delay(20);}}
 controller.abort();assert.equal((await outcome).name,'AbortError');assert.equal(started,true);await delay(1100);await assert.rejects(readFile(leak),{code:'ENOENT'});
});

test('only explicitly selected imports are available to the reviewed run',async()=>{
 const project=await root();await mkdir(join(project,'src'));await writeFile(join(project,'main.kujo'),'from src.helper import greeting\nprintln(greeting())\n');await writeFile(join(project,'src/helper.kujo'),'export func greeting() { return "imported" }\n');
 const omitted=await previewExecution({project,binary,input:{mode:'run',entry:'main.kujo',files:['main.kujo']}});await assert.rejects(executeSource({project,binary,input:omitted.execution_input}),{code:'kujo_source_execution_failed'});
 const included=await previewExecution({project,binary,input:{mode:'run',entry:'main.kujo',files:['main.kujo','src/helper.kujo']}});assert.match((await executeSource({project,binary,input:included.execution_input})).stdout,/imported/);
});


test('test snapshots reject missing expectations and nested-only or entirely skipped suites',async()=>{
 const project=await root();await mkdir(join(project,'tests/nested'),{recursive:true});
 await writeFile(join(project,'tests/smoke.kujo'),'println("actual")\n');
 await writeFile(join(project,'tests/nested/smoke.kujo'),'println("nested")\n');
 await assert.rejects(previewExecution({project,binary,input:{mode:'test',files:['tests/smoke.kujo']}}),/reviewed expected output/);
 await assert.rejects(previewExecution({project,binary,input:{mode:'test',files:['tests/nested/smoke.kujo']}}),/top-level/);
 await writeFile(join(project,'tests/smoke.interpreter.out'),'actual\n');
 const input={mode:'test',files:['tests/smoke.kujo','tests/smoke.interpreter.out']};
 const plan=await previewExecution({project,binary,input});assert.equal((await executeSource({project,binary,input:plan.execution_input})).passed,true);
 await writeFile(join(project,'tests/smoke.kujo'),'# Inventory: skip\nprintln("actual")\n');
 const skipped=await previewExecution({project,binary,input});await assert.rejects(executeSource({project,binary,input:skipped.execution_input}),error=>error.code==='kujo_source_execution_failed'&&error.message.includes('no fixtures')&&error.details.artifacts.length===1);
});
