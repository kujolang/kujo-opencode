import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,cp,symlink,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {buildCandidate,verifyCandidate} from '../scripts/release-candidate.mjs';
const exec=promisify(execFile);
test('candidate packs committed bytes and refuses dirt, overwrite, mutation and redirected files',async t=>{
 const base=await mkdtemp(join(tmpdir(),'kujo-candidate-contract-'));t.after(()=>rm(base,{recursive:true,force:true}));const repo=join(base,'repo');await mkdir(repo);
 const pkg={name:'@fixture/candidate',version:'1.0.0',files:['*.mjs'],type:'module'};
 await writeFile(join(repo,'package.json'),JSON.stringify(pkg));await writeFile(join(repo,'index.mjs'),'export const value=1;\n');
 await writeFile(join(repo,'.gitignore'),'ignored.mjs\n');
 await writeFile(join(repo,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,packages:{'':{name:pkg.name,version:pkg.version}}}));
 await mkdir(join(repo,'catalog'));await mkdir(join(repo,'.generated'));
 await writeFile(join(repo,'catalog/sources.json'),JSON.stringify({sources:[{id:'fixture',commit:'a'.repeat(40)}]}));
 for(const file of ['BUILD.json','GATEWAY-CONTRACT.json'])await writeFile(join(repo,'.generated',file),'{}');
 const git=async args=>exec('git',args,{cwd:repo});await git(['init','-q']);await git(['add','.']);await git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
 await assert.rejects(buildCandidate(repo,join(repo,'candidate')),/outside/);
 await writeFile(join(repo,'untracked'),'private');await assert.rejects(buildCandidate(repo,join(base,'dirty')),/clean/);await rm(join(repo,'untracked'));
 await writeFile(join(repo,'ignored.mjs'),'private ignored content');
 await git(['config','core.autocrlf','true']);
 const directory=join(base,'candidate');const candidate=await buildCandidate(repo,directory);
 const inventory=JSON.parse((await exec(process.execPath,[process.env.npm_execpath,'pack','--dry-run','--ignore-scripts','--json',join(directory,candidate.archive)],{cwd:base})).stdout)[0];
 assert.ok(inventory.files.some(file=>file.path==='index.mjs'));assert.ok(!inventory.files.some(file=>file.path==='ignored.mjs'));
 assert.equal((await exec('tar',['-xOf',candidate.archive,'package/index.mjs'],{cwd:directory})).stdout,'export const value=1;\n');
 assert.equal(candidate.name,pkg.name);assert.equal(candidate.version,pkg.version);assert.equal(candidate.acceptance,'pending');assert.equal(candidate.published,false);assert.equal(candidate.commit,(await git(['rev-parse','HEAD'])).stdout.trim());
 await assert.rejects(buildCandidate(repo,directory),{code:'EEXIST'});
 const archive=join(directory,candidate.archive),bytes=await readFile(archive);await writeFile(archive,Buffer.concat([bytes,Buffer.from('changed')]));await assert.rejects(verifyCandidate(directory),/Changed candidate file/);await writeFile(archive,bytes);
 const manifest=await readFile(join(directory,'candidate.json'));const bad={...candidate,archive:'../outside.tgz'};await writeFile(join(directory,'candidate.json'),JSON.stringify(bad));await assert.rejects(verifyCandidate(directory));await writeFile(join(directory,'candidate.json'),manifest);
 await writeFile(join(directory,'unexpected.txt'),'extra');await assert.rejects(verifyCandidate(directory),/Unexpected/);await rm(join(directory,'unexpected.txt'));
 const original=await readFile(join(directory,'SHA256SUMS'));await writeFile(join(directory,'SHA256SUMS'),'');await assert.rejects(verifyCandidate(directory),/Checksum inventory/);await writeFile(join(directory,'SHA256SUMS'),original);
 if(process.platform!=='win32'){
  const source=join(base,'archive-copy.tgz');await cp(archive,source);await rm(archive);await symlink(source,archive);await assert.rejects(verifyCandidate(directory),/regular files/);await rm(archive);await writeFile(archive,bytes);
 }
 assert.equal((await verifyCandidate(directory)).sha256,candidate.sha256);
});
