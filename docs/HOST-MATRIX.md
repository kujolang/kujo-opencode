# Exact-candidate host checks

The `Exact candidate host matrix` workflow is prepared for Linux, macOS and
Windows. It uses 2.0.31 as its minimum test target and resolves the latest version
of the official `@opencode/cli` v2 package once per run. These are test targets,
not a declaration that the complete matrix has passed. The Linux runner is
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

The POSIX jobs also run the actual 80×24 terminal harness with the exact candidate,
including onboarding, service guidance, visible profile rejection, and separate
RunLedger start/finish approvals. Screens and payload proof are retained. This does
not request inference. The harness uses a private Python environment with pinned
terminal-parser dependencies.

Windows rendered-terminal acceptance and all six live specialist model journeys
remain separate gaps; the POSIX harness does not run on Windows. These records are
required in addition to native API checks before the release report can mark the
full platform requirement passed. A CI billing failure before jobs start supplies
no compatibility evidence.

For local POSIX rendered acceptance after installing tests/requirements-tui.txt in
a private Python environment:

```sh
python tests/tui-terminal.py --candidate /absolute/candidate \
  --host /absolute/host/bin/opencode --ledger --columns 80 --rows 24
```

Candidate mode verifies the bundle before installation and after UI acceptance,
then compares the installed payload to the archive. A failed payload comparison
marks verification as failed rather than leaving a passing candidate receipt.
