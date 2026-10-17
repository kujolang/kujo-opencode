import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { VERSION } from "../lib/version.mjs";

const exec = promisify(execFile);

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "npm_execpath is unavailable");
const { stdout } = await exec(process.execPath, [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"], {
  maxBuffer: 8 * 1024 * 1024,
});
const report = JSON.parse(stdout)[0];
const files = new Set(report.files.map((file) => file.path));
for (const required of [
  "bin/kujo-opencode.mjs",
  "bin/kujo-opencode-mcp.mjs",
  ".generated/BUILD.json",
  ".generated/GATEWAY-CONTRACT.json",
  ".generated/gateway-contract.mjs",
  ".generated/gateway-contract.ts",
  ".generated/gateway-contract.LICENSE",
  "lib/gateway.mjs",
  "catalog/service-abilities.json",
  ".generated/local-runtime.mjs",
  "catalog/abilities.json",
  "catalog/source-abilities.json",
  "catalog/build-abilities.json",
  "catalog/starter-abilities.json",
  "catalog/starter-components.json",
  "lib/starters.mjs",
  "lib/source-tools.mjs",
  "catalog/profiles.json",
  "catalog/sources.json",
  "lib/version.mjs",
  "assets/opencode/skills/kujo-opencode/SKILL.md",
  "docs/PROVENANCE.md",
  "docs/SERVICE-SUPPORT.md",
  "docs/COMPATIBILITY.md",
  "README.md",
  "SECURITY.md",
]) assert.ok(files.has(required), `missing ${required}`);
assert.ok(![...files].some((path) => path.includes("node_modules") || path.endsWith(".tgz")));
assert.equal(report.name, "@kujolang/kujo-opencode");
assert.equal(report.version, VERSION);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(VERSION, packageJson.version);
assert.equal(packageJson.dependencies["@kujolang/kujo-runtime"], "1.8.0");
assert.equal(packageJson.repository.url, "git+https://github.com/kujolang/kujo-opencode.git");
assert.equal(packageJson.homepage, "https://github.com/kujolang/kujo-opencode#readme");
assert.equal(packageJson.bugs.url, "https://github.com/kujolang/kujo-opencode/issues");
const { stdout: versionOutput } = await exec(process.execPath, ["bin/kujo-opencode.mjs", "--version"]);
assert.equal(versionOutput.trim(), `kujo-opencode ${packageJson.version}`);
