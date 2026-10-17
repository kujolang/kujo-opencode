import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const query=async identity=>{
 const result=await exec('npm',['view',identity,'dist','--json','--registry=https://registry.npmjs.org/'],{timeout:30000});
 return JSON.parse(result.stdout);
};
// npm can accept a publish before its public metadata becomes visible.
// Retry only that missing-version response; authentication and validation errors fail.
export async function waitRegistryDist(identity,{read=query,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=30,delay=10000}={}){
 for(let attempt=1;attempt<=attempts;attempt++){
  try{return await read(identity);}catch(error){
   let code;try{code=JSON.parse(error.stdout).error?.code;}catch{}
   if(code!=='E404'||attempt===attempts)throw error;
   console.log(`Registry version is not visible yet (${attempt}/${attempts}); waiting.`);
   await wait(delay);
  }
 }
 throw new Error('Registry polling requires at least one attempt');
}
