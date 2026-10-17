import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {npmInvocation} from '../lib/npm-command.mjs';
import {run} from '../lib/process.mjs';

test('Windows npm resolution executes JavaScript without shell interpretation',async t=>{
 const root=await mkdtemp(join(tmpdir(),'kujo npm & fixture-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const cli=join(root,'node_modules/npm/bin/npm-cli.js');
 await mkdir(join(root,'node_modules/npm/bin'),{recursive:true});
 await writeFile(cli,'console.log(JSON.stringify(process.argv.slice(2)))');
 const command=await npmInvocation(undefined,{platform:'win32',env:{Path:root},executable:join(root,'opencode.exe')});
 assert.equal(command[1],cli);
 const args=['ci','a & echo unexpected','%PATH%'];
 const result=await run(process.execPath,[command[1],...args]);
 assert.equal(result.exitCode,0);assert.deepEqual(JSON.parse(result.stdout),args);
 await assert.rejects(npmInvocation(undefined,{platform:'win32',env:{},executable:join(root,'missing/opencode.exe')}),{code:'install_npm_missing'});
});
