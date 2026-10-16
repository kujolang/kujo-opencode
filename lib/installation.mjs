import { lstat, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { readJson, writeJson } from "./io.mjs";
import { homePaths, safeExistingDirectory, safeExistingFile } from "./paths.mjs";

export const INSTALLATION_SCHEMA = "kujo.opencode.installation/v1";

export async function writeInstallation(value) {
  const home = homePaths();
  const installation = { schema: INSTALLATION_SCHEMA, ...value };
  await writeJson(join(home.root, "installations", `${value.version}.json`), installation);
  // 0.1.0 reads only installation.json. Preserve it for projects still using that runtime.
  // New projections select their own version record, so upgrading one project is independent.
  const previous = await readJson(home.installation, null);
  if (!previous || previous.version === value.version) await writeJson(home.installation, installation);
  return installation;
}

export async function loadInstallation(catalog, version = null) {
  const home = homePaths();
  if (version !== null && !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("invalid installation version");
  const installation = (version ? await readJson(join(home.root, "installations", `${version}.json`), null) : null) || await readJson(home.installation, null);
  if (!installation || installation.schema !== INSTALLATION_SCHEMA) throw new Error("trusted Kujo OpenCode installation metadata is missing; run 'kujo-opencode setup'");
  if (typeof installation.version !== "string" || !installation.sources || typeof installation.sources !== "object") throw new Error("trusted Kujo OpenCode installation metadata is invalid");

  const expectedProjection = join(home.root, "runtime", installation.version);
  if (resolve(installation.projection_root || "") !== resolve(expectedProjection)) throw new Error("trusted Kujo OpenCode projection path is invalid");
  await safeExistingDirectory(home.root, relative(home.root, expectedProjection));
  const expectedBinary = join(expectedProjection, "native", process.platform === "win32" ? "kujo.exe" : "kujo");
  if (resolve(installation.kujo_bin || "") !== resolve(expectedBinary)) throw new Error("trusted Kujo runtime path is invalid");
  await safeExistingFile(home.root, relative(home.root, expectedBinary));

  const expectedIds = new Set(catalog.sources.map((source) => source.id));
  if (Object.keys(installation.sources).length !== expectedIds.size) throw new Error("trusted Kujo source catalog is incomplete");
  for (const expected of catalog.sources) {
    const installed = installation.sources[expected.id];
    if (!installed || installed.commit !== expected.commit || !["pinned", "local"].includes(installed.mode)) throw new Error(`trusted Kujo source '${expected.id}' is invalid`);
    if (installed.mode === "pinned") {
      const expectedPath = join(home.sources, expected.id);
      if (resolve(installed.path || "") !== resolve(expectedPath)) throw new Error(`trusted Kujo source path '${expected.id}' is invalid`);
      await safeExistingDirectory(home.root, relative(home.root, expectedPath));
      const head = await safeExistingFile(home.root, relative(home.root, join(expectedPath, ".git", "HEAD")));
      if ((await readFile(head, "utf8")).trim() !== expected.commit) throw new Error(`trusted Kujo source revision '${expected.id}' is invalid; run 'kujo-opencode update'`);
    } else {
      const stat = await lstat(installed.path);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`local Kujo source '${expected.id}' must be a real directory`);
    }
  }
  for (const id of Object.keys(installation.sources)) if (!expectedIds.has(id)) throw new Error(`unexpected trusted Kujo source '${id}'`);
  return installation;
}
