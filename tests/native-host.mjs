import {verifyCandidate} from '../scripts/release-candidate.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const exec=promisify(execFile),repo=resolve('.');
const journey=process.env.KUJO_TEST_JOURNEY;
const specialistNames=['understand','build','review','browser','workflow','ship'];
const selectedJourneys=journey==='all'?specialistNames:journey?journey.split(','):[];
const dispatchTransportEnabled=process.env.KUJO_TEST_DISPATCH_TRANSPORT==='1';
if(dispatchTransportEnabled){assert.ok(process.env.KUJO_TEST_MODEL&&!process.env.KUJO_TEST_AGENT&&!journey,'Dispatch transport requires an explicit model and its own Build session');for(const flag of ['KUJO_TEST_GUARD','KUJO_TEST_TELEMETRY','KUJO_TEST_CANCEL_TELEMETRY','KUJO_TEST_AUTOTRACK'])assert.notEqual(process.env[flag],'1','Run transport and lifecycle checks separately');}
if(journey){assert.ok(selectedJourneys.length>0&&selectedJourneys.length<=6&&new Set(selectedJourneys).size===selectedJourneys.length&&selectedJourneys.every(name=>specialistNames.includes(name)),'Only unique implemented specialist journeys may run');assert.ok(process.env.KUJO_TEST_MODEL&&!process.env.KUJO_TEST_AGENT,'Journey needs an explicit model and owns its specialist identity');for(const flag of ['KUJO_TEST_GUARD','KUJO_TEST_TELEMETRY','KUJO_TEST_CANCEL_TELEMETRY','KUJO_TEST_AUTOTRACK'])assert.notEqual(process.env[flag],'1','Run specialist and lifecycle acceptance separately');}
if(process.env.KUJO_TEST_TELEMETRY==='1'||process.env.KUJO_TEST_CANCEL_TELEMETRY==='1')assert.ok(process.env.KUJO_TEST_MODEL&&!process.env.KUJO_TEST_AGENT,'Telemetry acceptance needs an explicit model and ordinary Build agent');
if(process.env.KUJO_TEST_GUARD==='1')assert.ok(process.env.KUJO_TEST_MODEL&&!process.env.KUJO_TEST_AGENT,'Guard acceptance needs an explicit model and ordinary Build agent');
const root=await mkdtemp(join(tmpdir(),'kujo-native-host-'));console.log(`Native fixture: ${root}`);const project=join(root,'project');await mkdir(project);
if(process.env.GITHUB_OUTPUT)await (await import('node:fs/promises')).appendFile(process.env.GITHUB_OUTPUT,`fixture=${root}\n`);
await exec('git',['init',project]);
const env={...process.env,KUJO_OPENCODE_HOME:join(root,'kujo')};
const candidate=process.env.KUJO_TEST_RELEASE_DIR?await verifyCandidate(process.env.KUJO_TEST_RELEASE_DIR):null;
const pinned=Boolean(candidate)||process.env.KUJO_TEST_PINNED==='1';
let setupCLI=join(repo,'bin/kujo-opencode.mjs');
if(pinned)for(const key of ['KUJO_BIN','KUJO_SOURCE_ROOT','KUJO_OPENCODE_PROJECT','NODE_PATH'])delete env[key];
if(candidate){
 assert.ok(process.env.npm_execpath,'Candidate host acceptance must run through npm');
 const prefix=join(root,'prefix');
 await exec(process.execPath,[process.env.npm_execpath,'install','--prefix',prefix,join(candidate.directory,candidate.archive)],{env,timeout:180000,maxBuffer:4*1024*1024});
 setupCLI=join(prefix,'node_modules/@kujolang/kujo-opencode/bin/kujo-opencode.mjs');
}
await exec(process.execPath,[setupCLI,'setup','--project',project,...(pinned?[]:['--source-root',resolve('..')]),'--json'],{env,timeout:pinned?900000:120000,maxBuffer:4*1024*1024});
const installation=JSON.parse(await readFile(join(env.KUJO_OPENCODE_HOME,'installation.json'),'utf8'));
if(pinned){
 assert.ok(Object.values(installation.sources).every(source=>source.mode==='pinned'));
 for(const source of Object.values(installation.sources)){
  for(const [key,value] of [['core.autocrlf','false'],['core.longpaths','true']])assert.equal((await exec('git',['config','--local','--get',key],{cwd:source.path})).stdout.trim(),value);
 }
}
const hostVersion=(await exec(process.env.OPENCODE_BIN||'opencode',['--version'],{timeout:30000})).stdout.trim();
const watchdog=(process.env.KUJO_TEST_TELEMETRY==='1'||process.env.KUJO_TEST_CANCEL_TELEMETRY==='1')?await (await import('./watchdog-host-fixture.mjs')).watchdogHostFixture(root,JSON.parse(await readFile(join(env.KUJO_OPENCODE_HOME,'installation.json'),'utf8'))):null;
if(watchdog)env.WDG_API_AUTH_TOKEN=watchdog.token;
const host=process.env.OPENCODE_BIN||'opencode';
const hostEnv={...env}; delete hostEnv.KUJO_OPENCODE_HOME;
const child=spawn(host,['serve','--hostname','127.0.0.1','--port','0'],{env:hostEnv,cwd:project,stdio:['ignore','pipe','pipe']});
let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>output=(output+chunk).slice(-65536));
let base,authorization,tuiCleanup;
try {
 for(let i=0;i<120;i++) {
  if(child.exitCode!==null)throw Error('Host exited');
  base=output.match(/server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1];const password=output.match(/server password ([^\s]+)/)?.[1];
  if(base&&password){authorization='Basic '+Buffer.from('opencode:'+password).toString('base64');break;}
  await delay(250);
 }
 if(!base||!authorization)throw Error('Host did not start');
 const managementActions={profile:'kujo.profile.change',capability:'kujo.capability.change',lifecycle:'kujo.lifecycle.change',runledger:'kujo.runledger.session',browser:'kujo.browser.setup',knowledge:'kujo.ability.approve'};
 const pendingManagement=new Map();
 async function api(path,body,timeoutMs=15000) {
  const action=managementActions[path.replace('/api/rpc/kujo.control/','')];
  const marker=action&&body?.input?randomUUID():undefined;
  const key=marker?body.input.sessionID+':'+action:undefined;
  if(marker){body={...body,input:{...body.input,uiRequestID:marker}};pendingManagement.set(key,marker);}
  try {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:authorization,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)throw Error(`Host HTTP ${response.status}: ${await response.text()}`);
  const result=response.status===204?null:await response.json();
  if(!body&&path.endsWith('/permission'))for(const permission of result.data||[]) {
   const expected=pendingManagement.get(permission.sessionID+':'+permission.action);
   if(expected)assert.equal(permission.metadata.ui_request_id,expected,'management permission echoes its exact display correlation');
  }
  return result;
  }catch(error){if(error?.name==='TimeoutError')throw new Error(`Host request timed out: ${path}`,{cause:error});throw error;}finally{if(marker&&pendingManagement.get(key)===marker)pendingManagement.delete(key);}
 }
 let commands=[];
 for(let i=0;i<20;i++){commands=(await api('/api/command')).data;if(commands.some(c=>c.name==='kujo-status'))break;await delay(250);}
 if (!commands.some(c=>c.name==='kujo-status')) throw new Error('Native command did not load: '+JSON.stringify((await api('/api/plugin')).data.filter(p=>p.source.type!=='builtin')));
 const requiredAgents=['kujo-understand','kujo-build','kujo-review','kujo-browser','kujo-workflow','kujo-ship'];
 let agents=[];for(let i=0;i<40;i++){agents=(await api('/api/agent')).data;if(requiredAgents.every(id=>agents.some(agent=>agent.id===id)))break;await delay(250);}
 for(const id of requiredAgents)assert.ok(agents.some(agent=>agent.id===id),`missing specialist ${id}`);
 const nativeStatus=await api('/api/rpc/kujo.control/status',{input:{}});
 assert.match(JSON.stringify(nativeStatus),/kujo.profile.essentials/);
 const nativeEvidence=await api('/api/rpc/kujo.control/evidence',{input:{}});
 assert.equal(nativeEvidence.output.scope,'project');
 assert.ok(nativeEvidence.output.receipts.every(receipt=>receipt.metadata.project_root===nativeStatus.output.project));
 assert.match(JSON.stringify(nativeEvidence),/receipts/);
 const session=(await api('/api/session',{title:'Kujo native acceptance',directory:project})).data;
 await api('/api/rpc/kujo.control/specialist',{input:{sessionID:session.id,agent:'kujo-build'}});
 assert.equal((await api(`/api/session/${session.id}`)).data.agent,'kujo-build');
 await api(`/api/session/${session.id}/command`,{name:'kujo-status',text:''});
 const inbox=await api(`/api/session/${session.id}/inbox`);
 assert.match(JSON.stringify(inbox),/kujo\.profile\.essentials/);
 await api(`/api/session/${session.id}/command`,{name:'kujo-evidence',text:''});
 // Drive only this isolated fixture's human permission endpoint. No live user
 // session or production mutation is approved by this acceptance harness.
 const selectedProfile=process.env.KUJO_TEST_MODEL?'ship':'build';
 const changing=api('/api/rpc/kujo.control/profile',{input:{sessionID:session.id,profile:selectedProfile}});
 let pending;
 for(let i=0;i<40;i++) {const list=(await api(`/api/session/${session.id}/permission`)).data;pending=list.find(p=>p.action==='kujo.profile.change');if(pending)break;await delay(100);}
 assert.ok(pending,'profile change must create a real host permission request');
 assert.equal(JSON.parse(await readFile(join(project,'.kujo/opencode.json'),'utf8')).profile,'kujo.profile.essentials');
 await api(`/api/session/${session.id}/permission/${pending.id}/reply`,{decision:'once'});
 await changing;
 assert.equal(JSON.parse(await readFile(join(project,'.kujo/opencode.json'),'utf8')).profile,`kujo.profile.${selectedProfile}`);
 await api(`/api/session/${session.id}/command`,{name:'kujo-status',text:''});
 let messages;
 for(let i=0;i<40;i++){messages=await api(`/api/session/${session.id}/inbox`);if(JSON.stringify(messages).includes(`kujo.profile.${selectedProfile}`))break;await delay(100);}
 assert.ok(JSON.stringify(messages).includes(`kujo.profile.${selectedProfile}`));
 assert.ok((await api(`/api/session/${session.id}/message?limit=100`)).data.every(message=>message.type!=='assistant'),'management commands must not trigger model inference');
 // Exercise capability changes through real host permission and actual config.
 const configPath=join(project,'.kujo/opencode.json');
 let ability='kujo.scout.repository.inspect';let inherited=true;
 const originalConfig=await readFile(configPath,'utf8');
 async function capabilityChange(mode,decision,{stale=false}={}) {
  const before=await readFile(configPath,'utf8');
  const outcome=api('/api/rpc/kujo.control/capability',{input:{sessionID:session.id,ability,mode}}).then(value=>({value}),error=>({error}));
  let permission;
  for(let i=0;i<40;i++){permission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.capability.change');if(permission)break;await delay(100);}
  assert.ok(permission,'capability change requires fresh host permission');
  assert.deepEqual(permission.save,[]);assert.equal(permission.metadata.ability,ability);assert.equal(permission.metadata.mode,mode);
  assert.equal(await readFile(configPath,'utf8'),before,'no write while permission pending');
  if(stale){const edited=JSON.parse(before);edited.updated_at='concurrent-fixture-edit';await writeFile(configPath,JSON.stringify(edited,null,2)+'\n');}
  await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision});
  const result=await outcome;
  if(decision==='reject'||stale){assert.ok(result.error);if(stale)assert.equal(JSON.parse(await readFile(configPath,'utf8')).updated_at,'concurrent-fixture-edit');else assert.equal(await readFile(configPath,'utf8'),before);}
  else {if(result.error)throw result.error;const status=(await api('/api/rpc/kujo.control/status',{input:{}})).output;const item=status.capabilities.find(item=>item.id===ability);assert.equal(item.mode,mode);assert.equal(item.active,mode==='profile'?inherited:mode==='enabled');}
 }
 await capabilityChange('disabled','reject');
 await capabilityChange('disabled','once');
 await capabilityChange('enabled','once');
 await capabilityChange('profile','once');
 assert.deepEqual(JSON.parse(await readFile(configPath,'utf8')),JSON.parse(originalConfig));
 const hidden=(await api('/api/rpc/kujo.control/status',{input:{}})).output.capabilities.find(item=>!item.active);
 assert.ok(hidden,'fixture profile must have an unexposed tool');ability=hidden.id;inherited=false;
 await capabilityChange('enabled','once');
 await capabilityChange('profile','once');
 await capabilityChange('disabled','once',{stale:true});
 await writeFile(configPath,originalConfig);
 await assert.rejects(api('/api/rpc/kujo.control/capability',{input:{sessionID:session.id,ability:'kujo.unknown',mode:'enabled'}}));
 assert.ok((await api(`/api/session/${session.id}/message?limit=100`)).data.every(message=>message.type!=='assistant'),'capability management must not trigger inference');
 // Lifecycle activation is a separate explicit human choice, never a tool.
 assert.equal((await api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action:'status'}})).output.enabled,false);
 async function lifecycleChange(action,decision,{stale=false}={}) {
  const before=await readFile(configPath,'utf8');
  const outcome=api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action,...(action==='enable'&&watchdog?{url:watchdog.endpoint}:{})}}).then(value=>({value}),error=>({error}));
  let permission;
  for(let i=0;i<40;i++){permission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.lifecycle.change');if(permission)break;await delay(100);}
  assert.ok(permission,'lifecycle requires native permission');assert.deepEqual(permission.save,[]);
  assert.equal(await readFile(configPath,'utf8'),before,'no lifecycle write before approval');
  const waitingStatus=(await api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action:'status'}})).output;
  assert.equal(waitingStatus.enabled,JSON.parse(before).lifecycle?.enabled===true,'Status stays readable without applying the pending change');
  if(stale)await writeFile(configPath,JSON.stringify({...JSON.parse(before),updated_at:'lifecycle-stale-fixture'}));
  await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision});
  const result=await outcome;
  if(decision==='reject'||stale){assert.ok(result.error);if(!stale)assert.equal(await readFile(configPath,'utf8'),before);}
  else {if(result.error)throw result.error;const output=result.value.output;if(['enable','disable'].includes(action))assert.equal(output.enabled,action==='enable');else if(action==='retry')assert.equal(output.reason,'idle');else if(action==='discard')assert.equal(output.discarded,0);else if(action.endsWith('_tracking')){if(action==='reset_tracking')assert.equal(output.reset,true);else if(action==='recover_tracking')assert.equal(output.recovered,false);else assert.equal(output.runledger.enabled,action==='enable_tracking');}else if(action.endsWith('_guard'))assert.equal(output.intervention.enabled,action==='enable_guard');else assert.equal(output.recovered,false);}
 }
 await lifecycleChange('enable','reject');
 await lifecycleChange('enable','once',{stale:true});
 await writeFile(configPath,originalConfig);
 await lifecycleChange('enable','once');
 await lifecycleChange('retry','once');
 const trackingCapabilities=(await api('/api/rpc/kujo.control/status',{input:{}})).output.capabilities;
 if(!['kujo.runledger.runs.start','kujo.runledger.runs.finish'].every(id=>trackingCapabilities.find(item=>item.id===id).active))assert.equal((await api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action:'enable_tracking'}})).output.code,'tracking_capabilities_missing');
 for(const id of ['kujo.runledger.runs.start','kujo.runledger.runs.finish']){if(!trackingCapabilities.find(item=>item.id===id).active){ability=id;await capabilityChange('enabled','once');}}
 await lifecycleChange('enable_tracking','reject');
 await lifecycleChange('enable_tracking','once');
 await lifecycleChange('recover_tracking','once');
 await lifecycleChange('reset_tracking','once');
 await lifecycleChange('disable_tracking','once');
 await lifecycleChange('recover','once');
 await lifecycleChange('discard','once');
 await lifecycleChange('disable','once');
 await lifecycleChange('enable_guard','reject');
 await lifecycleChange('enable_guard','once');
 await lifecycleChange('disable_guard','once');
 assert.equal(JSON.parse(await readFile(configPath,'utf8')).lifecycle.enabled,false);
 assert.ok((await api(`/api/session/${session.id}/message?limit=100`)).data.every(message=>message.type!=='assistant'),'lifecycle management must not trigger inference');
 // Probe in the actual bundled host; reject setup without touching dependencies.
 // Guided knowledge: real canonical indexing and fresh human host permission.
 for(const operation of ['preview','index','status','query','recover']){ability=`kujo.opencode.knowledge.${operation}`;await capabilityChange('enabled','once');}
 await mkdir(join(project,'knowledge-docs'),{recursive:true});await writeFile(join(project,'knowledge-docs/guide.md'),'# Modules\nKujo modules organize reusable functions with explicit imports.\n');
 const knowledgeInput={sessionID:session.id,name:'native'};
 const knowledgePreview=(await api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'preview',path:'knowledge-docs'}})).output;
 for(const decision of ['reject','once']){
  const pending=api('/api/rpc/kujo.control/knowledge',{input:{sessionID:session.id,action:'index',...knowledgePreview.index_input}},30000).then(value=>({value}),error=>({error}));
  let permission;for(let i=0;i<40;i++){permission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.ability.approve');if(permission)break;await delay(100);}
  assert.ok(permission);assert.deepEqual(permission.save,[]);assert.equal(permission.metadata.ability,'kujo.opencode.knowledge.index');
  await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision});const result=await pending;
  if(decision==='reject'){assert.ok(result.error);assert.equal((await api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'status'}})).output.state,'missing');}else{if(result.error)throw result.error;assert.equal(result.value.output.state,'indexed');}
 }
 assert.equal((await api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'status'}})).output.state,'current');
 const answer=(await api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'query',question:'How do modules organize functions?'}})).output;assert.match(JSON.stringify(answer),/guide.md/);
 await writeFile(join(project,'knowledge-docs/guide.md'),'Changed');assert.equal((await api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'status'}})).output.state,'stale');
 await assert.rejects(api('/api/rpc/kujo.control/knowledge',{input:{...knowledgeInput,action:'query',question:'Modules?'}}));
 const browserBefore=(await api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'status'}},20000)).output;
 const {lensBrowserStatus}=await import('../lib/lens.mjs');const browserInstallation=JSON.parse(await readFile(join(env.KUJO_OPENCODE_HOME,'installation.json'),'utf8'));const expectedBrowser=await lensBrowserStatus(browserInstallation.sources.lens.path);assert.equal(browserBefore.ready,expectedBrowser.ready,'bundled host and Node must agree about actual launch readiness');
 assert.equal(typeof browserBefore.ready,'boolean');assert.ok(['ready','dependencies_missing','launch_failed','probe_failed'].includes(browserBefore.state));
 const installing=api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'install'}}).then(value=>({value}),error=>({error}));
 let browserPermission;for(let i=0;i<40;i++){browserPermission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.browser.setup');if(browserPermission)break;await delay(100);}
 assert.ok(browserPermission);assert.deepEqual(browserPermission.save,[]);assert.equal(browserPermission.metadata.operation,'install');
 await api(`/api/session/${session.id}/permission/${browserPermission.id}/reply`,{decision:'reject'});assert.ok((await installing).error);
 for(const decision of ['reject','once']){
  const recovering=api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'recover'}}).then(value=>({value}),error=>({error}));
  let permission;for(let i=0;i<40;i++){permission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.browser.setup');if(permission)break;await delay(100);}
  assert.ok(permission);assert.deepEqual(permission.save,[]);assert.equal(permission.metadata.operation,'recover');
  await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision});const result=await recovering;
  if(decision==='reject')assert.ok(result.error);else{if(result.error)throw result.error;assert.equal(result.value.output.recovered,false);}
 }
 const browserAfter=(await api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'status'}},20000)).output;assert.equal(browserAfter.ready,browserBefore.ready);assert.notEqual(browserAfter.state,'installing');
 const hostConfig=JSON.parse(await readFile(join(project,'.opencode/opencode.json'),'utf8'));
 assert.match(hostConfig.mcp.servers.kujo.command[0],/(?:^|[/\\])node(?:\.exe)?$/i,'native projection must retain a Node interpreter');
 // Session RunLedger uses canonical records and exact native Ability grants.
 for(const id of ['kujo.runledger.runs.start','kujo.runledger.runs.finish','kujo.opencode.runledger.correlate']){
  const state=(await api('/api/rpc/kujo.control/status',{input:{}})).output;
  if(!state.capabilities.find(item=>item.id===id).active){ability=id;inherited=false;await capabilityChange('enabled','once');}
 }
 const ledgerSession=(await api('/api/session',{title:'Session ledger fixture',location:{directory:await realpath(project)},agent:'kujo-ship',model:{providerID:'opencode',id:'glm-5.3-flash-free'}})).data;
 await api(`/api/session/${ledgerSession.id}/command`,{name:'kujo-status',text:''});
 const ledgerStatus=()=>api('/api/rpc/kujo.control/runledger',{input:{sessionID:ledgerSession.id,action:'status'}});
 assert.equal((await ledgerStatus()).output.state,'not_started');
 async function sessionLedgerChange(action,decision,status){
  const outcome=api('/api/rpc/kujo.control/runledger',{input:{sessionID:ledgerSession.id,action,...(status?{status}:{})}}).then(value=>({value}),error=>({error}));
  let permission;for(let i=0;i<50;i++){permission=(await api(`/api/session/${ledgerSession.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(permission)break;await delay(100);}
  assert.ok(permission,'session ledger mutation requires approval');assert.deepEqual(permission.save,[]);
  assert.equal((await ledgerStatus()).output.state,action==='start'?'not_started':'in_progress');
  await api(`/api/session/${ledgerSession.id}/permission/${permission.id}/reply`,{decision});
  const result=await outcome;if(decision==='reject')assert.ok(result.error);else{if(result.error)throw result.error;assert.equal(result.value.output.state,action==='finish'?status:'in_progress');assert.ok(result.value.output.receipt_id);}
 }
 await sessionLedgerChange('start','reject');
 assert.equal((await ledgerStatus()).output.state,'not_started');
 const {lostHttpReply}=await import('./lost-http-reply.mjs');
 const lostStart=lostHttpReply({url:base+'/api/rpc/kujo.control/runledger',authorization,body:{input:{sessionID:ledgerSession.id,action:'start'}}}).then(value=>({value}),error=>({error}));
 let lostPermission;
 for(let i=0;i<50;i++){lostPermission=(await api(`/api/session/${ledgerSession.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(lostPermission)break;await delay(100);}
 assert.ok(lostPermission);assert.equal(lostPermission.metadata.ability,'kujo.runledger.runs.start');assert.deepEqual(lostPermission.save,[]);
 const lostBefore=(await ledgerStatus()).output;assert.equal(lostBefore.state,'not_started');
 assert.deepEqual(lostPermission.metadata.input,{path:'.',provider:'opencode',model:'glm-5.3-flash-free',task:`OpenCode session ${ledgerSession.id}`,ledger_dir:lostBefore.ledger_dir});
 await api(`/api/session/${ledgerSession.id}/permission/${lostPermission.id}/reply`,{decision:'once'});
 const lostOutcome=await lostStart;if(lostOutcome.error)throw lostOutcome.error;
 const nativeTransportRecovery={...lostOutcome.value,scope:'session RunLedger start; no inference or Dispatch transport claim'};
 const recovered=(await ledgerStatus()).output;assert.equal(recovered.state,'in_progress');assert.ok(recovered.run_id);
 const startReceipts=()=>readFile(join(env.KUJO_OPENCODE_HOME,'receipts.jsonl'),'utf8').then(text=>text.split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(r=>r.metadata?.session_id===ledgerSession.id&&r.ability_id==='kujo.runledger.runs.start'&&r.status==='succeeded'));
 assert.equal((await startReceipts()).length,1,'Lost reply must not replay execution');
 nativeTransportRecovery.run_id=recovered.run_id;
 const beforeRepeat=(await ledgerStatus()).output;
 const repeated=(await api('/api/rpc/kujo.control/runledger',{input:{sessionID:ledgerSession.id,action:'start'}})).output;
 assert.equal(repeated.run_id,beforeRepeat.run_id);
 assert.equal((await startReceipts()).length,1,'Explicit repeated start must reconcile retained state');
 assert.equal((await api(`/api/session/${ledgerSession.id}/permission`)).data.length,0);
 await sessionLedgerChange('correlate','reject');
 await sessionLedgerChange('correlate','once');
 assert.match((await ledgerStatus()).output.record.correlation.watchdog_trace_id,/^[a-f0-9]{32}$/);
 await sessionLedgerChange('finish','once','partial');
 const finished=(await ledgerStatus()).output;assert.equal(finished.record.status,'partial');assert.equal(finished.record.prompt_file,null);
 assert.ok((await api(`/api/session/${ledgerSession.id}/message?limit=100`)).data.every(message=>message.type!=='assistant'));
 if(process.env.KUJO_TEST_AUTOTRACK==='1'){
  await lifecycleChange('enable_tracking','once');
  const auto=(await api('/api/session',{title:'Automatic ledger hook acceptance',location:{directory:await realpath(project)},agent:'kujo-ship',model:{providerID:'opencode',id:'glm-5.3-flash-free'}})).data;
  const {OpenCode}=await import('@opencode/client');const {setupTui}=await import('../lib/tui.mjs');
  const dialogs=[];const nativeClient=OpenCode.make({baseUrl:base,headers:{Authorization:authorization}});
  tuiCleanup=setupTui({location:{directory:await realpath(project)},client:nativeClient,keymap:{layer:()=>{}},ui:{router:{current:()=>({type:'session',sessionID:auto.id})},dialog:{select:async dialog=>{dialogs.push(dialog);return 'later';},alert:async dialog=>dialogs.push(dialog)},toast:{show:()=>{}}}});
  await delay(200);
  const inference=api(`/api/session/${auto.id}/prompt`,{text:'Reply OK. Do not use any tools.'},180000).then(value=>({value}),error=>({error}));
  let permission;for(let i=0;i<60;i++){permission=(await api(`/api/session/${auto.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(permission)break;await delay(200);}
  assert.ok(permission,'automatic start must request native permission before inference');assert.equal(permission.metadata.ability,'kujo.runledger.runs.start');assert.deepEqual(permission.save,[]);
  assert.equal((await api('/api/rpc/kujo.control/runledger',{input:{sessionID:auto.id,action:'status'}})).output.state,'not_started');
  await api(`/api/session/${auto.id}/permission/${permission.id}/reply`,{decision:'once'});await inference;
  let autoState;for(let i=0;i<60;i++){autoState=(await api('/api/rpc/kujo.control/runledger',{input:{sessionID:auto.id,action:'status'}})).output.state;if(autoState==='in_progress')break;await delay(100);}
  assert.equal(autoState,'in_progress');
  let reminder=false;for(let i=0;i<40;i++){reminder=JSON.stringify(await api(`/api/session/${auto.id}/inbox`)).includes('choose your verdict');if(reminder)break;await delay(100);}
  assert.equal(reminder,true,'idle must retain a human-verdict reminder');
  for(let i=0;i<60&&!dialogs.some(d=>d.title==='Review this tracked attempt');i++)await delay(100);
  assert.ok(dialogs.some(d=>d.title==='Review this tracked attempt'),'real native RPC event must drive the TUI completion flow');
  tuiCleanup();tuiCleanup=undefined;
  await nativeClient.location.reload();
  let reloaded;for(let i=0;i<60;i++){try{reloaded=(await api('/api/rpc/kujo.control/completion',{input:{sessionID:auto.id}})).output;break;}catch{await delay(100);}}
  assert.ok(reloaded,'native plugin must reload and restore the completion control');assert.equal(reloaded.available,false,'presentation markers must survive host reload');
  assert.equal((await api('/api/rpc/kujo.control/runledger',{input:{sessionID:auto.id,action:'status'}})).output.state,'in_progress');
  const finish=api('/api/rpc/kujo.control/runledger',{input:{sessionID:auto.id,action:'finish',status:'partial'}});
  let finishPermission;for(let i=0;i<60;i++){finishPermission=(await api(`/api/session/${auto.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(finishPermission)break;await delay(100);}
  assert.ok(finishPermission);assert.equal(finishPermission.metadata.input.status,'partial');assert.equal(finishPermission.metadata.ability,'kujo.runledger.runs.finish');assert.deepEqual(finishPermission.save,[]);
  await api(`/api/session/${auto.id}/permission/${finishPermission.id}/reply`,{decision:'once'});assert.equal((await finish).output.state,'partial');
  const cancelled=(await api('/api/session',{title:'Automatic tracking cancellation acceptance',location:{directory:await realpath(project)},agent:'kujo-ship',model:{providerID:'opencode',id:'glm-5.3-flash-free'}})).data;
  const cancelledPrompt=api(`/api/session/${cancelled.id}/prompt`,{text:'Reply OK. Do not use tools.'},180000).catch(()=>undefined);
  let cancelledPermission;for(let i=0;i<60;i++){cancelledPermission=(await api(`/api/session/${cancelled.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(cancelledPermission)break;await delay(100);}
  assert.ok(cancelledPermission);
  const interrupted=nativeClient.session.interrupt({sessionID:cancelled.id,resume:false},{signal:AbortSignal.timeout(15000)}).catch(error=>({error}));
  await delay(250);
  // The host may dismiss this permission itself. Otherwise a late grant must
  // not create a record after the session interruption was accepted.
  const remaining=(await api(`/api/session/${cancelled.id}/permission`)).data;
  if(remaining.some(p=>p.id===cancelledPermission.id))await api(`/api/session/${cancelled.id}/permission/${cancelledPermission.id}/reply`,{decision:'once'});
  const interruption=await interrupted;assert.equal(interruption?.error,undefined,'host must acknowledge interruption');await cancelledPrompt;
  assert.equal((await api('/api/rpc/kujo.control/runledger',{input:{sessionID:cancelled.id,action:'status'}})).output.state,'not_started','interrupted automatic start must not write after a late approval');
  await lifecycleChange('disable_tracking','once');
 }
 const {createApp}=await import('../lib/app.mjs');const {withDataRoot}=await import('../lib/paths.mjs');
 const fixtureApp=await withDataRoot(env.KUJO_OPENCODE_HOME,()=>createApp(project));
 const ownReceipt=await fixtureApp.runtime.execute({abilityId:'kujo.ability.catalog.list',input:{},controls:{sessionId:session.id}});
 await fixtureApp.runtime.execute({abilityId:'kujo.ability.catalog.list',input:{},controls:{sessionId:'another-fixture-session'}});
 const scoped=await api('/api/rpc/kujo.control/evidence',{input:{scope:'session',sessionID:session.id}});
 assert.ok(scoped.output.receipts.some(receipt=>receipt.receipt_id===ownReceipt.receipt.receipt_id));
 assert.ok(scoped.output.receipts.every(receipt=>receipt.metadata.session_id===session.id));
 const projectEvidence=(await api('/api/rpc/kujo.control/evidence',{input:{scope:'project'}})).output;
 assert.ok(projectEvidence.receipts.length,'setup should record project evidence');
 const compared=(await api('/api/rpc/kujo.control/compare',{input:{left:ownReceipt.receipt.receipt_id,right:projectEvidence.receipts[0].receipt_id}})).output;assert.equal(compared.same_ability,true);
 const detail=(await api('/api/rpc/kujo.control/evidenceDetail',{input:{receiptID:projectEvidence.receipts[0].receipt_id}})).output;
 assert.equal(detail.receipt.metadata.project_root,await realpath(project));
 await assert.rejects(api('/api/rpc/kujo.control/artifact',{input:{receiptID:'not-retained',index:0}}));
 const live=process.env.KUJO_TEST_MODEL&&!journey&&!dispatchTransportEnabled ? await (await import('./native-model-acceptance.mjs')).nativeModelAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL}) : null;
 let specialistJourney=null;const specialistJourneys=[];
 if(journey||dispatchTransportEnabled){
  const changingFull=api('/api/rpc/kujo.control/profile',{input:{sessionID:session.id,profile:'full'}});
  let fullPermission;
  for(let i=0;i<40;i++){fullPermission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.profile.change');if(fullPermission)break;await delay(100);}
  assert.ok(fullPermission);assert.equal(fullPermission.metadata.profile,'kujo.profile.full');assert.deepEqual(fullPermission.save,[]);
  await api(`/api/session/${session.id}/permission/${fullPermission.id}/reply`,{decision:'once'});await changingFull;
  assert.equal(JSON.parse(await readFile(configPath,'utf8')).profile,'kujo.profile.full');
 }
 if(journey){
  const {OpenCode}=await import('@opencode/client');const nativeClient=OpenCode.make({baseUrl:base,headers:{Authorization:authorization}});
  for(const selectedJourney of selectedJourneys){
  const suffix=selectedJourneys.length>1?'-'+selectedJourney:'';
  try {
  const runJourney={understand:()=>import('./native-understand-acceptance.mjs').then(m=>m.nativeUnderstandAcceptance),build:()=>import('./native-build-acceptance.mjs').then(m=>m.nativeBuildAcceptance),review:()=>import('./native-review-acceptance.mjs').then(m=>m.nativeReviewAcceptance),browser:()=>import('./native-browser-acceptance.mjs').then(m=>m.nativeBrowserAcceptance),workflow:()=>import('./native-workflow-acceptance.mjs').then(m=>m.nativeWorkflowAcceptance),ship:()=>import('./native-ship-acceptance.mjs').then(m=>m.nativeShipAcceptance)};
  const executeJourney=await runJourney[selectedJourney]();
  specialistJourney=await executeJourney({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL,interrupt:sessionID=>nativeClient.session.interrupt({sessionID,resume:false},{signal:AbortSignal.timeout(15000)})});
  await writeFile(join(root,'specialist-operations'+suffix+'.json'),JSON.stringify(specialistJourney,null,2)+'\n');
  const {specialistReport}=await import('./native-specialist-report.mjs');
  specialistJourney.report=await specialistReport({api,journey:specialistJourney,receipts:async()=>(await readFile(join(env.KUJO_OPENCODE_HOME,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line)),interrupt:sessionID=>nativeClient.session.interrupt({sessionID,resume:false},{signal:AbortSignal.timeout(15000)})});
  } catch(error) {
   const provider=String(error.message).match(/Live provider failed before acceptance: provider\.[a-z]+ \(HTTP [0-9]+\)/)?.[0];
   await writeFile(join(root,'specialist-failure'+suffix+'.json'),JSON.stringify({ok:false,journey:selectedJourney,host:hostVersion,model:process.env.KUJO_TEST_MODEL,error_type:error.name,reason:provider||'Specialist acceptance failed; inspect retained fixture evidence and test log',...(candidate?{candidate_commit:candidate.commit,candidate_sha256:candidate.sha256}:{})},null,2)+'\n');
   throw error;
  }
  await writeFile(join(root,'specialist-evidence'+suffix+'.json'),JSON.stringify(specialistJourney,null,2)+'\n');
  specialistJourneys.push(specialistJourney);
  console.log(JSON.stringify({specialist:selectedJourney,passed:true,steps:specialistJourney.steps.length}));
  }
 }
 let failureGuard=null;
 if(process.env.KUJO_TEST_GUARD==='1'){
  await lifecycleChange('enable_guard','once');
  failureGuard=await (await import('./native-model-acceptance.mjs')).nativeFailureGuardAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL});
  await writeFile(join(root,'failure-guard-evidence.json'),JSON.stringify(failureGuard,null,2)+'\n');
  await lifecycleChange('disable_guard','once');
 }
 let telemetry=null;
 if(process.env.KUJO_TEST_TELEMETRY==='1'){
  await lifecycleChange('enable','once');
  const {OpenCode}=await import('@opencode/client');const nativeClient=OpenCode.make({baseUrl:base,headers:{Authorization:authorization}});
  telemetry=await (await import('./native-telemetry-acceptance.mjs')).nativeTelemetryAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL,watchdog,reload:()=>nativeClient.location.reload(),disable:()=>lifecycleChange('disable','once')});
  await writeFile(join(root,'telemetry-evidence.json'),JSON.stringify(telemetry,null,2)+'\n');
 }
 let cancellation=null;
 if(process.env.KUJO_TEST_CANCEL_TELEMETRY==='1'){
  await lifecycleChange('enable','once');
  const {OpenCode}=await import('@opencode/client');const nativeClient=OpenCode.make({baseUrl:base,headers:{Authorization:authorization}});
  cancellation=await (await import('./native-cancellation-acceptance.mjs')).nativeCancellationAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL,watchdog,interrupt:sessionID=>nativeClient.session.interrupt({sessionID,resume:false},{signal:AbortSignal.timeout(15000)})});
  await writeFile(join(root,'cancellation-evidence.json'),JSON.stringify(cancellation,null,2)+'\n');
  await lifecycleChange('disable','once');
 }
 let dispatchTransport=null;
 if(dispatchTransportEnabled){
  const {OpenCode}=await import('@opencode/client');const nativeClient=OpenCode.make({baseUrl:base,headers:{Authorization:authorization}});
  dispatchTransport=await (await import('./native-dispatch-transport.mjs')).nativeDispatchTransport({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL,loseApprovalReply:(sessionID,permissionID)=>lostHttpReply({url:base+`/api/session/${sessionID}/permission/${permissionID}/reply`,authorization,body:{decision:'once'},timeoutMs:180000}),interrupt:sessionID=>nativeClient.session.interrupt({sessionID,resume:false},{signal:AbortSignal.timeout(15000)})});
  await writeFile(join(root,'dispatch-transport-evidence.json'),JSON.stringify(dispatchTransport,null,2)+'\n');
 }
 const verification={ok:true,root,host:hostVersion,platform:process.platform,arch:process.arch,pinned_sources:pinned,rendered_tui:false,...(candidate?{candidate_commit:candidate.commit,candidate_sha256:candidate.sha256,candidate_integrity:candidate.integrity}:{}),live,specialistJourney,specialistJourneys,dispatchTransport,failureGuard,cancellation:cancellation?{...cancellation,events:undefined}:null,telemetry:telemetry?{...telemetry,events:undefined}:null,commands:commands.filter(c=>c.name.startsWith('kujo-')).map(c=>c.name),native_status_recorded:true,native_evidence_recorded:true,native_profile_permission:true,native_capability_permissions:true,native_lifecycle_permissions:true,native_session_runledger:true,nativeTransportRecovery,native_browser_readiness:true,native_knowledge_verified:true,native_automatic_tracking:process.env.KUJO_TEST_AUTOTRACK==='1',browser_ready:browserBefore.ready,model_call:Boolean(live)||Boolean(specialistJourney)||Boolean(dispatchTransport)||process.env.KUJO_TEST_AUTOTRACK==='1'};
 if(candidate)await verifyCandidate(candidate.directory);
 await writeFile(join(root,'verification.json'),JSON.stringify(verification,null,2)+'\n');
 console.log(JSON.stringify(verification));
} catch(error) {
 const diagnostic={host:hostVersion,platform:process.platform,exit_code:child.exitCode,signal:child.signalCode,error_type:error.name,
  output:output.replace(/server password [^\s]+/g,'server password [redacted]').replace(/(Authorization[:=]\s*)(?:Basic|Bearer)\s+[^\s]+/gi,'$1[redacted]').slice(-16000)};
 await writeFile(join(root,'host-failure.json'),JSON.stringify(diagnostic,null,2)+'\n',{mode:0o600});
 throw error;
} finally {tuiCleanup?.();child.kill('SIGTERM');await watchdog?.stop();}
