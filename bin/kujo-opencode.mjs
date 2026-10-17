#!/usr/bin/env node
import {queryEvidence} from "../lib/evidence.mjs";
import { recoverProjectFiles } from "../lib/project-activation.mjs";
import { createInterface } from "node:readline/promises";
import { approveRequest, readApprovalRequest } from "../lib/approvals.mjs";
import { hostDocument } from "../lib/host-config.mjs";
import { recoverDirectory } from "../lib/atomic-directory.mjs";
import { access, mkdir, readdir, rm, realpath } from "node:fs/promises";
import { closeSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { createApp, loadProjectConfig } from "../lib/app.mjs";
import { loadCatalog, profileAbilities } from "../lib/catalog.mjs";
import { activateProject, projectActivationPaths, uninstallProject, preflightHost, installProjection, installSources } from "../lib/install.mjs";
import { loadInstallation, writeInstallation } from "../lib/installation.mjs";
import { readJson, writeJson } from "../lib/io.mjs";
import { assertSafePurgeRoot, homePaths, packageRoot, projectPaths } from "../lib/paths.mjs";
import { run } from "../lib/process.mjs";
import { VERSION } from "../lib/version.mjs";
import { installLensBrowser, lensBrowserStatus, recoverLensBrowser } from "../lib/lens.mjs";

process.stdout.on("error", error => { if (error.code === "EPIPE") process.exit(0); else throw error; });

const command = process.argv[2] || "help";

function options(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) { result._.push(value); continue; }
    const [key, inline] = value.slice(2).split("=", 2);
    if (["json", "force", "purge", "dry-run"].includes(key)) result[key] = true;
    else { const next = inline ?? values[++index]; if (!next || next.startsWith("--")) throw new Error(`missing value for --${key}`); result[key] = next; }
  }
  return result;
}

function output(value, json = false) {
  if (json) return process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  if (value.receipt) {
    process.stdout.write(`${value.message || (value.ok ? 'Operation completed.' : 'Operation failed.')}\n`);
    const receipt = value.receipt;
    process.stdout.write(`Receipt: ${receipt.receipt_id} (${receipt.status})\n`);
    const report = receipt.result?.structured;
    if (Array.isArray(report?.checks)) {
      for (const check of report.checks) process.stdout.write(`${check.passed ? '✓' : '!'} ${check.message}${check.detail ? ' — '+check.detail : ''}\n`);
    } else if (receipt.error) process.stdout.write(`${receipt.error.message}\n`);
    else if (receipt.result) process.stdout.write(`${JSON.stringify(receipt.result, null, 2).slice(0,3000)}\n`);
    process.stdout.write(`Full evidence: ${homePaths().receipts}\n`);
    return;
  }
  if (value.checks) { process.stdout.write(`${value.message}\n`); for (const check of value.checks) process.stdout.write(`${check.ok ? '✓' : '✗'} ${check.name}${check.error ? ': '+check.error : ''}\n`); return; }
  if (value.profiles) { for (const profile of value.profiles) process.stdout.write(`${profile.id.replace('kujo.profile.', '')} — ${profile.description}\n`); return; }
  if (value.abilities && Array.isArray(value.abilities)) { for (const item of value.abilities) process.stdout.write(`${item.active ? '✓' : '·'} ${item.tool} — ${item.id}\n`); return; }
  process.stdout.write(`${value.message || "OK"}\n`);
  for (const [key, item] of Object.entries(value)) if (!["ok", "message"].includes(key)) process.stdout.write(`${key}: ${Array.isArray(item) ? item.join(", ") : typeof item === "object" ? JSON.stringify(item) : item}\n`);
}

async function exists(path) { try { await access(path); return true; } catch { return false; } }

