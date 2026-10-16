import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileAbilityState, LocalAbilityRuntime } from "../.generated/local-runtime.mjs";

const definition = { schema: "kujo.ability/v1", id: "kujo.test.files.write", version: "1.0.0", title: "Write fixture", description: "Write a bounded fixture.", input_schema: { type: "object", required: ["value"], properties: { value: { type: "string", minLength: 1 } }, additionalProperties: false }, output_schema: { type: "object", additionalProperties: true }, effects: [{ kind: "write", resource: "kujo.test.files" }], idempotency: { mode: "keyed" } };
const profiles = [{ schema: "kujo.ability-profile/v1", id: "kujo.profile.test", version: "1.0.0", description: "Test", default: true, extends: [], ability_ids: [definition.id], metadata: {} }];

test("approval, idempotency, receipts, restart, and cancellation fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "kujo-opencode-runtime-")); const state = new FileAbilityState({ statePath: join(root, "state.json"), receiptsPath: join(root, "receipts.jsonl") }); let executions = 0;
  const ability = { definition, tool: { name: "fixture" }, handler: async (input) => { executions += 1; return { value: input.value }; } };
  const runtime = new LocalAbilityRuntime({ abilities: [ability], profiles, profileId: "kujo.profile.test", state });
  let result = await runtime.execute({ abilityId: definition.id, input: { value: "a" }, controls: { invocationId: "run-1" } });
  assert.equal(result.code, "ability_idempotency_key_required");
  result = await runtime.execute({ abilityId: definition.id, input: { value: "a" }, controls: { invocationId: "run-1", idempotencyKey: "key-1" } });
  assert.equal(result.code, "ability_approval_required");
  const approval = await runtime.requestApproval({ abilityId: definition.id, input: { value: "a" }, invocationId: "run-1" });
  result = await runtime.execute({ abilityId: definition.id, input: { value: "a" }, controls: { invocationId: "run-1", idempotencyKey: "key-1", approvalId: approval.approval_id, sessionId: "s", modelId: "glm-5.3" } });
  assert.equal(result.ok, true); assert.equal(executions, 1); assert.equal(result.receipt.metadata.model_id, "glm-5.3");
  const restarted = new LocalAbilityRuntime({ abilities: [ability], profiles, profileId: "kujo.profile.test", state: new FileAbilityState({ statePath: join(root, "state.json"), receiptsPath: join(root, "receipts.jsonl") }) });
  const replay = await restarted.execute({ abilityId: definition.id, input: { value: "a" }, controls: { invocationId: "run-2", idempotencyKey: "key-1" } });
  assert.equal(replay.replayed, true); assert.equal(executions, 1);
  const invalid = await restarted.execute({ abilityId: definition.id, input: {}, controls: {} }); assert.equal(invalid.code, "ability_input_invalid");
  const controller = new AbortController(); controller.abort();
  const readDefinition = { ...definition, id: "kujo.test.files.read", effects: [{ kind: "read", resource: "kujo.test.files" }], idempotency: { mode: "intrinsic" } };
  const cancelledRuntime = new LocalAbilityRuntime({ abilities: [{ definition: readDefinition, tool: { name: "read" }, handler: async () => ({}) }], profiles: [{ ...profiles[0], ability_ids: [readDefinition.id] }], profileId: "kujo.profile.test", state });
  const cancelled = await cancelledRuntime.execute({ abilityId: readDefinition.id, input: { value: "a" }, controls: {}, signal: controller.signal }); assert.equal(cancelled.receipt.status, "cancelled");
  const strictOutput = { ...readDefinition, id: "kujo.test.files.strict", output_schema: { type: "object", required: ["value"], properties: { value: { type: "string" } }, additionalProperties: false } };
  const invalidOutputRuntime = new LocalAbilityRuntime({ abilities: [{ definition: strictOutput, tool: { name: "strict" }, handler: async () => ({ unexpected: true }) }], profiles: [{ ...profiles[0], ability_ids: [strictOutput.id] }], profileId: "kujo.profile.test", state });
  const invalidOutput = await invalidOutputRuntime.execute({ abilityId: strictOutput.id, input: { value: "a" }, controls: {} });
  assert.equal(invalidOutput.code, "ability_output_invalid"); assert.equal(invalidOutput.receipt.result, null); assert.equal(invalidOutput.receipt.status, "failed");
  assert.ok((await readFile(join(root, "receipts.jsonl"), "utf8")).trim().split("\n").length >= 5);
});

