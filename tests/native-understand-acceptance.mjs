import assert from 'node:assert/strict';
import {access,readFile,readdir,writeFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {specialistSession,specialistStep} from './native-specialist-runner.mjs';

export async function nativeUnderstandAcceptance({api,project,dataRoot,model,interrupt}) {
 project=await realpath(project);
 await writeFile(join(project,'understand-fixture.kujo'),'// Acceptance fixture: deterministic local greeting.\nprintln("understand fixture")\n');
 const session=await specialistSession({api,project,model,agent:'kujo-understand'});
 const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
 const absent=path=>assert.rejects(access(join(project,path)),{code:'ENOENT'});
 const run=step=>specialistStep({api,session,receipts,step,interrupt});
 const evidence=[];
 const output='.kujo/understand-scout',scout={path:'.',quick:true,output_dir:output};
 await absent(output);
 evidence.push(await run({ability:'kujo.scout.repository.inspect',tool:'kujo_scout_inspect',input:scout,decision:'reject',beforeDecision:()=>absent(output),after:()=>absent(output)}));
 evidence.push(await run({ability:'kujo.scout.repository.inspect',tool:'kujo_scout_inspect',input:scout,decision:'once',beforeDecision:()=>absent(output),after:async receipt=>{
  assert.deepEqual(receipt.result.artifacts,[join(project,output)]);
  const directories=await readdir(join(project,output));assert.equal(directories.length,1);
  const manifest=JSON.parse(await readFile(join(project,output,directories[0],'scan_manifest.json'),'utf8'));
  assert.equal(manifest.tool.name,'scout');assert.equal(manifest.schema_version,1);assert.ok(manifest.artifacts&&typeof manifest.artifacts==='object');assert.ok(Object.keys(manifest.artifacts).length>0);
 }}));
 const task='Explain understand-fixture.kujo and identify what this tiny fixture does not test';
 const scent={path:'.',task,budget:4000,dry_run:true};await absent('.kujo/scent');
 // The canonical Ability declares output effects even for dry-run, so retain
 // normal native approval rather than inventing a host policy exception.
 evidence.push(await run({ability:'kujo.scent.context.pack',tool:'kujo_scent_pack',input:scent,decision:'once',beforeDecision:()=>absent('.kujo/scent'),after:()=>absent('.kujo/scent')}));
 evidence.push(await run({ability:'kujo.scent.context.pack',tool:'kujo_scent_pack',input:{...scent,dry_run:false},decision:'once',beforeDecision:()=>absent('.kujo/scent'),after:async receipt=>{
  assert.deepEqual(receipt.result.artifacts,[join(project,'.kujo/scent')]);
  const context=JSON.parse(await readFile(join(project,'.kujo/scent/context.json'),'utf8'));
  assert.equal(context.task,task);assert.equal(context.budget,4000);assert.equal(context.target,'generic');assert.ok(Array.isArray(context.selected_files));
  JSON.parse(await readFile(join(project,'.kujo/scent/redactions.json'),'utf8'));
 }}));
 const invalid='.missing-understand-scope';await absent(invalid);
 evidence.push(await run({ability:'kujo.scout.repository.inspect',tool:'kujo_scout_inspect',input:{path:invalid,quick:true,output_dir:'.kujo/no-output'},decision:'once',expectedStatus:'failed',beforeDecision:()=>absent(invalid),after:async receipt=>{assert.ok(receipt.error?.code);await absent(invalid);}}));
 return {agent:session.agent,model,session_id:session.id,scope:'canonical Scout/Scent fixture; not repository safety certification',steps:evidence};
}
