import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compareReceipts,queryEvidence,evidenceSummary,previewArtifact} from '../lib/evidence.mjs';
const receipt=(id,project,session,time=1)=>({schema:'kujo.ability.receipt/v1',receipt_id:id,completed_at_ms:time,metadata:{project_root:project,session_id:session},result:{secret:'not in summary'},error:null});
test('retained evidence filters project/session, separates legacy and includes archives',async()=>{
 const root=await mkdtemp(join(tmpdir(),'kujo-evidence-'));const path=join(root,'receipts.jsonl');
 await writeFile(path,[receipt('a','/a','one',3),receipt('b','/b','one',4),receipt('legacy',undefined,'one',5),receipt('c','/a','two',2)].map(JSON.stringify).join('\n')+'\nbroken\n');
 await writeFile(path+'.1',JSON.stringify(receipt('archived','/a','one',1))+'\n');
 const project=await queryEvidence({path,project:'/a'});assert.deepEqual(project.receipts.map(r=>r.receipt_id),['a','c','archived']);assert.equal(project.invalid_records,1);assert.match(project.coverage,/Older/);
 const session=await queryEvidence({path,project:'/a',scope:'session',sessionID:'one'});assert.deepEqual(session.receipts.map(r=>r.receipt_id),['a','archived']);
 assert.deepEqual((await queryEvidence({path,project:'/a',scope:'legacy'})).receipts.map(r=>r.receipt_id),['legacy']);
 assert.equal((await queryEvidence({path,project:'/a',receiptID:'b'})).receipts.length,0);
 assert.deepEqual(evidenceSummary(project.receipts[0]).result,{omitted:true});
 await assert.rejects(queryEvidence({path,project:'/a',scope:'session'}),/session/);
});
test('artifact previews are bounded, distinguish directories and reject escapes/symlinks',async()=>{
 const root=await mkdtemp(join(tmpdir(),'kujo-artifact-'));const project=join(root,'project');await mkdir(project);
 await writeFile(join(project,'text'),'x'.repeat(70000));const value=await previewArtifact(project,'text');assert.equal(value.content.length,65536);assert.equal(value.truncated,true);assert.match(value.notice,/not immutable/);
 await writeFile(join(project,'binary'),Buffer.from([0,1,2]));await assert.rejects(previewArtifact(project,'binary'),/Binary/);
 await writeFile(join(root,'outside'),'private');await assert.rejects(previewArtifact(project,'../outside'));
 await symlink(join(root,'outside'),join(project,'link'));await assert.rejects(previewArtifact(project,'link'));
 const folder=join(project,'folder');await mkdir(folder);for(let i=0;i<55;i++)await writeFile(join(folder,String(i)),'');
 const directory=await previewArtifact(project,'folder');assert.equal(directory.entries.length,50);assert.equal(directory.truncated,true);
 await assert.rejects(previewArtifact(project,'missing'));
});

test('comparison reports recorded differences without claiming quality',()=>{
 const left={...receipt('left','/a','one'),ability_id:'check',definition_digest:'a',status:'failed',duration_ms:10};
 const right={...left,receipt_id:'right',status:'succeeded',duration_ms:15,result:{changed:true}};
 const result=compareReceipts(left,right);assert.equal(result.same_ability,true);assert.equal(result.duration_ms.delta,5);assert.equal(result.serialized_result_equal,false);assert.match(result.notice,/not correctness/);
});
