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
28 pinned source repositories, installs its own Kujo binary, and configures this
project. Internet access is required during installation. It can take several
minutes. npm publication is pending; **the registry package name is not yet an
available install route**. A maintainer creates the tarball with `npm ci && npm pack`;
[release candidates](docs/RELEASING.md) add checksums, an SBOM and exact-archive verification.
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
| `ship` | 30 | Run verification and retain release evidence |
| `build` | 17 | Inspect source and run reviewed source/test snapshots |
| `full` | 60 | Add orchestration, RAG, and optional service tools |

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

With the native plugin, **Review Kujo operation** opens before the permission
choice. Inspect the operation, destination (when supplied), effects, exact input,
and approval identity. Long values have pages so you can inspect the whole input.
Choose **Return to permission choice**, then **Allow once** or **Reject** in
OpenCode. Closing the review does not grant permission. A plain rejection ends
that model step; ask again only if you want a separate new request.

You can reopen the details through `/kujo` → **Review pending approval** or the
command palette while a request is pending. The review stays within the current
project and session. OpenCode owns the decision; Kujo issues the request-bound
canonical approval only after the host grants permission and the capability is
revalidated.

If you explicitly use the MCP fallback, an operation returns a request ID. Review
and decide that request in your terminal:

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

See [compatibility, upgrades and troubleshooting](docs/COMPATIBILITY.md) for
tested host/platform limits and recovery instructions.

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
CMD and Pi state remain separate. Six scoped specialists are available through
`/kujo` → Choose a specialist. Tool exposure still follows the selected profile.

### Browser readiness

Shared browser setup uses an exclusive installer lock and stages dependencies before activation. Failed or cancelled setup restores the prior dependency tree. After an installer process stops unexpectedly, choose **Recover interrupted setup** in Browser readiness, or run `kujo-opencode browser recover`, then check readiness again. Recovery refuses a live installer. Browser downloads use an external cache and retain prior versions for rollback; unset `PLAYWRIGHT_BROWSERS_PATH=0` before setup. Recovery alone does not establish browser readiness.

Open `/kujo` → Browser readiness to launch and close Chromium without visiting a
website. If dependencies are missing or launch fails, choose Install browser
dependencies and review the native permission request. Setup installs the pinned
Lens bridge packages and Chromium; it does not verify your application. It runs
as a bounded background job. Reopen the menu to see progress, cancel or recheck.
Closing OpenCode stops its active installation; recheck disk readiness after restart.

If setup fails, choose **Why installation failed** for the detected cause and a
recovery step. The CLI reports the same safe guidance. Recognized storage/quota,
folder permissions, missing npm, certificate, authentication and network failures
have distinct messages; an unclassified failure remains explicitly uncertain.
Raw installer output is not copied into the UI. Address the reported condition,
then retry installation. Use recovery first only if setup reports an interrupted
transaction; recovery refuses to take over a live installer.

When Chromium is ready, the menu can enable page verification and select the
Browser specialist. Provide a running local URL and the behavior to verify. The
Ship profile also exposes flow validation and failure evidence. External URLs
still need explicit permission. If repair completes but Chromium cannot launch,
check the operating system's browser dependencies rather than treating an existing
executable path as a passing check. Browser dependencies are shared by projects
using the same installed Lens source.

### Optional lifecycle delivery

In a project session, choose `/kujo` → Lifecycle delivery → Enable local Watchdog
delivery, then review the native permission request. Delivery is off by default.
Start Watchdog separately with `kujo-opencode services start watchdog`. The default
endpoint is `http://127.0.0.1:7700`; token-protected services use `WDG_API_AUTH_TOKEN`
in OpenCode's environment. The bridge never starts the service or changes model
providers. It sends only session/tool/model IDs and status metadata, never prompts,
tool inputs/outputs, response bodies or credentials.

The same menu shows queue status and requests approval to retry one pending event,
recover an interrupted queue, discard pending events or disable delivery. Disabling
stops observers and delivery; pending events remain on disk for re-enabling. Retry
is bounded to five attempts, 128 events and 24 hours (expiry is applied on the next
queue operation). Authentication failures discard the affected event; fix the token
before enabling new work. An endpoint change holds existing events for the original
endpoint. Shutdown aborts delivery; stable IDs let Watchdog deduplicate a retry if
its acknowledgement was lost. Failed telemetry does not fail the user's tool call.

