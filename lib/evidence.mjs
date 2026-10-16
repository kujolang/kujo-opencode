import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {relative} from 'node:path';
import {readLastLines} from './io.mjs';
import {safeExistingFile,safeExistingDirectory} from './paths.mjs';

// Match the canonical writer's three retained archives. Every read is bounded;
// this is recent retained evidence, never an assertion of complete history.
export async function queryEvidence({path,project,scope='project',sessionID,receiptID,limit=50}) {
 if(!['project','session','legacy'].includes(scope))throw Error('Unknown evidence scope');
 if(scope==='session'&&!sessionID)throw Error('A session is required');
 const found=[],seen=new Set();let scanned=0,invalid=0;
 for(let archive=0;archive<=3;archive++){
  const lines=await readLastLines(archive?`${path}.${archive}`:path,100000,2*1024*1024);
  for(const line of lines.reverse()){
   let receipt;try{receipt=JSON.parse(line);}catch{invalid++;continue;}
   if(receipt?.schema!=='kujo.ability.receipt/v1'||typeof receipt.receipt_id!=='string'){invalid++;continue;}
   if(seen.has(receipt.receipt_id))continue;seen.add(receipt.receipt_id);scanned++;
   const root=receipt.metadata?.project_root;
   if(scope==='legacy'?Boolean(root):root!==project)continue;
   if(scope==='session'&&receipt.metadata?.session_id!==sessionID)continue;
   if(receiptID&&receipt.receipt_id!==receiptID)continue;
   found.push(receipt);
  }
 }
 found.sort((a,b)=>(b.completed_at_ms||0)-(a.completed_at_ms||0)||a.receipt_id.localeCompare(b.receipt_id));
 return {scope,project,session_id:scope==='session'?sessionID:null,receipts:found.slice(0,Math.min(Math.max(limit,1),100)),matches:found.length,scanned,invalid_records:invalid,coverage:'Recent retained evidence: up to 2 MiB per ledger file, current plus three archives. Older records may be absent.',unscoped:scope==='legacy'};
}
export function evidenceSummary(receipt){
 const {result,error,...summary}=receipt;
 return {...summary,result:result===null?null:{omitted:true},error:error?{code:error.code,message:error.message}:null};
}
export function artifactReferences(receipt){
 const paths=receipt.result?.artifacts||receipt.error?.details?.artifacts;
 return Array.isArray(paths)?paths.filter(path=>typeof path==='string'):[];
}
export async function previewArtifact(project,path){
 let file;
 try{file=await safeExistingFile(project,path);}catch(error){
  if(error.code!=='ability_path_invalid')throw error;
  const directory=await safeExistingDirectory(project,path);
  // Do not recurse or follow entries. Bound enumeration even in large folders.
  const {opendir}=await import('node:fs/promises');const directoryHandle=await opendir(directory);const entries=[];
  for await(const entry of directoryHandle){entries.push({name:entry.name,type:entry.isSymbolicLink()?'symlink':entry.isDirectory()?'directory':'file'});if(entries.length===51)break;}
  return {path:relative(project,directory),kind:'directory',entries:entries.slice(0,50),truncated:entries.length>50};
 }
 const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const stat=await handle.stat();if(!stat.isFile())throw Error('Artifact is not a regular file');
  const bytes=Buffer.alloc(65537);const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
  let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,Math.min(bytesRead,65536)),{stream:bytesRead>65536});}catch{throw Error('Artifact preview supports UTF-8 text only');}
  if(content.includes('\0'))throw Error('Binary artifact cannot be previewed as text');
  return {path:relative(project,file),kind:'file',content,truncated:bytesRead>65536,notice:'Current file contents; receipt paths are references, not immutable snapshots.'};
 }finally{await handle.close();}
}

export function compareReceipts(left,right){
 return {left:left.receipt_id,right:right.receipt_id,same_ability:left.ability_id===right.ability_id,same_definition:left.definition_digest===right.definition_digest,status:{left:left.status,right:right.status},duration_ms:{left:left.duration_ms,right:right.duration_ms,delta:right.duration_ms-left.duration_ms},model:{left:left.metadata?.model_id,right:right.metadata?.model_id},serialized_result_equal:JSON.stringify(left.result)===JSON.stringify(right.result),notice:'Compares recorded outcomes and serialized results, not correctness or release readiness. Timing is informational.'};
}
