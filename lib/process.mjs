import { spawn } from "node:child_process";

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env || process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: options.killTree && process.platform !== "win32" });
    const kill = signal => {
      if(!options.killTree)return child.kill(signal);
      if(process.platform==='win32') { if(child.pid)spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true}).on('error',()=>child.kill(signal)); }
      else if(child.pid)try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')child.kill(signal);}
    };
    const stdout = []; const stderr = []; let bytes = 0; const limit = options.maxBytes || 8 * 1024 * 1024;
    const collect = (bucket) => (chunk) => { bytes += chunk.length; if (bytes > limit) { kill("SIGKILL"); return; } bucket.push(chunk); };
    child.stdout.on("data", collect(stdout)); child.stderr.on("data", collect(stderr));
    const abort = () => kill(options.killTree?"SIGKILL":"SIGTERM");
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => kill("SIGKILL"), options.timeoutMs || 120_000);
    child.on("error", reject);
    child.on("exit",()=>{if(options.killTree&&process.platform!=="win32")kill("SIGKILL");});
    child.on("close", (code, signal) => {
      if(options.killTree&&process.platform!=="win32")kill("SIGKILL");
      clearTimeout(timer); options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) return reject(Object.assign(new Error("operation cancelled"), { name: "AbortError" }));
      if (bytes > limit) return reject(Object.assign(new Error("command output exceeded safety limit"), { code: "ability_output_limit" }));
      resolve({ exitCode: code, signal, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
}
