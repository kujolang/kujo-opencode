# Compatibility, upgrades and support

Kujo OpenCode 0.2.0 is still undergoing release acceptance. Public npm publication
is pending. Use the tarball installation in the README; do not assume an npm
package or a green cross-platform certification exists.

## Compatibility

| Component | Requirement and current evidence |
| --- | --- |
| Node.js | 20 or newer; package declares this minimum |
| OpenCode | Version 2 required; native host and terminal acceptance currently use 2.0.31 |
| OpenCode 1 | Unsupported |
| macOS | Local installation, upgrade and terminal workflows verified on macOS 26.6.2 x86_64 |
| Linux and Windows | CI targets exist; complete platform acceptance is pending |
| Models | OpenCode owns authentication, availability and billing. Kujo does not proxy inference or choose a paid fallback |
| Kujo runtime | Adapter installs its pinned runtime; no global Kujo installation required |
| Browser checks | Optional Chromium installation and operating-system dependencies required |

A successful model listing does not prove that a provider permits every agent.
The OpenCode free GLM model has executed ordinary Build workflows; scoped Ship
attempts with the requested free providers have returned HTTP 403. Changing a
Kujo profile does not repair provider authorization. Use OpenCode's model controls
to select a model you are entitled to use, then retry deliberately.

No minimum/latest OpenCode version range beyond the tested version is certified
yet. A new host release needs host discovery, permission, terminal and workflow
acceptance before its support status changes.

## Upgrade and recovery

From each configured project, inspect the current state before upgrading:

```sh
kujo-opencode --version
opencode --version
kujo-opencode status
kujo-opencode doctor
```

Install the new release tarball, then run `kujo-opencode update` in each project.
Existing profiles, capability overrides and receipts are preserved. Other projects
retain their selected projection until updated. Actual 0.1.0-to-0.2.0 packed
upgrade has local acceptance; arbitrary downgrade and mixed-version combinations
are not certified. Keep the prior tarball and your normal project backup.

If installation was interrupted, let any live installer finish first. Once it
has stopped:

```sh
kujo-opencode recover
kujo-opencode update
kujo-opencode doctor
```

Recovery refuses conflicting edits and live owners. Preserve conflicting files
before resolving them; do not delete recovery journals or locks to force an update.
For missing owned plugin/command files, run `kujo-opencode repair`, restart
OpenCode and check `/kujo`. Repair does not replace recovery for an interrupted
transaction. There is no general-purpose downgrade command.

`kujo-opencode uninstall` removes this project's integration while retaining
shared data. `uninstall --purge` also removes shared sources and receipts used by
other projects; it is not a troubleshooting shortcut.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| `/kujo` is missing | Run `status` and `doctor` in the same project, repair owned projections if needed, then restart OpenCode |
| A capability is unavailable | Open `/kujo` → Manage individual capabilities; inspect profile exposure and readiness |
| Provider returns 401/403 | Check that provider's authentication/access in OpenCode; Kujo cannot grant model access |
| Browser setup fails | Open `/kujo` → Browser readiness → Why installation failed; address the reported cause and retry |
| Browser setup was interrupted | Once its owner stops, run `kujo-opencode browser recover`, then `kujo-opencode browser status` |
| Lifecycle deliveries need attention | Fix the Watchdog service or token, then open Lifecycle delivery → Retry delivery now and approve resuming retained events; original 24-hour expiry still applies |
| Installation reports disk full | Free space, recover after the installer stops, then retry; retain the original failure evidence |
| A write's response was lost | Inspect Evidence history and the target's state before retrying; do not create a new invocation merely to bypass an uncertain outcome |
| A tool succeeded but the task is incomplete | Inspect the outcome, input/provenance and result; a tool receipt does not determine your session verdict |

## Reporting a problem

Use the repository issue tracker when you have access. Include adapter and
OpenCode versions, OS/architecture, installation method, the exact failing action,
expected/actual behavior and whether a fresh project reproduces it. Include a
receipt ID or a redacted screenshot if useful. Do not attach tokens, credential
files, private prompts or an entire data directory. There is no response-time SLA.

The maintained acceptance record is [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).
It distinguishes verified behavior from pending work. Security reporting follows
[SECURITY.md](../SECURITY.md).

### Dispatch checkpoint continuation

The catalog pins Dispatch 1.4 (`71ca927c65598ecfe7c1816068e047cf50b915e0`)
and the package uses Kujo runtime 1.8.1, as required by its canonical release.
Ordinary human checkpoint continuation requires the authoritative
`kujo.control-view/v1` projection. Older installed sources without this view fail
closed and need an explicit installation upgrade. Native approval binds the exact
revision, identifiers, decision and review response; canonical Dispatch also
validates the revision under its run lock. Later checkpoints require new review.
Experimental v2 intervention/assurance decisions retain their canonical operator
surface. Canonical Dispatch 1.4 supports Linux/macOS POSIX runtimes; Windows
continuation and the broader host matrix remain unverified.