test("concurrent keyed approvals execute once across runtime instances", async () => {
  const root = await mkdtemp(join(tmpdir(), "kujo-opencode-race-"));
  const statePath = join(root, "state.json");
  const receiptsPath = join(root, "receipts.jsonl");
  let executions = 0;
  const ability = { definition, tool: { name: "fixture" }, handler: async (input) => {
    executions += 1;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    return { value: input.value };
  } };
  const first = new LocalAbilityRuntime({ abilities: [ability], profiles, profileId: "kujo.profile.test", state: new FileAbilityState({ statePath, receiptsPath }) });
  const second = new LocalAbilityRuntime({ abilities: [ability], profiles, profileId: "kujo.profile.test", state: new FileAbilityState({ statePath, receiptsPath }) });
  const input = { value: "race" };
  const invocationId = "race-run";
  const approval = await first.requestApproval({ abilityId: definition.id, input, invocationId });
  const controls = { invocationId, idempotencyKey: "race-key", approvalId: approval.approval_id };
  const outcomes = await Promise.all([
    first.execute({ abilityId: definition.id, input, controls }),
    second.execute({ abilityId: definition.id, input, controls }),
  ]);
  assert.equal(executions, 1);
  assert.equal(outcomes.filter((item) => item.ok).length, 1);
  assert.equal(outcomes.filter((item) => item.code === "ability_idempotency_in_progress").length, 1);
  const replay = await second.execute({ abilityId: definition.id, input, controls: { invocationId: "later-run", idempotencyKey: "race-key" } });
  assert.equal(replay.replayed, true);
  assert.equal(executions, 1);
});

test("bounded output and sharded idempotency state prevent unbounded hot files", async () => {
  const root = await mkdtemp(join(tmpdir(), "kujo-opencode-bounds-"));
  const statePath = join(root, "state.json");
  const receiptsPath = join(root, "receipts.jsonl");
  const readDefinition = { ...definition, id: "kujo.test.bounded.read", effects: [{ kind: "read", resource: "kujo.test" }] };
  const runtime = new LocalAbilityRuntime({
    abilities: [{ definition: readDefinition, tool: { name: "bounded" }, handler: async (input) => ({ value: input.value }) }],
    profiles: [{ ...profiles[0], ability_ids: [readDefinition.id] }],
    profileId: "kujo.profile.test",
    state: new FileAbilityState({ statePath, receiptsPath }),
  });
  const oversized = await runtime.execute({ abilityId: readDefinition.id, input: { value: "x".repeat(300 * 1024) }, controls: { idempotencyKey: "large" } });
  assert.equal(oversized.code, "ability_output_limit");
  for (let index = 0; index < 100; index += 1) {
    const result = await runtime.execute({ abilityId: readDefinition.id, input: { value: String(index) }, controls: { idempotencyKey: `key-${index}` } });
    assert.equal(result.ok, true);
  }
  const stateSize = await stat(statePath).then((entry) => entry.size, (error) => error.code === "ENOENT" ? 0 : Promise.reject(error));
  assert.ok(stateSize < 4096);
  assert.equal((await readdir(`${statePath}.d/idempotency`, { recursive: true })).filter((name) => name.endsWith(".json")).length, 101);
});

test('friendly approval requests require consent, bind project and digest, and execute once', async () => {
  const { executeWithApproval, readApprovalRequest, approveRequest } = await import('../lib/approvals.mjs');
  const root = await mkdtemp(join(tmpdir(), 'kujo-opencode-human-'));
  const previous = process.env.KUJO_OPENCODE_HOME; process.env.KUJO_OPENCODE_HOME = root;
  try {
    let executions = 0;
    const runtime = new LocalAbilityRuntime({abilities:[{definition,tool:{name:'fixture'},handler:async input=>{executions++;return input;}}],profiles,profileId:profiles[0].id,state:new FileAbilityState({statePath:join(root,'state.json'),receiptsPath:join(root,'receipts.jsonl')})});
    const app={runtime,paths:{root}};
    const pending=await executeWithApproval(app,{abilityId:definition.id,input:{value:'human'}});
    assert.equal(pending.code,'ability_approval_required'); assert.equal(executions,0);
    const request=await readApprovalRequest(pending.approval_request.id);
    assert.equal((await approveRequest(app,request,async()=>false)).ok,false); assert.equal(executions,0);
    await assert.rejects(approveRequest({...app,paths:{root:join(root,'other')}},request,async()=>true),/another project/);
    await assert.rejects(approveRequest(app,{...request,digest:'changed'},async()=>true),/changed/);
    const result=await approveRequest(app,request,async details=>{assert.deepEqual(details.input,{value:'human'});assert.equal(details.effects[0].kind,'write');return true;});
    assert.equal(result.ok,true); assert.equal(executions,1);
    assert.equal((await approveRequest(app,request,async()=>true)).replayed,true); assert.equal(executions,1);
    const {writeJson}=await import('../lib/io.mjs');
    await writeJson(join(root,'requests',`${pending.approval_request.id}.json`),{...request,created_at:0});
    await assert.rejects(readApprovalRequest(pending.approval_request.id),/expired/);
    await assert.rejects(readApprovalRequest('../escape'),/Invalid/);
  } finally { if(previous===undefined) delete process.env.KUJO_OPENCODE_HOME; else process.env.KUJO_OPENCODE_HOME=previous; }
});
