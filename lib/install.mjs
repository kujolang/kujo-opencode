import { replaceDirectory } from "./atomic-directory.mjs";
import { hostDocument, editServer } from "./host-config.mjs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { cp, lstat, mkdir, readFile, realpath, rm, rmdir, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { run } from "./process.mjs";
import { readJson, writeJson, writeText } from "./io.mjs";
import { homePaths, packageRoot, projectPaths, safeDirectChild, safeOutputPath } from "./paths.mjs";
import { profileAbilities, skillForSource } from "./catalog.mjs";

async function exists(path) { try { await lstat(path); return true; } catch { return false; } }

const LEGACY_HOST_ASSETS = [".opencode/skills/kujo-opencode/SKILL.md", ".opencode/commands/kujo.md", ".opencode/commands/kujo-review.md", ".opencode/commands/kujo-doctor.md"];
const NATIVE_FILES = [".opencode/plugins/kujo/index.ts", ".opencode/plugins/kujo/tui.ts", ".opencode/plugins/kujo/package.json"];
const HOST_ASSETS = [...LEGACY_HOST_ASSETS.filter(file => !file.endsWith("commands/kujo.md")), ...NATIVE_FILES];
const OWNED_ASSETS = [...new Set([...LEGACY_HOST_ASSETS,...HOST_ASSETS])];



export async function installSources(catalog, { sourceRoot, force = false, progress = () => {} } = {}) {
  const home = homePaths(); await mkdir(home.sources, { recursive: true });
  const installed = {};
  let index = 0;
  for (const source of catalog.sources) {
    progress(`[${++index}/${catalog.sources.length}] Preparing ${source.id}`);
    if (sourceRoot) {
      const local = resolve(sourceRoot, source.id);
      if (!await exists(local)) throw new Error(`local source is missing: ${local}`);
      installed[source.id] = { path: local, commit: source.commit, mode: "local" };
      continue;
    }
    const destination = join(home.sources, `${source.id}-${source.commit}`);
    let reusable = !force && await exists(destination);
    if (reusable) {
      const revision = await run("git", ["rev-parse", "HEAD"], { cwd: destination, timeoutMs: 10_000 });
      reusable = revision.exitCode === 0 && revision.stdout.trim() === source.commit;
    }
    if (!reusable) {
      await replaceDirectory(destination, async temporary => {
      let result = await run("git", ["clone", "--filter=blob:none", "--no-checkout", `https://github.com/${source.repo}.git`, temporary], { timeoutMs: 180_000 });
      if (result.exitCode !== 0) throw new Error(`failed to acquire ${source.repo}: ${result.stderr.trim()}`);
      result = await run("git", ["checkout", "--detach", source.commit], { cwd: temporary, timeoutMs: 120_000 });
      if (result.exitCode !== 0) throw new Error(`failed to pin ${source.repo}: ${result.stderr.trim()}`);
      });
    }
    installed[source.id] = { path: destination, commit: source.commit, mode: "pinned" };
  }
  return installed;
}

