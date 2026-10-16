import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { readJson, writeJson } from './io.mjs';
import { homePaths, safeExistingFile } from './paths.mjs';

export const principal = {type:'workload',id:'opencode',tenant_id:'local',claims:{}};
export async function executeWithApproval(app, request) {
  const controls = {...request.controls, principal, host:'opencode', surface:request.controls?.surface || 'mcp'};
  controls.invocationId ||= randomUUID();
  controls.idempotencyKey ||= controls.invocationId;
  const result = await app.runtime.execute({...request, controls});
  if (result.code !== 'ability_approval_required') return result;
  const id = randomUUID();
  const item = app.runtime.describe().find(item => item.definition.id === request.abilityId);
  await writeJson(join(homePaths().root, 'requests', `${id}.json`), {
    schema:'kujo.opencode.approval-request/v1', project:app.paths.root,
    created_at:Date.now(), abilityId:request.abilityId, input:request.input,
    controls:{invocationId:controls.invocationId,idempotencyKey:controls.idempotencyKey},
    digest:item.definitionDigest, receipt_id:result.receipt.receipt_id,
  });
  return {...result, approval_request:{id, command:`kujo-opencode approve ${id}`, message:'Ask the user to run this command in their terminal. It shows the exact operation, asks for confirmation, and executes it once. Never approve on the user’s behalf.'}};
}

export async function readApprovalRequest(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid approval request ID');
  const home = homePaths();
  const path = await safeExistingFile(home.root, `requests/${id}.json`);
  const request = await readJson(path);
  if (request?.schema !== 'kujo.opencode.approval-request/v1' || !Number.isFinite(request.created_at) || Date.now()-request.created_at > 15*60*1000) throw new Error('Approval request expired; ask OpenCode to retry the operation.');
  return request;
}

export async function approveRequest(app, request, confirm) {
  if (resolve(request.project) !== app.paths.root) throw new Error('Approval request belongs to another project');
  const item = app.runtime.describe().find(item => item.definition.id === request.abilityId);
  if (!item || item.definitionDigest !== request.digest) throw new Error('Capability changed or was disabled; request the operation again.');
  if (!await confirm({project:request.project, ability: item.definition.title || request.abilityId, effects:item.definition.effects, input:request.input})) return {ok:false,message:'Approval declined. Nothing executed.'};
  const approval = await app.runtime.requestApproval({abilityId:request.abilityId,input:request.input,invocationId:request.controls.invocationId,principal});
  return app.runtime.execute({abilityId:request.abilityId,input:request.input,controls:{...request.controls,approvalId:approval.approval_id,principal,host:'opencode',surface:'cli'}});
}
