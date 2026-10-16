import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {run} from '../lib/process.mjs';
async function freePort(){const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
export async function verifyStarterServers(project,binary){
 for(const kind of ['api','mcp']){
  const cwd=join(project,`${kind}-starter`),port=await freePort();
  if(kind==='mcp'){const path=join(cwd,'mcp-server.json');const config=JSON.parse(await readFile(path,'utf8'));config.http.port=port;await writeFile(path,JSON.stringify(config));}
  const controller=new AbortController();let terminal=null;
  const execution=run(binary,['run',kind==='api'?'main.kujo':'server.kujo','--interpreter','--isolated-imports'],{cwd,signal:controller.signal,killTree:true,timeoutMs:15000,maxBytes:65536,env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('KUJO_CRUD_'))),KUJO_MODULE_PATH:cwd,KUJO_ISOLATED_IMPORTS:'1',KUJO_CRUD_API_HOST:'127.0.0.1',KUJO_CRUD_PORT:String(port)}}).then(value=>terminal=value,error=>terminal={error:error.message});
  try{
   const origin=`http://127.0.0.1:${port}`;const health=kind==='api'?'/health':'/mcp/v1/health';let response=null;
   for(let attempt=0;attempt<80;attempt++){
    if(terminal)throw Error(`${kind} starter exited before health: ${JSON.stringify(terminal)}`);
    try{response=await fetch(origin+health,{signal:AbortSignal.timeout(500)});if(response.ok)break;}catch{}
    await delay(100);
   }
   assert.ok(response?.ok,`${kind} starter health failed`);assert.ok(await response.json());
   if(kind==='api'){const items=await fetch(origin+'/items');assert.equal(items.status,200);assert.ok(await items.json());await readFile(join(cwd,'data/kujo_crud_api.db'));}
   else{const tools=await fetch(origin+'/mcp/v1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})});assert.equal(tools.status,200);const body=await tools.json();assert.ok(body.result?.tools?.length>0,JSON.stringify(body));}
  }finally{controller.abort();await execution;}
 }
}