async function setup(opts) {
  const catalog = await loadCatalog(); const project = resolve(opts.project || process.cwd());
  const previous = await readJson(projectPaths(project).config, null);
  const profile = profileId(opts.profile || previous?.profile || "essentials");
  profileAbilities(catalog, profile);
  await preflightHost(project);
  if (opts["dry-run"]) return output({ ok: true, message: "Kujo OpenCode setup validated (dry run).", project, profile, source_count: catalog.sources.length }, opts.json);
  const kujoBin = process.env.KUJO_BIN || (await import("@kujolang/kujo-runtime")).resolveKujoBinary();
  const sources = await installSources(catalog, { sourceRoot: opts["source-root"], force: opts.force, progress: message => { if (!opts.json) process.stderr.write(`${message}\n`); } });
  const projection = await installProjection(VERSION, kujoBin);
  const installedAt = new Date().toISOString();
  const installation = await writeInstallation({ version: VERSION, sources, projection_root: projection.root, kujo_bin: projection.kujo, installed_at: installedAt });
  const paths = projectPaths(project); const config = { schema: "kujo.opencode.config/v1", version: VERSION, installation_version: VERSION, profile, enabled: previous?.enabled || [], disabled: previous?.disabled || [], ...(previous?.lifecycle ? {lifecycle:previous.lifecycle} : {}), installed_at: previous?.installed_at || installedAt };
  const trustedConfig = { ...config, ...installation };
  const {skills,hostAssets,mcp}=await activateProject(catalog,trustedConfig,project,config,{host:true,expectedConfig:previous});
  const app = await createApp(project); const smoke = await app.runtime.execute({ abilityId: "kujo.ability.catalog.list", input: {}, controls: { host: "opencode", surface: "mcp", invocationId: `setup-${Date.now()}` } });
  if (!smoke.ok) throw new Error("local Ability smoke test failed");
  return output({ ok: true, message: "Kujo is configured. Run kujo-opencode demo, then open OpenCode and type /kujo.", project, profile, abilities: app.runtime.describe().length, skills: skills.length, host_assets: hostAssets.length, mcp, execution: "native-plugin", hosted_service_required: false }, opts.json);
}

function profileId(name) { return name?.startsWith('kujo.profile.') ? name : name ? `kujo.profile.${name}` : null; }

async function evidenceExport(opts) {
  const project=await realpath(resolve(opts.project||process.cwd()));
  await loadProjectConfig(project);
  const scope=opts.scope||(opts.session?'session':'project');
  if(opts.session&&scope!=='session')throw Error('--session requires session scope');
  const result=await queryEvidence({path:homePaths().receipts,project,scope,sessionID:opts.session,receiptID:opts.receipt,limit:100});
  if(opts.receipt&&!result.receipts.length)throw Error('Receipt is outside this scope or no longer retained');
  output({schema:'kujo.opencode.evidence/v1',...result},true);
}

async function demo(opts) {
  const app = await createApp(resolve(opts.project || process.cwd()));
  const result = await app.runtime.execute({abilityId:'kujo.shipcheck.repository.scan',input:{path:'.'},controls:{host:'opencode',surface:'cli'}});
  output({ok:result.ok,message:result.ok ? 'First repository scan complete. Open OpenCode and type /kujo for an explanation and next steps.' : 'Repository scan failed. Run kujo-opencode doctor for setup problems; inspect the receipt below for repository findings.',receipt:result.receipt}, opts.json);
  if (!result.ok) process.exitCode = 1;
}

async function status(opts) {
  const project = resolve(opts.project || process.cwd()); const paths = projectPaths(project);
  if (!await exists(paths.config)) return output({ ok: false, message: "Kujo OpenCode is not configured in this project.", project }, opts.json);
  const { config } = await loadProjectConfig(project);
  const app = await createApp(project);
  return output({ ok: true, message: "Kujo OpenCode is configured.", version: config.version, profile: config.profile, abilities: app.runtime.describe().length, sources: Object.keys(config.sources).length, mcp_configured: Boolean((await hostDocument(project)).value.mcp?.servers?.kujo), receipts: homePaths().receipts }, opts.json);
}

