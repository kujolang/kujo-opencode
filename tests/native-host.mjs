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
 const nativeStatus=await api('/api/rpc/kujo.control/status',{input:{}});
 assert.match(JSON.stringify(nativeStatus),/kujo.profile.essentials/);
 const nativeEvidence=await api('/api/rpc/kujo.control/evidence',{input:{}});
 assert.match(JSON.stringify(nativeEvidence),/receipts/);
 const session=(await api('/api/session',{title:'Kujo native acceptance',directory:project})).data;
 await api(`/api/session/${session.id}/command`,{name:'kujo-status',text:''});
 const inbox=await api(`/api/session/${session.id}/inbox`);
 assert.match(JSON.stringify(inbox),/kujo\.profile\.essentials/);
 await api(`/api/session/${session.id}/command`,{name:'kujo-evidence',text:''});
 // Drive only this isolated fixture's human permission endpoint. No live user
 // session or production mutation is approved by this acceptance harness.
 const selectedProfile=process.env.KUJO_TEST_MODEL?'ship':'review';
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
 const live=process.env.KUJO_TEST_MODEL ? await (await import('./native-model-acceptance.mjs')).nativeModelAcceptance({api,project,dataRoot:env.KUJO_OPENCODE_HOME,model:process.env.KUJO_TEST_MODEL}) : null;
 console.log(JSON.stringify({ok:true,root,live,commands:commands.filter(c=>c.name.startsWith('kujo-')).map(c=>c.name),native_status_recorded:true,native_evidence_recorded:true,native_profile_permission:true,model_call:Boolean(live)}));
} finally {child.kill('SIGTERM');}
