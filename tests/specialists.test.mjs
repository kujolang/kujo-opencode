import './native-specialist-runner.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog,profileAbilities} from '../lib/catalog.mjs';
import {specialists,assertSpecialistAbility,specialistMarkdown,specialistStatus,scopeSpecialistTools,specialistCapabilities} from '../lib/specialists.mjs';
test('six specialist policies resolve to real capabilities and block cross-scope calls',async()=>{
 const catalog=await loadCatalog();assert.equal(specialists.length,6);const known=new Set(catalog.abilities.map(item=>item.definition.id));
 for(const specialist of specialists){
  for(const id of specialist.abilities){assert.ok(known.has(id),`${specialist.id}: ${id}`);assert.doesNotThrow(()=>assertSpecialistAbility(specialist.id,id));}
  for(const id of known)if(!specialist.abilities.includes(id))assert.throws(()=>assertSpecialistAbility(specialist.id,id),{code:'kujo_specialist_scope'});
  const markdown=specialistMarkdown(specialist,catalog);const permissions=JSON.parse(markdown.split('\n').find(line=>line.startsWith('permissions: ')).slice(13));
  assert.ok(permissions.some(rule=>rule.action==='kujo.browser.setup'&&rule.effect==='ask'));
  assert.ok(permissions.some(rule=>rule.action==='kujo.runledger.session'&&rule.effect==='ask'));
  assert.ok(permissions.some(rule=>rule.action==='kujo.lifecycle.change'&&rule.effect==='ask'));
  assert.deepEqual(permissions[0],{action:'*',resource:'*',effect:'deny'});
  assert.ok(!permissions.some(rule=>['shell','edit','subagent','webfetch','websearch'].includes(rule.action)));
  assert.deepEqual(permissions.at(-1),{action:'kujo.ability.approve',resource:'*',effect:'ask'});
 }
});
test('specialist readiness reports actual profile exposure instead of assuming tools are installed',async()=>{
 const catalog=await loadCatalog();const states=specialistStatus(catalog,profileAbilities(catalog,'kujo.profile.essentials'));
 assert.ok(states.find(item=>item.id==='kujo-browser').missing.includes('kujo.lens.page.check'));
 assert.ok(states.find(item=>item.id==='kujo-understand').available.includes('kujo.scout.repository.inspect'));
 assert.equal(specialistStatus(catalog,profileAbilities(catalog,'kujo.profile.full')).every(item=>item.missing.length===0),true);
});

test('model context exposes only active tools within the selected specialist scope',async()=>{
 const catalog=await loadCatalog();const event={agent:'kujo-ship',tools:{kujo_shipcheck_scan:{},kujo_lens_check:{},shell:{},read:{},subagent:{},question:{}}};
 scopeSpecialistTools(event,catalog);assert.deepEqual(Object.keys(event.tools),['kujo_shipcheck_scan','question']);
 const normal={agent:'build',tools:{shell:{},read:{}}};scopeSpecialistTools(normal,catalog);assert.deepEqual(Object.keys(normal.tools),['shell','read']);
});

test('catalog discovery does not advertise abilities forbidden to a specialist',async()=>{
 const catalog=await loadCatalog();const visible=specialistCapabilities('kujo-review',catalog.abilities);
 assert.ok(visible.some(item=>item.definition.id==='kujo.patchbrief.changes.summarize'));
 assert.ok(!visible.some(item=>item.definition.id==='kujo.runledger.runs.start'));
 assert.equal(specialistCapabilities('build',catalog.abilities).length,catalog.abilities.length);
});

test('live acceptance distinguishes provider rejection from missing tool execution',async()=>{
 const {assertProviderHealthy}=await import('./native-model-acceptance.mjs');
 assert.doesNotThrow(()=>assertProviderHealthy({data:[{type:'assistant',content:[]}]}));
 assert.throws(()=>assertProviderHealthy({data:[{error:{type:'provider.auth',status:403,response:{body:'private response'}}}]}),error=>error.message.includes('provider.auth (HTTP 403)')&&!error.message.includes('private response'));
});

test('Build specialist scenario exercises the real runtime and retained failures',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {fileURLToPath}=await import('node:url');
 const script=fileURLToPath(new URL('./build-specialist-canonical.mjs',import.meta.url));
 const result=await promisify(execFile)(process.execPath,[script],{timeout:120000,maxBuffer:1024*1024});
 const evidence=JSON.parse(result.stdout.trim());assert.equal(evidence.ok,true);assert.equal(evidence.steps,8);assert.equal(evidence.live_specialist,false);assert.equal(evidence.native_approval,false);
});

import './browser-specialist-runner.test.mjs';
