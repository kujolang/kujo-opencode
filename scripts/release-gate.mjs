import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyCandidate} from './release-candidate.mjs';
export const requirements=['native-management','lifecycle','specialists','capability-parity','recovery','host-platform-matrix'];
export const specialists=['understand','build','review','browser','workflow','ship'];
const repository='kujolang/kujo-opencode';
// Validate release identity and the reviewer's explicit acceptance inventory.
// Evidence URLs are pointers for human review, not automated proof of their claims.
export function validateRelease({candidate,repo,environment,run,report,sha,ref,digest,runID}){
 assert.equal(repo.full_name,repository);assert.equal(repo.private,false,'npm provenance requires a public repository');
 assert.equal(environment.name,'npm-release');
 const reviewers=environment.protection_rules?.find(rule=>rule.type==='required_reviewers');
 assert.ok(reviewers?.reviewers?.length&&typeof reviewers.prevent_self_review==='boolean','Release environment requires explicit human review; self-review follows the maintainer policy');
 assert.equal(run.repository?.full_name,repository);assert.equal(run.event,'workflow_dispatch');
 assert.equal(String(run.id),runID);assert.equal(run.path,'.github/workflows/release-candidate.yml');
 assert.equal(run.status,'completed');assert.equal(run.conclusion,'success','Candidate workflow must pass');
 assert.equal(run.head_sha,sha);assert.equal(candidate.commit,sha,'Tag must identify the candidate source');
 assert.equal(candidate.name,'@kujolang/kujo-opencode');assert.match(candidate.version,/^\d+\.\d+\.\d+$/);
 assert.equal(ref,`refs/tags/v${candidate.version}`,'Dispatch from the exact version tag');
 assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(candidate.sha256,digest,'Unexpected candidate bytes');
 assert.equal(report.schema,'kujo.opencode.release-acceptance/v1');
 assert.equal(report.commit,sha);assert.equal(report.sha256,digest);assert.equal(report.candidate_run_id,runID);
 function evidence(entry,label){
  assert.equal(entry?.status,'passed',`${label} acceptance is incomplete`);
  assert.ok(Array.isArray(entry.evidence)&&entry.evidence.length>0,`${label} needs evidence`);
  for(const link of entry.evidence){
   const url=new URL(link);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'github.com');assert.equal(url.username,'');assert.equal(url.password,'');
   assert.match(url.pathname,/^\/kujolang\/kujo-opencode\/actions\/runs\/[1-9][0-9]*(?:\/artifacts\/[1-9][0-9]*)?\/?$/,'Use retained repository Actions evidence');
   assert.equal(url.search,'');assert.equal(url.hash,'');
  }
 }
 assert.deepEqual(Object.keys(report.requirements||{}).sort(),[...requirements].sort());
 for(const key of requirements)evidence(report.requirements[key],key);
 assert.deepEqual(Object.keys(report.specialists||{}).sort(),[...specialists].sort());
 for(const key of specialists)evidence(report.specialists[key],key);
 assert.deepEqual(Object.keys(report.host_matrix||{}).sort(),['darwin','linux','win32']);
 for(const platform of ['darwin','linux','win32']){
  assert.deepEqual(Object.keys(report.host_matrix[platform]).sort(),['latest','minimum']);
  for(const bound of ['minimum','latest']){const entry=report.host_matrix[platform][bound];assert.match(entry.version,/^2\.\d+\.\d+$/);evidence(entry,`${platform}/${bound}`);}
 }
 return {archive:candidate.archive,version:candidate.version,tag:`v${candidate.version}`,sha256:digest};
}
export function validateRegistryDist(candidate,dist){
 assert.equal(dist.integrity,candidate.integrity,'Registry archive differs from the accepted candidate');
 assert.equal(dist.attestations?.provenance?.predicateType,'https://slsa.dev/provenance/v1','Registry release must have provenance');
 const url=new URL(dist.attestations.url);assert.equal(url.origin,'https://registry.npmjs.org');
 assert.equal(decodeURIComponent(url.pathname),`/-/npm/v1/attestations/${candidate.name}@${candidate.version}`);
 assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.search,'');assert.equal(url.hash,'');
 // npm audit signatures performs the actual cryptographic verification next.
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [directory,contextFile,reportFile]=process.argv.slice(2);
 const context=JSON.parse(await readFile(contextFile,'utf8')),report=JSON.parse(await readFile(reportFile,'utf8'));
 const approved=validateRelease({candidate:await verifyCandidate(directory),report,...context});
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries(approved).map(([key,value])=>`${key}=${value}\n`).join(''));
 console.log(JSON.stringify(approved));
}
