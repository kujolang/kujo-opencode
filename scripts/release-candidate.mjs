import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,lstat,readdir,realpath,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
const exec=promisify(execFile);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const encode=value=>JSON.stringify(value,null,2)+'\n';
const filename=name=>typeof name==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
async function npm(args,cwd){
  assert.ok(process.env.npm_execpath,'Run through npm run release:candidate or release:verify');
  return exec(process.execPath,[process.env.npm_execpath,...args],{cwd,maxBuffer:16*1024*1024,timeout:120000});
}
async function git(args,cwd){return (await exec('git',args,{cwd})).stdout.trim();}
async function clean(root){assert.equal(await git(['status','--porcelain','--untracked-files=all'],root),'','Candidate requires a clean tracked and untracked working tree');}

// This is a checksummed build record, not signed provenance or acceptance.
export async function buildCandidate(root,destination){
  root=await realpath(root);destination=resolve(destination);
  const parent=await realpath(resolve(destination,'..'));
  const rel=relative(root,parent);
  assert.ok(rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||rel==='..'||isAbsolute(rel),'Candidate directory must be outside the repository');
  await clean(root);
  const commit=await git(['rev-parse','HEAD'],root),tree=await git(['rev-parse','HEAD^{tree}'],root);
  const snapshot=await mkdtemp(join(tmpdir(),'kujo-release-source-'));
  try {
  const source=join(snapshot,'source');await mkdir(source);
  await git(['-c','core.autocrlf=false','archive','--format=tar','--output='+join(snapshot,'source.tar'),commit],root);
  await exec('tar',['-xf','source.tar','-C','source'],{cwd:snapshot});
  const pkg=await json(join(source,'package.json'));
  await mkdir(destination); // Exclusive: never replace a prior candidate.
  const packed=JSON.parse((await npm(['pack','--json','--pack-destination',destination],source)).stdout)[0];
  assert.ok(filename(packed.filename)&&packed.filename.endsWith('.tgz'),'Invalid npm archive name');
  assert.equal(packed.name,pkg.name);assert.equal(packed.version,pkg.version);
  const tarball=await readFile(join(destination,packed.filename));
  const integrity='sha512-'+createHash('sha512').update(tarball).digest('base64');
  assert.equal(packed.integrity,integrity,'npm archive integrity mismatch');
  const sbom=JSON.parse((await npm(['sbom','--package-lock-only','--omit=dev','--sbom-format=cyclonedx'],source)).stdout);
  assert.equal(sbom.bomFormat,'CycloneDX');
  const sources=await json(join(source,'catalog/sources.json'));
  assert.ok(sources.sources.every(source=>/^[a-f0-9]{40}$/.test(source.commit)),'Unpinned source');
  const provenance={schema:'kujo.opencode.build-record/v1',signed:false,commit,tree,node:process.version,npm:(await npm(['--version'],root)).stdout.trim(),platform:process.platform,arch:process.arch,runtime:await json(join(source,'.generated/BUILD.json')),gateway:await json(join(source,'.generated/GATEWAY-CONTRACT.json')),sbom_scope:'Production npm lockfile dependencies, including optional platforms; source repositories listed separately. Not an installed-machine inventory.'};
  for(const [name,value] of Object.entries({'sbom.cdx.json':encode(sbom),'sources.json':encode(sources),'build-record.json':encode(provenance),'package-lock.json':await readFile(join(source,'package-lock.json'))}))await writeFile(join(destination,name),value,{flag:'wx'});
  await clean(root);assert.equal(await git(['rev-parse','HEAD'],root),commit,'Source changed during packing');
  const files={};for(const name of (await readdir(destination)).sort())files[name]=sha(await readFile(join(destination,name)));
  const candidate={schema:'kujo.opencode.candidate/v1',name:pkg.name,version:pkg.version,commit,tree,archive:packed.filename,integrity,files,acceptance:'pending',published:false};
  await writeFile(join(destination,'candidate.json'),encode(candidate),{flag:'wx'});
  const checksums={...files,'candidate.json':sha(await readFile(join(destination,'candidate.json')))};
  await writeFile(join(destination,'SHA256SUMS'),Object.entries(checksums).sort(([a],[b])=>a.localeCompare(b)).map(([name,digest])=>`${digest}  ${name}\n`).join(''),{flag:'wx'});
  return await verifyCandidate(destination);
  } finally {await rm(snapshot,{recursive:true,force:true});}
}
export async function verifyCandidate(directory){
  directory=await realpath(directory);
  for(const name of await readdir(directory))assert.ok((await lstat(join(directory,name))).isFile(),'Candidate entries must be regular files');
  const candidate=await json(join(directory,'candidate.json'));
  assert.equal(candidate.schema,'kujo.opencode.candidate/v1');assert.ok(filename(candidate.archive)&&candidate.archive.endsWith('.tgz'));
  assert.ok(/^[a-f0-9]{40}$/.test(candidate.commit)&&/^[a-f0-9]{40}$/.test(candidate.tree),'Invalid source identity');
  const required=[candidate.archive,'sbom.cdx.json','sources.json','build-record.json','package-lock.json'].sort();
  assert.deepEqual(Object.keys(candidate.files).sort(),required,'Incomplete candidate inventory');
  assert.deepEqual((await readdir(directory)).sort(),[...required,'candidate.json','SHA256SUMS'].sort(),'Unexpected candidate files');
  const checksums={};for(const [name,digest] of Object.entries(candidate.files)){assert.ok(filename(name)&&/^[a-f0-9]{64}$/.test(digest),'Invalid checksum entry');assert.equal(sha(await readFile(join(directory,name))),digest,`Changed candidate file: ${name}`);checksums[name]=digest;}
  checksums['candidate.json']=sha(await readFile(join(directory,'candidate.json')));
  assert.equal(await readFile(join(directory,'SHA256SUMS'),'utf8'),Object.entries(checksums).sort(([a],[b])=>a.localeCompare(b)).map(([name,digest])=>`${digest}  ${name}\n`).join(''),'Checksum inventory mismatch');
  const integrity='sha512-'+createHash('sha512').update(await readFile(join(directory,candidate.archive))).digest('base64');assert.equal(candidate.integrity,integrity);
  const record=await json(join(directory,'build-record.json'));assert.equal(record.commit,candidate.commit);assert.equal(record.tree,candidate.tree);assert.equal(record.signed,false);
  const lock=await json(join(directory,'package-lock.json'));assert.equal(lock.name,candidate.name);assert.equal(lock.version,candidate.version);
  assert.equal((await json(join(directory,'sbom.cdx.json'))).bomFormat,'CycloneDX');
  const packed=JSON.parse((await npm(['pack','--dry-run','--ignore-scripts','--json',join(directory,candidate.archive)],directory)).stdout)[0];
  assert.equal(packed.name,candidate.name);assert.equal(packed.version,candidate.version);
  return {ok:true,directory,...candidate,sha256:candidate.files[candidate.archive]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [mode,directory,...extra]=process.argv.slice(2);
  assert.ok(['build','verify'].includes(mode)&&directory&&!extra.length,'Usage: release-candidate.mjs build|verify DIRECTORY');
  console.log(JSON.stringify(await (mode==='build'?buildCandidate(process.cwd(),directory):verifyCandidate(directory)),null,2));
}
