import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {specialistSession,specialistStep} from './native-specialist-runner.mjs';
import {browserScenario} from './browser-specialist-scenario.mjs';
export async function nativeBrowserAcceptance({api,project,dataRoot,model,interrupt}) {
 project=await realpath(project);
 const session=await specialistSession({api,project,model,agent:'kujo-browser'});
 try {
  const browser=await prepareBrowser({api,session});
  const receipts=async()=> (await readFile(join(dataRoot,'receipts.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
  const steps=[];
  for await(const step of browserScenario(project))steps.push(await specialistStep({api,session,receipts,step,interrupt}));
  return {agent:session.agent,model,session_id:session.id,browser,scope:'real desktop/mobile page evidence; external opt-in rejected without contacting a public endpoint',steps};
 }catch(error){await interrupt(session.id).catch(()=>{});throw error;}
}

export async function prepareBrowser({api,session,pollMs=250,timeoutMs=960000}) {
 const status=async()=>(await api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'status'}},20000)).output;
 const before=await status();let installed=false;
  if(!before.ready){
   // Isolated acceptance only: exact native installation request, never a persistent grant.
   const request=api('/api/rpc/kujo.control/browser',{input:{sessionID:session.id,action:'install'}},960000).then(value=>({value}),error=>({error}));
   let permission;
   for(let i=0;i<100;i++){
    const pending=(await api(`/api/session/${session.id}/permission`)).data;
    assert.ok(pending.length<=1);permission=pending[0];if(permission)break;await delay(100);
   }
   assert.ok(permission,'Browser installation must require native approval');
   assert.equal(permission.action,'kujo.browser.setup');assert.deepEqual(permission.save,[]);assert.equal(permission.metadata.operation,'install');
   await api(`/api/session/${session.id}/permission/${permission.id}/reply`,{decision:'once'});
   const outcome=await request;if(outcome.error)throw outcome.error;installed=true;
  }
  let after=await status();const deadline=Date.now()+timeoutMs;
  while(after.state==='installing'&&Date.now()<deadline){await delay(pollMs);after=await status();}
  assert.equal(after.ready,true,`Browser setup did not become ready: ${JSON.stringify(after)}`);
  assert.equal((await api(`/api/session/${session.id}/permission`)).data.length,0);
 return {before,after,installed};
}
