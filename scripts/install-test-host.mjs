import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,lstat,chmod,appendFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
export function hostPackage(version,platform=process.platform,arch=process.arch){
 assert.match(version,/^2\.\d+\.\d+$/,'Select an exact OpenCode 2 release');
 assert.ok(['darwin','linux','win32'].includes(platform)&&['x64','arm64'].includes(arch),'Unsupported test host platform');
 return `@opencode/cli-${platform==='win32'?'windows':platform}-${arch}${arch==='x64'?'-baseline':''}@${version}`;
}
export async function installTestHost(version,directory){
 const identity=hostPackage(version);directory=resolve(directory);await mkdir(directory);
 assert.ok(process.env.npm_execpath,'Run via npm run test:host-install');
 const npm=async args=>exec(process.execPath,[process.env.npm_execpath,...args,'--registry=https://registry.npmjs.org/'],{timeout:300000,maxBuffer:1024*1024});
 const expected=JSON.parse((await npm(['view',identity,'dist.integrity','--json'])).stdout);
 const packed=JSON.parse((await npm(['pack',identity,'--ignore-scripts','--json','--pack-destination',directory])).stdout)[0];
 assert.equal(packed.name+'@'+packed.version,identity);assert.equal(packed.integrity,expected);
 assert.match(packed.filename,/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tgz$/);
 const archive=await readFile(join(directory,packed.filename));assert.equal('sha512-'+createHash('sha512').update(archive).digest('base64'),expected);
 const binary=process.platform==='win32'?'bin/opencode.exe':'bin/opencode';
 assert.ok(packed.files.some(file=>file.path===binary),'Native binary missing from official package');
 await exec('tar',['-xzf',packed.filename,'--strip-components=1','package/'+binary],{cwd:directory});
 const host=join(directory,binary);assert.ok((await lstat(host)).isFile(),'Native binary must be a regular file');
 if(process.platform!=='win32')await chmod(host,0o755);
 const reported=(await exec(host,['--version'],{timeout:30000})).stdout.trim();assert.equal(reported,'opencode v'+version);
 const proof={version,host,reported,platform:process.platform,arch:process.arch,package:identity,integrity:expected,host_sha256:createHash('sha256').update(await readFile(host)).digest('hex')};
 await writeFile(join(directory,'host-provenance.json'),JSON.stringify(proof,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`host=${host}\nversion=${version}\n`);
 return proof;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const [version,directory,...extra]=process.argv.slice(2);assert.ok(directory&&!extra.length);console.log(JSON.stringify(await installTestHost(version,directory)));}