The optional failure guard is a separate switch in the lifecycle menu. After
three distinct consecutive failures from the same tool within five minutes, it
pauses that session and adds a non-resuming evidence reminder. Success, a different
tool or an expired window resets the count. It never retries tools or grants
approval. The guard tracks at most 128 sessions and intervenes at most once per
session per plugin activation; its counters reset on reload. It also works with
Watchdog delivery disabled. Queue status shows its intervention/attention counts.

### Session RunLedger

Choose `/kujo` → Session RunLedger to start, inspect or finish a canonical record
for the current session. Enable RunLedger start/finish capabilities first, or use
Ship/Full, and select an OpenCode model. Starting records the selected model and
initial git state after approval; it does not submit a model request or save the
prompt. Finishing asks you to choose Pass, Partial, Fail or Abandoned and approve
the final git snapshot. Idle sessions are never assigned a verdict automatically.

Records live under `.kujo/opencode-runledger/<session-hash>/`. Stable session keys
and canonical records let repeated starts inspect the existing run after a lost
response. Ambiguous/corrupt records or unresolved execution state require evidence
inspection rather than an automatic repeated write. Tracking remains tied to its
original session and project; no usage/cost values are invented. Automatic session
activation/finalization and live-provider lifecycle acceptance remain unfinished.

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
work. Use the reviewed run/test workflow below for execution, or starter
preview/creation for a new project.

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
| `kujo-workflow` | Dispatch/Muzzle, offline knowledge, and run evidence | Full |
| `kujo-ship` | Release scan, requested evaluation and run evidence | Ship |

For Dispatch, validate before running. Native execution approval does not approve
workflow checkpoints: those remain paused for a separate human decision. Use
`kujo_dispatch_inspect` with the retained run ID and output directory before
considering a retry. Inspection discloses possible canonical SQLite bookkeeping
and requires its own approval; it never resumes the run or decides a checkpoint.
Checkpoint continuation currently uses canonical Dispatch operator commands.


Specialists inherit your model choice. Each has an enforced native Ability
allowlist and denies raw shell, edits, network tools and delegation by default.
Normal approvals still apply to its declared effects. Selecting a specialist
does not enable capabilities or start inference; the picker reports missing
exposure. Change the profile separately when needed. Build supports reviewed
run/test, starter creation, MCP generation and Agents SDK fixtures. Ship gathers evidence; it does not publish releases.

## Find and export evidence

In `/kujo` → **Evidence history**, choose this project, the current session, or
older unscoped receipts. New receipts carry the canonical project path. Older
receipts are kept separate because their project cannot be inferred safely.
Choose a receipt for an outcome summary, input and provenance, its recorded
result, or referenced artifacts. The summary reports the tool outcome; it does
not declare the overall task complete. Long records have pages, first/last-page
navigation and text search across the complete retained value. Compare two project receipts to see status, duration, model and exact
serialized-result differences; comparison does not establish correctness.

Artifact previews show current local files, which may have changed since the
run. They reject paths outside the project and symlinks, show at most 64 KiB of
UTF-8 text or 50 directory entries, and do not execute or open external URLs.
The terminal viewer preserves the complete returned preview in readable pages;
those server-side file and directory limits still apply.

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
Syntax and self-check commands use argument vectors, with no shell interpolation.
The receipt includes their results; the upstream report marks its separate
shell-based command checks skipped.
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
not certify live providers or your application's agent behavior. Generator and
SDK commands have 120-second windows; each generated-server check has 30 seconds.
Output is bounded, and receipts support normal replay.


## Create a reviewed starter

Choose Build and ask for a `script`, fixture `agent`, SQLite `api`, or local `mcp`
starter. `kujo_starter_preview` takes `kind`, a lowercase `name`, and an optional
project-relative `output_dir` (default: the name). The parent directory must
already exist; an existing destination is refused before approval.

The preview contains every proposed file and directory, SHA-256 digests, canonical runtime or
source provenance, and `creation_input`. Review the files, then approve
`kujo_starter_create` with that exact input. Changed generator/source bytes are
refused. Creation writes only those files into a new directory. It does not
install dependencies, run evaluations, start a server or configure a provider.

Scripts use canonical `kujo init`; agents use `kujo agent new` with the basic
fixture profile and no Git initialization. API and MCP starters copy an explicit,
checksum-verified inventory from pinned canonical repositories, with a local
getting-started guide. The agent README explains dependency installation and
fixture execution; application guides explain local startup and exposure limits.

After an interrupted or uncertain creation, call `kujo_starter_inspect` with the
reviewed creation input. It reports matching, missing, changed or unreadable
files without modifying them. Partial output is retained; creation never
silently resumes or overwrites it. Additional files are outside this comparison.
If the canonical source/runtime has changed, inspection refuses to substitute a
new inventory: use the original preview receipt to review the retained files.

