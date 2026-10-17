import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareBrowser} from './native-browser-acceptance.mjs';
function fixture({ready=false,afterReady=true,permission={id:'owned-permission',action:'kujo.browser.setup',save:[],metadata:{operation:'install'}},installError=false}={}){
 const calls=[];let probes=0,replied=false,finish;
 const api=async(path,body)=>{
  calls.push({path,body});
  if(path==='/api/rpc/kujo.control/browser'){
   if(body.input.action==='status')return {output:{ready:probes++?afterReady:ready}};
   assert.equal(body.input.action,'install');return new Promise((resolve,reject)=>{finish=()=>installError?reject(Error('Installation failed')):resolve({output:{ready:true}});});
  }
  if(path.endsWith('/reply')){assert.equal(path,'/api/session/owned/permission/owned-permission/reply');replied=true;finish();return {};}
  if(path.endsWith('/permission'))return {data:replied||ready?[]:[permission]};
  throw Error('Unexpected API call');
 };
 return {api,calls,session:{id:'owned'}};
}
test('Browser readiness does not reinstall a working browser',async()=>{const f=fixture({ready:true});assert.equal((await prepareBrowser(f)).installed,false);assert.ok(f.calls.every(c=>c.body?.input?.action!=='install'));});
test('Browser setup grants only the exact isolated native installation once',async()=>{const f=fixture();assert.equal((await prepareBrowser(f)).installed,true);assert.deepEqual(f.calls.filter(c=>c.path.endsWith('/reply')).map(c=>c.body),[{decision:'once'}]);});
for(const [name,permission] of Object.entries({persistent:{id:'owned-permission',action:'kujo.browser.setup',save:['*'],metadata:{operation:'install'}},wrongAction:{id:'owned-permission',action:'kujo.ability.approve',save:[],metadata:{operation:'install'}},wrongOperation:{id:'owned-permission',action:'kujo.browser.setup',save:[],metadata:{operation:'recover'}}}))test(`Browser setup refuses ${name} permission`,async()=>{const f=fixture({permission});await assert.rejects(prepareBrowser(f));assert.equal(f.calls.filter(c=>c.path.endsWith('/reply')).length,0);});
test('Browser setup preserves installer failure',async()=>{await assert.rejects(prepareBrowser(fixture({installError:true})),/Installation failed/);});
test('Browser setup requires a successful post-install launch probe',async()=>{await assert.rejects(prepareBrowser(fixture({afterReady:false})));});
