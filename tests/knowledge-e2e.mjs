import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {previewKnowledge,indexKnowledge,knowledgeStatus,queryKnowledge} from '../lib/knowledge.mjs';
import {resolveKujoBinary} from '@kujolang/kujo-runtime';
const config={kujo_bin:resolveKujoBinary(),sources:{rag:{path:resolve('../rag'),commit:'fixture'}}};
async function fixture(t){const project=await mkdtemp(join(tmpdir(),'kujo-knowledge-'));t.after(()=>rm(project,{recursive:true,force:true}));await mkdir(join(project,'docs'));await writeFile(join(project,'docs/guide.md'),'# Kujo modules\nKujo modules use explicit imports. Modules organize functions into reusable source files.\n');return project;}
test('reviewed canonical offline knowledge indexes, queries, detects stale and preserves old index',async t=>{
 const project=await fixture(t);assert.equal((await knowledgeStatus({project,config,input:{}})).state,'missing');const preview=await previewKnowledge({project,config,input:{}});assert.equal(preview.files.length,1);
 const indexed=await indexKnowledge({project,config,input:preview.index_input});assert.equal(indexed.state,'indexed');assert.equal((await knowledgeStatus({project,config,input:{}})).state,'current');
 const query=await queryKnowledge({project,config,input:{question:'How do Kujo modules organize functions?'}});assert.equal(query.state,'current');assert.match(JSON.stringify(query.result),/guide.md/);
 const before=await readFile(join(project,'.kujo/knowledge/default/index.json'));
 await writeFile(join(project,'docs/guide.md'),'Changed corpus');assert.equal((await knowledgeStatus({project,config,input:{}})).state,'stale');await assert.rejects(indexKnowledge({project,config,input:preview.index_input}),/changed since preview/);await assert.rejects(queryKnowledge({project,config,input:{question:'modules'}}),/stale/);assert.deepEqual(await readFile(join(project,'.kujo/knowledge/default/index.json')),before);
});

test('managed knowledge ignores project provider configuration and rejects corrupted indexes',async t=>{
 const project=await fixture(t);await writeFile(join(project,'.env'),'KUJO_RAG_EMBEDDING_PROVIDER=openai\nKUJO_RAG_VECTOR_BACKEND=qdrant\n');
 const preview=await previewKnowledge({project,config,input:{}});await indexKnowledge({project,config,input:preview.index_input});
 const status=await knowledgeStatus({project,config,input:{}});assert.equal(status.summary.provider,'hash');
 await writeFile(join(project,'docs/added.txt'),'New document');assert.equal((await knowledgeStatus({project,config,input:{}})).state,'stale');
 await rm(join(project,'docs/added.txt'));assert.equal((await knowledgeStatus({project,config,input:{}})).state,'current');
 await writeFile(join(project,'.kujo/knowledge/default/index.json'),'{}');await assert.rejects(knowledgeStatus({project,config,input:{}}),/changed outside/);
});
