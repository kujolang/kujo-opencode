import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {withDataRoot} from '../lib/paths.mjs';
import {writeInstallation,loadInstallation} from '../lib/installation.mjs';
test('migration verifies the old installed catalog without weakening normal execution checks',async()=>{
 const home=await mkdtemp(join(tmpdir(),'kujo-catalog-migration-'));
 await withDataRoot(home,async()=>{
  const projection=join(home,'runtime/0.1.0');await mkdir(join(projection,'native'),{recursive:true});await mkdir(join(projection,'catalog'));
  const binary=join(projection,'native',process.platform==='win32'?'kujo.exe':'kujo');await writeFile(binary,'fixture');
  const pin='a'.repeat(40),path=join(home,'sources/old');await mkdir(join(path,'.git'),{recursive:true});await writeFile(join(path,'.git/HEAD'),pin+'\n');
  const old={schema:'kujo.opencode.sources/v1',sources:[{id:'old',commit:pin}]};const current={sources:[...old.sources,{id:'new',commit:'b'.repeat(40)}]};
  await writeFile(join(projection,'catalog/sources.json'),JSON.stringify(old));await writeInstallation({version:'0.1.0',projection_root:projection,kujo_bin:binary,sources:{old:{path,commit:pin,mode:'pinned'}}});
  await assert.rejects(loadInstallation(current,'0.1.0'),/catalog is incomplete/);
  assert.equal((await loadInstallation(current,'0.1.0',{migration:true})).version,'0.1.0');
  await writeFile(join(path,'.git/HEAD'),'b'.repeat(40)+'\n');await assert.rejects(loadInstallation(current,'0.1.0',{migration:true}),/revision/);
  await writeFile(join(projection,'catalog/sources.json'),JSON.stringify({...old,sources:[{id:'../escape',commit:pin}]}));await assert.rejects(loadInstallation(current,'0.1.0',{migration:true}),/catalog is invalid/);
 });
});
