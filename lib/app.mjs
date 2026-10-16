import { access, realpath } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCatalog, profileAbilities } from "./catalog.mjs";
import { readJson } from "./io.mjs";
import { handlers } from "./executor.mjs";
import { homePaths, projectPaths, runtimeModule } from "./paths.mjs";
import { loadInstallation } from "./installation.mjs";

function projectConfigError(message) {
  return Object.assign(new Error(message), { code: "kujo_project_config_invalid" });
}

export async function loadProjectConfig(project = process.cwd(), catalog = null) {
  const paths = projectPaths(project);
  try { await access(join(paths.root,'.kujo/opencode-activation.json')); throw projectConfigError('Project activation is active or interrupted; finish it or run kujo-opencode recover --project DIR'); }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  const projectConfig = await readJson(paths.config, null);
  if (!projectConfig || projectConfig.schema !== "kujo.opencode.config/v1") throw projectConfigError(`Kujo OpenCode is not configured for ${paths.root}; run 'kujo-opencode setup'`);
  const loadedCatalog = catalog || await loadCatalog();
  const installation = await loadInstallation(loadedCatalog, projectConfig.installation_version);
  const allowed = new Set(["schema", "version", "profile", "enabled", "disabled", "installation_version", "installed_at", "updated_at"]);
  for (const key of Object.keys(projectConfig)) if (!allowed.has(key)) throw projectConfigError(`untrusted Kujo OpenCode project configuration field: ${key}`);
  if (projectConfig.version !== installation.version || projectConfig.installation_version !== installation.version) throw projectConfigError("Kujo OpenCode project and trusted installation versions do not match; run 'kujo-opencode update'");
  if (!Array.isArray(projectConfig.enabled) || !Array.isArray(projectConfig.disabled)) throw projectConfigError("Kujo OpenCode project Ability overrides are invalid");
  if (!loadedCatalog.profiles.some((profile) => profile.id === projectConfig.profile)) throw projectConfigError("Kujo OpenCode project profile is unknown");
  if (![...projectConfig.enabled, ...projectConfig.disabled].every((id) => typeof id === "string" && loadedCatalog.abilities.some((ability) => ability.definition.id === id))) throw projectConfigError("Kujo OpenCode project Ability overrides contain unknown identifiers");
  return { config: { ...projectConfig, ...installation, receiptsPath: homePaths().receipts }, projectConfig, installation, paths };
}

export async function createApp(project = process.cwd()) {
  await access(runtimeModule);
  const { LocalAbilityRuntime, FileAbilityState } = await import(pathToFileURL(runtimeModule));
  const catalog = await loadCatalog(); const { config, paths } = await loadProjectConfig(project, catalog);
  const selected = profileAbilities(catalog, config.profile, config.enabled, config.disabled);
  let adapterHandlers = {};
  const abilities = selected.map((item) => ({ ...item, handler: (input, context) => adapterHandlers[item.adapter](input, context), handlerId: `${item.definition.id}.canonical-cli` }));
  const home = homePaths();
  const projectRoot=await realpath(paths.root);
  class ProjectEvidenceState extends FileAbilityState {
    async appendReceipt(receipt) {
      receipt.metadata={...receipt.metadata,project_root:projectRoot};
      return super.appendReceipt(receipt);
    }
  }
  // The runtime independently resolves profile visibility. Project overrides
  // must therefore be reflected in its selected profile, not only in the
  // registered handler list. Keep canonical catalog definitions untouched.
  const effectiveProfiles = catalog.profiles.map(profile => profile.id === config.profile
    ? {...profile, extends:[], ability_ids:selected.map(item=>item.definition.id)} : profile);
  const runtime = new LocalAbilityRuntime({ abilities, profiles: effectiveProfiles, profileId: config.profile, state: new ProjectEvidenceState({ statePath: home.state, receiptsPath: home.receipts }) });
  adapterHandlers = handlers({ config: { ...config, receiptsPath: home.receipts }, project: paths.root, runtime });
  return { catalog, config, paths, runtime };
}
