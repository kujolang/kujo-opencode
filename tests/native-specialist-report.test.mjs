import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpecialistReport,specialistReport} from './native-specialist-report.mjs';
const steps=[{ability:'scan',decision:'none',expected_status:'failed',receipt_ids:['failed-receipt'],terminal_receipt:'failed-receipt'},{ability:'run',decision:'reject',receipt_ids:['pending'],terminal_receipt:null}];
const report=()=>({operations:[{ability:'scan',outcome:'failed',receipt_ids:['failed-receipt'],explanation:'Scan failed'},{ability:'run',outcome:'rejected',receipt_ids:['pending'],explanation:'Human declined'}],limitations:'No release was published'});
test('report retains failed and rejected evidence',()=>assert.equal(validateSpecialistReport(JSON.stringify(report()),steps).operations.length,2));
for(const [name,change] of [
 ['fabricated citation',r=>r.operations[0].receipt_ids=['invented']],
 ['unrelated citation',r=>r.operations[0].receipt_ids=['pending']],
 ['hidden failure',r=>r.operations[0].outcome='succeeded'],
 ['hidden rejection',r=>r.operations[1].outcome='succeeded'],
 ['omitted operation',r=>r.operations.pop()],
 ['missing limitations',r=>r.limitations='']
])test(name,()=>{const r=report();change(r);assert.throws(()=>validateSpecialistReport(JSON.stringify(r),steps));});
for(const effect of ['permission','receipt','tool'])test(`report refuses unexpected ${effect}`,async()=>{
 let prompted=false,stopped=false;
 const api=async path=>{
  if(path.endsWith('/prompt')){prompted=true;return {};}
  if(path.endsWith('/permission'))return {data:prompted&&effect==='permission'?[{id:'denied'}]:[]};
  if(path.includes('/message'))return {data:prompted?[{id:'new',type:'assistant',agent:'kujo-ship',model:{providerID:'provider',id:'model'},content:effect==='tool'?[{type:'tool'}]:[{type:'text',text:JSON.stringify(report())}]}]:[]};
  return {};
 };
 await assert.rejects(specialistReport({api,journey:{session_id:'owned',agent:'kujo-ship',model:'provider/model',steps},receipts:async()=>prompted&&effect==='receipt'?[{receipt_id:'unexpected',metadata:{session_id:'owned'}}]:[],interrupt:async()=>{stopped=true;},pollMs:0}));
 assert.ok(stopped);
});
test('live report uses only new model text and preserves evidence',async()=>{
 let prompted=false;
 const old={id:'old',type:'assistant',content:[{type:'text',text:'not a report'}]};
 const api=async path=>{
  if(path.endsWith('/prompt')){prompted=true;return {};}
  if(path.endsWith('/permission'))return {data:[]};
  if(path.includes('/message'))return {data:[old,...(prompted?[{id:'new',type:'assistant',agent:'kujo-ship',model:{providerID:'provider',id:'model'},content:[{type:'reasoning',text:'excluded'},{type:'text',text:JSON.stringify(report())}]}]:[])]};
  return {};
 };
 const result=await specialistReport({api,journey:{session_id:'owned',agent:'kujo-ship',model:'provider/model',steps},receipts:async()=>[],interrupt:async()=>assert.fail('Successful report must not interrupt'),pollMs:0});
 assert.deepEqual(result.message_ids,['new']);assert.equal(result.operations[0].outcome,'failed');
});
