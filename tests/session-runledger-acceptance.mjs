import assert from 'node:assert/strict';
import {realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function verifySessionLedger({project,packageRoot,home}){
 project=await realpath(project);
 const {manageSessionLedger}=await import(pathToFileURL(join(packageRoot,'lib/session-runledger.mjs')));
 const {createApp}=await import(pathToFileURL(join(packageRoot,'lib/app.mjs')));
 const {withDataRoot}=await import(pathToFileURL(join(packageRoot,'lib/paths.mjs')));
 return withDataRoot(home,async()=>{
  let approve=false,requests=0;const sessionID='session_canonical_fixture';
  const options={project,sessionID,openApp:createApp,sessionAtProject:async id=>{assert.equal(id,sessionID);return {model:{providerID:'fixture',id:'offline'}};},approve:async metadata=>{requests++;assert.ok(metadata.digest);assert.equal(metadata.input.ledger_dir.includes('..'),false);if(!approve)throw Error('Fixture human rejected');}};
  await assert.rejects(manageSessionLedger({...options,action:'start'}),/human rejected/);
  assert.equal((await manageSessionLedger({...options,action:'status'})).state,'not_started');
  approve=true;const started=await manageSessionLedger({...options,action:'start'});assert.equal(started.state,'in_progress');assert.ok(started.receipt_id);assert.equal(started.record.prompt_file,null);assert.equal(started.record.usage.input_tokens,null);
  // Simulate a caller losing the returned receipt: a fresh app/runtime reads
  // the canonical session record and never starts a duplicate attempt.
  const replay=await manageSessionLedger({...options,action:'start'});assert.equal(replay.run_id,started.run_id);assert.equal(requests,2);
  approve=false;await assert.rejects(manageSessionLedger({...options,action:'finish',status:'partial'}),/human rejected/);assert.equal((await manageSessionLedger({...options,action:'status'})).state,'in_progress');
  approve=true;const finished=await manageSessionLedger({...options,action:'finish',status:'partial'});assert.equal(finished.state,'partial');assert.match(finished.record.verdict,/Human selected partial/);assert.equal(finished.record.model,'offline');assert.equal(requests,4);
  return {run_id:finished.run_id,receipt_id:finished.receipt_id};
 });
}