Limits: 64 files, 128 directories, 64 KiB per file, 256 KiB total UTF-8 content, depth eight and
300 KB serialized preview. Full live specialist and platform acceptance remain
tracked in the production-readiness document.

### Local knowledge

Choose Full, then `/kujo` → Local knowledge. Give the index a name, choose
**Preview and rebuild**, and select a project directory (default `docs`). Review
the listed files before granting the separate indexing permission. The guided
workflow uses canonical RAG with offline hash embeddings and local JSON storage;
it does not inherit the project's `.env` or RAG provider settings.

**Check freshness** compares file hashes and configured provenance. **Ask a
question** refuses missing or stale indexes, so changed documents require a new
preview and approved rebuild. Results retain canonical citations; `corpus/`
paths map to the selected corpus directory. Indexing reads a reviewed snapshot,
so freshness describes the last inspection, not a continuously watched folder.

Each named index lives under `.kujo/knowledge/`. The corpus supports Markdown,
plain text and Kujo source, at most 128 files totaling 8 MiB (256 KiB per file).
Hidden entries, node_modules, dist, vendor and other extensions are excluded;
symlinks are refused. This is a bounded project workflow, not the whole RAG
product: existing RAG capabilities retain custom-provider and larger-corpus use.

Failed builds preserve the previous index. After an interrupted installer has
stopped, choose **Recover interrupted indexing**, approve recovery, then check
freshness. Recovery never takes over a live owner. Keep retained evidence after
an uncertain response before deciding whether to rebuild.

### Session evidence correlation

In `/kujo` → Session RunLedger, choose **Link this session’s Watchdog trace**
after starting a record. Approve the exact link; it records only the stable trace
identifier in canonical RunLedger. It does not enable telemetry, start a service,
or change your verdict. Repeating an already recorded link is read-only. A
different existing trace requires inspection rather than silent replacement.

When lifecycle delivery is separately enabled, events automatically include the
run ID only when canonical RunLedger confirms the matching trace. Inspection is
cached for at most five seconds across up to128 sessions; native ledger changes
invalidate that session’s cache immediately. Missing, corrupt or unavailable
records leave events unlinked. Read attempts are bounded and no record contents
are sent. Session idle still means an unknown outcome, not a passing run.

Opt-in automatic start and finish reminders are available in Lifecycle controls.
Linking and human-selected finish remain separate approved operations.

### Automatic session tracking

Choose Ship or Full (or enable RunLedger start/finish), then `/kujo` → Lifecycle
delivery → **Enable automatic tracking**. This is separate from Watchdog delivery
and is off by default. Before the first model request, OpenCode asks for exact
one-time approval to start that session’s canonical RunLedger record. Declining
or leaving an uncertain result never triggers an automatic retry.

When execution becomes idle, fails, completes or is interrupted, an in-progress
record receives one inbox reminder. In the active session, the native UI offers
evidence review, an explicit verdict, or **Keep working**. Finishing requests
separate approval for the final snapshot. The offer is shown once per session;
returning to a session reconciles missed events. An event arriving during another
Kujo dialog is shown after it closes, provided you are still in that session.
If the UI disconnects during presentation, use `/kujo` → Session RunLedger. Closing the
offer or choosing Keep working preserves the in-progress record.
Completion does not imply success. Finalization still requires your selected
verdict and approval; no usage or cost is invented.

Request/reminder/presentation markers survive reload and are bounded to128 sessions per
project. **Reset tracking requests** clears only those markers after approval,
allowing new requests; canonical run records are preserved. **Recover tracking
journal** handles a stopped writer and refuses live ownership. Disable tracking
to stop new requests. Unload, disable and session cancellation prevent a late
approval from starting a new record; inspect canonical state if a command had
already begun. A host permission dialog may still require dismissal.

### Starting from OpenCode’s home screen

Open `/kujo` and choose the setup action you need. If no session is open, choose
**Create a project session** to continue directly. This creates an empty session
in the current workspace without sending a prompt or calling a model. Cancel
leaves your workspace and session list unchanged. Capability changes and tool
effects still require their normal approvals.

RunLedger start records the model currently selected in the OpenCode prompt,
without calling it. If no model is selected, choose one before starting tracking.
The native result shows a compact status summary; **Record location** identifies
the canonical JSON file, and **Evidence history** exposes operation receipts.


### Leash intervention delivery