async function doctor(opts) {
  const project = resolve(opts.project || process.cwd());
  const catalog = await loadCatalog();
  let config = null; let configurationError = "";
  try { ({ config } = await loadProjectConfig(project)); } catch (error) { configurationError = error.message; }
  const checks = [];
  checks.push({ name: "configuration", ok: Boolean(config), ...(configurationError ? { error: configurationError } : {}) });
  checks.push({ name: "generated-runtime", ok: await exists(join(packageRoot, ".generated", "local-runtime.mjs")) });
  if (config) for (const [id, source] of Object.entries(config.sources)) {
    let ok = await exists(source.path); let actual = null;
    if (ok && source.mode === "pinned") { try { actual = (await import("node:child_process")).execFileSync("git", ["rev-parse", "HEAD"], { cwd: source.path, encoding: "utf8" }).trim(); ok = actual === source.commit; } catch { ok = false; } }
    checks.push({ name: `source:${id}`, ok, commit: source.commit, ...(actual ? { actual_commit: actual } : {}) });
  }
  try { const runtime = config?.kujo_bin || process.env.KUJO_BIN || (await import("@kujolang/kujo-runtime")).resolveKujoBinary(); checks.push({ name: "kujo-runtime", ok: (await run(runtime, ["--version"], {timeoutMs:10000})).exitCode === 0, path: runtime }); } catch (error) { checks.push({ name: "kujo-runtime", ok: false, error: error.message }); }
  let hostVersion = '';
  if (await commandAvailable('opencode')) {
    const probe = await run('opencode', ['--version'], {timeoutMs:10000});
    if (probe.exitCode === 0) hostVersion = probe.stdout.trim();
  }
  const hostReady = /^opencode v?2\./.test(hostVersion);
  checks.push({name:'opencode', ok:hostReady, version:hostVersion, ...(!hostReady ? {error:'Install OpenCode 2 and put opencode on PATH; see https://opencode.ai/v2/docs/'} : {})});
  if (config) {
    for (const file of ['index.ts','tui.ts','package.json']) checks.push({name:`native-plugin:${file}`,ok:await exists(join(project,'.opencode/plugins/kujo',file))});
    const server=(await hostDocument(project)).value.mcp?.servers?.kujo;
    checks.push({name:'mcp-fallback-disabled',ok:!server || server.disabled===true,error:server && !server.disabled?'Disable the Kujo MCP fallback to avoid duplicate tools; run repair.':undefined});
  }
  if (config && profileAbilities(catalog, config.profile, config.enabled, config.disabled).some((ability) => ability.definition.id === "kujo.lens.page.check")) {
    const lens = config.sources.lens ? await lensBrowserStatus(config.sources.lens.path) : { ready: false };
    checks.push({ name: "lens-browser", ok: lens.ready, ...(lens.executable ? { executable: lens.executable } : {}), ...(!lens.ready ? { error: "run 'kujo-opencode browser install'" } : {}) });
  }
  const ok = checks.every((check) => check.ok);
  output({ ok, message: ok ? "Kujo OpenCode diagnostics passed." : "Kujo OpenCode diagnostics found problems.", checks }, opts.json);
  if (!ok) process.exitCode = 1;
}

async function commandAvailable(name) { const path = (process.env.PATH || "").split(process.platform === "win32" ? ";" : ":"); return (await Promise.all(path.map((part) => exists(join(part, process.platform === "win32" ? `${name}.exe` : name))))).some(Boolean); }

