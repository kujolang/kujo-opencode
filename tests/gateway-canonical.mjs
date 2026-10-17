// Real CMS application gateway, private DB and fixture-only bootstrap identity.
// No external connectors, provisioned user database or production service.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {listGateway,callGateway} from '../lib/gateway.mjs';
if(!process.env.CMS_TEST_SOURCE)throw Error('Set CMS_TEST_SOURCE to a canonical CMS checkout with dependencies installed.');
const source=resolve(process.env.CMS_TEST_SOURCE),binary=resolveKujoBinary(),root=await mkdtemp(join(tmpdir(),'kujo-gateway-canonical-'));
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const token=randomBytes(32).toString('hex'),origin=`http://127.0.0.1:${port}`;
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('CMS_'))),CMS_API_HOST:'127.0.0.1',CMS_API_PORT:String(port),CMS_API_TOKEN:token,CMS_ALLOW_BOOTSTRAP_TOKEN:'true',CMS_ENFORCE_BOOTSTRAP_TOKEN_ROTATION:'false',CMS_DB_PATH:join(root,'cms.db'),CMS_SITE_URL:origin,CMS_EXTENSION_INBOX_DIR:join(root,'extensions-inbox'),CMS_EXTENSION_STORE_DIR:join(root,'extensions'),CMS_MEDIA_INBOX_DIR:join(root,'media-inbox'),CMS_MEDIA_STORE_DIR:join(root,'media')};
const child=spawn(binary,['run','--interpreter','backend/runtime/main.kujo'],{cwd:source,env,stdio:['ignore','pipe','pipe']});let log='',spawnError;for(const stream of [child.stdout,child.stderr])stream.on('data',b=>log=(log+b).slice(-8192));child.on('error',e=>spawnError=e);
try{
 let ready=false;for(let n=0;n<200;n++){if(spawnError)throw spawnError;if(child.exitCode!==null)throw Error(`CMS exited: ${log.replaceAll(token,'[redacted]')}`);try{ready=(await fetch(origin+'/health',{signal:AbortSignal.timeout(500)})).ok;}catch{}if(ready)break;await delay(100);}assert.ok(ready,'CMS did not become healthy');
 const gatewayEnv={KUJO_ABILITY_GATEWAY_URL:origin,KUJO_ABILITY_GATEWAY_TOKEN:token};const list=await listGateway({env:gatewayEnv});const tool=list.tools.find(t=>t.abilityId==='kujo.cms.site.inspect');assert.ok(tool,'canonical site-info descriptor');
 const input={origin,tool,input:{},invocation_id:'opencode-cms-read',idempotency_key:'opencode-cms-read-key'};
 const result=await callGateway(input,{env:gatewayEnv});assert.equal(result.receipt.status,'succeeded');assert.equal(result.result.service,'CMS API');
 // All provisioning and approvals below target only this disposable fixture.
 async function api(path,body){const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});const value=await response.json();assert.ok(response.ok,`fixture API ${path}: HTTP ${response.status}`);return value.data;}
 await api('/v1/content-types',{type_key:'fixture',label:'Fixture',singular_label:'Fixture'});
 const entry=await api('/v1/entries',{content_type_key:'fixture',title:'Private gateway fixture',slug:'private-gateway-fixture',status:'draft',body:'Acceptance only'});
 const seoPath=`/v1/entries/${entry.id}/seo`,before=await api(seoPath);
 const writeTool=list.tools.find(t=>t.execution==='/v1/abilities/seo/update-entry/run');assert.ok(writeTool);
 const writeInput={origin,tool:writeTool,input:{entry_id:entry.id,changes:{title:'Reviewed gateway fixture'},confirmed:true},invocation_id:'opencode-cms-approval',idempotency_key:'opencode-cms-approval-key'};
 await assert.rejects(callGateway(writeInput,{env:gatewayEnv}),e=>e.code==='gateway_execution_incomplete'&&e.details?.receipt?.status==='approval_required');
 assert.deepEqual(await api(seoPath),before,'application data must remain unchanged before approval');
 const grant=await api('/v1/abilities/seo/update-entry/approvals',{invocation_id:writeInput.invocation_id});assert.equal(typeof grant.approval_id,'string');
 assert.deepEqual(await api(seoPath),before,'issuing application approval alone must not mutate the entry');
 const approvedInput={...writeInput,approval_id:grant.approval_id};
 const written=await callGateway(approvedInput,{env:gatewayEnv});assert.equal(written.receipt.status,'succeeded');assert.equal(written.receipt.approval_id,grant.approval_id);assert.equal(written.result.seo.title,'Reviewed gateway fixture');
 const after=await api(seoPath);assert.notDeepEqual(after,before);assert.ok(JSON.stringify(after).includes('Reviewed gateway fixture'));
 const replay=await callGateway(approvedInput,{env:gatewayEnv});assert.equal(replay.receipt.receipt_id,written.receipt.receipt_id);assert.deepEqual(await api(seoPath),after,'idempotent replay must preserve the completed state');
 await assert.rejects(callGateway({...approvedInput,input:{...writeInput.input,changes:{title:'Unapproved change'}}},{env:gatewayEnv}));assert.deepEqual(await api(seoPath),after,'changed input cannot reuse the grant or key');
 await writeFile(join(root,'mutation-receipt.json'),JSON.stringify(written.receipt,null,2)+'\n');
 await assert.rejects(listGateway({env:{...gatewayEnv,KUJO_ABILITY_GATEWAY_TOKEN:'invalid-fixture-token'}}),{code:'gateway_remote_rejected'});
 const proof={ok:true,root,source_commit:execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime_sha256:createHash('sha256').update(await readFile(binary)).digest('hex'),tool_count:list.tools.length,receipt_id:result.receipt.receipt_id,canonical_read:true,server_approval_required:true,approved_mutation:true,unchanged_before_approval:true,idempotent_replay:true,changed_input_rejected:true,auth_rejection:true,external_connectors:false};await writeFile(join(root,'verification.json'),JSON.stringify(proof,null,2)+'\n');await writeFile(join(root,'receipt.json'),JSON.stringify(result.receipt,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');for(let n=0;n<50&&child.exitCode===null&&child.signalCode===null;n++)await delay(100);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}}
