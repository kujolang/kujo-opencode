import {constants} from 'node:fs';
import {open,mkdir,readdir,lstat,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,relative,dirname,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {safeExistingDirectory,safeExistingFile,safeOutputPath} from './paths.mjs';
import {replaceDirectory,recoverDirectory} from './atomic-directory.mjs';
import {run} from './process.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const extensions=new Set(['.md','.markdown','.txt','.kujo']);
const fail=message=>Object.assign(Error(message),{code:'kujo_knowledge_invalid'});
function name(value='default'){if(typeof value!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(value))throw fail('Choose a lowercase knowledge name, at most 64 characters');return value;}
async function bounded(path,limit){const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await f.stat();if(!s.isFile()||s.size>limit)throw fail('Knowledge file exceeds its inspection limit');const b=Buffer.alloc(limit+1);let n=0;while(n<b.length){const r=await f.read(b,n,b.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead;}if(n>limit)throw fail('Knowledge file grew beyond its inspection limit');return b.subarray(0,n);}finally{await f.close();}}
async function inventory(project,path,signal){
 const root=await safeExistingDirectory(project,path),files=[];let bytes=0,visited=0;
 async function scan(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){signal?.throwIfAborted();if(++visited>2048)throw fail('Choose a smaller corpus (at most 2048 entries)');if(entry.name.startsWith('.')||['node_modules','dist','vendor'].includes(entry.name))continue;const file=join(dir,entry.name);if(entry.isSymbolicLink())throw fail('Knowledge corpus must not contain symbolic links');if(entry.isDirectory())await scan(await safeExistingDirectory(project,file));else if(entry.isFile()&&extensions.has(extname(entry.name).toLowerCase())){const content=await bounded(await safeExistingFile(project,file),256*1024);new TextDecoder('utf-8',{fatal:true}).decode(content);bytes+=content.length;if(bytes>8*1024*1024||files.length>=128)throw fail('Choose at most 128 text files totaling 8 MiB');files.push({path:relative(root,file).split('\\').join('/'),sha256:digest(content),bytes:content.length,content});}}}
 await scan(root);if(!files.length)throw fail('No supported text files: choose Markdown, text or Kujo source');
 return {path:relative(project,root)||'.',bytes,files};
}
async function destination(project,value){return safeOutputPath(project,`.kujo/knowledge/${name(value)}`);}
function provenance(config){const source=config.sources.rag;if(!source)throw fail('Canonical RAG source is not installed');return {source:source.commit||source.path,runtime:config.kujo_bin};}
export async function previewKnowledge({project,config,input,signal}){
 const corpus=await inventory(project,input.path||'docs',signal),files=corpus.files.map(({content,...entry})=>entry);const manifest={schema:'kujo.opencode.knowledge/v1',name:name(input.name),path:corpus.path,files,provenance:provenance(config)};
 return {...manifest,bytes:corpus.bytes,digest:digest(JSON.stringify(manifest)),index_input:{name:manifest.name,path:manifest.path,digest:digest(JSON.stringify(manifest))},mode:'offline',exclusions:['dotfiles','node_modules','dist','vendor','non-text extensions']};
}
async function canonical({config,cwd,args,signal}){
 const source=config.sources.rag.path,env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('KUJO_RAG_')));
 Object.assign(env,{KUJO_MODULE_PATH:source,KUJO_ISOLATED_IMPORTS:'1',KUJO_RAG_EMBEDDING_PROVIDER:'hash',KUJO_RAG_VECTOR_BACKEND:'local_json',KUJO_RAG_INDEX_PATH:'./index.json',KUJO_RAG_NAMESPACE_INDEX_ISOLATION:'false'});
 const result=await run(config.kujo_bin,['run',join(source,'main.kujo'),'--interpreter','--isolated-imports','--',...args],{cwd,env,signal,killTree:true,timeoutMs:240000,maxBytes:1024*1024});
 let output;try{output=JSON.parse(result.stdout.trim());}catch{throw fail('Canonical RAG returned invalid output; inspect retained evidence');}
 if(result.exitCode!==0||output.ok===false)throw fail('Canonical RAG operation failed');return output;
}
export async function indexKnowledge({project,config,input,signal}){
 const preview=await previewKnowledge({project,config,input,signal});if(preview.digest!==input.digest)throw fail('Corpus or runtime changed since preview; review a new preview');
 const corpus=await inventory(project,preview.path,signal);if(JSON.stringify(corpus.files.map(({content,...f})=>f))!==JSON.stringify(preview.files))throw fail('Corpus changed while preparing the snapshot');
 const target=await destination(project,preview.name);let result;
 await replaceDirectory(target,async staged=>{await mkdir(join(staged,'corpus'),{recursive:true});for(const file of corpus.files){signal?.throwIfAborted();const path=join(staged,'corpus',file.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,file.content,{flag:'wx',mode:0o600});}
 result=await canonical({config,cwd:staged,args:['ingest','--path','corpus','--recursive','true'],signal});
 if(result.errors?.length||!result.summary?.chunks)throw fail('Canonical ingestion produced errors or no chunks; previous index retained');
 const index=await bounded(join(staged,'index.json'),32*1024*1024);
 await writeFile(join(staged,'manifest.json'),JSON.stringify({...preview,index_sha256:digest(index),summary:result.summary}),{flag:'wx',mode:0o600});
 },{checkpoint:async()=>signal?.throwIfAborted()});return {state:'indexed',name:preview.name,digest:preview.digest,summary:result.summary,artifacts:[join(target,'manifest.json')]};
}
async function stored(project,value){const target=await destination(project,value);try{await lstat(target+'.install-lock');throw fail('Knowledge installation is active or interrupted; recover after its owner stops');}catch(e){if(e.code!=='ENOENT')throw e;}
 const path=await safeExistingFile(project,join(target,'manifest.json'));const manifest=JSON.parse((await bounded(path,1024*1024)).toString());if(manifest.schema!=='kujo.opencode.knowledge/v1'||manifest.name!==name(value)||typeof manifest.digest!=='string'||!Array.isArray(manifest.files))throw fail('Invalid managed knowledge manifest');
 const index=await bounded(await safeExistingFile(project,join(target,'index.json')),32*1024*1024);if(digest(index)!==manifest.index_sha256)throw fail('Knowledge index changed outside the managed workflow; rebuild it');return {target,manifest,index};}
