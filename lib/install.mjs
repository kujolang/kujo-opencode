import { specialists, specialistMarkdown } from "./specialists.mjs";
import { activateProjectFiles } from "./project-activation.mjs";
import { replaceDirectory } from "./atomic-directory.mjs";
import { hostDocument, editServer, renderServer } from "./host-config.mjs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { cp, lstat, mkdir, readFile, realpath, rm, rmdir } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { run } from "./process.mjs";
import { readJson } from "./io.mjs";
import { homePaths, packageRoot, projectPaths, safeDirectChild, safeOutputPath } from "./paths.mjs";
import { profileAbilities, skillForSource } from "./catalog.mjs";

async function exists(path) { try { await lstat(path); return true; } catch { return false; } }

const LEGACY_HOST_ASSETS = [".opencode/skills/kujo-opencode/SKILL.md", ".opencode/commands/kujo.md", ".opencode/commands/kujo-review.md", ".opencode/commands/kujo-doctor.md"];
const NATIVE_FILES = [".opencode/plugins/kujo/index.ts", ".opencode/plugins/kujo/tui.ts", ".opencode/plugins/kujo/package.json"];
const HOST_ASSETS = [...LEGACY_HOST_ASSETS.filter(file => !file.endsWith("commands/kujo.md")), ...NATIVE_FILES, ...specialists.map(item=>`.opencode/agents/${item.id}.md`)];
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

async function skillsPlan(catalog, config, project) {
  const paths=projectPaths(project),source=config.sources['kujo-skills']?.path;
  if(!source)throw Error('canonical Kujo skills source is not installed');
  const names=[...new Set(profileAbilities(catalog,config.profile,config.enabled,config.disabled).map(item=>skillForSource[item.source]).filter(Boolean))].sort();
  await safeOutputPath(paths.root,paths.skillRoot);
  const previous=validatedProjectedSkills(await readJson(paths.projectionManifest,{skills:[]}),catalog,paths.skillRoot);
  const plans=[];
  for(const name of names){
    const from=join(source,'skills',name),to=safeDirectChild(paths.skillRoot,name);
    if(!await exists(from))throw Error(`canonical skill is missing: ${name}`);
    if(await exists(to)&&!previous.includes(name))throw Error(`refusing to replace unowned skill: ${name}`);
    plans.push({path:relative(project,to),link:from});
  }
  for(const name of previous)if(!names.includes(name))plans.push({path:relative(project,safeDirectChild(paths.skillRoot,name)),remove:true});
  plans.push({path:relative(project,paths.projectionManifest),content:JSON.stringify({schema:'kujo.opencode.skill-projection/v1',source,source_commit:config.sources['kujo-skills'].commit,profile:config.profile,skills:names},null,2)+'\n'});
  return {plans,names};
}
export async function projectSkills(catalog,config,project){
 const result=await skillsPlan(catalog,config,project);
 await activateProjectFiles(project,result.plans,projectActivationPaths(catalog));return result.names;
}
export function projectActivationPaths(catalog){
 return [...new Set([...OWNED_ASSETS,'.kujo/opencode.json','.kujo/opencode-skills.json','.kujo/opencode-host.json',
 'opencode.json','opencode.jsonc','.opencode/opencode.json','.opencode/opencode.jsonc',
 ...Object.values(skillForSource).map(name=>`.opencode/skills/${name}`)])];
}
export async function activateProject(catalog,config,project,projectConfig,{host=false,expectedConfig}={}){
 const skills=await skillsPlan(catalog,config,project);const plans=[...skills.plans];let hostAssets=[],mcp;
 if(host){
  const assets=await hostAssetsPlan(project,config,catalog);plans.push(...assets.plans);hostAssets=assets.files;
  await preflightHost(project);const document=await hostDocument(project);mcp=document.path;
  plans.push({path:relative(project,mcp),content:renderServer(document,mcpServer(config,project))});
 }
 plans.push({path:'.kujo/opencode.json',content:JSON.stringify(projectConfig,null,2)+'\n'});
 await activateProjectFiles(project,plans,projectActivationPaths(catalog),{precondition:async()=>{
   if(expectedConfig!==undefined&&JSON.stringify(await readJson(projectPaths(project).config,null))!==JSON.stringify(expectedConfig))throw Error('Project configuration changed; retry from the current profile');
 }});
 return {skills:skills.names,hostAssets,mcp};
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

async function hostAssetsPlan(project, config, catalog) {
  if (!config?.projection_root) throw new Error("native projection requires a trusted installation root");
  const paths = projectPaths(project);
  const previous = await readJson(paths.hostManifest, { files: [] });
  const owned = validatedHostFiles(previous);
  const moduleUrl = name => JSON.stringify(pathToFileURL(join(config.projection_root,"lib",name)).href);
  const generated = {
    ...Object.fromEntries(specialists.map(item=>[`.opencode/agents/${item.id}.md`,specialistMarkdown(item,catalog)])),
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
  const plans=[...contents].map(([to,content])=>({path:relative(project,to),content}));
  for(const path of owned)if(!HOST_ASSETS.includes(path))plans.push({path,remove:true});
  plans.push({path:relative(project,paths.hostManifest),content:JSON.stringify({schema:'kujo.opencode.opencode-projection/v1',files:HOST_ASSETS},null,2)+'\n'});
  return {plans,files:[...HOST_ASSETS]};
}

export async function projectOpenCodeAssets(project,config){
 const catalog=await (await import("./catalog.mjs")).loadCatalog();
 const assets=await hostAssetsPlan(project,config,catalog);
 await activateProjectFiles(project,assets.plans,projectActivationPaths());return assets.files;
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

function mcpServer(config,project){
 return {type:'local',disabled:true,command:[process.execPath,join(config.projection_root||packageRoot,'bin','kujo-opencode-mcp.mjs')],codemode:false,environment:{KUJO_OPENCODE_HOME:homePaths().root,KUJO_OPENCODE_PROJECT:projectPaths(project).root}};
}
export async function configureMcp(config,project){
 await preflightHost(project);return editServer(await hostDocument(project),mcpServer(config,project));
}

export async function uninstallProject(catalog,project){
 await preflightHost(project);
 const paths=projectPaths(project),document=await hostDocument(project);
 const skillNames=validatedProjectedSkills(await readJson(paths.projectionManifest,{skills:[]}),catalog,paths.skillRoot);
 const hostFiles=validatedHostFiles(await readJson(paths.hostManifest,{files:[]}));
 const files=[...hostFiles,...skillNames.map(name=>relative(project,safeDirectChild(paths.skillRoot,name))),'.kujo/opencode.json','.kujo/opencode-skills.json','.kujo/opencode-host.json'];
 const plans=[...new Set(files)].map(path=>({path,remove:true}));
 if(document.value.mcp?.servers?.kujo)plans.push({path:relative(project,document.path),content:renderServer(document,undefined)});
 await activateProjectFiles(project,plans,projectActivationPaths(catalog));
 if(hostFiles.some(file=>NATIVE_FILES.includes(file))){
  try{await rmdir(join(project,'.opencode/plugins/kujo'));}catch(error){if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code))throw error;}
 }
}

export async function removeMcp(project) {
  const existing = await preflightHost(project);
  if (!existing.mcp?.servers?.kujo) return;
  await editServer(await hostDocument(project), undefined);
}
