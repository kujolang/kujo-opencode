import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
const exec=promisify(execFile),repo=resolve('.');
const root=await mkdtemp(join(tmpdir(),'kujo-native-host-'));const project=join(root,'project');await mkdir(project);
const env={...process.env,KUJO_OPENCODE_HOME:join(root,'kujo')};
await exec(process.execPath,[join(repo,'bin/kujo-opencode.mjs'),'setup','--project',project,'--source-root',resolve('..'),'--json'],{env,timeout:120000});
const configPath=join(project,'.opencode/opencode.json');const config=JSON.parse(await readFile(configPath,'utf8'));
const pluginDir=join(project,'.opencode/plugins/kujo-native'); await mkdir(pluginDir,{recursive:true});
await writeFile(join(pluginDir,'index.ts'),`export { default } from ${JSON.stringify(pathToFileURL(join(repo,'lib/plugin.mjs')).href)};\n`);
await writeFile(configPath,JSON.stringify(config));
const host=process.env.OPENCODE_BIN||'opencode';
const child=spawn(host,['serve','--hostname','127.0.0.1','--port','0'],{env,cwd:project,stdio:['ignore','pipe','pipe']});
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
 async function api(path,body) {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:authorization,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Host HTTP ${response.status}: ${await response.text()}`);
  return response.status===204?null:response.json();
 }
 let commands=[];
 for(let i=0;i<20;i++){commands=(await api('/api/command')).data;if(commands.some(c=>c.name==='kujo-status'))break;await delay(250);}
 if (!commands.some(c=>c.name==='kujo-status')) throw new Error('Native command did not load: '+JSON.stringify((await api('/api/plugin')).data.filter(p=>p.source.type!=='builtin')));
 const session=(await api('/api/session',{title:'Kujo native acceptance',directory:project})).data;
 await api(`/api/session/${session.id}/command`,{name:'kujo-status',text:''});
 const inbox=await api(`/api/session/${session.id}/inbox`);
 assert.match(JSON.stringify(inbox),/kujo\.profile\.essentials/);
 await api(`/api/session/${session.id}/command`,{name:'kujo-evidence',text:''});
 // Drive only this isolated fixture's human permission endpoint. No live user
 // session or production mutation is approved by this acceptance harness.
 const changing=api(`/api/session/${session.id}/command`,{name:'kujo-profile',text:'review'});
 let pending;
 for(let i=0;i<40;i++) {const list=(await api(`/api/session/${session.id}/permission`)).data;pending=list.find(p=>p.action==='kujo.profile.change');if(pending)break;await delay(100);}
 assert.ok(pending,'profile change must create a real host permission request');
 assert.equal(JSON.parse(await readFile(join(project,'.kujo/opencode.json'),'utf8')).profile,'kujo.profile.essentials');
 await api(`/api/session/${session.id}/permission/${pending.id}/reply`,{decision:'once'});
 await changing;
 assert.equal(JSON.parse(await readFile(join(project,'.kujo/opencode.json'),'utf8')).profile,'kujo.profile.review');
 await api(`/api/session/${session.id}/command`,{name:'kujo-status',text:''});
 let messages;
 for(let i=0;i<40;i++){messages=await api(`/api/session/${session.id}/inbox`);if(JSON.stringify(messages).includes('kujo.profile.review'))break;await delay(100);}
 assert.match(JSON.stringify(messages),/kujo\.profile\.review/);
 assert.ok((await api(`/api/session/${session.id}/message?limit=100`)).data.every(message=>message.type!=='assistant'),'management commands must not trigger model inference');
 console.log(JSON.stringify({ok:true,root,commands:commands.filter(c=>c.name.startsWith('kujo-')).map(c=>c.name),native_status_recorded:true,native_evidence_recorded:true,native_profile_permission:true,model_call:false}));
} finally {child.kill('SIGTERM');}