export async function installProjection(version, kujoBinary) {
  const final = join(homePaths().root, "runtime", version);
  if (resolve(final) === resolve(packageRoot)) return { root: final, kujo: kujoBinary };
  await replaceDirectory(final, async destination => {
  await mkdir(destination, { recursive: true });
  for (const name of ["bin", "lib", "catalog", "assets", ".generated"]) await cp(join(packageRoot, name), join(destination, name), { recursive: true, force: true });
  for (const name of ["package.json", "README.md", "SECURITY.md", "LICENSE"]) await cp(join(packageRoot, name), join(destination, name), { force: true });
  const nativeDir = join(destination, "native"); await mkdir(nativeDir, { recursive: true });
  const native = join(nativeDir, process.platform === "win32" ? "kujo.exe" : "kujo");
  const resolvedBinary = await realpath(kujoBinary);
  await cp(resolvedBinary, native, { force: true });
  await cp(dirname(createRequire(import.meta.url).resolve("jsonc-parser/package.json")), join(destination, "node_modules", "jsonc-parser"), { recursive: true });
  });
  return { root: final, kujo: join(final, "native", process.platform === "win32" ? "kujo.exe" : "kujo") };
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

export async function projectOpenCodeAssets(project, config) {
  if (!config?.projection_root) throw new Error("native projection requires a trusted installation root");
  const paths = projectPaths(project);
  const previous = await readJson(paths.hostManifest, { files: [] });
  const owned = validatedHostFiles(previous);
  const moduleUrl = name => JSON.stringify(pathToFileURL(join(config.projection_root,"lib",name)).href);
  const generated = {
    [NATIVE_FILES[0]]: `import { setupPlugin } from ${moduleUrl("plugin.mjs")};\nexport default {id:"kujo.opencode",setup:ctx=>setupPlugin(ctx,{dataRoot:${JSON.stringify(homePaths().root)}})};\n`,
    [NATIVE_FILES[1]]: `export { default } from ${moduleUrl("tui.mjs")};\n`,
    [NATIVE_FILES[2]]: JSON.stringify({name:"kujo-opencode-local",private:true,type:"module",exports:{".":"./index.ts","./tui":"./tui.ts"}},null,2)+"\n",
  };
  const contents = new Map();
  // Validate all targets before touching any existing projection.
  for (const relativePath of HOST_ASSETS) {
    const to = join(paths.root, relativePath);
    await safeOutputPath(paths.root, to);
    const content = generated[relativePath] ?? await readFile(join(packageRoot,"assets","opencode",relativePath.replace(/^\.opencode\//,"")),"utf8");
    if (await exists(to) && !owned.includes(relativePath) && await readFile(to,"utf8") !== content)
      throw Object.assign(new Error(`refusing to replace unowned OpenCode asset: ${relativePath}`),{code:"kujo_host_asset_conflict"});
    contents.set(to,content);
  }
  for (const relativePath of owned) await safeOutputPath(paths.root,join(paths.root,relativePath));
  for (const [to,content] of contents) await writeText(to,content);
  for (const relativePath of owned) if (!HOST_ASSETS.includes(relativePath)) await rm(join(paths.root,relativePath),{force:true});
  await writeJson(paths.hostManifest,{schema:"kujo.opencode.opencode-projection/v1",files:HOST_ASSETS});
  return [...HOST_ASSETS];
}

function validatedHostFiles(manifest) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.files)) throw Object.assign(new Error("invalid OpenCode projection manifest"), { code: "kujo_host_manifest_invalid" });
  if (manifest.schema !== undefined && manifest.schema !== "kujo.opencode.opencode-projection/v1") throw Object.assign(new Error("unsupported OpenCode projection manifest"), { code: "kujo_host_manifest_invalid" });
  for (const file of manifest.files) if (!OWNED_ASSETS.includes(file)) throw Object.assign(new Error(`unknown projected OpenCode asset '${file}'`), { code: "kujo_host_manifest_invalid" });
  return [...new Set(manifest.files)];
}

export async function removeOpenCodeAssets(project) {
  const paths = projectPaths(project); const manifest = await readJson(paths.hostManifest, { files: [] });
  const files=validatedHostFiles(manifest);
  for (const relativePath of files) await safeOutputPath(paths.root,join(paths.root,relativePath));
  for (const relativePath of files) await rm(join(paths.root, relativePath), { force: true });
  if(files.some(file=>NATIVE_FILES.includes(file))) {
    try { await rmdir(join(paths.root,'.opencode/plugins/kujo')); }
    catch(error) { if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code)) throw error; }
  }
  await rm(paths.hostManifest, { force: true });
}

export async function preflightHost(project) {
  const paths = projectPaths(project);
  await safeOutputPath(paths.root, paths.mcp);
  await safeOutputPath(paths.root, paths.config);
  await safeOutputPath(paths.root, paths.hostManifest);
  await safeOutputPath(paths.root, paths.projectionManifest);
  const document = await hostDocument(project);
  if (Object.hasOwn(document.value.mcp?.servers || {}, 'kujo') && !ownedServer(document.value.mcp.servers.kujo)) throw new Error("Refusing to replace an unowned kujo MCP server");
  return document.value;
}

function ownedServer(server) {
  const projection = join(homePaths().root, "runtime");
  return Array.isArray(server?.command) && server.command.length === 2 &&
    typeof server.command[1] === "string" && /^\d+\.\d+\.\d+$/.test(server.command[1].slice(projection.length + 1).split(/[\\/]/)[0]) &&
    server.command[1] === join(projection, server.command[1].slice(projection.length + 1).split(/[\\/]/)[0], "bin", "kujo-opencode-mcp.mjs") &&
    server.environment?.KUJO_OPENCODE_HOME === homePaths().root;
}

export async function configureMcp(config, project) {
  const paths = projectPaths(project); const existing = await preflightHost(project);
  const servers = { ...(existing.mcp?.servers || {}) };
  const projectionRoot = config.projection_root || packageRoot;
  servers.kujo = { type: "local", disabled: true, command: [process.execPath, join(projectionRoot, "bin", "kujo-opencode-mcp.mjs")], codemode: false, environment: { KUJO_OPENCODE_HOME: homePaths().root, KUJO_OPENCODE_PROJECT: paths.root } };
  return editServer(await hostDocument(project), servers.kujo);
}

export async function removeMcp(project) {
  const existing = await preflightHost(project);
  if (!existing.mcp?.servers?.kujo) return;
  await editServer(await hostDocument(project), undefined);
}
