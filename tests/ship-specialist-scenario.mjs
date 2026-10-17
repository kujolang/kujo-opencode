import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export async function* shipScenario(project,{provider='canonical-preflight',model='no-model'}={}) {
 const path='specialist-ship',root=join(project,path);await mkdir(root);
 await writeFile(join(root,'evidence.txt'),'Verified fixture output\n',{flag:'wx'});
 const suite=target=>({name:'ship-fixture',description:'One deterministic local file check',tests:[{name:'Expected artifact exists',check:'file_exists',params:{path:target}}]});
 await writeFile(join(root,'pass.json'),JSON.stringify(suite('evidence.txt')),{flag:'wx'});
 await writeFile(join(root,'fail.json'),JSON.stringify(suite('missing.txt')),{flag:'wx'});
 const absent=async name=>assert.equal(await stat(join(root,name)).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}),false);
 let runID,evalID;
 yield {ability:'kujo.shipcheck.repository.scan',tool:'kujo_shipcheck_scan',input:{path},after:async receipt=>{const report=receipt.result.structured;assert.equal(report.tool,'shipcheck');assert.equal(Boolean(report.summary.gate_passed),false);assert.equal(receipt.result.exit_code,0);}};
 yield {ability:'kujo.runledger.runs.start',tool:'kujo_runledger_start',input:{path,provider,model,task:'Ship acceptance: actual Eval outcomes; no publication',ledger_dir:'.runledger'},decision:'once',beforeDecision:()=>absent('.runledger'),after:async receipt=>{runID=receipt.result.run_id;assert.ok(runID);const record=JSON.parse(await readFile(join(root,'.runledger/runs',runID+'.json'),'utf8'));assert.equal(record.status,'in_progress');}};
 const evaluation={ability:'kujo.eval.suite.run',tool:'kujo_eval_run'};
 yield {...evaluation,input:{path,config:'pass.json',output_dir:'rejected-eval'},decision:'reject',beforeDecision:()=>absent('rejected-eval'),after:()=>absent('rejected-eval')};
 for(const [config,output,status] of [['pass.json','passed-eval','succeeded'],['fail.json','failed-eval','failed']])yield {...evaluation,input:{path,config,output_dir:output},decision:'once',expectedStatus:status,beforeDecision:()=>absent(output),after:async receipt=>{
  if(status==='failed'){assert.equal(receipt.error.code,'kujo_command_failed');assert.notEqual(receipt.error.details.exit_code,0);}else assert.equal(receipt.result.exit_code,0);
  const summary=JSON.parse(await readFile(join(root,output,'summary.json'),'utf8'));assert.equal(summary.total,1);assert.equal(summary.failed,status==='failed'?1:0);assert.equal(summary.passed,status==='failed'?0:1);
  const evidence=JSON.parse(await readFile(join(root,output,'evaluation-result.json'),'utf8'));assert.equal(evidence.verdict,status==='failed'?'fail':'pass');assert.ok(evidence.subject.run_id);
  for(const ref of evidence.evidence_refs){const file=ref.kind==='eval.summary'?'summary.json':ref.kind==='eval.last_run'?'last_run.json':ref.kind==='eval.report'?'eval-report.md':null;if(file)assert.equal(createHash('sha256').update(await readFile(join(root,output,file))).digest('hex'),ref.integrity.sha256);}
  if(status==='failed')evalID=evidence.subject.run_id;
 }};
 yield {ability:'kujo.opencode.runledger.correlate',tool:'kujo_runledger_correlate',input:{path,run_id:runID,eval_run_id:evalID,ledger_dir:'.runledger'},decision:'once',beforeDecision:async()=>assert.equal(JSON.parse(await readFile(join(root,'.runledger/runs',runID+'.json'),'utf8')).status,'in_progress'),after:async()=>{const record=JSON.parse(await readFile(join(root,'.runledger/runs',runID+'.json'),'utf8'));assert.equal(record.correlation.eval_run_id,evalID);assert.equal(record.status,'in_progress');assert.ok(!record.verdict);}};
 yield {ability:'kujo.runledger.runs.finish',tool:'kujo_runledger_finish',input:{path,run_id:runID,status:'fail',verdict:'Fixture Eval failed. ShipCheck scan is informational. No release authorized or published.',ledger_dir:'.runledger'},decision:'once',beforeDecision:async()=>assert.equal(JSON.parse(await readFile(join(root,'.runledger/runs',runID+'.json'),'utf8')).status,'in_progress'),after:async()=>assert.equal(JSON.parse(await readFile(join(root,'.runledger/runs',runID+'.json'),'utf8')).status,'fail')};
 yield {ability:'kujo.runledger.runs.report',tool:'kujo_runledger_report',input:{path},after:async receipt=>assert.match(receipt.result.stdout,/fail/)};
}
