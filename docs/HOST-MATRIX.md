# Exact-candidate host checks

The `Exact candidate host matrix` workflow passed on Linux, macOS and Windows
for the [published 0.2.0 archive](acceptance/2026-10-17-release-hosts.json). It uses 2.0.31 as its minimum test target and resolves the latest version
of the official `@opencode/cli` v2 package once per run. These are recorded test targets; a newer host or archive needs its own evidence. The Linux runner is
glibc Ubuntu; musl distributions are outside this matrix. The general GitHub latest
release and the `opencode-ai` npm package can still refer to v1; the workflow
must not silently test that different host generation.

Dispatch `host-matrix.yml` from the same source commit as a successful
`Release candidate` run, supplying its run ID and reviewed archive SHA-256. Each
runner downloads that one immutable archive, verifies it, installs an official
standalone host in a private runner directory, and sets `KUJO_TEST_RELEASE_DIR`
for native acceptance. The harness installs the tarball and all pinned sources;
it does not require sibling checkouts or replace the user's OpenCode installation.

The host installer downloads the exact platform package without running its
package scripts, verifies npm's SHA-512 integrity against the downloaded bytes,
extracts only the native binary, verifies its reported version, and records its
SHA-256. x64 uses the baseline CPU build. Windows uses the standalone executable,
not an unsupported global package-manager installation. Official distribution
choices follow the [OpenCode v2 installation documentation](https://opencode.ai/v2/docs/).

Native acceptance verifies management RPC, profile/capability/lifecycle permission
rejection and one-time grants, canonical session RunLedger operations, knowledge,
and browser setup controls. It writes `verification.json`, including actual host,
platform/architecture, candidate commit/hash/integrity and pinned-source status.
The payload verifier compares the installed runtime files to the exact archive.
The workflow retains host provenance and native acceptance as separate artifacts.
It uses read-only repository permissions and makes no inference requests by default.

A local equivalent, using a new directory for the host binary:

```sh
npm run test:host-install -- 2.0.31 /absolute/new/host-directory
KUJO_TEST_RELEASE_DIR=/absolute/candidate \
  OPENCODE_BIN=/absolute/new/host-directory/bin/opencode npm run test:native
```

Use `bin/opencode.exe` on Windows. For source-checkout testing without a candidate,
`KUJO_TEST_PINNED=1 npm run test:native` also acquires pinned repositories rather
than local siblings. Live-model flags remain explicit and require an entitled
provider; no paid model is selected automatically.

All jobs are configured to run the actual 80×24 terminal harness with the exact candidate,
including onboarding, service guidance, visible profile rejection, and separate
RunLedger start/finish approvals. Screens and payload proof are retained. This does
not request inference. The harness uses a private Python environment with pinned
terminal-parser dependencies.

The harness uses POSIX PTYs on Linux/macOS and pinned pywinpty 3.0.5 with native
ConPTY on Windows. It launches only an owned standalone host, uses bounded reads,
and retains UTF-8 screens. A real-terminal smoke gate checks dimensions, Unicode
input, early exit and cleanup before the OpenCode journey. Windows invokes npm's
JavaScript entrypoint through node, avoiding shell interpolation of fixture paths.
The transport follows the upstream [pywinpty 3.0.5 API](https://github.com/andfoy/pywinpty/blob/v3.0.5/winpty/ptyprocess.py).

Windows rendered-terminal acceptance passed with ConPTY, alongside Linux and
macOS, in [run 39051805077](https://github.com/kujolang/kujo-opencode/actions/runs/39051805077).
These jobs made no model calls. Six-specialist ChatGPT acceptance is recorded
separately and used an earlier archive. Final release approval must bind the
required native, rendered and live-model evidence to the chosen archive.

For local rendered acceptance after installing tests/requirements-tui.txt in
a private Python environment (Windows requires its conditional pywinpty wheel):

```sh
python tests/terminal-transport-test.py
python tests/tui-terminal.py --candidate /absolute/candidate \
  --host /absolute/host/bin/opencode --ledger --columns 80 --rows 24
```

Candidate mode verifies the bundle before installation and after UI acceptance,
then compares the installed payload to the archive. A failed payload comparison
marks verification as failed rather than leaving a passing candidate receipt.
