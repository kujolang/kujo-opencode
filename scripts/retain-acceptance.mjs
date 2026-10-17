// Retain imported local evidence, never certify a release or rerun model tests.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const commit=process.env.CANDIDATE_COMMIT, sha256=process.env.CANDIDATE_SHA256;
assert.match(commit??'',/^[a-f0-9]{40}$/);
assert.match(sha256??'',/^[a-f0-9]{64}$/);
const read=async name=>JSON.parse(await readFile(`docs/acceptance/2026-10-17-promotion-${name}.json`,'utf8'));
const identity=value=>{assert.equal(value.candidate_commit,commit);assert.equal(value.candidate_sha256,sha256);};
const hosts=await read('hosts');identity(hosts);assert.equal(hosts.status,'passed');
assert.equal(hosts.verification.length,15);
for(const row of hosts.verification){identity(row.evidence);assert.equal(row.evidence.ok,true);}
const specialists=await read('specialists');identity(specialists);assert.equal(specialists.all_six_passed,true);
assert.deepEqual(specialists.results.map(row=>row.name).sort(),['browser','build','review','ship','understand','workflow']);
const counts={understand:5,build:8,review:4,browser:7,workflow:18,ship:8};
assert.equal(specialists.checks,50);
for(const row of specialists.results){identity(row);assert.equal(row.journey.agent,`kujo-${row.name}`);assert.equal(row.journey.steps.length,counts[row.name]);assert.ok(row.journey.report.operations.length>0);assert.ok(row.journey.report.message_ids.length>0);}
for(const name of ['lifecycle','dispatch']){const record=await read(name);identity(record.verification);assert.equal(record.verification.ok,true);}
console.log('Imported local receipts match the requested candidate. Human review remains required; no model tests ran in this job.');
