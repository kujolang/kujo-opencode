import {readdir,readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {safeExistingDirectory,safeExistingFile} from './paths.mjs';
// Canonical listing trusts index keys as paths. Validate its existing inputs
// before invoking it; do not duplicate its catalog/reconciliation semantics.
export async function validateDispatchDiscovery(cwd,requested){
 const output=await safeExistingDirectory(cwd,requested||'.kujo/dispatch');
 const entries=await readdir(output,{withFileTypes:true});
 if(entries.length>10000)throw Object.assign(Error('Dispatch discovery is limited to 10000 output entries; select a smaller output directory'),{code:'ability_input_invalid'});
 const names=new Set(entries.filter(entry=>entry.name.startsWith('run-')).map(entry=>entry.name));
 try{
  const index=await safeExistingFile(output,'.dispatch-run-index.json');
  if((await stat(index)).size>2*1024*1024)throw Object.assign(Error('Dispatch index exceeds the 2 MiB discovery limit'),{code:'ability_input_invalid'});
  let parsed;try{parsed=JSON.parse(await readFile(index,'utf8'));}catch{parsed=null;}
  // Malformed JSON remains canonical Dispatch's repair decision.
  if(parsed?.runs&&typeof parsed.runs==='object'&&!Array.isArray(parsed.runs))for(const name of Object.keys(parsed.runs))names.add(name);
 }catch(error){if(error.code!=='ENOENT')throw error;}
 for(const name of names){
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,255}$/.test(name))throw Object.assign(Error('Dispatch index contains an invalid run identifier'),{code:'ability_path_forbidden'});
  try{await safeExistingDirectory(output,name);await safeExistingFile(output,join(name,'state.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 return output;
}
