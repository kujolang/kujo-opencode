import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const exec=promisify(execFile),repo=resolve('.');
const root=await mkdtemp(join(tmpdir(),'kujo-native-host-'));const project=join(root,'project');await mkdir(project);
await exec('git',['init',project]);
const env={...process.env,KUJO_OPENCODE_HOME:join(root,'kujo')};
await exec(process.execPath,[join(repo,'bin/kujo-opencode.mjs'),'setup','--project',project,'--source-root',resolve('..'),'--json'],{env,timeout:120000});
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
 async function api(path,body,timeoutMs=15000) {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:authorization,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)throw Error(`Host HTTP ${response.status}: ${await response.text()}`);
  return response.status===204?null:response.json();
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
  const outcome=api('/api/rpc/kujo.control/lifecycle',{input:{sessionID:session.id,action}}).then(value=>({value}),error=>({error}));
  let permission;
  for(let i=0;i<40;i++){permission=(await api(`/api/session/${session.id}/permission`)).data.find(p=>p.action==='kujo.lifecycle.change');if(permission)break;await delay(100);}
  assert.ok(permission,'lifecycle requires native permission');assert.deepEqual(permission.save,[]);
  assert.equal(await readFile(configPath,'utf8'),before,'no lifecycle write before approval');
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
 await sessionLedgerChange('start','once');
 const beforeRepeat=(await ledgerStatus()).output;
 const repeated=(await api('/api/rpc/kujo.control/runledger',{input:{sessionID:ledgerSession.id,action:'start'}})).output;
 assert.equal(repeated.run_id,beforeRepeat.run_id);
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
  assert.equal((await api('/api/rpc/kujo.control/completion',{input:{sessionID:auto.id}})).output.available,false);
  const finish=api('/api/rpc/kujo.control/runledger',{input:{sessionID:auto.id,action:'finish',status:'partial'}});
  let finishPermission;for(let i=0;i<60;i++){finishPermission=(await api(`/api/session/${auto.id}/permission`)).data.find(p=>p.action==='kujo.runledger.session');if(finishPermission)break;await delay(100);}
  assert.ok(finishPermission);assert.equal(finishPermission.metadata.input.status,'partial');assert.equal(finishPermission.metadata.ability,'kujo.runledger.runs.finish');assert.deepEqual(finishPermission.save,[]);
  await api(`/api/session/${auto.id}/permission/${finishPermission.id}/reply`,{decision:'once'});assert.equal((await finish).output.state,'partial');
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
 const live=process.env.KUJO_TEST_MODEL ? await (await import('./native-model-acceptance.mjs')).nativeModelAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL}) : null;
 console.log(JSON.stringify({ok:true,root,live,commands:commands.filter(c=>c.name.startsWith('kujo-')).map(c=>c.name),native_status_recorded:true,native_evidence_recorded:true,native_profile_permission:true,native_capability_permissions:true,native_lifecycle_permissions:true,native_session_runledger:true,native_browser_readiness:true,native_knowledge_verified:true,native_automatic_tracking:process.env.KUJO_TEST_AUTOTRACK==='1',browser_ready:browserBefore.ready,model_call:Boolean(live)||process.env.KUJO_TEST_AUTOTRACK==='1'}));
} finally {tuiCleanup?.();child.kill('SIGTERM');}
