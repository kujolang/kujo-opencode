import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRelease,validateRegistryDist,requirements,specialists} from '../scripts/release-gate.mjs';
const sha='a'.repeat(40),digest='b'.repeat(64),runID='123';
function fixture(){
 const evidence=()=>({status:'passed',evidence:['https://github.com/kujolang/kujo-opencode/actions/runs/123/artifacts/456']});
 return {sha,digest,runID,ref:'refs/tags/v0.2.0',candidate:{name:'@kujolang/kujo-opencode',version:'0.2.0',commit:sha,sha256:digest,archive:'kujolang-kujo-opencode-0.2.0.tgz'},repo:{full_name:'kujolang/kujo-opencode',private:false},environment:{name:'npm-release',protection_rules:[{type:'required_reviewers',prevent_self_review:true,reviewers:[{type:'User',reviewer:{id:1}}]}]},run:{id:123,repository:{full_name:'kujolang/kujo-opencode'},event:'workflow_dispatch',path:'.github/workflows/release-candidate.yml',status:'completed',conclusion:'success',head_sha:sha},report:{schema:'kujo.opencode.release-acceptance/v1',commit:sha,sha256:digest,candidate_run_id:runID,requirements:Object.fromEntries(requirements.map(key=>[key,evidence()])),specialists:Object.fromEntries(specialists.map(key=>[key,evidence()])),host_matrix:Object.fromEntries(['darwin','linux','win32'].map(platform=>[platform,{minimum:{version:'2.0.31',...evidence()},latest:{version:'2.0.31',...evidence()}}]))}};
}
test('release gate binds source, archive, version tag and reviewed evidence inventory',()=>{
 assert.equal(validateRelease(fixture()).tag,'v0.2.0');
 for(const mutate of [f=>f.repo.private=true,f=>f.environment.protection_rules=[],f=>f.environment.protection_rules[0].reviewers=[],f=>f.run.conclusion='failure',f=>f.run.repository.full_name='foreign/repo',f=>f.run.path='untrusted.yml',f=>f.run.event='pull_request',f=>f.run.id=124,f=>f.candidate.commit='c'.repeat(40),f=>f.ref='refs/heads/main',f=>f.digest='d'.repeat(64),f=>f.report.sha256='e'.repeat(64),f=>f.report.candidate_run_id='124']){const f=fixture();mutate(f);assert.throws(()=>validateRelease(f));}
});
test('missing specialist/platform outcomes and unretained or foreign evidence block release',()=>{
 for(const mutate of [f=>delete f.report.requirements.recovery,f=>f.report.requirements.lifecycle.status='pending',f=>delete f.report.specialists.browser,f=>f.report.specialists.ship.evidence=[],f=>delete f.report.host_matrix.win32,f=>delete f.report.host_matrix.linux.minimum,f=>f.report.host_matrix.darwin.latest.version='1.0.0',f=>f.report.requirements.recovery.evidence=['https://example.com/passed'],f=>f.report.requirements.recovery.evidence=['https://github.com/foreign/repo/actions/runs/123'],f=>f.report.requirements.recovery.evidence=['file:///tmp/pass.json']]){const f=fixture();mutate(f);assert.throws(()=>validateRelease(f));}
});

test('registry acceptance requires matching bytes and a canonical provenance endpoint',()=>{
 const candidate={name:'@kujolang/kujo-opencode',version:'0.2.0',integrity:'sha512-fixture'};
 const dist={integrity:candidate.integrity,attestations:{url:'https://registry.npmjs.org/-/npm/v1/attestations/@kujolang/kujo-opencode@0.2.0',provenance:{predicateType:'https://slsa.dev/provenance/v1'}}};
 validateRegistryDist(candidate,dist);
 for(const mutate of [d=>d.integrity='other',d=>delete d.attestations,d=>d.attestations.url='https://example.com/attestation',d=>d.attestations.url+='?override=1',d=>d.attestations.provenance.predicateType='unknown']){const d=structuredClone(dist);mutate(d);assert.throws(()=>validateRegistryDist(candidate,d));}
});

test('maintainer may approve their own release while human review stays required',()=>{
 const f=fixture();f.environment.protection_rules[0].prevent_self_review=false;
 assert.equal(validateRelease(f).tag,'v0.2.0');
 f.environment.protection_rules[0].reviewers=[];assert.throws(()=>validateRelease(f));
});

test('publication metadata uses canonical GitHub endpoints, including repository root',async()=>{
 const {readFile,mkdtemp,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFile}=await import('node:child_process');
 const {promisify}=await import('node:util');
 const action=(await readFile(new URL('../.github/actions/verify-release/action.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
 const source=action.split("node --input-type=module <<'JS'\n")[1].split('\n        JS')[0];
 const directory=await mkdtemp(join(tmpdir(),'kujo-release-metadata-'));
 const mock=`
 const expected=['https://api.github.com/repos/kujolang/kujo-opencode','https://api.github.com/repos/kujolang/kujo-opencode/environments/npm-release','https://api.github.com/repos/kujolang/kujo-opencode/actions/runs/123'];
 globalThis.fetch=async url=>{
  if(!expected.includes(url))throw Error('Unexpected metadata URL: '+url);
  return {ok:true,json:async()=>url===expected[0]?{private:false}:url===expected[1]?{name:'npm-release'}:{head_sha:'${sha}',conclusion:'success',path:'.github/workflows/release-candidate.yml'}};
 };
 `;
 try{
  await promisify(execFile)(process.execPath,['--input-type=module','-e',mock+source],{env:{...process.env,CANDIDATE_RUN_ID:'123',CANDIDATE_SHA256:digest,GITHUB_SHA:sha,GITHUB_REF:'refs/tags/v0.2.0',RUNNER_TEMP:directory,GITHUB_REPOSITORY:'kujolang/kujo-opencode',GH_TOKEN:'test-only',ACCEPTANCE_JSON:'{}'}});
  const context=JSON.parse(await readFile(join(directory,'release-context.json'),'utf8'));
  assert.equal(context.repo.private,false);assert.equal(context.environment.name,'npm-release');assert.equal(context.run.head_sha,sha);
 }finally{await rm(directory,{recursive:true,force:true});}
});


test('registry propagation retries only missing versions and stays bounded',async()=>{
 const {waitRegistryDist}=await import('../.github/scripts/wait-registry-dist.mjs');
 const missing=Object.assign(new Error('not visible'),{stdout:JSON.stringify({error:{code:'E404'}})});
 let calls=0,waits=0;
 const dist={integrity:'verified separately'};
 assert.equal(await waitRegistryDist('fixture@1.0.0',{read:async()=>{if(++calls===1)throw missing;return dist;},wait:async()=>{waits++;},attempts:2}),dist);
 assert.equal(calls,2);assert.equal(waits,1);
 calls=0;
 await assert.rejects(waitRegistryDist('fixture@1.0.0',{read:async()=>{calls++;throw missing;},wait:async()=>{},attempts:2}),/not visible/);
 assert.equal(calls,2);
 const denied=Object.assign(new Error('authentication failed'),{stdout:JSON.stringify({error:{code:'ENEEDAUTH'}})});
 await assert.rejects(waitRegistryDist('fixture@1.0.0',{read:async()=>{throw denied;},wait:async()=>{assert.fail('Must not retry authentication failures');}}),/authentication failed/);
});
