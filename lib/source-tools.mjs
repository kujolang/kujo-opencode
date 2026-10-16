import {constants} from 'node:fs';
import {open,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {safeExistingFile} from './paths.mjs';
import {run} from './process.mjs';

export const MAX_SOURCE_BYTES=64*1024;
// Canonical tooling operates on a bounded private copy. Formatting never writes
// the source; check/lint do not execute the program or establish import validity.
export async function inspectSource({project,binary,file,mode,signal}) {
 if(!['inspect','format'].includes(mode))throw new Error('unknown source operation');
 if(!file.endsWith('.kujo'))throw Object.assign(new Error('Select a .kujo source file'),{code:'kujo_source_type'});
 signal?.throwIfAborted();
 const source=await safeExistingFile(project,file);
 const handle=await open(source,constants.O_RDONLY|constants.O_NOFOLLOW);
 let bytes;
 try {
  const stat=await handle.stat();
  if(!stat.isFile()||stat.size>MAX_SOURCE_BYTES)throw Object.assign(new Error('Source must be a regular file no larger than 64 KiB'),{code:'kujo_source_limit'});
  const buffer=Buffer.alloc(MAX_SOURCE_BYTES+1);let length=0;
  while(length<buffer.length){const read=await handle.read(buffer,length,buffer.length-length,length);if(!read.bytesRead)break;length+=read.bytesRead;}
  if(length>MAX_SOURCE_BYTES)throw Object.assign(new Error('Source exceeds 64 KiB'),{code:'kujo_source_limit'});
  bytes=buffer.subarray(0,length);
 }finally{await handle.close();}
 let original;try{original=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Object.assign(new Error('Source must be UTF-8 text'),{code:'kujo_source_encoding'});}
 const digest=createHash('sha256').update(bytes).digest('hex');const name=relative(project,source);
 const temporary=await mkdtemp(join(tmpdir(),'kujo-source-'));
 try {
  const snapshot=join(temporary,'source.kujo');await writeFile(snapshot,bytes,{mode:0o600});
  const invoke=async command=>{
   signal?.throwIfAborted();
   const result=await run(binary,[command,snapshot,'--json'],{cwd:temporary,signal,timeoutMs:15000,maxBytes:256*1024});
   if(result.signal)throw Object.assign(new Error('Source operation exceeded its execution window'),{code:'kujo_source_timeout'});
   const text=result.stdout.replaceAll(snapshot,name);const stderr=result.stderr.replaceAll(snapshot,name).slice(-32768);let diagnostics;
   try{diagnostics=JSON.parse(text);}catch{
    if(['check','lint'].includes(command)&&[3,4].includes(result.exitCode)&&/\[KUJO[A-Z0-9_]+\]/.test(stderr))diagnostics={format:'text',text:stderr};
    else throw Object.assign(new Error('Canonical runtime returned invalid source diagnostics'),{code:'kujo_source_protocol',details:{exit_code:result.exitCode,stderr}});}
   if(command==='format'&&(result.exitCode!==0||diagnostics?.status!=='preview'||diagnostics?.options?.write!==false||typeof diagnostics.formatted_source!=='string'))throw Object.assign(new Error('Canonical formatting preview failed'),{code:'kujo_source_format_failed'});
   return {exit_code:result.exitCode,diagnostics,stderr};
  };
  const common={file:name,sha256:digest,source_bytes:bytes.length,scope:'single-file',executed_program:false,modified_source:false};
  if(mode==='format')return {...common,original,format:await invoke('format')};
  const check=await invoke('check');const lint=await invoke('lint');
  return {...common,valid:check.exit_code===0,check,lint};
 }finally{await rm(temporary,{recursive:true,force:true});}
}
