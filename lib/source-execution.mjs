import {tmpdir} from 'node:os';
import {constants} from 'node:fs';
import {open,mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,posix} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {safeExistingFile,safeOutputPath} from './paths.mjs';
import {run} from './process.mjs';

const MAX_BYTES=4*1024*1024;
function command(input){
 if(Buffer.byteLength(JSON.stringify(input))>32768)throw Error('Execution manifest exceeds 32 KiB');
 if(!['run','test'].includes(input.mode))throw Error('Choose run or test');
 if(!Array.isArray(input.files)||!input.files.length||input.files.length>256)throw Error('Select 1–256 files for the execution snapshot');
 const paths=input.files.map(item=>typeof item==='string'?item:item.path);
 if(new Set(paths).size!==paths.length)throw Error('Duplicate snapshot paths');
 for(const path of paths)if(typeof path!=='string'||!path||path.includes('\\')||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..')||path.length>1024||path.includes('\0'))throw Error('Snapshot paths must be normalized project-relative paths');
 const args=input.args||[];
 if(!Array.isArray(args)||args.length>32||args.some(arg=>typeof arg!=='string'||arg.length>4096||arg.includes('\0')))throw Error('Invalid program arguments');
 if(input.mode==='test'){
  if(input.entry||args.length)throw Error('Test mode accepts no entry or program arguments');
  const fixtures=paths.filter(path=>/^tests\/[^/]+\.kujo$/.test(path));
  if(!fixtures.length)throw Error('Include at least one top-level tests/*.kujo fixture and its expected output');
  for(const fixture of fixtures){
   const stem=fixture.slice(0,-5);
   if(!paths.includes(`${stem}.out`)&&!paths.includes(`${stem}.interpreter.out`))throw Error(`Include reviewed expected output for ${fixture}; test mode cannot create missing expectations`);
  }
  return ['test','--runtime','interpreter'];
 }
 if(!input.entry?.endsWith('.kujo')||!paths.includes(input.entry))throw Error('The .kujo entry must be included in the snapshot');
 return ['run','--interpreter','--isolated-imports',...(process.platform==='win32'?['--kill-children-on-exit']:[]),input.entry,'--',...args];
}
async function snapshot(project,input,verify,signal){
 const argv=command(input);let total=0;const files=[];
 for(const item of input.files){
  signal?.throwIfAborted();const path=typeof item==='string'?item:item.path;
  const source=await safeExistingFile(project,path);const handle=await open(source,constants.O_RDONLY|constants.O_NOFOLLOW);
  let bytes;
  try{
   const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_BYTES-total)throw Error('Execution snapshot exceeds 4 MiB');
   const buffer=Buffer.alloc(MAX_BYTES-total+1);let length=0;
   while(length<buffer.length){const read=await handle.read(buffer,length,buffer.length-length,length);if(!read.bytesRead)break;length+=read.bytesRead;}
   if(length>MAX_BYTES-total)throw Error('Execution snapshot exceeds 4 MiB');bytes=buffer.subarray(0,length);
  }finally{await handle.close();}
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(verify&&item.sha256!==sha256)throw Object.assign(new Error(`Source changed since preview: ${path}. Preview again before requesting approval.`),{code:'kujo_source_changed'});
  total+=bytes.length;files.push({path,sha256,bytes});
 }
 return {argv,files,total};
}
export async function previewExecution({project,binary,input,signal}){
 const data=await snapshot(project,input,false,signal);let remaining=16384;
 const runtimeSha=createHash('sha256').update(await readFile(binary)).digest('hex');
 const executionInput={runtime_sha256:runtimeSha,mode:input.mode,entry:input.entry||'',args:input.args||[],files:data.files.map(({path,sha256})=>({path,sha256}))};command(executionInput);
 return {command:['kujo',...data.argv],cwd:'A new retained .kujo/executions/<id> snapshot directory',total_bytes:data.total,execution_input:executionInput,files:data.files.map(({path,sha256,bytes})=>{
  const length=Math.min(bytes.length,remaining);remaining-=length;let preview;
  try{preview=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length),{stream:length<bytes.length});}catch{preview='[binary data]';}
  return {path,sha256,size:bytes.length,preview,preview_truncated:length<bytes.length};
 }),notice:'Review every selected file, arguments and program effects before approval. Execution uses these exact bytes, but trusted programs can access the host; the snapshot is not a sandbox. Include imports, resources and expected test outputs explicitly.'};
}
export async function executeSource({project,binary,input,signal}){
 const data=await snapshot(project,input,true,signal);signal?.throwIfAborted();
 const runtimeBytes=await readFile(binary);
 if(createHash('sha256').update(runtimeBytes).digest('hex')!==input.runtime_sha256)throw Object.assign(new Error('Runtime changed since preview; preview again before approval'),{code:'kujo_runtime_changed'});
 const directory=await safeOutputPath(project,`.kujo/executions/${randomUUID()}`);
 await mkdir(directory,{recursive:true,mode:0o700});
 try{
  for(const file of data.files){const target=join(directory,file.path);await mkdir(join(directory,posix.dirname(file.path)),{recursive:true});await writeFile(target,file.bytes,{flag:'wx',mode:0o600});}
 }catch(error){await rm(directory,{recursive:true,force:true});throw error;}
 // Prevent inherited import roots from selecting code outside the reviewed set.
 const env={...process.env,KUJO_ISOLATED_IMPORTS:"1",KUJO_MODULE_PATH:directory};
 const runtimeDirectory=await mkdtemp(join(tmpdir(),'kujo-reviewed-runtime-'));const executable=join(runtimeDirectory,process.platform==='win32'?'kujo.exe':'kujo');
 let outcome;
 try{
  await writeFile(executable,runtimeBytes,{mode:0o700,flag:'wx'});
  signal?.throwIfAborted();outcome=await run(executable,data.argv,{cwd:directory,env,signal,timeoutMs:120000,maxBytes:32*1024,killTree:true});
 }catch(error){error.details={...error.details,artifacts:[directory],notice:'Snapshot retained; execution may have produced effects. Inspect evidence before retrying.'};throw error;}finally{await rm(runtimeDirectory,{recursive:true,force:true});}
 const emptySuite=input.mode==='test'&&/^\[✓\] Passed 0\/0 tests\s*$/m.test(outcome.stdout);
 const result={mode:input.mode,runtime_sha256:input.runtime_sha256,command:['kujo',...data.argv],exit_code:outcome.exitCode,signal:outcome.signal,passed:outcome.exitCode===0&&!outcome.signal&&!emptySuite,stdout:outcome.stdout,stderr:outcome.stderr,files:data.files.map(({path,sha256})=>({path,sha256})),artifacts:[directory],notice:'Trusted execution from the reviewed snapshot, not an OS sandbox. Generated files remain in the snapshot unless the program wrote elsewhere.'};
 if(!result.passed)throw Object.assign(new Error(emptySuite?'Canonical test command ran no fixtures':outcome.signal?'Source execution exceeded its execution window':'Canonical source command failed'),{code:'kujo_source_execution_failed',details:result});
 return result;
}
