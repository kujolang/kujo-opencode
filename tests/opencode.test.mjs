import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preflightHost, configureMcp, removeMcp, projectSkills } from '../lib/install.mjs';
import { packageRoot, homePaths } from '../lib/paths.mjs';
import { VERSION } from '../lib/version.mjs';

async function fixture() {
 const root = await mkdtemp(join(tmpdir(), 'kujo-opencode-config-'));
 await mkdir(join(root, '.opencode'));
 return root;
}
test('OpenCode V2 projection preserves settings and other servers through removal', async () => {
 const root = await fixture();
 const path = join(root, '.opencode/opencode.json');
 const existing = {model:'opencode/glm-5.3-flash-free',permissions:[{action:'shell',resource:'*',effect:'ask'}],mcp:{timeout:{startup:30000},servers:{other:{type:'local',command:['other']}}}};
 await writeFile(path, JSON.stringify(existing));
 await configureMcp({projection_root:join(homePaths().root,'runtime',VERSION)},root);
 const next = JSON.parse(await readFile(path));
 assert.deepEqual(next.permissions,existing.permissions);
 assert.equal(next.model,existing.model);
 assert.deepEqual(next.mcp.timeout,existing.mcp.timeout);
 assert.equal(next.mcp.servers.kujo.type,'local');
 assert.equal(next.mcp.servers.kujo.codemode,false);
 assert.ok(Array.isArray(next.mcp.servers.kujo.command));
 assert.equal(next.mcp.servers.kujo.environment.KUJO_OPENCODE_PROJECT,root);
 await removeMcp(root);
 assert.deepEqual(JSON.parse(await readFile(path)),existing);
});
test('setup refuses unowned servers, malformed configs and symlinked roots',async()=>{
 for (const content of ['null','[]','{"mcp":[]}','{"mcp":{"servers":[]}}','{"mcp":{"servers":{"kujo":{"command":["unrelated"]}}}}']) {
  const root=await fixture(); const path=join(root,'.opencode/opencode.json');
  await writeFile(path,content); await assert.rejects(preflightHost(root));
  assert.equal(await readFile(path,'utf8'),content);
 }
 const root=await fixture(); await writeFile(join(root,'.opencode/opencode.jsonc'),'{}');
 await preflightHost(root);
 const parent=await mkdtemp(join(tmpdir(),'kujo-opencode-symlink-')); const outside=await fixture();
 await symlink(outside,join(parent,'.opencode'));
 await assert.rejects(preflightHost(parent),/symbolic links/);
});
test('skills refuse unowned content and symlinked parent directories',async()=>{
 const root=await fixture(); const sources=await fixture();
 const catalog={profiles:[{id:'p',ability_ids:['a']}],abilities:[{definition:{id:'a'},source:'scout'}]};
 const name='kujo-scout-workflows'; await mkdir(join(sources,'skills',name),{recursive:true});
 await writeFile(join(sources,'skills',name,'SKILL.md'),'canonical');
 const target=join(root,'.opencode/skills',name); await mkdir(target,{recursive:true});
 await writeFile(join(target,'SKILL.md'),'user content');
 await assert.rejects(projectSkills(catalog,{profile:'p',sources:{'kujo-skills':{path:sources,commit:'fixture'}}},root),/unowned/);
 assert.equal(await readFile(join(target,'SKILL.md'),'utf8'),'user content');
});

test('JSONC merge keeps comments and trailing commas, supports root config and upgrades', async () => {
 const root=await fixture(); const path=join(root,'opencode.jsonc');
 const original='{\n // keep my model\n "model":"custom",\n "mcp":{"servers":{"other":{"type":"remote","url":"http://localhost:99"}}},\n}\n';
 await writeFile(path,original);
 await configureMcp({projection_root:join(homePaths().root,'runtime','0.1.0')},root);
 await configureMcp({projection_root:join(homePaths().root,'runtime',VERSION)},root);
 const text=await readFile(path,'utf8'); assert.match(text,/keep my model/); assert.match(text,/custom/); assert.match(text,/localhost:99/);
 await removeMcp(root); assert.match(await readFile(path,'utf8'),/keep my model/);
 await assert.rejects(readFile(join(root,'.opencode/opencode.json')),{code:'ENOENT'});
});

test('multiple Kujo config definitions fail closed without changing either file', async()=> {
 const root=await fixture();
 const content=JSON.stringify({mcp:{servers:{kujo:{command:['other']}}}});
 for (const name of ['opencode.json','.opencode/opencode.jsonc']) await writeFile(join(root,name),content);
 await assert.rejects(preflightHost(root),/multiple OpenCode files/);
 assert.equal(await readFile(join(root,'opencode.json'),'utf8'),content);
});
