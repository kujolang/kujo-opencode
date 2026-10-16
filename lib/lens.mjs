import { join } from "node:path";
import { run } from "./process.mjs";

const PROBE = "const fs=require('node:fs');const c=require('playwright-core').chromium;const p=c.executablePath();if(fs.existsSync(p)){process.stdout.write(p)}else{c.launch({headless:true}).then(async b=>{await b.close();process.stdout.write('headless-shell')}).catch(()=>{process.exitCode=1})}";

export async function lensBrowserStatus(lensRoot) {
  const bridge = join(lensRoot, "bridge");
  try {
    const result = await run(process.execPath, ["-e", PROBE], { cwd: bridge, timeoutMs: 10_000, maxBytes: 16 * 1024 });
    return { ready: result.exitCode === 0, bridge, ...(result.exitCode === 0 ? (result.stdout.trim() === "headless-shell" ? { mode: "headless-shell" } : { executable: result.stdout.trim() }) : {}) };
  } catch (error) {
    return { ready: false, bridge, error: error.message };
  }
}

export async function installLensBrowser(lensRoot, options = {}) {
  const bridge = join(lensRoot, "bridge"); const npm = options.npmCommand || (process.platform === "win32" ? "npm.cmd" : "npm");
  let result = await run(npm, ["ci", "--omit=dev", "--ignore-scripts"], { cwd: bridge, timeoutMs: 300_000, maxBytes: 2 * 1024 * 1024 });
  if (result.exitCode !== 0) throw new Error(`Lens bridge dependency installation failed: ${result.stderr.trim() || result.stdout.trim()}`);
  result = await run(npm, ["run", "install-browser"], { cwd: bridge, timeoutMs: 600_000, maxBytes: 2 * 1024 * 1024 });
  if (result.exitCode !== 0) throw new Error(`Lens browser installation failed: ${result.stderr.trim() || result.stdout.trim()}`);
  const status = await lensBrowserStatus(lensRoot);
  if (!status.ready) throw new Error("Lens browser installation completed without a usable Chromium executable");
  return status;
}
