import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createServer} from 'node:http';
export async function* browserScenario(project) {
 const path='specialist-browser',root=join(project,path);await mkdir(root);
 let requests=0;const server=createServer((request,response)=>{requests++;response.writeHead(request.url==='/failure'?503:200,{'Content-Type':'text/html'});response.end('<!doctype html><html lang="en"><head><title>Browser specialist fixture</title></head><body><main><h1>Browser specialist fixture</h1></main></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const absent=async name=>assert.equal(await stat(join(root,name)).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}),false);
 try {
  await writeFile(join(root,'valid-flow.json'),JSON.stringify({name:'Browser specialist fixture',url,viewports:['desktop'],timeout_seconds:10,steps:[{visit:url},{assert_text:'Browser specialist fixture'},{assert_no_console_errors:true}]}),{flag:'wx'});
  await writeFile(join(root,'invalid-flow.json'),JSON.stringify({name:'Invalid flow',url,steps:[{click:'#unreviewed'}]}),{flag:'wx'});
  yield {ability:'kujo.lens.flow.validate',tool:'kujo_lens_flow_validate',input:{path,flow_file:'valid-flow.json'},after:async receipt=>{assert.equal(receipt.result.exit_code,0);}};
  yield {ability:'kujo.lens.flow.validate',tool:'kujo_lens_flow_validate',input:{path,flow_file:'invalid-flow.json'},expectedStatus:'failed',after:async receipt=>{assert.equal(receipt.error.code,'kujo_command_failed');assert.notEqual(receipt.error.details.exit_code,0);}};
  const page={ability:'kujo.lens.page.check',tool:'kujo_lens_check'};
  const input={path,url,output_dir:'accepted',quick:false,html:true,allow_external:false,timeout_seconds:10};
  yield {...page,input:{...input,output_dir:'rejected'},decision:'reject',beforeDecision:()=>absent('rejected'),after:()=>absent('rejected')};
  yield {...page,input,decision:'once',beforeDecision:()=>absent('accepted'),after:async receipt=>{
   assert.equal(receipt.result.exit_code,0);assert.deepEqual(receipt.result.artifacts,[join(root,'accepted')]);
   const report=JSON.parse(await readFile(join(root,'accepted/lens-report.json'),'utf8'));assert.equal(report.status,'PASS');assert.equal(report.url,url+'/');assert.ok(requests>=2,'The owned fixture must receive browser requests');
   assert.match(await readFile(join(root,'accepted/lens-report.html'),'utf8'),/html/i);
   for(const viewport of ['desktop','mobile']){const png=await readFile(join(root,`accepted/screenshots/${viewport}.png`));assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);}
  }};
  yield {...page,input:{...input,url:'https://example.invalid',output_dir:'external-denied'},decision:'once',expectedStatus:'failed',beforeDecision:()=>absent('external-denied'),after:async receipt=>{assert.equal(receipt.error.code,'ability_url_forbidden');await absent('external-denied');}};
  // Exact explicit external opt-in is presented for review, then rejected. No public request is sent.
  yield {...page,input:{...input,url:'https://example.invalid',allow_external:true,output_dir:'external-rejected'},decision:'reject',beforeDecision:()=>absent('external-rejected'),after:()=>absent('external-rejected')};
  yield {...page,input:{...input,url:url+'/failure',output_dir:'browser-failed'},decision:'once',expectedStatus:'failed',beforeDecision:()=>absent('browser-failed'),after:async receipt=>{
   assert.equal(receipt.error.code,'kujo_command_failed');assert.notEqual(receipt.error.details.exit_code,0);
   const report=JSON.parse(await readFile(join(root,'browser-failed/lens-report.json'),'utf8'));assert.equal(report.status,'FAIL');assert.ok(report.findings.some(finding=>finding.id.startsWith('LENS-NETWORK')&&finding.title.includes('503')));
  }};
 } finally {if(server.listening)await new Promise(resolve=>server.close(resolve));}
}
