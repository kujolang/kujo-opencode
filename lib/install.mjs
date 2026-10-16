import { VERSION } from "./version.mjs";
import { cp, lstat, mkdir, readFile, realpath, rename, rm, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { run } from "./process.mjs";
import { readJson, writeJson } from "./io.mjs";
import { homePaths, packageRoot, projectPaths, safeDirectChild, safeOutputPath } from "./paths.mjs";
import { profileAbilities, skillForSource } from "./catalog.mjs";

async function exists(path) { try { await lstat(path); return true; } catch { return false; } }

const HOST_ASSETS = [".opencode/skills/kujo-opencode/SKILL.md"];


export async function installSources(catalog, { sourceRoot, force = false } = {}) {
  const home = homePaths(); await mkdir(home.sources, { recursive: true });
  const installed = {};
  for (const source of catalog.sources) {
    if (sourceRoot) {
      const local = resolve(sourceRoot, source.id);
      if (!await exists(local)) throw new Error(`local source is missing: ${local}`);
      installed[source.id] = { path: local, commit: source.commit, mode: "local" };
      continue;
    }
    const destination = join(home.sources, source.id);
    if (force) await rm(destination, { recursive: true, force: true });
    if (await exists(destination)) {
      const revision = await run("git", ["rev-parse", "HEAD"], { cwd: destination, timeoutMs: 10_000 });
      if (revision.exitCode !== 0 || revision.stdout.trim() !== source.commit) await rm(destination, { recursive: true, force: true });
    }
    if (!await exists(destination)) {
      const temporary = `${destination}.partial-${process.pid}`;
      await rm(temporary, { recursive: true, force: true });
      let result = await run("git", ["clone", "--filter=blob:none", "--no-checkout", `https://github.com/${source.repo}.git`, temporary], { timeoutMs: 180_000 });
      if (result.exitCode !== 0) throw new Error(`failed to acquire ${source.repo}: ${result.stderr.trim()}`);
      result = await run("git", ["checkout", "--detach", source.commit], { cwd: temporary, timeoutMs: 120_000 });
      if (result.exitCode !== 0) throw new Error(`failed to pin ${source.repo}: ${result.stderr.trim()}`);
      await rename(temporary, destination);
    }
    installed[source.id] = { path: destination, commit: source.commit, mode: "pinned" };
  }
  return installed;
}

export async function installProjection(version, kujoBinary) {
  const destination = join(homePaths().root, "runtime", version);
  if (resolve(destination) === resolve(packageRoot)) return { root: destination, kujo: kujoBinary };
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const name of ["bin", "lib", "catalog", "assets", ".generated"]) await cp(join(packageRoot, name), join(destination, name), { recursive: true, force: true });
  for (const name of ["package.json", "README.md", "SECURITY.md", "LICENSE"]) await cp(join(packageRoot, name), join(destination, name), { force: true });
  const nativeDir = join(destination, "native"); await mkdir(nativeDir, { recursive: true });
  const native = join(nativeDir, process.platform === "win32" ? "kujo.exe" : "kujo");
  const resolvedBinary = await realpath(kujoBinary);
  await cp(resolvedBinary, native, { force: true });
  return { root: destination, kujo: native };
}

export async function projectSkills(catalog, config, project) {
  const paths = projectPaths(project); const source = config.sources["kujo-skills"]?.path;
  if (!source) throw new Error("canonical Kujo skills source is not installed");
  const active = profileAbilities(catalog, config.profile, config.enabled, config.disabled);
  const names = [...new Set(active.map((ability) => skillForSource[ability.source]).filter(Boolean))].sort();
  await safeOutputPath(paths.root, paths.skillRoot);
  await mkdir(paths.skillRoot, { recursive: true });
  const previous = await readJson(paths.projectionManifest, { skills: [] });
  const previousNames = validatedProjectedSkills(previous, catalog, paths.skillRoot);
  for (const name of previousNames) if (!names.includes(name)) await rm(safeDirectChild(paths.skillRoot, name), { recursive: true, force: true });
  for (const name of names) {
    const from = join(source, "skills", name); const to = safeDirectChild(paths.skillRoot, name);
    if (!await exists(from)) throw new Error(`canonical skill is missing: ${name}`);
    if (await exists(to) && !previousNames.includes(name)) throw new Error(`refusing to replace unowned skill: ${name}`);
    await rm(to, { recursive: true, force: true });
    try { await symlink(from, to, process.platform === "win32" ? "junction" : "dir"); }
    catch { await cp(from, to, { recursive: true }); }
  }
  await writeJson(paths.projectionManifest, { schema: "kujo.opencode.skill-projection/v1", source, source_commit: config.sources["kujo-skills"].commit, profile: config.profile, skills: names });
  return names;
}

function validatedProjectedSkills(manifest, catalog, skillRoot) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.skills)) throw Object.assign(new Error("invalid Kujo OpenCode skill projection manifest"), { code: "kujo_skill_manifest_invalid" });
  if (manifest.schema !== undefined && manifest.schema !== "kujo.opencode.skill-projection/v1") throw Object.assign(new Error("unsupported Kujo OpenCode skill projection manifest"), { code: "kujo_skill_manifest_invalid" });
  const allowed = new Set(catalog.abilities.map((ability) => skillForSource[ability.source]).filter(Boolean));
  for (const name of manifest.skills) {
    safeDirectChild(skillRoot, name);
    if (!allowed.has(name)) throw Object.assign(new Error(`unknown projected Kujo skill '${name}'`), { code: "kujo_skill_manifest_invalid" });
  }
  return [...new Set(manifest.skills)];
}

