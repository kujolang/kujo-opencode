import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
async function scan(server,project,env){
 const child=spawn(process.execPath,[server],{env:{...env,KUJO_OPENCODE_PROJECT:project},stdio:['pipe','pipe','pipe']});
 let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors=(errors+b).slice(-4096));
 const completed=new Promise((done,fail)=>{child.once('error',fail);child.once('close',code=>code===0?done():fail(Error(`MCP fixture exited ${code}: ${errors}`)));});
 const timer=setTimeout(()=>child.kill('SIGKILL'),30000);
 try{child.stdin.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'kujo_shipcheck_scan',arguments:{path:'.'}}})+'\n');await completed;const response=JSON.parse(output.trim());assert.equal(response.result?.structuredContent?.ok,true,JSON.stringify(response));assert.equal(response.result.structuredContent.receipt.status,'succeeded');return response.result.structuredContent.receipt.receipt_id;}finally{clearTimeout(timer);child.kill('SIGTERM');}
}
export async function verifyMixedVersion({root,env,cli,oldCli,project,older}){
 const commands=async(executable,args,location)=>JSON.parse((await exec(process.execPath,[executable,...args,'--project',location,'--json'],{env,timeout:120000,maxBuffer:4*1024*1024})).stdout);
 const baselinePaths=[join(older,'.kujo/opencode.json'),join(project,'.kujo/opencode.json'),join(older,'README.md'),join(project,'README.md')];
 const baseline=await Promise.all(baselinePaths.map(p=>readFile(p)));
 const checkUnchanged=async()=>{for(let i=0;i<baselinePaths.length;i++)assert.deepEqual(await readFile(baselinePaths[i]),baseline[i],`Other project changed: ${baselinePaths[i]}`);};
 const oldServer=join(resolve(oldCli,'..'),'kujo-opencode-mcp.mjs'),newServer=join(resolve(cli,'..'),'kujo-opencode-mcp.mjs');
 assert.equal(JSON.parse(baseline[0]).installation_version,'0.1.0');assert.equal(JSON.parse(baseline[1]).installation_version,'0.2.0');
 const before={old:await scan(oldServer,older,env),current:await scan(newServer,project,env)};
 // Fail acquisition through the actual new CLI while the old project is active.
 // An empty explicit source root is deterministic and needs no network fault.
 const missingSources=await mkdtemp(join(root,'missing-upgrade-sources-'));
 await assert.rejects(commands(cli,['update','--source-root',missingSources],older),error=>error.code===1&&error.stderr.includes('local source is missing'));
 await checkUnchanged();
 const afterFailedUpgrade={old:await scan(oldServer,older,env),current:await scan(newServer,project,env)};
 const third=await mkdtemp(join(root,'mixed-version-project-'));await writeFile(join(third,'README.md'),'# Independent integration fixture\n');await exec('git',['init','-q',third],{env});
 assert.equal((await commands(cli,['setup'],third)).ok,true);
 assert.equal((await commands(cli,['repair'],third)).ok,true);
 const thirdReceipt=await scan(newServer,third,env);await checkUnchanged();
 const afterRepair={old:await scan(oldServer,older,env),current:await scan(newServer,project,env)};
 const removed=await commands(cli,['uninstall'],third);assert.equal(removed.ok,true);assert.equal(await readFile(join(third,'README.md'),'utf8'),'# Independent integration fixture\n');
 await checkUnchanged();
 const afterUninstall={old:await scan(oldServer,older,env),current:await scan(newServer,project,env)};
 const proof={ok:true,versions:['0.1.0','0.2.0'],project:third,before,third_receipt:thirdReceipt,after_repair:afterRepair,after_uninstall:afterUninstall,after_failed_upgrade:afterFailedUpgrade,other_configs_and_readmes_unchanged:true,purge:false};
 await writeFile(join(root,'mixed-version-verification.json'),JSON.stringify(proof,null,2)+'\n');return proof;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(process.argv[2]);const accepted=JSON.parse(await readFile(join(root,'verification.json'),'utf8'));assert.equal(accepted.ok,true);assert.equal(accepted.old_project_retained,true);
 const env={...process.env,KUJO_OPENCODE_HOME:join(root,'home/kujo')};for(const key of ['KUJO_BIN','KUJO_SOURCE_ROOT','NODE_PATH'])delete env[key];
 console.log(JSON.stringify(await verifyMixedVersion({root,env,cli:join(root,'prefix/node_modules/@kujolang/kujo-opencode/bin/kujo-opencode.mjs'),oldCli:join(env.KUJO_OPENCODE_HOME,'runtime/0.1.0/bin/kujo-opencode.mjs'),project:join(root,'project'),older:join(root,'older-project')})));
}
