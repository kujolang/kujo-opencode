import {access} from 'node:fs/promises';
import {dirname,join,delimiter} from 'node:path';
import {nodeCommand} from './node-command.mjs';

// Execute npm's JavaScript entrypoint on Windows. Spawning npm.cmd directly
// fails on current Node releases; a shell would reinterpret paths and arguments.
export async function npmInvocation(command, {platform=process.platform,env=process.env,executable=process.execPath}={}) {
 if(command)return Array.isArray(command)?command:[command];
 if(platform!=='win32')return ['npm'];
 const pathKey=Object.keys(env).find(key=>key.toLowerCase()==='path');
 const roots=[dirname(executable),...(env[pathKey]||'').split(platform==='win32'?';':delimiter).filter(Boolean)];
 for(const root of roots){
  const cli=join(root,'node_modules','npm','bin','npm-cli.js');
  try{await access(cli);return [nodeCommand(executable),cli];}catch(error){if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
 }
 throw Object.assign(Error('npm was not found. Install Node.js with npm or fix the PATH used to start OpenCode, then retry.'),{code:'install_npm_missing'});
}
