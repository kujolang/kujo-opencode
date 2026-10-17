import {basename} from 'node:path';
// OpenCode's bundled host executable is not a Node CLI. Preserve the current
// Node executable for CLI use, but use the required Node installation in hosts.
export function nodeCommand(executable=process.execPath){return /^node(?:\.exe)?$/i.test(basename(executable))?executable:(process.platform==='win32'?'node.exe':'node');}
