import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handlers } from "../lib/executor.mjs";
import { installLensBrowser, lensBrowserStatus } from "../lib/lens.mjs";

test("Watchdog telemetry adapter emits accepted metadata-only canonical v2", async () => {
  let body = null;
  const server = createServer((request, response) => {
    let text = ""; request.setEncoding("utf8"); request.on("data", (chunk) => { text += chunk; }); request.on("end", () => {
      body = JSON.parse(text); response.writeHead(200, { "Content-Type": "application/json" }); response.end('{"ok":true}');
    });
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  try {
    const port = server.address().port;
    const adapter = handlers({ config: { version: "test", kujo_bin: process.execPath, sources: {} }, project: process.cwd(), runtime: null }).watchdog_record;
    const result = await adapter({ name: "adapter.test", status: "ok", session_id: "session", run_id: "run", url: `http://127.0.0.1:${port}` });
    assert.equal(result.accepted, true); assert.equal(body.schema_version, "watchdog.telemetry.v2"); assert.equal(body.records[0].attributes["watchdog.outcome.code"], "success");
    assert.deepEqual(body.records[0].content, []); assert.equal(body.records[0].privacy.content_mode, "off"); assert.deepEqual(body.records[0].references.map((item) => item.type), ["session", "run"]);
    await assert.rejects(() => adapter({ name: "adapter.test", url: "https://example.com" }), { code: "ability_url_forbidden" });
  } finally {
    await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  }
});

test("Lens browser status requires both the bridge dependency and browser launch", async () => {
  const root = await mkdtemp(join(tmpdir(), "kujo-opencode-lens-")); const bridge = join(root, "bridge"); const moduleRoot = join(bridge, "node_modules", "playwright-core"); const executable = join(root, "chromium");
  await mkdir(moduleRoot, { recursive: true });
  assert.equal((await lensBrowserStatus(root)).ready, false);
  await writeFile(executable, "fixture");
  await writeFile(join(moduleRoot, "index.js"), `module.exports={chromium:{executablePath(){return ${JSON.stringify(executable)}},async launch(){return {async close(){}}}}};\n`);
  const status = await lensBrowserStatus(root); assert.equal(status.ready, true); assert.equal(status.executable, executable);
  const adapter = handlers({ config: { kujo_bin: process.execPath, sources: { lens: { path: root } } }, project: root, runtime: null }).lens_check;
  await assert.rejects(() => adapter({ path: ".", url: "https://example.com", output_dir: ".lens/test" }, {}), { code: "ability_url_forbidden" });
});

test("Lens browser installer uses the locked bridge lifecycle and verifies Chromium", async () => {
  const root = await mkdtemp(join(tmpdir(), "kujo-opencode-lens-install-")); const bridge = join(root, "bridge"); const fakeNpm = join(root, "npm-fixture"); const executable = join(root, "chromium");
  await mkdir(bridge, { recursive: true }); await writeFile(join(bridge, "package-lock.json"), "{}\n"); await writeFile(join(bridge,"package.json"),"{}\n");
  await writeFile(fakeNpm, `#!/usr/bin/env node\nconst fs=require('node:fs');const path=require('node:path');const root=process.cwd();const moduleRoot=path.join(root,'node_modules','playwright-core');fs.mkdirSync(moduleRoot,{recursive:true});fs.writeFileSync(${JSON.stringify(executable)},'fixture');fs.writeFileSync(path.join(moduleRoot,'index.js'),${JSON.stringify(`module.exports={chromium:{executablePath(){return ${JSON.stringify(executable)}},async launch(){return {async close(){}}}}};\n`)});\n`);
  await chmod(fakeNpm, 0o755);
  const status = await installLensBrowser(root, { npmCommand: fakeNpm }); assert.equal(status.ready, true); assert.equal(status.executable, executable);
});

test('Lens readiness accepts the installed headless-shell distribution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kujo-opencode-headless-'));
  const moduleRoot = join(root, 'bridge', 'node_modules', 'playwright-core');
  await mkdir(moduleRoot, {recursive:true});
  await writeFile(join(moduleRoot,'index.js'), `module.exports={chromium:{executablePath(){return '/nonexistent/kujo-test-chrome'},async launch(options){if(options.headless!==true)throw Error('not headless');return {async close(){}}}}};\n`);
  const result=await lensBrowserStatus(root);
  assert.equal(result.ready,true);
  assert.equal(result.mode,'headless-shell');
  assert.equal(result.executable,undefined);
});

test('Dispatch inspection rejects escaping identifiers and symlinked canonical storage',async()=>{
 const {symlink}=await import('node:fs/promises');
 const root=await mkdtemp(join(tmpdir(),'kujo-dispatch-inspect-'));
 const adapter=handlers({project:root,runtime:null,config:{kujo_bin:'must-not-execute',sources:{dispatch:{path:root}}}}).dispatch_inspect;
 await assert.rejects(adapter({path:'.',run_id:'../outside'},{}),{code:'ability_input_invalid'});
 await assert.rejects(adapter({path:'.',run_id:'--help'},{}),{code:'ability_input_invalid'});
 await mkdir(join(root,'runs/run-one'),{recursive:true});await writeFile(join(root,'runs/run-one/state.json'),'{}');
 await mkdir(join(root,'runs/.dispatch'));await writeFile(join(root,'outside'),'private');await symlink(join(root,'outside'),join(root,'runs/.dispatch/state.db'));
 await assert.rejects(adapter({path:'.',run_id:'run-one',output_dir:'runs'},{}),{code:'ability_path_invalid'});
});

test('RunLedger correlation requires explicit bounded links and confined records',async()=>{
 const {symlink}=await import('node:fs/promises');const root=await mkdtemp(join(tmpdir(),'kujo-ledger-link-'));await mkdir(join(root,'.runledger/runs'),{recursive:true});
 const adapter=handlers({project:root,runtime:null,config:{kujo_bin:'must-not-execute',sources:{runledger:{path:root}}}}).runledger_correlate;
 for(const input of [{run_id:'run-one'},{run_id:'../escape',eval_run_id:'eval-one'},{run_id:'run-one',eval_run_id:'--help'},{run_id:'run-one',watchdog_trace_id:'not-a-trace'}])await assert.rejects(adapter(input,{}),{code:'ability_input_invalid'});
 await writeFile(join(root,'outside'),'{}');await symlink(join(root,'outside'),join(root,'.runledger/runs/run-one.json'));
 await assert.rejects(adapter({run_id:'run-one',eval_run_id:'eval-one'},{}),{code:'ability_path_invalid'});
});

test('Dispatch discovery rejects index traversal and symlinked run state before canonical reads',async()=>{
 const {symlink,unlink}=await import('node:fs/promises');const root=await mkdtemp(join(tmpdir(),'kujo-dispatch-discover-'));await mkdir(join(root,'runs'));
 const adapter=handlers({project:root,runtime:null,config:{kujo_bin:'must-not-execute',sources:{dispatch:{path:root}}}}).dispatch_list;
 const index=join(root,'runs/.dispatch-run-index.json');await writeFile(index,JSON.stringify({runs:{'../outside':{}}}));
 await assert.rejects(adapter({output_dir:'runs'},{}),{code:'ability_path_forbidden'});await unlink(index);
 await mkdir(join(root,'runs/run-one'));await writeFile(join(root,'outside'),'{}');await symlink(join(root,'outside'),join(root,'runs/run-one/state.json'));
 await assert.rejects(adapter({output_dir:'runs'},{}),{code:'ability_path_invalid'});
});

