import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {inspectSource,MAX_SOURCE_BYTES} from '../lib/source-tools.mjs';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
const binary=resolveKujoBinary();

test('canonical source inspection and format preview do not execute or modify source',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-source-test-'));
 const original='x := 1\nprintln(x)\nwrite_file("must-not-exist", "executed")\n';
 await writeFile(join(project,'main.kujo'),original);
 const checked=await inspectSource({project,binary,file:'main.kujo',mode:'inspect'});
 assert.equal(checked.valid,true);assert.equal(checked.executed_program,false);assert.equal(checked.file,'main.kujo');assert.match(checked.sha256,/^[a-f0-9]{64}$/);
 const formatted=await inspectSource({project,binary,file:'main.kujo',mode:'format'});
 assert.equal(formatted.format.diagnostics.options.write,false);assert.equal(formatted.format.diagnostics.status,'preview');
 assert.equal(await readFile(join(project,'main.kujo'),'utf8'),original);
 await assert.rejects(readFile(join(project,'must-not-exist')),{code:'ENOENT'});
});
test('source inspection reports malformed code as diagnostics',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-source-invalid-'));await writeFile(join(project,'bad.kujo'),'func broken( {\n');
 const result=await inspectSource({project,binary,file:'bad.kujo',mode:'inspect'});
 assert.equal(result.valid,false);assert.notEqual(result.check.exit_code,0);assert.match(result.check.stderr,/bad.kujo|error/i);
});
test('source operations reject oversized, non-text, outside, symlink and cancelled input',async()=>{
 const project=await mkdtemp(join(tmpdir(),'kujo-source-boundary-'));const outside=await mkdtemp(join(tmpdir(),'kujo-source-outside-'));
 await writeFile(join(project,'large.kujo'),'x'.repeat(MAX_SOURCE_BYTES+1));await writeFile(join(project,'bytes.kujo'),Buffer.from([255]));
 await writeFile(join(outside,'secret.kujo'),'println("outside")');await symlink(join(outside,'secret.kujo'),join(project,'link.kujo'));
 const inspect=file=>inspectSource({project,binary,file,mode:'inspect'});
 await assert.rejects(inspect('large.kujo'),{code:'kujo_source_limit'});await assert.rejects(inspect('bytes.kujo'),{code:'kujo_source_encoding'});
 await assert.rejects(inspect(join(outside,'secret.kujo')));await assert.rejects(inspect('link.kujo'));
 await assert.rejects(inspect('main.txt'),{code:'kujo_source_type'});
 const controller=new AbortController();controller.abort();await assert.rejects(inspectSource({project,binary,file:'main.kujo',mode:'inspect',signal:controller.signal}),{name:'AbortError'});
});
