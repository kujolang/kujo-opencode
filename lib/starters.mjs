import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,readdir,lstat,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {catalogDir,safeExistingFile,safeExistingDirectory,safeOutputPath} from './paths.mjs';
import {run} from './process.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const entrypoints={script:'src/main.kujo',agent:'src/main.kujo',api:'main.kujo',mcp:'server.kujo'};
function request(input){
 if(!Object.hasOwn(entrypoints,input.kind)||typeof input.name!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(input.name))throw Error('Choose script, agent, api or mcp and a lowercase project name');
}
function relativePath(path){if(typeof path!=='string'||path.includes('\\')||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')||path.includes('\0'))throw Error('Invalid starter file path');return path;}
async function readText(root,path){
 const file=await safeExistingFile(root,relativePath(path));const stat=await lstat(file);
 if(stat.nlink!==1||stat.size>65536)throw Error('Starter file exceeds 64 KiB or is hard-linked');
 const bytes=await readFile(file);if(bytes.length>65536)throw Error('Starter file exceeds 64 KiB');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(text.includes('\0'))throw Error('Binary starter file refused');return text;
}
async function application(target,input,sources){
 const inventory=JSON.parse(await readFile(join(catalogDir,'starter-components.json'),'utf8'));
 const component=inventory.components.find(item=>item.id===(input.kind==='api'?'crud-api':'mcp'));
 const installed=sources[component.id];if(!installed||installed.commit!==component.gitCommit)throw Error('Pinned starter component is missing; update the installation');
 await mkdir(target,{mode:0o700});
 for(const path of component.files){const content=await readText(installed.path,path);if(hash(content)!==component.checksums[path])throw Error(`Canonical starter bytes changed: ${component.id}/${path}`);const out=join(target,path==='README.md'?'UPSTREAM_README.md':path);await mkdir(dirname(out),{recursive:true,mode:0o700});await writeFile(out,content,{flag:'wx',mode:0o600});}
 const api=input.kind==='api';const entry=entrypoints[input.kind];
 await writeFile(join(target,'README.md'),`# ${input.name}\n\nCanonical ${component.id} ${component.version} starter.\nSource: ${component.repository}/tree/${component.gitCommit}\n\nAfter reviewing all files, run locally from this directory:\n\n\`\`\`sh\nkujo run ${entry} --interpreter\n\`\`\`\n\n${api?'The default server listens on 127.0.0.1:4100 and creates data/kujo_crud_api.db. Writes require an explicit authentication configuration before exposure. See UPSTREAM_README.md and docs/api-examples.md.':'The default MCP server listens on 127.0.0.1:8931 with access to ./demo. Review mcp-server.json, permitted roots and authentication before connecting clients. See docs/mcp-reference.md and docs/security-model.md.'}\n\nStop the foreground server with Ctrl+C. Preview and creation do not start a server, open a port, install dependencies or create a database. This inventory includes the canonical backend/demo only; upstream frontend, generation and test tooling mentioned in UPSTREAM_README.md may not be included.\n`,{flag:'wx',mode:0o600});
 await writeFile(join(target,'.gitignore'),'data/*.db\ndata/*.db-*\n*.log\n.env.local\n',{flag:'wx',mode:0o600});
 return {id:component.id,commit:component.gitCommit,repository:component.repository,version:component.version};
}
async function proposed({binary,sources,input,signal}){
 request(input);signal?.throwIfAborted();const temporary=await mkdtemp(join(tmpdir(),'kujo-starter-'));const target=join(temporary,input.name);
 try{
  const runtime_sha256=hash(await readFile(binary));let component=null;
  if(['api','mcp'].includes(input.kind))component=await application(target,input,sources);
  else{
   const args=input.kind==='script'?['init','--dir',target,'--name',input.name]:['agent','new',input.name,'--dir',target,'--profile','basic','--provider','fixture','--no-git','--json'];
   const result=await run(binary,args,{cwd:temporary,signal,killTree:true,timeoutMs:10000,maxBytes:16384});
   if(result.exitCode!==0||result.signal)throw Object.assign(new Error('Canonical starter generator failed'),{details:result});
  }
  const files=[],directories=[];let total=0;
  async function collect(path='',depth=0){
   if(depth>8)throw Error('Starter directory depth exceeded');
   for(const name of (await readdir(join(target,path))).sort()){
    signal?.throwIfAborted();if(['.git','node_modules','kennel_packages'].includes(name))throw Error('Generated dependency/repository files refused');const file=path?`${path}/${name}`:name;relativePath(file);
    const stat=await lstat(join(target,file));if(stat.isSymbolicLink())throw Error('Starter symlink refused');
    if(stat.isDirectory()){if(directories.length>=128)throw Error('Starter directory count exceeded');directories.push(file);await collect(file,depth+1);continue;}
    const content=await readText(target,file);total+=Buffer.byteLength(content);if(files.length>=64||total>262144||content.includes(temporary))throw Error('Starter inventory exceeds limits or contains a temporary path');files.push({path:file,content,sha256:hash(content)});
   }
  }
  await collect();if(!files.some(file=>file.path===entrypoints[input.kind]))throw Error('Canonical entrypoint missing');
  const provenance={runtime_sha256,component};const digest=hash(JSON.stringify({kind:input.kind,name:input.name,provenance,directories,files:files.map(({path,sha256})=>({path,sha256}))}));
  const result={kind:input.kind,name:input.name,entrypoint:entrypoints[input.kind],provenance,directories,files,total_bytes:total,digest};
  if(Buffer.byteLength(JSON.stringify(result))>300000)throw Error('Starter preview exceeds receipt limit');return result;
 }finally{await rm(temporary,{recursive:true,force:true});}
}
async function destination(project,input){const output=await safeOutputPath(project,input.output_dir||input.name);await safeExistingDirectory(project,dirname(output));return output;}
export async function previewStarter(options){
 const result=await proposed(options);const output=await destination(options.project,options.input);
 try{await lstat(output);throw Object.assign(new Error('Starter destination exists; inspect it or choose a new directory'),{code:'kujo_output_exists'});}catch(error){if(error.code!=='ENOENT')throw error;}
 return {...result,creation_input:{kind:result.kind,name:result.name,output_dir:options.input.output_dir||result.name,digest:result.digest},destination:output,notice:'Review every file before approval. Canonical generators or pinned application bytes; project unchanged, dependencies not installed, generated programs not executed. Agent starters use fixture configuration and require their pinned dependencies before running.'};
}
async function reviewed(options){const result=await proposed(options);if(result.digest!==options.input.digest)throw Object.assign(new Error('Starter changed since preview; preview and approve again'),{code:'kujo_starter_changed'});return result;}
export async function createStarter(options){
 const result=await reviewed(options);const output=await destination(options.project,options.input);options.signal?.throwIfAborted();
 // Exclusive directory creation is the no-overwrite boundary. A failure keeps
 // partial evidence; inspect never deletes or silently resumes uncertain writes.
 try{await mkdir(output,{mode:0o700});}catch(error){if(error.code==='EEXIST')throw Object.assign(new Error('Starter destination exists; inspect it or choose a new directory'),{code:'kujo_output_exists'});throw error;}let written=0;
 try{
  for(const directory of result.directories){options.signal?.throwIfAborted();await mkdir(await safeOutputPath(output,directory),{mode:0o700});}
  for(const file of result.files){options.signal?.throwIfAborted();const target=await safeOutputPath(output,file.path);await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,file.content,{flag:'wx',mode:0o600});written++;await options.checkpoint?.(written);}
  return {kind:result.kind,digest:result.digest,entrypoint:join(output,result.entrypoint),directories:result.directories,files:result.files.map(({path,sha256})=>({path,sha256})),artifacts:[output,join(output,result.entrypoint),...(result.files.some(file=>file.path==='README.md')?[join(output,'README.md')]:[])],notice:'Created reviewed bytes only. No program, dependency installer or server was started.'};
 }catch(error){error.details={...error.details,artifacts:[output],written_files:written,notice:'Partial starter retained. Use kujo_starter_inspect with the reviewed creation input before deciding how to recover.'};throw error;}
}
export async function inspectStarter(options){
 const result=await reviewed(options);const output=await destination(options.project,options.input);const files=[],directories=[];let missing=0,changed=0;
 for(const path of result.directories){options.signal?.throwIfAborted();let status;try{await safeExistingDirectory(output,path);status="matching";}catch(error){status=error.code==="ENOENT"?"missing":"unreadable";}if(status==="missing")missing++;else if(status!=="matching")changed++;directories.push({path,status});}
 for(const file of result.files){options.signal?.throwIfAborted();let status;
  try{status=hash(await readText(output,file.path))===file.sha256?'matching':'changed';}catch(error){status=error.code==='ENOENT'?'missing':'unreadable';}
  if(status==='missing')missing++;else if(status!=='matching')changed++;files.push({path:file.path,status});
 }
 return {digest:result.digest,status:changed?'changed':missing===files.length+directories.length?'missing':missing?'partial':'complete',files,directories,artifacts:[output],notice:'Comparison covers only the reviewed file and directory inventory; additional files are not inspected. No files were changed. Complete means the reviewed bytes exist, not that the program or dependencies were run.'};
}