async function browser(opts) {
  const action = opts._[0] || "status"; if (!["status", "install", "recover"].includes(action)) throw new Error("browser action must be status, install or recover");
  const project = resolve(opts.project || process.cwd()); const { config } = await loadProjectConfig(project); const lens = config.sources.lens;
  if (!lens) throw new Error("Lens source is not installed");
  if(action === "recover"){output({ok:true,...await recoverLensBrowser(lens.path),message:"Browser setup recovery finished. Run browser status before retrying installation."},opts.json);return;}
  const status = action === "install" ? await installLensBrowser(lens.path) : await lensBrowserStatus(lens.path);
  output({ ok: status.ready, message: status.ready ? "Lens browser launched successfully." : status.state === "setup_busy_or_interrupted" ? "Browser setup is active or interrupted. Wait for its owner, or run 'kujo-opencode browser recover' after it stops." : status.state === "dependencies_missing" ? "Lens bridge dependencies are missing; run 'kujo-opencode browser install'." : status.state === "launch_failed" ? "Chromium could not launch; run 'kujo-opencode browser install', then check operating-system browser dependencies if the problem persists." : "Browser readiness probe failed; verify Node is available and retry.", browser: "chromium", ready: status.ready, state:status.state, ...(status.executable ? { executable: status.executable } : {}) }, opts.json);
  if (!status.ready) process.exitCode = 1;
}

async function profiles(opts) {
  const catalog = await loadCatalog(); const project = resolve(opts.project || process.cwd()); const current = await exists(projectPaths(project).config) ? (await loadProjectConfig(project, catalog)).projectConfig : null;
  output({ ok: true, message: "Portable Kujo Ability profiles.", current: current?.profile || null, profiles: catalog.profiles.map((profile) => ({ id: profile.id, label: profile.metadata.label, description: profile.description, default: profile.default })) }, opts.json);
}

async function abilities(opts) {
  const catalog = await loadCatalog(); const project = resolve(opts.project || process.cwd()); const config = await exists(projectPaths(project).config) ? (await loadProjectConfig(project, catalog)).projectConfig : null;
  const active = config ? new Set(profileAbilities(catalog, config.profile, config.enabled, config.disabled).map((item) => item.definition.id)) : new Set();
  output({ ok: true, message: "Kujo Ability catalog.", abilities: catalog.abilities.map((item) => ({ id: item.definition.id, tool: item.tool.name, effects: item.definition.effects.map((effect) => effect.kind), active: active.has(item.definition.id) })) }, opts.json);
}

async function select(opts, enable) {
  const name = opts._[0]; if (!name) throw new Error(`usage: kujo-opencode ${enable ? "enable" : "disable"} <ability-id>`);
  const project = resolve(opts.project || process.cwd()); const { config, projectConfig, paths } = await loadProjectConfig(project);
  const catalog = await loadCatalog();
  const expectedConfig=structuredClone(projectConfig);
  const matches = catalog.abilities.filter(item => item.definition.id === name || item.tool.name === name || item.source === name);
  if (!matches.length) throw new Error(`Unknown capability '${name}'; run kujo-opencode abilities`);
  for (const {definition:{id}} of matches) {
  projectConfig.enabled = (projectConfig.enabled || []).filter((value) => value !== id); projectConfig.disabled = (projectConfig.disabled || []).filter((value) => value !== id);
  (enable ? projectConfig.enabled : projectConfig.disabled).push(id); }
  const next = { ...config, ...projectConfig }; const {skills}=await activateProject(catalog,next,project,projectConfig,{expectedConfig});
  output({ ok: true, message: `${name} ${enable ? "enabled" : "disabled"}. Restart OpenCode to refresh tools.`, profile: next.profile, skills }, opts.json);
}

async function setProfile(opts) {
  const id = profileId(opts._[0]); if (!id) throw new Error("usage: kujo-opencode profile essentials|build|review|ship|full");
  const project = resolve(opts.project || process.cwd()); const { config, projectConfig, paths } = await loadProjectConfig(project);
  const catalog = await loadCatalog(); const expectedConfig=structuredClone(projectConfig); profileAbilities(catalog, id); projectConfig.profile = id; const next = { ...config, ...projectConfig }; const {skills}=await activateProject(catalog,next,project,projectConfig,{expectedConfig});
  output({ ok: true, message: `Active profile changed to ${id}. Restart OpenCode to refresh tools.`, abilities: profileAbilities(catalog, id, next.enabled, next.disabled).length, skills }, opts.json);
}