Open `/kujo` → External services for local configuration and capability status.
This screen does not contact a service or verify credentials. See the
[service support matrix](docs/SERVICE-SUPPORT.md) for verified behavior and limits.

Select **Full**, or enable the two Leash capabilities under `/kujo` → Capabilities
(`kujo-opencode enable leash` also enables both). Start and configure your canonical
Leash service separately. In the environment that launches OpenCode, set
`KUJO_LEASH_URL` to its origin and `KUJO_LEASH_TOKEN` to a registered-device JWT.
Leash's bootstrap token only registers devices; it cannot submit interventions.
Remote services require HTTPS; local loopback HTTP is supported. Optional
`KUJO_LEASH_AUDIENCE` is sent as `x-kujo-audience`. Tokens are never stored in the
project configuration or returned by these tools.

`kujo_leash_status` inspects configuration without contacting the service. Ask the
Workflow specialist to submit a canonical Leash intervention event with
`kujo_leash_deliver`, using the exact origin reported by status. Review the event
and destination in the native approval dialog: Leash may route it to configured
notification providers. Delivery requires separate one-time approval even with
Full selected. Changing the configured origin requires a new approved request.

The receipt distinguishes `awaiting_decision`, `delivered`, `partially_delivered`,
`delivery_failed` and `duplicate`. None means a human approved the action or that
OpenCode permissions changed. The adapter does not poll for decisions, resume
workflows, register devices, start Leash or automatically retry submissions. If
a response is lost, inspect the stable request/event ID in Leash before retrying.
Keep that ID when reconciling; a new ID could create another intervention.


### Application Ability gateway

Select **Full**, or enable `gateway` using the capability picker or
`kujo-opencode enable gateway`. Set `KUJO_ABILITY_GATEWAY_URL` to the application
origin and `KUJO_ABILITY_GATEWAY_TOKEN` to its scoped bearer credential in the
environment that launches OpenCode. Optional `KUJO_ABILITY_GATEWAY_AUDIENCE` is
sent as `x-kujo-audience`. Remote origins require HTTPS. Setup does not contact
the service or configure its accounts.

Ask the Workflow specialist to call `kujo_gateway_list`. Discovery returns the
application's tool descriptors, including canonical identity, schemas, effects
and execution path. For execution, `kujo_gateway_call` takes the exact reviewed
`tool` descriptor, `origin`, operation `input`, and stable `invocation_id` and
`idempotency_key`. Native approval binds all those values. The adapter fetches
the catalog again and refuses changed descriptors before sending execution.
The application remains authoritative if its state changes during the request;
a preflight catalog check is not an atomic server-side version lock.

If the application requires its own approval, obtain that through its normal
human approval interface and supply the resulting `approval_id`. OpenCode does
not issue application approvals, infer tenant permissions or reuse native
approval IDs as remote grants. Rejection and `approval_required` remain failed
execution results with validated remote receipts when available.

A successful result requires a canonical receipt matching the reviewed Ability
ID, version, definition digest and invocation. The receipt and its result appear
in local evidence alongside the adapter receipt. There are no automatic retries.
After cancellation or a lost response, inspect the invocation in the application
before deciding whether to retry with the same identifiers.


### Read a configured Watchdog service

Choose **Full**, or enable `kujo_watchdog_read` in the capability picker or CLI.
Set `KUJO_WATCHDOG_URL` and, for a protected API, `KUJO_WATCHDOG_TOKEN` in the
environment that launches OpenCode. `/kujo` → External services → Watchdog reads
shows configuration guidance without connecting. Remote origins require HTTPS;
loopback HTTP is supported. Optional `KUJO_WATCHDOG_AUDIENCE` is forwarded as
`x-kujo-audience`. The tool does not reuse `WDG_API_AUTH_TOKEN` automatically: an
explicitly configured remote reader should not receive another service's token.

Ask the Workflow specialist to read `/api/stats`, `/api/traces?limit=10`, or
`/api/telemetry/v2/records?producer=kujo-opencode`. Query filters are preserved.
Only GET requests under `/api/*`, `/healthz` and `/readyz` are supported; model
proxy routes are excluded. Responses are bounded to 256 KiB with a 15-second timeout,
and redirects are refused. Narrow filters when a response exceeds the bound.
The result reflects what the service returns and its access policy; it is not
limited to the metadata emitted by OpenCode's lifecycle observer.

This reader does not start a service, enable telemetry, mutate lifecycle settings
or proxy model calls. Existing local Watchdog health and lifecycle-delivery
controls retain their own configuration and credentials.
