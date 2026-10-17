import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export async function* reviewScenario(project) {
 const path='specialist-review',root=join(project,path);await mkdir(root);
 const git=async args=>(await exec('git',args,{cwd:root,timeout:15000})).stdout;
 await git(['init','-q']);await mkdir(join(root,'.git/no-hooks')); 
 const files={'review-fixture.md':'# Review fixture\nOriginal behavior.\n','valid.spec.json':JSON.stringify({name:'Review fixture',goal:'Explain the actual diff without editing it.',acceptance_criteria:['Changed file is reported','Source remains unchanged']}),'invalid.spec.json':JSON.stringify({name:'Missing goal'})};
 for(const [name,text] of Object.entries(files))await writeFile(join(root,name),text,{flag:'wx'});
 await git(['add','--',...Object.keys(files)]);
 await git(['-c','user.name=Acceptance fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c',`core.hooksPath=${join(root,'.git/no-hooks')}`,'commit','-qm','Private review baseline']);
 await writeFile(join(root,'review-fixture.md'),'# Review fixture\nChanged behavior with an explicit limitation.\n');
 const expectedDiff=await git(['diff','--binary','HEAD']);assert.match(expectedDiff,/Changed behavior/);
 const unchanged=async()=>{assert.equal(await git(['diff','--binary','HEAD']),expectedDiff);for(const name of ['valid.spec.json','invalid.spec.json'])assert.equal(await readFile(join(root,name),'utf8'),files[name]);};
 yield {ability:'kujo.patchbrief.changes.summarize',tool:'kujo_patchbrief_summarize',input:{path,format:'json'},after:async receipt=>{
  const result=receipt.result.structured;assert.equal(result.tool,'patchbrief');assert.equal(result.summary.files_changed,1);assert.equal(result.analysis.diff_error,false);assert.equal(result.analysis.diff_truncated,false);assert.deepEqual(result.files.map(file=>file.path),['review-fixture.md']);await unchanged();
 }};
 yield {ability:'kujo.changebucket.changes.measure',tool:'kujo_changebucket_measure',input:{path,base:'HEAD'},after:async receipt=>{
  const result=receipt.result.structured;assert.equal(result.summary.files_changed,1);assert.deepEqual(result.files.map(file=>file.path),['review-fixture.md']);await unchanged();
 }};
 yield {ability:'kujo.spec.contract.validate',tool:'kujo_spec_validate',input:{path,file:'valid.spec.json',strict:false},after:async receipt=>{assert.equal(receipt.result.structured.valid,true);await unchanged();}};
 yield {ability:'kujo.spec.contract.validate',tool:'kujo_spec_validate',input:{path,file:'invalid.spec.json',strict:true},expectedStatus:'failed',after:async receipt=>{
  assert.equal(receipt.error.code,'kujo_command_failed');assert.notEqual(receipt.error.details.exit_code,0);assert.equal(JSON.parse(receipt.error.details.stdout).valid,false);await unchanged();
 }};
}
