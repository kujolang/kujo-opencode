// Public diagnostics are a fixed vocabulary. Never forward npm/Playwright output:
// it can contain registry credentials, proxy URLs or private filesystem paths.
const messages=Object.freeze({
 install_disk_full:'Storage is full or a quota was reached. Free space on the installation and browser-cache volumes, then retry.',
 install_permission_denied:'The installer could not write a required folder. Check ownership and write permissions for the installation and browser cache, then retry.',
 install_npm_missing:'npm was not found. Install Node.js with npm or fix the PATH used to start OpenCode, then retry.',
 install_certificate:'Certificate validation failed. Check the system clock and trusted certificates for your network or proxy, then retry.',
 install_network:'The installer could not reach a download service. Check network, DNS and proxy settings, then retry.',
 install_auth:'A package or download service refused authentication. Check your npm registry and proxy configuration, then retry.',
 install_interrupted:'The installer stopped before completion. Check available system resources and retry; use recovery if setup reports an interrupted transaction.',
 install_output_limit:'The installer produced too much output and was stopped. Check npm configuration, then retry.',
 dependencies_failed:'Lens dependency installation failed. Check npm configuration, available storage and network access, then retry.',
 chromium_failed:'Chromium installation failed. Check available storage, download access and operating-system support, then retry.',
 launch_failed:'Chromium could not launch. Check operating-system browser dependencies and run Check readiness again.',
 install_failed:'Browser installation failed. Check Node/npm, available storage and network access, then retry.',
});
export function browserFailure(code) {
 const known=Object.hasOwn(messages,code)?code:'install_failed';
 return {code:known,message:messages[known]};
}
export function browserInstallError(phase,{error,result}={}) {
 const output=`${error?.code||''}\n${result?.stdout||''}\n${result?.stderr||''}`;
 let code=phase==='dependencies'?'dependencies_failed':'chromium_failed';
 if(/\b(?:ENOSPC|EDQUOT)\b|no space left on device|disk quota exceeded/i.test(output))code='install_disk_full';
 else if(/\b(?:EACCES|EPERM)\b|permission denied/i.test(output))code='install_permission_denied';
 else if(error?.code==='ENOENT')code='install_npm_missing';
 else if(/\b(?:CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT)\b|certificate verify failed/i.test(output))code='install_certificate';
 else if(/\b(?:E401|E403)\b/.test(output))code='install_auth';
 else if(/\b(?:ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ERR_SOCKET_TIMEOUT)\b/.test(output))code='install_network';
 else if(error?.code==='ability_output_limit')code='install_output_limit';
 else if(result?.signal)code='install_interrupted';
 const failure=browserFailure(code);
 return Object.assign(new Error(failure.message),{code:failure.code});
}