async function approve(opts) {
  if (opts._[0]) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run approval in an interactive human terminal. No --yes or piped approvals are accepted.');
    const request = await readApprovalRequest(opts._[0]);
    if (opts.project && resolve(opts.project) !== request.project) throw new Error('Approval request belongs to another project');
    const app = await createApp(request.project);
    const result = await approveRequest(app, request, async details => {
      process.stdout.write(`${JSON.stringify(details, null, 2)}\n`);
      const reader = createInterface({input:process.stdin, output:process.stdout});
      try { return (await reader.question('Approve and execute this exact operation once? [y/N] ')).trim().toLowerCase() === 'y'; } finally { reader.close(); }
    });
    output(result, opts.json); if (!result.ok) process.exitCode = 1; return;
  }
  if (!opts.ability || !opts.invocation || !opts.input) throw new Error("approve requires --ability, --invocation, and --input JSON");
  const input = JSON.parse(opts.input); const app = await createApp(resolve(opts.project || process.cwd()));
  const approval = await app.runtime.requestApproval({ abilityId: opts.ability, input, invocationId: opts.invocation, principal: { type: "workload", id: "opencode", tenant_id: "local", claims: {} } });
  output({ ok: true, message: "One-time approval issued. Pass its ID in _kujo.approvalId with the same invocation ID and input.", approval_id: approval.approval_id, expires_at_ms: approval.expires_at_ms }, opts.json);
}

async function services(opts) {
  const action = opts._[0] || "status"; const name = opts._[1] || "watchdog"; if (name !== "watchdog") throw new Error("only the optional watchdog service is supported");
  const home = homePaths(); const state = await readJson(home.services, {}); const current = state.watchdog;
  if (action === "status") { const running = await watchdogProcessMatches(current); return output({ ok: true, message: running ? "Watchdog is running." : "Watchdog is stopped.", service: "watchdog", running, pid: running ? current.pid : null, stale_state: Boolean(current && !running), url: "http://127.0.0.1:7700" }, opts.json); }
  if (action === "stop") { const running = await watchdogProcessMatches(current); if (running) process.kill(current.pid, "SIGTERM"); delete state.watchdog; await writeJson(home.services, state); return output({ ok: true, message: running ? "Watchdog stop requested." : "Stale Watchdog state cleared without signaling another process." }, opts.json); }
  if (action !== "start") throw new Error("services action must be status, start, or stop");
  if (await watchdogProcessMatches(current)) return output({ ok: true, message: "Watchdog is already running.", pid: current.pid, url: "http://127.0.0.1:7700" }, opts.json);
  const { config } = await loadProjectConfig(resolve(opts.project || process.cwd())); if (!config?.sources?.watchdog) throw new Error("Watchdog source is not installed");
  const runtime = config.kujo_bin; const serviceRoot = join(home.root, "watchdog"); await mkdir(join(serviceRoot, "data", "backups"), { recursive: true });
  const log = join(home.root, "watchdog.log"); const out = openSync(log, "a");
  const watchdogRoot = config.sources.watchdog.path;
  const script = join(watchdogRoot, "dashboard_server.kujo");
  const child = spawn(runtime, ["run", "--interpreter", script], { cwd: watchdogRoot, detached: true, stdio: ["ignore", out, out], env: { ...process.env, WDG_HOST: "127.0.0.1", WDG_PORT: "7700", WDG_DB_PATH: join(serviceRoot, "data", "watchdog.db"), WDG_PROXY_CONFIG_PATH: join(serviceRoot, "proxy.json"), WDG_SOURCES_CONFIG_PATH: join(serviceRoot, "sources.json"), WDG_EXPORTERS_CONFIG_PATH: join(serviceRoot, "exporters.json"), WDG_BACKUP_DIR: join(serviceRoot, "data", "backups"), WDG_BACKUP_SCRIPT_PATH: join(watchdogRoot, "scripts", "watchdog_backup.js"), WDG_DITHER_CHARTS_JS_PATH: join(watchdogRoot, "vendor", "dither-charts.js"), WDG_DITHER_CHARTS_CSS_PATH: join(watchdogRoot, "vendor", "dither-charts.css"), WDG_DEPARTURE_MONO_PATH: join(watchdogRoot, "vendor", "fonts", "DepartureMono-Regular.woff2"), WDG_CONTEXT_LIMIT_CATALOG_PATH: join(watchdogRoot, "config", "context_limit_catalog.json") } }); closeSync(out); child.unref();
  let spawnError = null; child.once("error", (error) => { spawnError = error; });
  let healthy = false;
  for (let attempt = 0; attempt < 30 && !spawnError; attempt += 1) { try { const response = await fetch("http://127.0.0.1:7700/healthz", { signal: AbortSignal.timeout(500) }); if (response.ok) { healthy = true; break; } } catch {} await new Promise((resolveWait) => setTimeout(resolveWait, 250)); }
  if (!healthy) { try { process.kill(child.pid, "SIGTERM"); } catch {} throw new Error(spawnError ? `Watchdog failed to start: ${spawnError.message}` : `Watchdog did not become healthy; inspect ${log}`); }
  state.watchdog = { pid: child.pid, started_at: new Date().toISOString(), log, script }; await writeJson(home.services, state);
  output({ ok: true, message: "Optional local Watchdog started.", pid: child.pid, url: "http://127.0.0.1:7700", log }, opts.json);
}

