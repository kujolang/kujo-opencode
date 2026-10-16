import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, modify, applyEdits } from 'jsonc-parser';
import { safeOutputPath, projectPaths } from './paths.mjs';
import { writeText } from './io.mjs';

export async function hostDocument(project) {
  const {root, mcp} = projectPaths(project);
  const documents = [];
  for (const name of ['opencode.json', 'opencode.jsonc', '.opencode/opencode.json', '.opencode/opencode.jsonc']) {
    const path = join(root, name);
    await safeOutputPath(root, path);
    let text;
    try { text = await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const errors = [];
    const value = parse(text, errors, { allowTrailingComma: true, disallowComments: false });
    if (errors.length || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid OpenCode config: ${path}`);
    for (const item of [value.mcp, value.mcp?.servers]) if (item !== undefined && (!item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`Invalid OpenCode MCP config: ${path}`);
    documents.push({path, text, value});
  }
  const owners = documents.filter(d => Object.hasOwn(d.value.mcp?.servers || {}, 'kujo'));
  if (owners.length > 1) throw new Error('Kujo is configured in multiple OpenCode files; keep one kujo server entry before setup.');
  return owners[0] || documents.at(-1) || {path:mcp, text:'{}\n', value:{}};
}

export function renderServer(document, server) {
  const edits = modify(document.text, ['mcp', 'servers', 'kujo'], server, {formattingOptions:{insertSpaces:true,tabSize:2,eol:'\n'}});
  const next = applyEdits(document.text, edits);
  return next;
}

export async function editServer(document, server) {
  const next=renderServer(document,server);
  if(next!==document.text)await writeText(document.path,next);
  return document.path;
}