export async function removeProjectedSkills(catalog, project) {
  const paths = projectPaths(project);
  const manifest = await readJson(paths.projectionManifest, { skills: [] });
  for (const name of validatedProjectedSkills(manifest, catalog, paths.skillRoot)) await rm(safeDirectChild(paths.skillRoot, name), { recursive: true, force: true });
}

export async function projectOpenCodeAssets(project) {
  const paths = projectPaths(project); await safeOutputPath(paths.root, HOST_ASSETS[0]); const previous = await readJson(paths.hostManifest, { files: [] });
  const owned = validatedHostFiles(previous);
  for (const relativePath of HOST_ASSETS) {
    const from = join(packageRoot, "assets", "opencode", relativePath.replace(/^\.opencode\//, ""));
    const to = join(paths.root, relativePath);
    if (await exists(to) && !owned.includes(relativePath)) {
      const [current, packaged] = await Promise.all([readFile(to), readFile(from)]);
      if (!current.equals(packaged)) throw Object.assign(new Error(`refusing to replace unowned OpenCode asset: ${relativePath}`), { code: "kujo_host_asset_conflict" });
    }
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { force: true });
  }
  for (const relativePath of owned) if (!HOST_ASSETS.includes(relativePath)) await rm(join(paths.root, relativePath), { force: true });
  await writeJson(paths.hostManifest, { schema: "kujo.opencode.opencode-projection/v1", files: HOST_ASSETS });
  return [...HOST_ASSETS];
}

function validatedHostFiles(manifest) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.files)) throw Object.assign(new Error("invalid OpenCode projection manifest"), { code: "kujo_host_manifest_invalid" });
  if (manifest.schema !== undefined && manifest.schema !== "kujo.opencode.opencode-projection/v1") throw Object.assign(new Error("unsupported OpenCode projection manifest"), { code: "kujo_host_manifest_invalid" });
  for (const file of manifest.files) if (!HOST_ASSETS.includes(file)) throw Object.assign(new Error(`unknown projected OpenCode asset '${file}'`), { code: "kujo_host_manifest_invalid" });
  return [...new Set(manifest.files)];
}

export async function removeOpenCodeAssets(project) {
  const paths = projectPaths(project); const manifest = await readJson(paths.hostManifest, { files: [] });
  for (const relativePath of validatedHostFiles(manifest)) await rm(join(paths.root, relativePath), { force: true });
  await rm(paths.hostManifest, { force: true });
}

export async function preflightHost(project) {
  const paths = projectPaths(project);
  await safeOutputPath(paths.root, paths.mcp);
  await safeOutputPath(paths.root, paths.config);
  await safeOutputPath(paths.root, paths.hostManifest);
  await safeOutputPath(paths.root, paths.projectionManifest);
  if (await exists(join(paths.root, ".opencode", "opencode.jsonc"))) throw new Error("Existing .opencode/opencode.jsonc requires manual merge; setup will not shadow it.");
  const existing = await readJson(paths.mcp, {});
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) throw new Error("Invalid OpenCode config");
  if (existing.mcp !== undefined && (!existing.mcp || typeof existing.mcp !== "object" || Array.isArray(existing.mcp))) throw new Error("Invalid OpenCode MCP config");
  const servers = existing.mcp?.servers;
  if (servers !== undefined && (!servers || typeof servers !== "object" || Array.isArray(servers))) throw new Error("Invalid OpenCode MCP server map");
  if (servers?.kujo && !ownedServer(servers.kujo)) throw new Error("Refusing to replace an unowned kujo MCP server");
  return existing;
}

function ownedServer(server) {
  const projection = join(homePaths().root, "runtime");
  return Array.isArray(server?.command) && server.command.length === 2 &&
    server.command[1] === join(projection, VERSION, "bin", "kujo-opencode-mcp.mjs") &&
    server.environment?.KUJO_OPENCODE_HOME === homePaths().root;
}

export async function configureMcp(config, project) {
  const paths = projectPaths(project); const existing = await preflightHost(project);
  const servers = { ...(existing.mcp?.servers || {}) };
  const projectionRoot = config.projection_root || packageRoot;
  servers.kujo = { type: "local", command: [process.execPath, join(projectionRoot, "bin", "kujo-opencode-mcp.mjs")], codemode: false, environment: { KUJO_OPENCODE_HOME: homePaths().root, KUJO_OPENCODE_PROJECT: paths.root } };
  await writeJson(paths.mcp, { ...existing, mcp: { ...existing.mcp, servers } });
  return paths.mcp;
}

export async function removeMcp(project) {
  const paths = projectPaths(project); const existing = await preflightHost(project);
  if (!existing.mcp?.servers?.kujo) return;
  const servers = { ...existing.mcp.servers }; delete servers.kujo;
  await writeJson(paths.mcp, { ...existing, mcp: { ...existing.mcp, servers } });
}
