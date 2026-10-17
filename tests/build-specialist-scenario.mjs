import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir,realpath} from 'node:fs/promises';
import {join,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=text=>createHash('sha256').update(text).digest('hex');

// Shared assertions for the real agent journey and canonical-runtime preflight.
// The preflight does not certify model behavior, native approval or receipts.
export async function* buildScenario(project) {
 const helper='src/specialist_helper.kujo',testFile='tests/specialist_build.kujo',expected='tests/specialist_build.out';
 const original='export func greeting() { return "reviewed import" }\n';
 const sources={[helper]:original,[testFile]:'from src.specialist_helper import greeting\nprintln(greeting())\n',[expected]:'reviewed import\n'};
 for(const directory of ['src','tests'])await mkdir(join(project,directory),{recursive:true});
 for(const [path,text] of Object.entries(sources))await writeFile(join(project,path),text,{flag:'wx'});
 const inventory=async()=>{try{return (await readdir(join(project,'.kujo/executions'))).sort();}catch(error){if(error.code==='ENOENT')return [];throw error;}};
 const sourceUnchanged=async()=>assert.equal(await readFile(join(project,helper),'utf8'),original);
 yield {ability:'kujo.opencode.source.inspect',tool:'kujo_source_inspect',input:{file:helper},after:async receipt=>{
  assert.equal(receipt.result.valid,true);assert.equal(receipt.result.sha256,hash(original));assert.equal(receipt.result.executed_program,false);await sourceUnchanged();
 }};
 yield {ability:'kujo.opencode.source.format',tool:'kujo_source_format',input:{file:helper},after:async receipt=>{
  assert.equal(receipt.result.modified_source,false);assert.equal(receipt.result.sha256,hash(original));assert.equal(receipt.result.format.diagnostics.options.write,false);await sourceUnchanged();
 }};
 let reviewed;
 const preview=()=>({ability:'kujo.opencode.source.preview',tool:'kujo_source_preview',input:{mode:'test',files:[testFile,expected,helper]},after:async receipt=>{
  reviewed=receipt.result.execution_input;assert.equal(reviewed.mode,'test');assert.match(reviewed.runtime_sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(reviewed.files.map(item=>item.path),[testFile,expected,helper]);
  for(const file of reviewed.files)assert.equal(file.sha256,hash(await readFile(join(project,file.path))));
  assert.ok(receipt.result.files.every(file=>file.preview_truncated===false));
 }});
 yield preview();
 const before=await inventory();
 yield {ability:'kujo.opencode.source.execute',tool:'kujo_source_execute',input:reviewed,decision:'reject',beforeDecision:async()=>assert.deepEqual(await inventory(),before),after:async()=>{assert.deepEqual(await inventory(),before);await sourceUnchanged();}};
 async function snapshot(result){
  assert.equal(result.artifacts.length,1);const directory=await realpath(result.artifacts[0]);
  const rel=relative(await realpath(join(project,'.kujo/executions')),directory);assert.ok(rel&&!isAbsolute(rel)&&!rel.startsWith('..'));
  assert.deepEqual(result.files,reviewed.files);
  for(const file of reviewed.files)assert.equal(hash(await readFile(join(directory,file.path))),file.sha256);
 }
 yield {ability:'kujo.opencode.source.execute',tool:'kujo_source_execute',input:reviewed,decision:'once',beforeDecision:async()=>assert.deepEqual(await inventory(),before),after:async receipt=>{
  assert.equal(receipt.result.passed,true);assert.equal(receipt.result.exit_code,0);await snapshot(receipt.result);await sourceUnchanged();
 }};
 // Change one reviewed import while the exact old execution input is retained.
 // The program must not start, even after a separate native grant.
 const afterSuccess=await inventory();
 await writeFile(join(project,helper),'export func greeting() { return "changed import" }\n');
 yield {ability:'kujo.opencode.source.execute',tool:'kujo_source_execute',input:reviewed,decision:'once',expectedStatus:'failed',beforeDecision:async()=>assert.deepEqual(await inventory(),afterSuccess),after:async receipt=>{
  assert.equal(receipt.error.code,'kujo_source_changed');assert.deepEqual(await inventory(),afterSuccess);
 }};
 // A fresh preview acknowledges the changed import. Its old expected output
 // now intentionally fails; retain the actual diagnostics and snapshot.
 yield preview();
 yield {ability:'kujo.opencode.source.execute',tool:'kujo_source_execute',input:reviewed,decision:'once',expectedStatus:'failed',beforeDecision:async()=>assert.deepEqual(await inventory(),afterSuccess),after:async receipt=>{
  assert.equal(receipt.error.code,'kujo_source_execution_failed');const result=receipt.error.details;
  assert.equal(result.passed,false);assert.notEqual(result.exit_code,0);assert.ok(result.stdout.length+result.stderr.length>0);await snapshot(result);
 }};
}