async function watchdogProcessMatches(current) {
  if (!Number.isSafeInteger(current?.pid) || current.pid <= 0 || typeof current.script !== "string") return false;
  try { process.kill(current.pid, 0); } catch { return false; }
  const outcome = process.platform === "win32"
    ? await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${current.pid}').CommandLine`], { timeoutMs: 5_000, maxBytes: 64 * 1024 })
    : await run("ps", ["-p", String(current.pid), "-o", "command="], { timeoutMs: 5_000, maxBytes: 64 * 1024 });
  return outcome.exitCode === 0 && outcome.stdout.includes(current.script);
}

async function repair(opts) { const project = resolve(opts.project || process.cwd()); const catalog = await loadCatalog(); const { config,projectConfig } = await loadProjectConfig(project, catalog); const {skills,hostAssets,mcp}=await activateProject(catalog,config,project,projectConfig,{host:true,expectedConfig:projectConfig}); output({ ok: true, message: "Kujo OpenCode projections repaired.", skills, host_assets: hostAssets, mcp }, opts.json); }

async function update(opts) {
  const catalog = await loadCatalog();
  const project = resolve(opts.project || process.cwd()); const { projectConfig, installation, paths } = await loadProjectConfig(project, catalog, { migration: true });
  await preflightHost(project);
  const preservedLocal = opts["source-root"] ? {} : Object.fromEntries(catalog.sources.filter(source => installation.sources[source.id]?.mode === "local" && installation.sources[source.id].commit === source.commit).map(source => [source.id, installation.sources[source.id]]));
  const sources = { ...preservedLocal, ...await installSources({ ...catalog, sources: catalog.sources.filter(source => !preservedLocal[source.id]) }, { sourceRoot: opts["source-root"], force: Boolean(opts.force) }) };
  let runtime = process.env.KUJO_BIN;
  if (!runtime) {
    try { runtime = (await import("@kujolang/kujo-runtime")).resolveKujoBinary(); }
    catch { runtime = installation.kujo_bin; }
  }
  const projection = await installProjection(VERSION, runtime);
  const updatedAt = new Date().toISOString();
  const nextInstallation = await writeInstallation({ version: VERSION, sources, projection_root: projection.root, kujo_bin: projection.kujo, installed_at: installation.installed_at, updated_at: updatedAt });
  const nextProject = { ...projectConfig, version: VERSION, installation_version: VERSION, updated_at: updatedAt };
  const config = { ...nextProject, ...nextInstallation };
  const {skills,hostAssets,mcp}=await activateProject(catalog,config,project,nextProject,{host:true,expectedConfig:projectConfig});
  output({ ok: true, message: "Kujo OpenCode updated without changing profile exposure.", profile: config.profile, enabled: config.enabled, disabled: config.disabled, skills, host_assets: hostAssets, mcp }, opts.json);
}

