# Kujo OpenCode

Use Kujo's supported ecosystem tools from OpenCode 2, with local execution,
clear approvals, and evidence receipts. Your models stay in OpenCode.

## Install and start

Requires Node.js 20+, npm, Git, and [OpenCode 2](https://opencode.ai/v2/docs/).
From the project you want to work on, install the release tarball and set up:

```sh
npm install --global /path/to/kujolang-kujo-opencode-0.2.0.tgz && kujo-opencode setup
```

This is one paste, with no checkout, build, test, or linking step. Setup downloads
27 pinned source repositories, installs its own Kujo binary, and configures this
project. Internet access is required during installation. It can take several
minutes. npm publication is pending; **the registry package name is not yet an
available install route**. A maintainer creates the tarball with `npm ci && npm pack`.
Users with access to the private repository can instead install directly:

```sh
npm install --global 'git+ssh://git@github.com/kujolang/kujo-opencode.git#codex/opencode-ability-integration' && kujo-opencode setup
```

For a temporary package invocation, `npm exec --yes --package=/path/to/package.tgz
-- kujo-opencode setup` also works. Repeat that prefix for later CLI commands,
or install globally for convenient maintenance commands.

```sh
kujo-opencode doctor
kujo-opencode demo
opencode
```

In OpenCode, type **`/kujo`** to manage profiles, individual capabilities and
specialists, or inspect evidence. The menu does not start inference. **`/kujo-review`** reviews
changes; **`/kujo-doctor`** helps diagnose setup. The demo runs a real read-only
ShipCheck scan and shows its receipt; it requires no model or API key. A successful
scan is evidence gathering, not a claim that the repository is ready to ship.
Scout's deeper repository map writes artifacts and therefore needs approval.

Setup safely merges the Kujo server into existing project JSON or JSONC,
including root-level configs, preserving comments, models, permissions, and other
servers. It refuses malformed configs, conflicting Kujo definitions, and unowned
assets. It adds project skills, a native plugin with a `/kujo` menu, review and doctor commands, and `.kujo/opencode.json`.
The native interface provides searchable capabilities, profile selection with a
fresh host permission, individual capability controls, and receipt history. The MCP entry is retained disabled
to avoid duplicate tools. Restart OpenCode after setup, update, or repair.
Repeated setup retains your selected profile and overrides.

## Choose what OpenCode can use

```sh
kujo-opencode profiles
kujo-opencode profile review
kujo-opencode enable lens
kujo-opencode disable kujo_lens_page_check
kujo-opencode abilities
```

| Profile | Tools | Intended use |
| --- | ---: | --- |
| `essentials` | 5 | Understand a repository and its changes |
| `review` | 18 | Check architecture, contracts, context, and change footprint |
| `ship` | 29 | Run verification and retain release evidence |
| `build` | 14 | Inspect source and run reviewed source/test snapshots |
| `full` | 45 | Add orchestration, RAG, and optional service tools |

`enable` and `disable` accept a product name, a tool name, or the canonical Ability
ID. Product names select all of that product's supported operations. Canonical
profile IDs remain supported. Explicit overrides survive profile changes and
upgrades. CLI changes require restarting OpenCode to refresh exposure. In the
native `/kujo` menu, **Manage individual capabilities** lets you enable, disable,
or restore the profile default for one tool. Each change requests fresh host
permission, updates the project's configuration and skills transactionally, and
refreshes tools immediately. Cancelling or declining leaves exposure unchanged.
If another process changes configuration during approval, the operation fails
without overwriting it; reopen the picker and review the current state.
Profiles and overrides grant no execution authority: effectful operations still
require their own approval, and specialist scope remains enforced.

The catalog covers Scout, Scent, PatchBrief, ChangeBucket, ShipCheck, Fence,
Spec, Eval, RunLedger, Dispatch, RAG, Watchdog, CaseFile, Concord, Muzzle,
Kennel, Redact, VersionSeal, PackWrite, Tribunal, Dossier, Howl, and Lens,
plus catalog discovery and receipts. See [the exact catalog](catalog/abilities.json)
for supported operations. This is not every feature of every Kujo product.

## Approve an operation

When an operation needs approval, OpenCode gives you a request ID. In your terminal:

```sh
kujo-opencode approve REQUEST_ID
```

You see the project, operation, effects, and exact input. Enter `y` to execute that
operation once, or press Enter to decline. No JSON assembly or token copying.
Requests expire after 15 minutes; changed definitions or disabled tools require a
new request. Canonical one-time approvals are still bound to identity, input,
invocation, and definition. Idempotency protects retries. OpenCode can inspect the
resulting receipt; it should not repeat a write with a new request.

Agents must never issue their own approvals. The friendly command requires an
interactive terminal and has no `--yes` bypass. The low-level explicit
`approve --ability ID --invocation ID --input JSON` remains for compatibility;
its caller remains responsible for obtaining human authorization.
OpenCode's own permission checks remain independent.

## Maintenance

- `status` shows the active installation; `doctor` reports readiness and fixes.
- Install the newer release package, then run `update` in each project. It keeps
  profiles, overrides, and receipts. Projects on 0.1.0 keep their prior projection.
- `recover` restores a source/runtime transaction interrupted by process death.
  It refuses to take over a live installer. Retry setup/update afterward.
- `repair` restores owned native plugin, MCP fallback, skill, and command projections.
- `uninstall` removes project integration and retains shared data. `--purge`
  deletes shared sources and receipts, affecting every configured project.
- `browser install` installs optional Lens Chromium prerequisites.
- `services start watchdog`, `services status watchdog`, and `services stop watchdog`
  manage the optional loopback service. Neither starts automatically.

Shared data lives in `~/.local/share/kujo/opencode`, or `KUJO_OPENCODE_HOME`.
CMD and Pi state remain separate. Watchdog and RunLedger are explicit tools;
automatic host lifecycle hooks and agent projections are not included.

## Development and verification

```sh
npm ci
npm test
npm run test:e2e
npm run test:fresh
npm run test:opencode -- --project /path/to/configured/project
```

The fresh gate packs the release, installs it through npm in an empty home and
prefix, acquires the real pinned sources, executes a demo and packaged MCP server,
and upgrades the actual 0.1.0 tarball while retaining another older project.
It requires network access and retains its temporary directory for inspection.
The host check uses a private loopback OpenCode server without a model request.

For development, `setup --source-root /absolute/path/to/kujo-repos` uses local
checkouts, trusting their contents rather than claiming pinned revisions.
`KUJO_BIN` selects an existing runtime. Public setup needs neither override.

See [verification](docs/VERIFICATION.md), [provenance](docs/PROVENANCE.md),
[security](SECURITY.md), and the official OpenCode 2
[commands](https://opencode.ai/v2/docs/commands/),
[MCP](https://opencode.ai/v2/docs/mcp-servers/), and
[skills](https://opencode.ai/v2/docs/skills/) documentation.

For explicit live-provider native execution and permission acceptance, set
`KUJO_TEST_MODEL=opencode/glm-5.3-flash-free` when running `npm run test:native`.
This makes real provider requests in isolated fixture sessions. Without that
variable, the native gate tests management and permissions without inference.
The current cross-host coverage and remaining work are tracked in
[the capability matrix](docs/CAPABILITY-PARITY.md) and
[production acceptance](docs/PRODUCTION-READINESS.md).


Select `Build` in `/kujo` (or run `kujo-opencode profile build`) to use
`kujo_source_inspect` and `kujo_source_format`. Both accept a project-relative
`.kujo` file of at most 64 KiB. They return a digest of the inspected bytes and
canonical diagnostics or formatting preview. Files are copied into a private
temporary directory; formatting is never applied to your source. These are
single-file checks, not proof that imports, project tests, or runtime behavior
work. Use the reviewed run/test workflow below for execution. Starter creation
remains tracked parity work.

Project setup, updates, profile changes, repair, and uninstall use a recoverable
activation transaction. If interrupted, run `kujo-opencode recover --project DIR`
before retrying. Recovery refuses a live installer. If it reports a changed-file
conflict, preserve that file outside its managed path before recovery, then merge
your edits back deliberately; recovery will not discard them automatically.


Choose **Choose a specialist** in `/kujo`, or use OpenCode's agent selector:

| Specialist | Scope | Starting profile |
| --- | --- | --- |
| `kujo-understand` | Repository map, context and task contract | Review |
| `kujo-build` | Source checks, reviewed execution, MCP generation and SDK fixtures | Build |
| `kujo-review` | Change footprint, architecture and artifact review | Review |
| `kujo-browser` | Lens flow/page verification and failure evidence | Ship |
| `kujo-workflow` | Explicit Dispatch/Muzzle operation and run evidence | Full |
| `kujo-ship` | Release scan, requested evaluation and run evidence | Ship |

Specialists inherit your model choice. Each has an enforced native Ability
allowlist and denies raw shell, edits, network tools and delegation by default.
Normal approvals still apply to its declared effects. Selecting a specialist
does not enable capabilities or start inference; the picker reports missing
exposure. Change the profile separately when needed. Build supports reviewed
run/test, MCP generation and Agents SDK fixtures. Starter creation remains
unimplemented. Ship gathers evidence; it does not publish releases.

## Find and export evidence

In `/kujo` → **Evidence history**, choose this project, the current session, or
older unscoped receipts. New receipts carry the canonical project path. Older
receipts are kept separate because their project cannot be inferred safely.
Choose a receipt to view its outcome/provenance, recorded result, or referenced
artifacts. Compare two project receipts to see status, duration, model and exact
serialized-result differences; comparison does not establish correctness.

Artifact previews show current local files, which may have changed since the
run. They reject paths outside the project and symlinks, show at most 64 KiB of
UTF-8 text or 50 directory entries, and do not execute or open external URLs.
The terminal display further limits long previews to 16,000 characters.

Export full retained receipts to standard output for your own tooling:

```sh
kujo-opencode evidence --json > evidence.json
kujo-opencode evidence --session SESSION_ID --json
kujo-opencode evidence --receipt RECEIPT_ID --json
kujo-opencode evidence --scope legacy --json
```

Native evidence scans up to 2 MiB from each of the current ledger and three
retained archives, showing up to 50 matches; CLI exports include up to 100.
The response states this coverage. Missing history is not evidence that an
operation never ran. Receipt inspection, comparison and export do not call a
model or create new receipts. The canonical catalog's receipt-list Ability
retains its existing shared-ledger contract; these scoped views are native
management and CLI features.

## Execution state across projects

Approvals and idempotency records are now stored per canonical workspace under
`projects/<workspace-hash>/state.json` in Kujo's data directory. Path aliases for
the same workspace use the same state. Different projects cannot use each other's
approvals or completed outcomes, even when a caller reuses an invocation ID or
idempotency key. Receipts remain in the shared ledger with project attribution.

On upgrade, completed legacy outcomes with matching project attribution can
still replay. Old approval grants are not transferred: request fresh approval
for unfinished work. An unscoped or in-progress legacy idempotency record stops
execution with `kujo_legacy_outcome_unresolved`. Inspect the receipts and actual
artifacts before deliberately starting a new operation with a new key; do not
retry blindly or delete state to bypass that check. Old state is preserved.
Moving a workspace to a different canonical path creates a different execution
namespace; automatic state relocation is not supported. Older installed versions
retain their prior behavior until each project is upgraded.

The packed fresh-install gate keeps its tarballs and `verification.json` after
success and removes its own cloned sources/caches. Set
`KUJO_TEST_KEEP_FIXTURE=1 npm run test:fresh` to retain a successful workspace for
manual host inspection. Failed fixtures remain available for diagnosis.

## Run reviewed source and tests

In Build, ask the agent to preview the files needed for your program or tests.
`kujo_source_preview` accepts `mode: "run"`, an `entry` such as `main.kujo`,
explicit project-relative `files`, and optional program `args`. For canonical
fixture tests use `mode: "test"` and include top-level `tests/*.kujo`, their
`.out` or `.interpreter.out` files,
imports and resources. It returns the command, runtime/source SHA-256 values,
bounded source excerpts and an `execution_input` for `kujo_source_execute`.

Review the files and effects, then approve that exact execution input. Changed
source or runtime bytes are refused. Execution runs a copy of the reviewed
runtime and files under `.kujo/executions/<id>`, using canonical interpreter
execution or `kujo test --runtime interpreter`. Every selected top-level fixture
must include reviewed expected output; snapshot-update mode is unavailable.
A suite with no runnable fixtures fails instead of reporting a successful test. Caller module paths and automatic project import fallback are disabled.
Only selected files are copied, so include every required import and resource.

These are trusted programs with your host permissions and inherited environment,
not an OS sandbox. They can perform filesystem, process and network effects.
Outputs stay in the snapshot unless the program writes elsewhere. The receipt
records runtime/source digests, command, output and artifact location; nonzero
exit is a failed receipt. Replaying a completed approved request returns its
receipt without rerunning. Inspect evidence before retrying an uncertain outcome.

Limits: 256 files, 4 MiB total source/resources, 32 KiB execution manifest,
16 KiB preview excerpts, 32 KiB combined output and a 120-second process window.
Cancellation and output/time limits terminate the supervised process tree;
platform acceptance remains subject to the documented release matrix.


## Generate MCP scaffolds and verify Agents SDK

In Build, ask `kujo_mcp_preview` to inspect a repository (`path`, default `.`)
and an output directory (`output_dir`, default `.kujo/mcp-generated`). Its parent
must exist and the destination must be new. Preview runs the canonical generator
with `--no-ai --dry-run`; it writes no scaffold and executes no discovered command.
Approve `kujo_mcp_make` to generate and validate the scaffold in that destination.
Generation analyzes current repository contents again, so a preview is advisory,
not a digest-bound source snapshot.

Open the returned `safety-review.md`, `mcp.manifest.json` and validation report
before exposing a generated server. The tool does not start or register it.
Existing destinations are refused, and failed generation retains partial files
for inspection. Choose a new destination deliberately after reviewing a failure.

`kujo_agents_smoke` runs the installed canonical Agents SDK offline examples with
normal approval, from a private temporary working directory. Every example must
report `ok: true` and `requires_network: false`. The approval example deliberately
reports a failed run: its acceptance flag verifies rejection. These fixtures do
not certify live providers or your application's agent behavior. Both workflows
use a 120-second window and bounded output; their receipts support normal replay.
