import { lstat, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeJson } from './io.mjs';

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

// One fixed lock per destination prevents concurrent installers from deleting
// each other's staging directories. A crashed owner requires explicit recovery.
export async function replaceDirectory(destination, populate, { checkpoint = async () => {} } = {}) {
  const final = resolve(destination);
  const lock = `${final}.install-lock`;
  await mkdir(dirname(final), { recursive: true });
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (error) { if (error.code === 'EEXIST') throw new Error(`Installation is already active or interrupted: ${final}. Recover the installation lock before retrying.`); throw error; }
  const id = randomUUID();
  const staged = `${final}.staged-${id}`;
  const backup = `${final}.backup-${id}`;
  let moved = false;
  let installed = false;
  let committed = false;
  const journal = { schema:'kujo.opencode.directory-transaction/v1', pid:process.pid, final, staged, backup, phase:'preparing' };
  try {
    await writeJson(`${lock}/owner.json`, journal);
    await populate(staged);
    const stagedStat = await lstat(staged);
    if (!stagedStat.isDirectory() || stagedStat.isSymbolicLink()) throw new Error('Installer did not produce a directory');
    await checkpoint('prepared');
    if (await exists(final)) { await rename(final, backup); moved = true; }
    await checkpoint('backed-up');
    await rename(staged, final); installed = true;
    await checkpoint('installed');
    await writeJson(`${lock}/owner.json`, {...journal, phase:'committed'});
    committed = true;
    await rm(backup, { recursive:true, force:true });
  } catch (error) {
    if (!committed) {
      if (installed) await rm(final, { recursive:true, force:true });
      if (moved) await rename(backup, final);
    }
    throw error;
  } finally {
    await rm(staged, { recursive:true, force:true });
    // Preserve journal if rollback itself failed: recovery must retain evidence.
    if (!await exists(backup)) await rm(lock, { recursive:true, force:true });
  }
}

// Recovery is explicit, never a timeout-based takeover of a live installer.
export async function recoverDirectory(destination) {
  const final = resolve(destination);
  const lock = `${final}.install-lock`;
  if (!await exists(lock)) return { recovered:false };
  const journal = await readFile(`${lock}/owner.json`, 'utf8').then(JSON.parse);
  if (journal.schema !== 'kujo.opencode.directory-transaction/v1' || journal.final !== final || !Number.isSafeInteger(journal.pid) || journal.pid <= 0) throw new Error('Invalid installation recovery journal');
  const suffix = journal.staged?.slice(`${final}.staged-`.length);
  if (!/^[a-f0-9-]{36}$/.test(suffix || '') || journal.staged !== `${final}.staged-${suffix}` || journal.backup !== `${final}.backup-${suffix}`) throw new Error('Invalid installation recovery paths');
  try { process.kill(journal.pid, 0); throw new Error('Installation owner is still running; recovery refused'); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
  if (!['preparing', 'committed'].includes(journal.phase)) throw new Error('Invalid installation recovery phase');
  if (journal.phase === 'committed') {
    if (!await exists(final)) throw new Error('Committed installation is missing; inspect recovery journal');
    await rm(journal.backup, {recursive:true,force:true});
  } else if (await exists(journal.backup)) {
    // A crash may occur after activation but before cleanup. Restore last known
    // working bytes, then let the explicit install perform a new transaction.
    await rm(final, { recursive:true, force:true });
    await rename(journal.backup, final);
  }
  await rm(journal.staged, { recursive:true, force:true });
  await rm(lock, { recursive:true, force:true });
  return { recovered:true };
}
