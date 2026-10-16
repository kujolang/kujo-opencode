import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
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
let base,authorization;
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
 const agents=(await api('/api/agent')).data;
 for(const id of ['kujo-understand','kujo-build','kujo-review','kujo-browser','kujo-workflow','kujo-ship'])assert.ok(agents.some(agent=>agent.id===id),`missing specialist ${id}`);
 const nativeStatus=await api('/api/rpc/kujo.control/status',{input:{}});
 assert.match(JSON.stringify(nativeStatus),/kujo.profile.essentials/);
 const nativeEvidence=await api('/api/rpc/kujo.control/evidence',{input:{}});
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
 const live=process.env.KUJO_TEST_MODEL ? await (await import('./native-model-acceptance.mjs')).nativeModelAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL}) : null;
 console.log(JSON.stringify({ok:true,root,live,commands:commands.filter(c=>c.name.startsWith('kujo-')).map(c=>c.name),native_status_recorded:true,native_evidence_recorded:true,native_profile_permission:true,native_capability_permissions:true,model_call:Boolean(live)}));
} finally {child.kill('SIGTERM');}
