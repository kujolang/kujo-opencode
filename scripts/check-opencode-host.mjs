import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const exec = promisify(execFile);
const args = process.argv.slice(2);
const project = resolve(args[0] === '--project' && args[1] ? args[1] : process.cwd());
const host = process.env.OPENCODE_BIN || 'opencode';
const {stdout:version} = await exec(host,['--version']);
if (!/^opencode v?2\./.test(version.trim())) throw new Error('OpenCode 2 is required');
// A private, persistent server allows asynchronous MCP startup to finish.
// Do not print its generated password or change the user's background service.
const child = spawn(host,['serve','--hostname','127.0.0.1','--port','0'],{cwd:project,stdio:['ignore','pipe','pipe']});
let output='', spawnError;
child.on('error',e=>{spawnError=e});
for (const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{output=(output+chunk).slice(-65536)});
try {
 let servers=[];
 for(let attempt=0;attempt<120;attempt++) {
  if(spawnError) throw spawnError;
  if(child.exitCode!==null) throw new Error('Private OpenCode server exited');
  const url=output.match(/server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
  const password=output.match(/server password ([^\s]+)/)?.[1];
  if(url && password) {
   const response=await fetch(url+'/api/mcp',{headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64')},signal:AbortSignal.timeout(5000)});
   if(!response.ok) throw new Error('OpenCode MCP inspection failed: HTTP '+response.status);
   servers=(await response.json()).data;
   const kujo=servers.find(s=>s.name==='kujo'||s.id==='kujo');
   if(kujo && (kujo.status==='connected'||kujo.status?.status==='connected'||kujo.status?.type==='connected'||kujo.status?.status==='disabled')) {
    const commandsResponse=await fetch(url+'/api/command',{headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64')},signal:AbortSignal.timeout(5000)});
    if(!commandsResponse.ok) throw new Error('OpenCode command discovery failed');
    const commands=(await commandsResponse.json()).data;
    const expected=['kujo-status','kujo-profile','kujo-evidence','kujo-review','kujo-doctor'];
    const rpc=await fetch(url+'/api/rpc/kujo.control/status',{method:'POST',headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({input:{}}),signal:AbortSignal.timeout(5000)});
    if(!rpc.ok) throw new Error('Native Kujo status RPC failed');
    const status=await rpc.json();
    if(!status.output?.tools?.length) throw new Error('Native Kujo has no exposed tools');
    for(const name of expected) if(!commands.some(command=>command.name===name)) throw new Error('OpenCode did not discover /'+name);
    console.log(JSON.stringify({ok:true,version:version.trim(),project,server:kujo,commands:expected,model_call:false}));
    process.exitCode=0; break;
   }
  }
  if(attempt===119) throw new Error('Kujo MCP connection not ready: '+JSON.stringify(servers));
  await delay(250);
 }
} finally {child.kill('SIGTERM');}