export async function knowledgeStatus({project,config,input,signal}){let record;try{record=await stored(project,input.name);}catch(e){if(e.code==='ENOENT')return {state:'missing',name:name(input.name)};throw e;}
 const {manifest}=record;try{const now=await previewKnowledge({project,config,input:{name:manifest.name,path:manifest.path},signal});return {state:now.digest===manifest.digest?'current':'stale',name:manifest.name,path:manifest.path,summary:manifest.summary,digest:manifest.digest};}catch(e){if(signal?.aborted)throw e;return {state:'stale',name:manifest.name,path:manifest.path,reason:'Corpus is missing, unreadable or no longer meets snapshot limits'};}}
export async function queryKnowledge({project,config,input,signal}){
 if(typeof input.question!=='string'||!input.question.trim()||input.question.length>4000)throw fail('Enter a question of 1–4000 characters');const state=await knowledgeStatus({project,config,input,signal});if(state.state!=='current')throw fail('Knowledge index is missing or stale; review and rebuild before querying');const {manifest,index}=await stored(project,input.name);if(manifest.digest!==state.digest)throw fail('Index changed during query preparation; retry inspection');const temp=await mkdtemp(join(tmpdir(),'kujo-knowledge-query-'));
 try{await writeFile(join(temp,'index.json'),index,{mode:0o600});const result=await canonical({config,cwd:temp,args:['query','--question',input.question],signal});return {state:'current',name:manifest.name,digest:manifest.digest,result,citation_root:manifest.path,citation_prefix:'corpus/',note:'Citations refer to the reviewed corpus snapshot; map corpus/ paths relative to citation_root.'};}finally{await rm(temp,{recursive:true,force:true});}
}
export async function recoverKnowledge({project,input}){return recoverDirectory(await destination(project,input.name));}