async function recover(opts) {
  const home = homePaths(); const catalog = await loadCatalog();
  const targets = catalog.sources.flatMap(source => [join(home.sources, source.id), join(home.sources, `${source.id}-${source.commit}`)]);
  const runtimeRoot = join(home.root, 'runtime');
  let names = []; try { names = await readdir(runtimeRoot); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const name of names) if (/^\d+\.\d+\.\d+\.install-lock$/.test(name)) targets.push(join(runtimeRoot, name.replace(/\.install-lock$/, '')));
  const recovered = [];
  const project=resolve(opts.project||process.cwd());
  if((await recoverProjectFiles(project,projectActivationPaths(catalog))).recovered)recovered.push(project);
  for (const target of targets) if ((await recoverDirectory(target)).recovered) recovered.push(target);
  output({ok:true,message:'Interrupted installation recovery finished. Retry setup or update, then run doctor.',recovered}, opts.json);
}

async function uninstall(opts) {
  const project = resolve(opts.project || process.cwd()); const paths = projectPaths(project); const catalog = await loadCatalog();
  if (opts.purge) await loadInstallation(catalog);
  await uninstallProject(catalog,project);
  if (opts.purge) await rm(assertSafePurgeRoot(homePaths().root), { recursive: true, force: true });
  output({ ok: true, message: `Kujo OpenCode removed from ${project}.${opts.purge ? " Shared local sources and receipts were purged." : " Shared local sources and receipts were preserved."}` }, opts.json);
}

function help() { process.stdout.write(`Kujo OpenCode ${VERSION}\n\nUsage: kujo-opencode <command> [options]\n\nCommands:\n  setup       Install every supported Kujo source locally and configure OpenCode\n  evidence    Export retained receipts as JSON (--scope project|session|legacy, --session ID, --receipt ID)\n  demo        Run your first repository scan and show its receipt\n  doctor      Verify runtime, source, configuration, and host readiness\n  status      Show the active local installation\n  profiles    List portable Ability profiles\n  profile NAME Select the active profile\n  abilities   List installed and active Abilities\n  enable NAME Add a tool or product to the active exposure\n  disable NAME Hide a tool or product from the active exposure\n  approve ID  Review, confirm, and execute a pending operation\n  browser     status|install|recover Lens Chromium dependencies\n  services    status|start|stop [watchdog]\n  update      Refresh all pinned local sources\n  recover     Restore interrupted source/runtime installations\n  repair      Restore MCP and skill projections\n  uninstall   Remove project projections; add --purge for shared data\n\nOptions:\n  --project DIR      Target project (default current directory)\n  --profile ID       Setup profile (default kujo.profile.essentials)\n  --source-root DIR  Use local Kujo checkouts (development/offline setup)\n  --force            Reacquire pinned sources\n  --json             Machine-readable output\n`); }

try {
  const opts = options(process.argv.slice(3));
  if (command === "evidence") await evidenceExport(opts); else if (command === "setup") await setup(opts); else if (command === "demo") await demo(opts); else if (command === "doctor") await doctor(opts); else if (command === "status") await status(opts); else if (command === "profiles") await profiles(opts); else if (command === "profile") await setProfile(opts); else if (command === "abilities") await abilities(opts); else if (command === "enable") await select(opts, true); else if (command === "disable") await select(opts, false); else if (command === "approve") await approve(opts); else if (command === "browser") await browser(opts); else if (command === "services") await services(opts); else if (command === "update") await update(opts); else if (command === "recover") await recover(opts); else if (command === "repair") await repair(opts); else if (command === "uninstall") await uninstall(opts); else if (["help", "--help", "-h"].includes(command)) help(); else if (["version", "--version", "-v"].includes(command)) process.stdout.write(`kujo-opencode ${VERSION}\n`); else throw new Error(`unknown command: ${command}`);
} catch (error) { process.stderr.write(`error: ${error.message}\n`); process.exitCode = 1; }
