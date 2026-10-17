import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {previewKnowledge,indexKnowledge,knowledgeStatus,queryKnowledge} from '../lib/knowledge.mjs';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
const config={kujo_bin:resolveKujoBinary(),sources:{rag:{path:resolve('../rag'),commit:'fixture'}}};
async function fixture(t){const project=await mkdtemp(join(tmpdir(),'kujo-knowledge-'));t.after(()=>rm(project,{recursive:true,force:true}));await mkdir(join(project,'docs'));await writeFile(join(project,'docs/guide.md'),'# Kujo modules\nKujo modules use explicit imports. Modules organize functions into reusable source files.\n');return project;}
test('knowledge preview excludes hidden and unsupported content and refuses symlinks',async t=>{
 const project=await fixture(t);await writeFile(join(project,'docs/.env'),'SECRET=not indexed');await writeFile(join(project,'docs/data.bin'),'binary');const preview=await previewKnowledge({project,config,input:{}});assert.deepEqual(preview.files.map(f=>f.path),['guide.md']);await symlink(join(project,'docs/guide.md'),join(project,'docs/link.md'));await assert.rejects(previewKnowledge({project,config,input:{}}),/symbolic/);
});
test('knowledge validates names and corpus boundaries before mutation',async t=>{
 const project=await fixture(t);await assert.rejects(previewKnowledge({project,config,input:{name:'../escape'}}),/lowercase/);await assert.rejects(previewKnowledge({project,config,input:{path:'..'}}),/within/);
});
