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
  approve=false;await assert.rejects(manageSessionLedger({...options,action:'correlate'}),/human rejected/);approve=true;const linked=await manageSessionLedger({...options,action:'correlate'});assert.match(linked.record.correlation.watchdog_trace_id,/^[a-f0-9]{32}$/);assert.equal(linked.state,'in_progress');const requestCount=requests;await manageSessionLedger({...options,action:'correlate'});assert.equal(requests,requestCount);
  const {SessionCorrelation}=await import(pathToFileURL(join(packageRoot,'lib/session-correlation.mjs')));const correlation=new SessionCorrelation({project,openApp:createApp});assert.equal(await correlation.resolve(sessionID),started.run_id);
  approve=false;await assert.rejects(manageSessionLedger({...options,action:'finish',status:'partial'}),/human rejected/);assert.equal((await manageSessionLedger({...options,action:'status'})).state,'in_progress');
  approve=true;const finished=await manageSessionLedger({...options,action:'finish',status:'partial'});assert.equal(finished.state,'partial');assert.match(finished.record.verdict,/Human selected partial/);assert.equal(finished.record.model,'offline');assert.equal(requests,6);
  const {AutomaticLedger}=await import(pathToFileURL(join(packageRoot,'lib/automatic-ledger.mjs')));
  const autoSession='session_auto_acceptance';let autoApprovals=0,allowAuto=false,reminders=0;
  const autoOptions={project,openApp:createApp,sessionAtProject:async id=>{assert.equal(id,autoSession);return {model:{providerID:'fixture',id:'offline'}};},approve:async()=>{autoApprovals++;if(!allowAuto)throw Error('Human rejected automatic start');}};
  const tracking={home,project,enabled:true,isCurrent:async()=>true,manage:input=>manageSessionLedger({...autoOptions,...input}),notify:async()=>{reminders++;}};
  let automatic=new AutomaticLedger(tracking);await automatic.before(autoSession);automatic.close();automatic=new AutomaticLedger(tracking);await automatic.before(autoSession);assert.equal(autoApprovals,1);
  await automatic.reset();automatic.close();allowAuto=true;automatic=new AutomaticLedger(tracking);await automatic.before(autoSession);assert.equal(autoApprovals,2);
  assert.equal((await manageSessionLedger({...autoOptions,sessionID:autoSession,action:'status'})).state,'in_progress');
  const priorReminders=reminders;await automatic.idle(autoSession);automatic.close();automatic=new AutomaticLedger(tracking);await automatic.idle(autoSession);assert.equal(reminders,priorReminders+1);automatic.close();
  const autoFinished=await manageSessionLedger({...autoOptions,sessionID:autoSession,action:'finish',status:'partial'});assert.equal(autoFinished.state,'partial');
  return {run_id:finished.run_id,receipt_id:finished.receipt_id};
 });
}
