import {lifecycleTraceID} from './lifecycle-outbox.mjs';
import {createHash} from 'node:crypto';
import {opendir} from 'node:fs/promises';
import {join} from 'node:path';
import {safeExistingDirectory,safeExistingFile} from './paths.mjs';
import {run} from './process.mjs';
import {principal} from './approvals.mjs';

function sessionKey(sessionID){if(typeof sessionID!=='string'||!sessionID||sessionID.length>160||!/^[A-Za-z0-9_.:-]+$/.test(sessionID))throw Error('Invalid RunLedger session ID');return createHash('sha256').update(sessionID).digest('hex');}
export function sessionLedgerDirectory(sessionID){return `.kujo/opencode-runledger/${sessionKey(sessionID)}`;}
// RunLedger owns records, IDs, git snapshots and verdict persistence. The host
// stores no parallel record model: its session relationship is a stable directory.
export async function sessionLedgerStatus({app,project,sessionID,signal}){
 const ledger_dir=sessionLedgerDirectory(sessionID);let directory;
 try{directory=await safeExistingDirectory(project,`${ledger_dir}/runs`);}catch(error){if(error.code==='ENOENT')return {state:'not_started',ledger_dir};throw error;}
 const files=[];let scanned=0;for await(const entry of await opendir(directory)){if(++scanned>128)throw Error('Session ledger inventory exceeds its inspection limit');if(entry.name.endsWith('.json'))files.push(entry.name);if(files.length>1)break;}
 if(!files.length)return {state:'not_started',ledger_dir};
 if(files.length!==1||! /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(files[0]))throw Error('Session ledger is ambiguous; inspect its canonical records before retrying');
 await safeExistingFile(project,`${ledger_dir}/runs/${files[0]}`);
 const run_id=files[0].slice(0,-5),source=app.config.sources.runledger.path;
 const result=await run(app.config.kujo_bin,['run',join(source,'runledger.kujo'),'--interpreter','--isolated-imports','--','show',run_id,'--json','--ledger',join(project,ledger_dir)],{cwd:project,signal,killTree:true,timeoutMs:15000,maxBytes:524288,env:{...process.env,KUJO_MODULE_PATH:source,KUJO_ISOLATED_IMPORTS:'1'}});
 if(result.exitCode!==0)throw Error('Canonical RunLedger inspection failed; inspect retained evidence before retrying');
 let record;try{record=JSON.parse(result.stdout);}catch{throw Error('Invalid canonical RunLedger response');}
 if(record.id!==run_id||record.task_name!==`OpenCode session ${sessionID}`||record.repo_path!==project||!['in_progress','pass','partial','fail','abandoned'].includes(record.status))throw Error('RunLedger record does not match this session and workspace');
 return {state:record.status,ledger_dir,run_id,record};
}
export async function manageSessionLedger({action,status,sessionID,project,openApp,sessionAtProject,approve,signal,inspect=sessionLedgerStatus}){
 const session=await sessionAtProject(sessionID),app=await openApp(project);
 const before=await inspect({app,project,sessionID,signal});
 if(action==='status')return before;
 if(!['start','finish','correlate'].includes(action))throw Error('Unknown session RunLedger action');
 if(action==='start'&&before.state!=='not_started')return before;
 if(action==='finish'&&before.state!=='in_progress')throw Error('Only an in-progress session run can be finished');
 if(action==='finish'&&!['pass','partial','fail','abandoned'].includes(status))throw Error('Choose an explicit human RunLedger verdict');
 if(action==='start'&&(!session.model?.providerID||!session.model?.id))throw Error('Select an OpenCode model before starting this session run');
 if(action==='correlate'&&before.state==='not_started')throw Error('Start a session run before linking Watchdog');
 const trace=lifecycleTraceID(project,sessionID);
 if(action==='correlate'&&before.record?.correlation?.watchdog_trace_id===trace)return before;
 if(action==='correlate'&&before.record?.correlation?.watchdog_trace_id)throw Error('This run already links a different Watchdog trace; inspect the canonical record');
 const abilityId=action==='correlate'?'kujo.opencode.runledger.correlate':action==='start'?'kujo.runledger.runs.start':'kujo.runledger.runs.finish';
 const item=app.runtime.describe().find(item=>item.definition.id===abilityId);
 if(!item)throw Error('Enable RunLedger start and finish in /kujo → Manage individual capabilities, or choose the Ship or Full profile');
 const input=action==='correlate'?{path:'.',run_id:before.run_id,watchdog_trace_id:trace,ledger_dir:before.ledger_dir}:action==='start'?{path:'.',provider:session.model.providerID,model:session.model.id,task:`OpenCode session ${sessionID}`,ledger_dir:before.ledger_dir}:{path:'.',run_id:before.run_id,status,verdict:`Human selected ${status} for this OpenCode session.`,ledger_dir:before.ledger_dir};
 const identity=`opencode-session-runledger:${sessionKey(sessionID)}:${action}`;
 const controls={principal,host:'opencode',surface:'plugin',sessionId:sessionID,invocationId:identity,idempotencyKey:identity};
 let result=await app.runtime.execute({abilityId,input,controls,signal});
 if(result.code==='ability_approval_required'){
  await approve({sessionID,ability:abilityId,digest:item.definitionDigest,input,effects:item.definition.effects,invocation:identity});
  signal?.throwIfAborted();await sessionAtProject(sessionID);
  const after=await openApp(project),active=after.runtime.describe().find(candidate=>candidate.definition.id===abilityId&&candidate.definitionDigest===item.definitionDigest);
  if(!active)throw Error('RunLedger capability changed during approval; nothing executed');
  const current=await inspect({app:after,project,sessionID,signal});
  if(current.state!==before.state||current.run_id!==before.run_id||current.record?.correlation?.watchdog_trace_id!==before.record?.correlation?.watchdog_trace_id)throw Error('Session ledger changed during approval; inspect it before retrying');
  const grant=await after.runtime.requestApproval({abilityId,input,invocationId:identity,principal});
  result=await after.runtime.execute({abilityId,input,controls:{...controls,approvalId:grant.approval_id},signal});
 }
 if(!result.ok)return {state:'attention',ledger_dir:before.ledger_dir,code:result.code,receipt_id:result.receipt?.receipt_id,message:'Inspect session records and retained evidence before retrying. An uncertain operation is never automatically repeated.'};
 return {...await inspect({app:await openApp(project),project,sessionID,signal}),receipt_id:result.receipt?.receipt_id};
}
