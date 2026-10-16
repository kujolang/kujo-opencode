import {mkdir,lstat,mkdtemp,rm,readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {safeExistingDirectory,safeOutputPath} from './paths.mjs';
import {run} from './process.mjs';

async function canonical(binary,source,entry,args,cwd,signal){
 signal?.throwIfAborted();
 const result=await run(binary,['run',join(source,entry),'--interpreter','--isolated-imports','--',...args],{cwd,signal,killTree:true,timeoutMs:120000,maxBytes:64*1024,env:{...process.env,KUJO_MODULE_PATH:source,KUJO_ISOLATED_IMPORTS:'1'}});
 if(result.exitCode!==0||result.signal)throw Object.assign(new Error('Canonical build workflow failed'),{code:'kujo_build_failed',details:result});
 return result;
}
async function destination(project,input){
 const target=await safeExistingDirectory(project,input.path||'.');
 const output=await safeOutputPath(project,input.output_dir||'.kujo/mcp-generated');
 await safeExistingDirectory(project,dirname(output));
 try{await lstat(output);throw Object.assign(new Error('Output already exists; choose a new directory and review existing evidence'),{code:'kujo_output_exists'});}catch(error){if(error.code!=='ENOENT')throw error;}
 return {target,output};
}
export async function mcpWorkflow({project,binary,source,input,signal,preview=false}){
 const {target,output}=await destination(project,input);
 const args=['make',target,'--out',join(output,'server'),'--artifacts',join(output,'artifacts'),'--no-ai',...(preview?['--dry-run']:['--validate'])];
 if(!preview){signal?.throwIfAborted();await mkdir(output,{mode:0o700});}
 try{
  const result=await canonical(binary,source,'mcp.kujo',args,source,signal);
  if(preview)return {...result,output_dir:output,notice:'Preview classifies the current repository and destination; it does not generate files or execute discovered commands. Generation analyzes the repository again after approval.'};
  const manifest=JSON.parse(await readFile(join(output,'server/mcp.manifest.json'),'utf8'));
  return {...result,generated_tools:Array.isArray(manifest.tools)?manifest.tools.length:null,artifacts:[output,join(output,'artifacts/safety-review.md'),join(output,'artifacts/validation-report.md'),join(output,'server/mcp.manifest.json')],notice:'Generated scaffold only. Review safety-review.md, the manifest and validation report before exposing or running a server. Existing outputs are never overwritten.'};
 }catch(error){if(!preview)error.details={...error.details,artifacts:[output],notice:'Partial generated output retained. Inspect it before choosing a new destination; do not assume generation completed.'};throw error;}
}
const EXAMPLES=['hello_agent','tool_agent','approval_agent','retrieval_agent','handoff_agent','traced_agent','artifact_agent'];
export async function agentsSmoke({binary,source,signal}){
 const cwd=await mkdtemp(join(tmpdir(),'kujo-agents-smoke-'));
 try{
  const result=await canonical(binary,source,'examples/examples_smoke_runner.kujo',[],cwd,signal);
  let examples;try{examples=JSON.parse(result.stdout.trim());}catch{throw Object.assign(new Error('Agents SDK returned invalid fixture evidence'),{code:'kujo_agents_evidence_invalid',details:result});}
  if(!examples||typeof examples!=="object"||EXAMPLES.some(name=>examples[name]?.ok!==true||examples[name]?.requires_network!==false))throw Object.assign(new Error('Agents SDK offline fixture acceptance failed'),{code:'kujo_agents_smoke_failed',details:{...result,examples}});
  return {examples,notice:'Canonical offline examples passed their own expectations. The approval example intentionally reports failed run status while ok=true verifies rejection. No live provider or application behavior is certified.'};
 }finally{await rm(cwd,{recursive:true,force:true});}
}
