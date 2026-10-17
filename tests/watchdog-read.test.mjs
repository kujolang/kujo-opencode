import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readWatchdog,watchdogReadStatus} from '../lib/watchdog-read.mjs';
async function fixture(t,reply){let calls=[];const server=createServer((req,res)=>{calls.push({url:req.url,method:req.method,headers:req.headers});reply(req,res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});return {calls,env:{KUJO_WATCHDOG_URL:`http://127.0.0.1:${server.address().port}`,KUJO_WATCHDOG_TOKEN:'fixture-secret',KUJO_WATCHDOG_AUDIENCE:'fixture'}};}
test('Watchdog configuration is opt-in and does not inherit a different service token',async t=>{
 assert.equal(watchdogReadStatus({}).configured,false);await assert.rejects(readWatchdog({}, {env:{}}),{code:'watchdog_not_configured'});
 const f=await fixture(t,(_req,res)=>res.end('{}'));const env={KUJO_WATCHDOG_URL:f.env.KUJO_WATCHDOG_URL,WDG_API_AUTH_TOKEN:'different-service-secret'};await readWatchdog({}, {env});assert.equal(f.calls[0].headers.authorization,undefined);assert.equal(watchdogReadStatus(env).credentials_supplied,false);
 for(const url of ['http://remote.example','https://user:secret@example.com','https://example.com/path','https://example.com?token=secret'])assert.throws(()=>watchdogReadStatus({KUJO_WATCHDOG_URL:url}));
 assert.equal(watchdogReadStatus({KUJO_WATCHDOG_URL:'https://watchdog.example'}).configured,true);
});
test('configured Watchdog reads preserve query filters and never mutate lifecycle state',async t=>{
 const f=await fixture(t,(_req,res)=>res.end(JSON.stringify({data:{records:[]}})));const result=await readWatchdog({path:'/api/telemetry/v2/records?producer=kujo-opencode&limit=1'},{env:f.env});assert.equal(f.calls.length,1);assert.equal(f.calls[0].method,'GET');assert.equal(f.calls[0].url,result.path);assert.equal(f.calls[0].headers.authorization,'Bearer fixture-secret');assert.equal(f.calls[0].headers['x-kujo-audience'],'fixture');assert.equal(result.lifecycle_changed,false);assert.deepEqual(result.body,{data:{records:[]}});assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
test('path escapes, model proxy routes and cancellation send no requests',async t=>{
 const f=await fixture(t,(_req,res)=>res.end('{}'));
 for(const path of ['//example.com/api/stats','/proxy/v1/models','/api/../proxy/v1/models','/api/%2e%2e/proxy/v1/models','/api/%2f../proxy','/api/stats#fragment','/api\\..\\proxy','https://example.com','x'.repeat(2049)])await assert.rejects(readWatchdog({path},{env:f.env}),{code:'watchdog_path_forbidden'});
 const stop=new AbortController();stop.abort();await assert.rejects(readWatchdog({}, {env:f.env,signal:stop.signal}),{name:'AbortError'});assert.equal(f.calls.length,0);
});
test('redirects, oversized responses, credential echoes and rejected auth fail without retries',async t=>{
 for(const [kind,code]of [['redirect','watchdog_read_failed'],['size','watchdog_response_limit'],['echo','watchdog_credential_echo'],['auth','watchdog_remote_rejected']]){const f=await fixture(t,(_req,res)=>{if(kind==='redirect'){res.writeHead(302,{location:'/api/other'});res.end();}else if(kind==='size')res.end('x'.repeat(256*1024+1));else if(kind==='auth'){res.writeHead(401);res.end('fixture-secret');}else res.end('fixture-secret');});await assert.rejects(readWatchdog({}, {env:f.env}),e=>e.code===code&&!e.message.includes('fixture-secret'));assert.equal(f.calls.length,1);}
});
