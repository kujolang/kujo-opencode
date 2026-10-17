// Canonical artifact preflight; deliberately not live specialist evidence.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'kujo-understand-canonical-'));
await exec('git',['init','-q',root]);
await writeFile(join(root,'README.md'),'# Understand fixture\nA deterministic local greeting; no network or authentication coverage.\n');
await writeFile(join(root,'understand-fixture.kujo'),'println("understand fixture")\n');
const binary=resolveKujoBinary();
async function run(product,args){const source=resolve('..',product);return exec(binary,['run',join(source,product+'.kujo'),'--interpreter','--',...args],{cwd:root,env:{...process.env,KUJO_MODULE_PATH:source},timeout:120000,maxBuffer:4*4000*4000});}
const output=join(root,'.kujo/understand-scout');
await run('scout',[root,'-o',output,'--quick']);
const directories=await readdir(output);assert.equal(directories.length,1);
const manifest=JSON.parse(await readFile(join(output,directories[0],'scan_manifest.json'),'utf8'));
assert.equal(manifest.tool.name,'scout');assert.equal(manifest.schema_version,1);assert.ok(manifest.artifacts&&typeof manifest.artifacts==='object');assert.ok(Object.keys(manifest.artifacts).length>0);
const task='Explain understand-fixture.kujo and identify what this tiny fixture does not test';
await run('scent',['pack','--task',task,'--budget','4000','--target','generic','--json','--dry-run']);
await assert.rejects(readFile(join(root,'.kujo/scent/context.json')),{code:'ENOENT'});
await run('scent',['pack','--task',task,'--budget','4000','--target','generic','--json','--out',join(root,'.kujo/scent'),'--format','both']);
const context=JSON.parse(await readFile(join(root,'.kujo/scent/context.json'),'utf8'));
assert.equal(context.task,task);assert.equal(context.budget,4000);assert.equal(context.target,'generic');assert.ok(Array.isArray(context.selected_files));
JSON.parse(await readFile(join(root,'.kujo/scent/redactions.json'),'utf8'));
console.log(JSON.stringify({ok:true,root,canonical_artifacts:true,live_specialist:false}));
