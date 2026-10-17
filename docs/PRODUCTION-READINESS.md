# OpenCode production-readiness acceptance

This is the completion contract for the user-authorized parity work. The 0.2.0
usability pass is the baseline, not a production certification. A checkbox means
verified evidence for the release candidate, not implementation intent.

## Required product outcomes

- [ ] Native OpenCode plugin entrypoint and in-host management of capabilities,
  readiness and evidence; authenticated human approvals through supported host
  APIs, preserving the canonical request-bound approval contract.
- [ ] Explicitly enabled lifecycle bridge: real session/tool/model correlation,
  metadata-only Watchdog delivery, bounded durable retry, optional RunLedger,
  cancellation, unload/reconnect, and bounded failure intervention.
- [ ] Scoped understanding, building, reviewing, browser verification, workflow
  operation and shipping agents/workflows; explicit tool access and failure tests.
- [ ] Capability matrix against CMD, Pi and current Paperclip: implement missing
  supported source/build/starter/evidence workflows through canonical products;
  document justified host boundaries without silently dropping requested scope.
- [ ] Recovery: interrupted installation, failed upgrades, rollback, concurrent
  setup, multiple projects/versions, lost-response reconciliation, repair and
  uninstall. A failed install must not destroy a working installation.
- [ ] Exact packed candidate through real OpenCode sessions and actual workflow
  and approval tests on supported platforms and minimum/latest host versions.
- [ ] Published public npm package, protected release workflow, matching tag and
  release, checksum/SBOM/provenance, verified registry consumer install/upgrade,
  compatibility/migration/support policies and copyable troubleshooting.

## Evidence rules

Do not substitute MCP connection for task execution, prompt files for native UI,
a fixture client for host approval, or local macOS tests for a platform matrix.
Each outcome requires a checked-in test or acceptance record with exact runtime,
package digest and host version. Failure paths are part of acceptance. No model
proxy, automatic approval, hidden network telemetry, or duplicated product logic.

## External gates (2026-10-16)

- npm authentication unavailable in prior check (E401); registry publication not
  done. Recheck before publishing. Never store credentials in evidence.
- GitHub run 38962320715 never started any job due to account billing/spending
  limits. Resolve through account owner, then rerun; this is not test evidence.
- Private repository access is not a replacement for a public distribution.

## Baseline evidence

0.2.0 has 22 passing local offline tests, local real-product E2E, packed
fresh-install/0.1.0 upgrade acceptance, and OpenCode 2.0.31 MCP/command discovery.
See VERIFICATION.md. These remain baseline checks, not completion of this list.

## Implementation checkpoint: recovery and native backend

The first goal checkpoint adds revision-specific source directories and staged
runtime/source replacement with rollback, exclusive destination locks, and the
explicit `recover` command. Tests inject failures during preparation, backup and
activation, race two installers, and terminate an installer process. The full
project configuration/skill activation transaction and orphan-lock recovery
before owner metadata exists remain to be completed; the recovery checkbox stays
open. Existing legacy source paths remain accepted for 0.1.0 consumers.

`lib/plugin.mjs` is a native server-plugin candidate, not yet the default setup
projection. `tests/native-host.mjs` creates a temporary `.opencode/plugins/.../
index.ts` wrapper pointing to it. OpenCode 2.0.31 loads it, records status/evidence,
and prompts for profile changes before writing configuration. Management output
uses synthetic inbox entries with `resume:false`; it must still gain a dedicated
human-facing panel. Native tool tests use the real canonical Ability runtime but
a fixture permission client; real-host tool/model/approval acceptance remains open.

Important host behaviors established by this checkpoint:

- Explicit `.mjs` config loading did not register this plugin in the tested host;
  the documented local directory with `index.ts` did.
- Synthetic messages resume model inference by default. Management commands must
  pass `resume:false`, and acceptance checks must inspect messages for accidental
  assistant/model execution rather than merely print `model_call:false`.
- The plugin instance directory is not every session's directory: every command
  and native tool revalidates the session's canonical workspace before acting.
- Native permission evaluation forces a fresh ask for Kujo approval and profile
  changes. Canonical approval is issued only after host assertion resolves and
  exposure/digest are revalidated. No agent-accessible approval issuing tool exists.

Checkpoint validation: 26 offline tests, local real-product E2E, packed
fresh-install/0.1.0 upgrade, and the native host command/profile-permission gate.
These do not close the full production-readiness list above.

## Implementation checkpoint: native management RPC and TUI candidate

The package now exports native server and TUI entrypoints. The TUI provides a
Kujo menu, status/capability details, profile selection, and receipt inspection
using host dialogs. It does not call a model or answer permission requests.
The server RPC requires a workspace-bound session and fresh host permission for
profile changes. RPC calls pass location options on each method invocation,
as required by the installed 2.0.31 SDK; raw HTTP uses an `input` envelope.

An async-local data root follows registered host callbacks rather than mutating
process environment. Tests overlap callbacks for separate roots and verify their
isolation. UI fixtures cover declined profile changes, cancellation, idle setup,
workspace routing, and suppression of late UI after unload. These are behavior
fixtures, not proof of a rendered OpenCode TUI. Default installation projection,
actual terminal interaction, and real native Ability execution remain open.

Validation: 30 offline tests and real-product E2E passed. The real 2.0.31 host
acceptance also exercises status/evidence RPC and profile RPC with a real pending
host permission, verifies configuration remains unchanged before the decision,
and verifies management produces no assistant messages. This does not close the
seven product outcomes above.

## Implementation checkpoint: native default setup

Setup, update and repair now generate owned `index.ts`, `tui.ts` and package
exports under `.opencode/plugins/kujo`, pointing at the installed runtime and
explicit data root. The old prompt-only `/kujo` asset is removed on migration.
The MCP entry is retained disabled to avoid duplicate tool exposure. Uninstall
removes owned plugin files; conflict tests prove unowned files are preserved
before writing any host assets. Full project transaction recovery is still open.

OpenCode 2.0.31 loaded this normal setup projection without a test wrapper and
passed status/evidence RPC and profile permission checks. The host discovery
script now verifies native RPC and commands with the disabled fallback present.
A real PTY session opened `/kujo`, selected status, searched `shipcheck`, and
opened its detail dialog. That inspection found duplicate slash suggestions and
an overflowing status alert; the corrected interface keeps one slash suggestion
per command and uses a searchable capability selector with individual details.
This is local macOS terminal evidence, not platform/version matrix acceptance.

Checkpoint gates: 31 offline tests passed, followed by focused setup/security
checks after empty-plugin-directory cleanup; real-product E2E passed. Packed
fresh installation and 0.1.0 upgrade passed with 25 pinned sources, preserved
older project, and five tools through the independently launched MCP fallback.
Fixture: `kujo-opencode-packed-S4TrTR`. The packed test preceded the final
uninstall-directory cleanup; final release certification still requires an
immutable final candidate through all gates.
Native RPC and command discovery also passed in real OpenCode 2.0.31 against
that packed fresh project, without a custom wrapper or KUJO_OPENCODE_HOME.

## Implementation checkpoint: real model and native Ability approval

`tests/native-host.mjs` accepts explicit `KUJO_TEST_MODEL=provider/model` to run
`tests/native-model-acceptance.mjs` against a real provider. The ordinary native
gate still makes no inference calls. Live acceptance creates an isolated project,
private real host, and separate fixture sessions for read, rejected write, and
approved write. It never enables blanket auto-approval. Permission replies are
limited to the exact fixture requests, and production approval code is unchanged.

OpenCode 2.0.31 with `opencode/glm-5.3-flash-free` passed on 2026-10-16:

- Native ShipCheck returned a succeeded canonical receipt with real session,
  agent, model and plugin-surface correlation.
- RunLedger's ledger directory did not exist while host permission was pending.
- Rejecting the exact write left no ledger and no succeeded receipt for that
  session after inference finished.
- A separate once-approved write created its ledger and a succeeded canonical
  receipt containing an approval ID and the actual model identity.

Fixture: `kujo-native-host-rXE8A9`; read receipt
`receipt-6ad7dba6-7794-46eb-9a1e-3bc2ee9b9e65`; approved write receipt
`receipt-542d03a8-c15c-4c19-8752-0b8774e7b4e7`.

The HTTP prompt remains open while inference or approval is pending. The harness
must observe permissions concurrently with the write's prompt request, and use
an explicit bounded inference timeout. It selects the Ship profile before model
execution so a profile change cannot compete with an active model turn.
This live-provider gate can fail due to provider availability; it is not part of
the deterministic offline suite. OS/version and immutable final-candidate gates
remain required. See CAPABILITY-PARITY.md for the source-backed remaining product
gaps; CMD's 38 matching IDs do not establish parity with Pi or Paperclip.

## Implementation checkpoint: canonical source tooling

Build is a new seven-tool profile (Essentials plus source inspection and
formatting preview); Full now exposes 40 tools. The two host-owned source
projection definitions invoke the canonical installed runtime without modifying
the generated Ability runtime. Check/lint/format operate on private copies of
one contained UTF-8 .kujo file of at most 64 KiB. Each report includes the source
SHA-256 and explicitly says the program was not executed and source was not
modified. Formatting is preview-only; imports, project tests and runtime behavior
are not established by these single-file checks.

34 offline tests passed, including real packaged-runtime source checks,
malformed-source diagnostics, non-writing formatting, path/symlink/size/encoding
boundaries and cancellation. The real-product E2E executes both tools through
MCP and validates their canonical receipts and unchanged source. OpenCode 2.0.31
native acceptance switches to Build through a fresh host permission and confirms
the refreshed profile. Source run/test and starter workflows remain open.

Canonical CLI detail: failed parsing can return exit 3 with structured text
errors on stderr even with --json. Preserve those diagnostics as explicit text;
do not misreport them as a successful compile or discard them as invalid JSON.

## Implementation checkpoint: transactional project activation

Setup, update, repair, profile/exposure changes (CLI and native), and uninstall
now prepare project changes before activation. One journal covers owned skills,
native plugin assets, host configuration, projection manifests and project
configuration. A complete initial journal is published using exclusive hard-link
creation, preventing the empty-owner gap for this new project lock. Competing
activations are rejected. Configuration reads reject an active/interrupted
activation; profile changes also compare the configuration they started with so
a stale request cannot silently overwrite a newer profile.

Replacements and original files are kept beside the project on the same
filesystem. A process interrupted before commit can be rolled back with
`kujo-opencode recover --project DIR`. Recovery checks every affected path and
its expected digest before restoring anything. A file edited after a crash is
a conflict: preserve the edit, move it out of the managed path, then recover and
merge it deliberately. Recovery does not kill a live owner or discard changed
files. Symlinked skills are restored as links without touching their source.

40 offline tests, real-product E2E and OpenCode2.0.31 native profile acceptance
passed. Failure injection covers every backup/activation boundary, real child
process death, concurrent writers, live-owner refusal, stale preconditions,
post-crash edits and symlink/remove rollback. These tests cover process failure,
not power-loss durability or concurrent edits by unrelated filesystem writers.
The older source/runtime directory-lock owner-publication gap remains open;
this checkpoint does not close the complete recovery or release matrix outcome.
Packed fresh installation and 0.1.0 upgrade also passed for this activation
checkpoint (`kujo-opencode-packed-a4xBRb`): 25 pinned sources, older project
preserved, and packaged MCP fallback discovery verified.

## Implementation checkpoint: scoped specialist workflows

Six native agents are projected with owned files and transactional setup/removal:
Understand, Build, Review, Browser verification, Workflow operation and Ship
readiness. The /kujo picker switches the current session without inference or
changing profile exposure, and reports missing capabilities. Build now has nine
tools, adding package/contract validation; Full remains 40.

Each specialist has a fixed native Ability allowlist, explicit host permission
rules, a model-context tool filter and scope-aware catalog discovery. An
out-of-scope native call is rejected before runtime execution or approval.
Raw shell, edits, arbitrary network tools and delegation are denied by default;
normal request-bound approval remains required for allowed Ability effects.
Profiles still independently constrain exposure. Source execution/starters and
publication are not implied by a specialist name.

Offline tests cover every specialist against the catalog, denied cross-scope
calls, missing exposure, model tool filtering, catalog filtering and picker
behavior. Real host acceptance verifies all six agents are discovered and the
native selector changes the session agent. Real-provider specialist execution is
a separate gate; do not infer it from agent discovery or prompt files alone.

Specialist checkpoint validation: 45 offline tests and the real-product E2E
gate passed. OpenCode 2.0.31 discovered all six agents and switched the session
agent through native RPC (`kujo-native-host-naYxxw`). The live Ship-specialist
run using opencode/glm-5.3-flash-free failed before tool execution with provider
auth HTTP 403 / FreeTierError. This is not evidence of specialist execution;
that gate remains open. No provider identity spoofing or inference proxy was used.

## Implementation checkpoint: complete source/runtime lock publication

New directory transactions publish a fully written owner journal through an
exclusive hard link, eliminating the earlier mkdir-before-owner crash window.
Failure immediately after acquisition is recoverable with the normal command.
Older complete directory journals remain supported; an older empty lock is
preserved for manual inspection because its ownership cannot be established.
A crash before publication can leave an inert uniquely named pending file; it
does not reserve the destination or block a subsequent installation. This is
process-crash recovery, not a claim of power-loss durability.

Recovery tests cover acquisition failure, every activation boundary, a real
process exit immediately after publication, a real exit after backup, concurrent
installation, live-owner refusal and legacy compatibility. The full offline
suite now passes 48 tests; local canonical E2E also passed for this runtime
change. The live-provider harness now reports terminal provider errors promptly
and omits raw response bodies, rather than waiting for a missing tool receipt.
The provider-rejected specialist acceptance remains open.

Packed fresh-install/0.1.0 upgrade passed for the specialist and complete-lock
implementation: fixture `kujo-opencode-packed-x4tYHn`, 25 pinned sources, previous
project preserved, five packaged MCP fallback tools. Candidate tarball SHA-256:
`40d3e783cdcec0ac5ed63f01f251aa2980b76edc6a02b160fec3a53048066c9c`.
OpenCode 2.0.31 then loaded that packed fresh project and passed native status
RPC and command discovery with the fallback disabled, without inference. Later
changes in this checkpoint were test diagnostics and documentation only. This
remains local macOS evidence, not a final release or platform matrix.

## Implementation checkpoint: individual native capability controls

The /kujo menu now lists every installed capability with active state and
profile/override provenance. Users can enable, disable, or restore the inherited
profile default. Changes require a fresh host permission with the exact Ability,
requested mode, profile and effects. They bind the current workspace and use
the same project activation transaction and stale-configuration precondition.
Tool and skill registries refresh immediately; enabling exposure grants no
execution approval and cannot bypass specialist scope.

49 offline tests and canonical E2E passed. OpenCode 2.0.31 fixture
`kujo-native-host-T8QfdH` verified real host denial without writes, once-approved
disable/enable/default (including out-of-profile exposure), unchanged configuration while permission was pending,
rejection of an intervening configuration edit without overwriting it, rejection
of unknown identifiers, and no inference from management. UI fixtures cover
selection, cancellation, unchanged choices and denial. This is not evidence of
provider-backed specialist execution or the complete OS/host release matrix.

This pass also corrected pre-existing override visibility: registering an enabled
out-of-profile handler was insufficient because the canonical runtime resolves
its own profile filter. App construction now supplies an in-memory effective
profile matching the resolved project exposure. No generated runtime or catalog
identity was changed. Regression tests inspect actual runtime/catalog visibility
and the real host's out-of-profile enable/reset behavior.

Packed fresh installation and 0.1.0 upgrade passed with the final override fix
(`kujo-opencode-packed-L1q3An`; tarball SHA-256
`827e164cf03b631287a4ef6bbb41818e41c66e5783f7e1d9741eb442f7ecb2bd`).
The gate enables source inspection outside Essentials, executes it through the
installed canonical runtime, disables it again and verifies five fallback MCP
tools. It also preserves the older project, profile/overrides and receipts.
The native menu entry was rendered in a real local PTY; management behavior is
covered by the real-host RPC gate above rather than inferred from that rendering.

## Implementation checkpoint: scoped evidence navigation

New app receipts receive a canonical project_root from the host-owned state
adapter. Native evidence defaults to project scope, supports session filtering
and an explicitly separate legacy view, and reads the current plus three retained
archives within a documented 2 MiB/file window. A receipt detail request cannot
select another project's record. Comparison reports recorded fields and exact
serialized-result equality without claiming quality. CLI evidence exports full
matching receipts as JSON to stdout. Management reads do not create query receipts
or invoke models. The canonical receipt-list Ability remains unchanged.

Linked artifact previews resolve server-selected receipt references, reject
out-of-project and symlink paths, and bound text/directory output. They describe
current file contents, not immutable evidence snapshots. Directory previews list
entries without recursive navigation or execution.

54 offline tests passed after the final UI regression was added. Canonical E2E and OpenCode 2.0.31 native gate
`kujo-native-host-490aMZ` passed with actual receipts from separate sessions,
project/detail filtering and comparison. Tests cover archive/legacy separation,
malformed lines, contained artifact bounds and escape refusal, scoped UI requests,
JSON export and metadata persistence. Earlier native assertion failure compared
a /var path with its correct /private/var canonical form; tests now compare
canonical roots. Full parity and the release platform/version matrix remain open.

Packed fresh/0.1.0 upgrade passed (`kujo-opencode-packed-nYeTzy`, SHA-256
`5ace6c54a13940e1d803677995c51967532924f983d814959e2e582bc1cbcea4`).
The installed package executed the source inspection and exported its exact
project-attributed receipt through the durable CLI, then retained the five-tool
fallback baseline. Documentation was updated after this candidate was packed;
this is a checkpoint gate, not final immutable release certification.

## Implementation checkpoint: project-isolated execution state

Approval and idempotency state now uses canonical-workspace namespaces. Shared
receipt writing still uses the legacy canonical writer/lock, so concurrent
projects cannot independently rotate the same ledger. Generated runtime bytes
remain unchanged. Existing project-scoped records win over later legacy records;
legacy completed receipts with matching project attribution replay without
repeating effects. Unscoped or in-progress legacy keys stop with an explicit
reconciliation error, and legacy grants cannot authorize new scoped executions.

Canonical local E2E now installs two projects under one data root: an unused
first-project approval is rejected in the second, an identical already-used key
requires the second project's approval, and Scout writes artifacts only after
that approval. Native OpenCode 2.0.31 management acceptance passed in fixture
`kujo-native-host-LPYgPe`. Offline tests cover restart/path-alias replay, foreign
grants, legacy known/unknown outcomes and late legacy records. Relocating a
workspace creates a new namespace; old binaries retain their original behavior.
This does not close all lost-response, mixed-version or release matrix cases.

External gates rechecked during execution-state work: npm whoami still returns
E401. GitHub run 38975403007 (commit 49233c6) completed with all seven jobs failed
before any steps; the check annotation states account payments/spending limits
prevented starting. This is not a code-test failure or platform verification.

The first packed attempt, kujo-opencode-packed-DY41nR, stopped on ENOSPC while
cloning Watchdog. Four exact prior task-created successful fixture workspaces
were cleaned while retaining their tarballs; no broad temporary-directory sweep
was performed. The test harness now removes only its own generated work folders
after success, retaining tarballs and verification.json. An explicit
KUJO_TEST_KEEP_FIXTURE=1 opt-out supports manual inspection; failed fixtures are
retained. Retry acceptance is recorded separately below.

Final checkpoint acceptance: 58 offline tests passed, including an in-progress
legacy operation that must not execute again. The packed retry passed in
kujo-opencode-packed-3wQu3B: fresh installation, 0.1.0 upgrade, previous project
retention, source execution/receipt export and five fallback tools. Tarball
SHA-256: 3bece7a7b6c3dfab5e4a3d18ccaadc4c1328238a93245fb6eeaefdfbaa50f24a.
The candidate bytes matched the initial failed attempt. Only tarballs, baseline
archive and verification.json remain in the successful fixture, as intended.


## Implementation checkpoint: approved source run and test

Build now exposes 11 tools and Full exposes 42. Source preview selects explicit
project files/resources, binds their digests and the installed runtime digest,
and shows the canonical command before execution approval. Execution uses copies
of those bytes in a retained project snapshot. Source/runtime changes refuse the
operation; canonical approvals and completed-request replay remain enforced.
The generated Ability runtime is unchanged. This is trusted host execution,
not an OS sandbox; programs retain host permissions and inherited environment.

The canonical fixture runner creates missing expectations and accepts an empty
suite. The adapter therefore requires a reviewed .out or .interpreter.out for
each selected top-level test and rejects a zero-runnable-test result. Nested-only
selections are refused. Expected-output comparison stays in the canonical runner.
Imports resolve from the snapshot root with automatic project fallback disabled.
Failure receipts retain snapshot locations and bounded command diagnostics.

65 offline tests, canonical E2E including preview/approval/execution/replay, and
OpenCode 2.0.31 native management acceptance passed (kujo-native-host-s0ldju).
Tests cover source/runtime digest changes, selected/omitted imports, passing and
failing fixtures, missing expectations, skipped suites, path boundaries, nonzero
exits and cancellation of a spawned descendant. Native management acceptance
makes no model calls and does not prove provider-backed Build execution. Windows
process-tree behavior and the supported host/OS matrix remain unverified.

Packed fresh install and 0.1.0 upgrade passed in kujo-opencode-packed-FutjoC,
including approved source execution from installed package bytes, 25 pinned
sources and preservation of the older project. Tarball SHA-256:
27676fe18076fe9e49cf51e7e3a7e7809fbfd26962d30139d4f0abca09d51481.
The prior source-run packed attempt failed on ENOSPC; only exact task-owned
fixture work folders/runtime copies were removed, preserving tarballs/receipts.
This checkpoint does not close the full product acceptance list.

## Implementation checkpoint: MCP generation and Agents SDK fixtures

Build now exposes 14 tools, Full 45, with 27 pinned source repositories. Three
host-owned definitions delegate to canonical MCP dry-run/generation and Agents
SDK offline smoke commands. MCP generation requires a new contained output
directory with an existing parent, uses --no-ai and --validate, refuses overwrite,
and retains partial output on failure. Preview is an advisory classification of
the current repository, not a digest-bound generated-file approval. No generated
server is started or registered. Review artifacts remain required before exposure.

Agents smoke runs in a temporary working directory with the installed SDK as its
explicit module root. It checks each canonical example's ok/requires_network
flags; the approval example's intentional failed status is preserved. These are
offline examples, not live-provider or application acceptance. Both operations
use normal canonical approvals and completed-request replay, bounded output and
process supervision. Generated runtime unchanged.

The first packed upgrade exposed catalog migration validation using the new
catalog against the old installation. Update now reads the prior catalog only
from its validated installed projection, checks its source pins/paths, and then
installs the new catalog. Ordinary execution still requires the current catalog.
Unchanged local development sources are preserved; new or changed pins are
installed, or an explicit --source-root supplies the complete local catalog.

Commits b198a1b and a15fec3. 69 offline tests and expanded canonical E2E passed,
including MCP preview/no writes, approved generation, safety artifacts, SDK
acceptance and replay. Native OpenCode2.0.31 management passed in m2xGD4 without
model calls before the migration-only CLI fix. Live specialist execution and the
OS/host matrix remain open. Starter preview/creation remains unimplemented.


The migration retry 5M17zi passed packed fresh/upgrade with 27 sources, prior
project preservation and actual installed MCP/SDK execution. Subsequent commit
4bef6f4 suppresses upstream shell-based extended validation (KUJO_BIN empty) and
runs the same syntax/self-check using direct argument vectors. The receipt
reports these checks separately from the canonical artifact report. This avoids
shell substitution from destination paths and handles runtime paths with spaces.
Canonical E2E verifies a literal $(printf injected) destination; no shell exploit
was executed. Direct checks have 30-second windows, in addition to the 120-second
generator bound. The normal offline suite still passes 69 tests.

Upstream MCP source remains unchanged. Source-verified shell interpolation at
src/make/validate_generated_server.kujo:152-160 was captured for human review as
SignalBox cap_781c3b50-1bc5-4bc9-90ff-0606d0b41dc3 and
sig_96a4ebd6-7b94-4026-b3de-c36a9f3a0475; exact-ID and concept retrieval passed.
This risk is mitigated in this adapter, not claimed fixed for other MCP callers.

Final checkpoint packed retry 0g2VQT passed fresh installation and 0.1.0 upgrade,
including installed MCP generation/direct checks and SDK fixtures, all 27 sources
and older project preservation. Candidate SHA-256: 8cd06f98fd775bf3b9be408a46b0b19e57fa19bdae028d2551dce8cef5d709f4.
Native management tRrtyP also passed after the direct-validation change. Only
test cleanup and timeout documentation changed after packing; this remains a
local checkpoint, not immutable full release/platform certification.

## Implementation checkpoint: reviewed starter creation

Commits 84459bd and f3e9754 add canonical script, fixture-agent, API and MCP
starter previews, approved creation and read-only inspection. Build17/Full48,
28 pinned sources. Script/agent use runtime init/agent new; API/MCP copy a bounded
checksum inventory derived from Paperclip88b53328's canonical component lock,
plus a local guide and ignore rules. The preview exposes every file and directory
and binds kind/name, runtime/component provenance and inventory digests. Creation
regenerates and checks the digest before an exclusive new-directory operation.
Existing destinations, changed inputs and path escapes are refused.

Partial creation is retained, not silently resumed or rolled back. Inspection
reports matching/missing/changed/unreadable reviewed files and directories without
writes; extra files are explicitly outside coverage. A changed canonical inventory
requires review of the original preview receipt. It is not a sandbox or proof of
runtime correctness, and creation never starts services or installs dependencies.

A real agent startup test found that preserving only files omitted the canonical
generator's empty agent/tools directory. Required directories now participate in
the digest and creation/inspection contract. The regression checks their presence
and detects their removal. Application ignore rules keep generated databases,
logs and local credential files out of normal Git additions.

74 offline tests passed, including concurrent creation, unchanged source/digests,
path boundaries and real process death after the first file. Five focused starter
tests passed after adding missing-directory coverage. Canonical E2E proves all
four previews/approvals/creation/inspection/replay, then starts the created API/MCP
servers on isolated loopback ports and verifies API requests and MCP discovery.
The test changes only the MCP fixture's port before startup. A separate isolated
Kennel install and agent run returns fixture output 'Owned agent fixture: Hello';
that acceptance is now part of the packed network test. Native OpenCode2.0.31
management QssxAs passed without model calls. Real Build-specialist execution,
OS/host matrix and final release certification remain open.

Final packed Vp2ILf passed fresh installation and 0.1.0 upgrade with 28 sources,
all four reviewed starter workflows, real API/MCP startup and agent pinned
dependency installation/fixture execution. verification.json records the explicit
starter_services_verified and agent_fixture_verified flags. Tarball SHA-256:
b420e45c1cc033fbb4412eca78b51fc4f7b268d0c8303ab2b1f8ce8baa19f989. Only test coverage and verification documentation
changed after packing; executable bytes match this checkpoint. This is local
macOS acceptance, not the full supported-platform/live-specialist release gate.

## Lifecycle delivery foundation checkpoint (2026-10-16)

The opt-in lifecycle outbox is implemented as a standalone internal component,
not yet connected to native hooks, configuration or management controls. Normal
OpenCode use still sends no automatic telemetry. Jobs contain allowlisted IDs
and status metadata only, with no prompts, tool inputs/outputs, error bodies or
credentials. Delivery is limited to a loopback Watchdog origin; redirects are
refused. Producer version and stable batch/record IDs survive restart and upgrade
so a lost acknowledgement can retry the exact batch.

Storage is project-scoped and bounded to 128 jobs/1 MiB, with five delivery
attempts and a 24-hour expiry applied when the queue is next operated. Claims
use durable leases; writes use the existing directory transaction. Interrupted
transactions require explicit recovery. Closing aborts delivery; pending work
remains recoverable. Endpoint changes hold old jobs instead of rerouting them.
No periodic worker, host activation, optional RunLedger or failure intervention
is claimed by this component.

83 offline tests pass, including real process termination after claim and lock
publication, concurrent delivery, bounded retry, cancellation, metadata omission
and disabled behavior. Canonical local E2E passed. A real token-protected pinned
Watchdog accepted a batch, then a simulated lost acknowledgement caused restart
and retry: the server retained exactly one record with no private-content
canaries. Final packed fresh/upgrade acceptance is pending below. All seven
production outcomes remain open.

Packed lifecycle candidate 7XhEFJ ended without acceptance: GitHub crud-api
source acquisition timed out during upgrade (`Recv failure: Operation timed
out`). This is a failed gate, not a passing fresh/upgrade certification. The
fixture is retained for diagnosis; rerun the exact candidate after acquisition
recovers. Offline and canonical E2E results above remain valid.

## Native lifecycle bridge checkpoint (2026-10-16)

The delivery foundation is now wired to native OpenCode hooks and a `/kujo`
lifecycle menu. Activation, disable, retry, interrupted-queue recovery and discard
require a fresh host permission; configuration changes use transactional activation
and reject stale approval. Specialist default-deny policies explicitly ask for this
human management action. No model-visible activation tool is added. Setup/repair
preserve the opt-in setting. Disabled installations register no lifecycle observers
and perform no queue/network activity.

Enabled observers accept only workspace-validated session IDs and allowlisted
metadata from session execution/idle/interruption, tool before/after, model request,
HTTP response and retry events. HTTP response status is not a claim of model
completion. A one-second bounded worker sends one eligible batch at a time; event
subscription reconnects with delay. Configuration is checked before capture and
delivery. Unload stops subscriptions, observers and delivery; recovery/discard stop
in-flight delivery before acting. Existing queue state survives disable/re-enable.
No prompt, tool content, error body or credential enters the queue.

89 offline tests and canonical E2E pass. OpenCode2.0.31 native fixture 0w4mfU
passed activation/denial/stale-config/disable without inference; expanded queue
management acceptance is recorded below when terminal. The initial native run
correctly exposed specialist default-deny rejection before the explicit ask rule
was added. Agent discovery now polls its own readiness within a bounded window.
Packed fresh/upgrade vzcDKv is pending; it predates the final unload-race guard
and stop-before-recovery/discard refinement and cannot certify those final bytes.

This supersedes the previous foundation-only integration status. Optional automatic
RunLedger, bounded failure intervention, live specialist workflows, guided RAG/Lens
readiness, remaining recovery/mixed-version acceptance and the immutable supported
platform/host/public release matrix remain required. All seven broad outcomes
remain open. Native permission acceptance is not live-model telemetry acceptance.

Expanded real OpenCode native fixture Pnl7ZH passed activation rejection, stale
configuration refusal, enable, retry, recovery, discard and disable without
inference. Packed vzcDKv passed fresh install and 0.1.0 upgrade with 28 pinned
sources, old-project preservation, starter execution and canonical Watchdog
delivery/deduplication. Tarball SHA-256: d7a3a3f8729153c51f7265f8be331eb562d12a4e14e5654290d3d4a958e90a7c.
This clears the previous download timeout for this retry. As noted above, the
packed candidate predates two final plugin shutdown/queue-action refinements;
final native Pnl7ZH and canonical E2E cover current local code, while immutable
full-release certification remains open.

## Session RunLedger and bounded failure guard (2026-10-16)

Commits dae8d71 and b96962b add session-linked native RunLedger start/inspect/finish
controls and a separate opt-in failure guard. The ledger invokes the canonical
Ability runtime for effects and canonical RunLedger show for inspection. Stable
session keys and one session-specific ledger directory preserve association after
restart/lost response; repeated starts inspect the existing record. Start and finish
require separate exact native grants, current capability exposure/digest checks,
workspace validation and unchanged canonical state. A human chooses the terminal
verdict. No prompt, inferred usage/cost or automatic success verdict is written.
Ambiguous records or unresolved execution state fail closed instead of duplicating
a write. Source: lib/session-runledger.mjs and its unit/canonical acceptance tests.

The guard pauses once after three distinct consecutive failures from the same
tool within five minutes and sends a resume:false evidence reminder. It never
retries or approves a tool. Success/different tools/expired windows reset counts;
state is capped at 128 sessions per plugin activation and resets on reload. It
can operate without Watchdog. Interrupt is launched outside the awaited tool hook
to avoid waiting for a session that is itself awaiting that hook. Configuration
is rechecked before interruption/notification, and unload suppresses later work.
Counters and outcomes are visible in native lifecycle status.

99 offline tests and expanded canonical E2E passed. Real OpenCode2.0.31 fixture
J0eoBH passed guard activation/rejection/disable and RunLedger rejection, approved
start, duplicate-start inspection and human-selected partial finish without model
inference. Earlier test sessions used a /var alias while the host location used
/private/var: approval remained pending outside the queried location. Creating
sessions with the canonical workspace fixed the acceptance; the live-provider
harness now also canonicalizes its workspace. This is a test routing correction,
not evidence that native host permission storage unifies arbitrary path aliases.

Packed candidate s1hMEi is running with the new installed-byte session RunLedger
acceptance; check its terminal result before claiming fresh/upgrade success.
The full lifecycle outcome remains open: automatic session tracking/finalization,
real-model telemetry and failure-guard acceptance are not established by manual
controls or host mocks. All six specialist tasks, guided knowledge/browser UX,
remaining recovery/mixed-version and immutable platform/host/public-release gates
retain their original scope.

Packed s1hMEi completed successfully: fresh install, 0.1.0 upgrade, 28 pinned
sources, older project retained, real starter services/agent fixture, Watchdog
deduplication and installed-byte session RunLedger rejection/start/lost-response
inspection/finish. verification.json includes session_runledger_verified:true.
Candidate SHA-256: 70c8dde715187007ed9e0215b3e46f87f8e959373eded1f016ba9a579b8bf826. Only test assertions and
acceptance documentation changed after packing; shipped executable bytes match
this checkpoint. This remains local macOS evidence, not the full immutable
supported-platform/live-specialist/public-release certification.

## Guided browser readiness checkpoint (2026-10-16)

Native /kujo now provides Browser readiness: actual Chromium launch/close, explicit
approved background installation, phase/status inspection, cancellation/recheck,
page-check capability enablement and Browser specialist selection. No website is
opened by readiness, no install starts from viewing the menu and no model call is
used for management. Install uses canonical locked npm dependencies and Lens's
install-browser script, with bounded commands and process-tree cancellation.
The job is single-flight within one plugin instance; cross-process shared-source
installation and interrupted-install recovery remain acceptance work.

The old probe returned ready when an executable path existed without launching it.
It now requires successful Chromium launch/close, supports the canonical headless
shell distribution, and distinguishes missing dependencies, launch failure and
probe failure without returning raw command output. CLI diagnostics reflect those
states. OpenCode's bundled executable is not a Node CLI: node-command.mjs selects
Node for native probes and regenerated MCP fallback commands while preserving the
current Node executable for CLI users. This fixes native-host interpreter routing
without changing the generated Ability runtime.

104 offline tests and canonical E2E passed. Native OpenCode2.0.31 fixture EPKiW1
passed readiness RPC and installation denial, preserving separate capability and
normal tool approvals. Final native check additionally compares launch readiness
against Node. Packed 2yPB0j is running an expanded empty-HOME gate that installs
Chromium and executes a real loopback Lens check from installed bytes; terminal
evidence is required before claiming that gate passed. Its tarball predates only
the final CLI diagnostic-text refinement, not the browser execution implementation.

Live specialist gate rechecked with opencode/glm-5.3-flash-free and kujo-ship:
provider.auth HTTP403 again rejected inference before native tool execution.
Canonical workspace routing is fixed; this remains a provider gate, not evidence
of a tool execution or approval failure. No provider spoofing/proxy was used.
All seven broad readiness outcomes remain open, including six specialist tasks,
automatic lifecycle tracking, guided RAG, recovery/platform matrix and public release.

Final native fixture OefqYm passed with browser_ready:true and agreement between
the bundled host and Node. Packed2yPB0j passed fresh install, 0.1.0 upgrade, 28
sources, older-project preservation, starter/runtime/Watchdog/session-ledger gates
and actual empty-HOME Chromium installation plus approved loopback Lens check.
verification.json records browser_launch_verified:true and browser_check_verified:true.
Tarball SHA-256: 61bb86edb927c2b8eadbe1d2ac3092829761217acf976dfe1dc36045476d1c08. Executable comparison confirms
only bin/kujo-opencode.mjs differs, for the final diagnostic-state text refinement.
That CLI refinement passed the final nine focused checks; full immutable matrix
certification remains required. Live specialist provider HTTP403 remains open.

## Shared browser installation recovery (2026-10-16)

Browser installation now uses the existing exclusive directory transaction on the
canonical physical Lens bridge/node_modules path. npm ci runs in a unique staging
workspace; activation remains reversible until the canonical Chromium installer
and actual launch check succeed. Failure/cancellation restores prior dependencies.
Explicit native/CLI recovery rejects live owners; status refuses readiness while
an installation journal exists. Browser cache garbage collection is disabled for
installation so older browser versions survive rollback. Hermetic browser cache
mode PLAYWRIGHT_BROWSERS_PATH=0 is rejected before mutation. This does not claim
power-loss durability or certify a recovered browser without a new launch check.

110 offline tests and canonical E2E passed. New tests cover physical-path aliases,
concurrent ownership, live recovery refusal, download failure, cancellation,
process death after activation, explicit recovery/retry and cache-mode rejection.
Native permission/recovery acceptance and packed iomJa2 are pending. This closes
the specific per-instance-only browser installer limitation above; broader
mixed-version recovery, live specialists and immutable release matrix remain open.

Final browser transaction acceptance: native GzUVDZ passed real OpenCode2.0.31
recovery rejection/once approval and readiness without inference. Packed iomJa2
passed fresh install, 0.1.0 upgrade, 28 sources, older-project preservation,
starter services/agent execution, session-ledger and real Chromium/Lens checks.
Candidate SHA-256: 9328df28b66a185db988794d9dfb9cb4319c6c91e540f79fd327aec9357d0057.
Executable bytes (lib/bin/.generated) match f6e043c; only test/docs refinements
postdate packing. This supersedes the pending status above. Full supported-host/OS
certification, six live specialists and public distribution remain unverified.

## Guided offline knowledge checkpoint (2026-10-16)

Native Local knowledge now offers corpus preview, separately approved indexing,
freshness, questions with canonical citations and explicit interrupted-install
recovery. Five host-owned Abilities delegate indexing/retrieval to canonical RAG;
Full exposes53 tools, Build remains17. Workflow specialist access includes the
same operations. Existing provider-configured RAG adapters retain their behavior.

The managed workflow snapshots up to128 Markdown/text/Kujo files (8MiB total,
256KiB each), excluding hidden/generated/dependency entries and rejecting symlinks.
It runs canonical hash/local_json RAG in a private workspace without inheriting
project .env or KUJO_RAG_* settings. A digest binds the reviewed inventory and
configured source/runtime provenance. Staged replacement retains the old index
on failure; explicit recovery refuses live owners. Stored index hash validation
and fresh corpus comparison precede queries. Citations retain corpus-relative
paths mapped to the selected directory. This is inspection-time freshness, not
continuous monitoring, and does not certify custom provider configurations.

113 offline tests, canonical E2E,16 focused tests and real OpenCode2.0.31 native
fixture wVQuk0 passed. Native checks cover missing state after denial, approved
canonical indexing, citations, current/stale states and stale query refusal.
OpenCode RPC schemas reject regex patterns; RPC uses length limits while Ability
schemas and handlers retain name/digest validation. Final answer-dialog formatting
passed focused UI tests. Packed fAKpsw failed during acquisition with ENOSPC before
knowledge acceptance. Its tarballs and failure log are retained; only owned test
workdirs were removed. The retry is in /tmp/kujo-knowledge-fresh-retry.log.

Remaining scope includes real specialist knowledge tasks and supported host/OS
acceptance, automatic RunLedger lifecycle/correlation, remaining recovery matrix
and public release. No broad parity checkbox is closed by this local checkpoint.

Subsequent packed blmhIp exposed a harness omission (new knowledge Abilities had
not been explicitly enabled); fixed by enabling all five. Packed7mXzpz completed
knowledge and browser checks but failed the final old five-tool assertion: ten
were correctly exposed after enabling knowledge. Final harness asserts ten plus
all five knowledge tool names. These are failed gates, not passing full-package
certification; logs/packages/available fixture receipts remain retained. Only
owned disposable test workspaces were removed to recover disk. Final retry is
/tmp/kujo-knowledge-fresh-acceptance.log (handle63137). Product bytes matchfb82c42.
Final offline suite passes114 tests; five focused knowledge tests also pass.

Final guided knowledge acceptance: packed85CdY6 passed the complete fresh-install/
0.1.0 upgrade gate,28sources, old-project preservation, starter services/agent
execution, session-ledger, real Chromium/Lens and managed knowledge index/query.
verification.json records knowledge_verified:true and packed_mcp_tools:10, with
all five knowledge tools checked by name. Candidate SHA256:
61431091101690cd1a68052a7e942cd9182bed91bc34c902be3716e173fdb57d.
Executable/catalog bytes matchfb82c42/dba6cda. Tarballs and verification.json are
retained; successful fixture workdirs cleaned. This supersedes pending statuses
and failed harness attempts above.114 offline tests and native wVQuk0 remain the
local evidence; six real specialist tasks and full host/OS/public release gates
are still open. Next implementation: optional automatic RunLedger lifecycle and
correlation, followed by remaining recovery/acceptance. Preserve the full goal.

## Session evidence correlation checkpoint (2026-10-16)

Session RunLedger now exposes an explicit approved link to the stable Watchdog
trace. Canonical RunLedger owns correlation persistence; repeated matching links
reconcile read-only, while a different existing link is refused. Linking neither
enables telemetry nor changes the run verdict. Ship30/Full54/Build17.

Enabled lifecycle delivery automatically adds a run reference only after canonical
RunLedger confirms that exact trace. A bounded identifier cache holds up to128
sessions for5seconds; native ledger actions invalidate it immediately. Canonical
lookup has a1.5second cancellation signal; unavailable records leave events
unlinked. Metadata projection strips all other fields, and idle remains unknown.
The observer does not create, mutate or finalize records. Automatic session start
and human-verdict finalization are still outstanding original-goal work.

119 offline tests and real OpenCode2.0.31 native xPvZMx passed approval rejection,
linking and canonical inspection. Canonical E2E initially stopped on the old
Ship29 assertion; corrected to30 with the new tool name checked. Final E2E,
canonical Watchdog run-reference acceptance and packedTOmi4m are pending below.

Final correlation acceptance: canonical E2E passed after explicit fixture exposure
was corrected. Real Watchdog2jX9hN accepted run references and deduplicated a lost
acknowledgement retry. PackedTOmi4m passed fresh install/0.1.0 upgrade,28sources,
old-project preservation, starters/agent/ledger/knowledge/browser gates, including
approved canonical correlation and repeated-link reconciliation. SHA256:
709a27c7ed0c6cf8a48cd700405cb87c9ffff675d3091b3cadfb1d75e9354ef1.
Executable/catalog bytes match1d37118/2c13229; later edits are tests/docs only.
119 offline tests and native xPvZMx passed. The live Ship specialist was rechecked
with opencode/glm-5.3-flash-free and again failed provider.auth HTTP403 before tool
execution (/tmp/kujo-correlation-live-specialist.log). This is not acceptance of
specialist execution. Automatic RunLedger start/finalization and the remaining
full parity/recovery/platform/public release requirements remain open.

## Automatic session start requests (2026-10-16)

Lifecycle controls now offer a separate opt-in automatic RunLedger start request
before the first model request. RunLedger start/finish exposure is a prerequisite.
Canonical writes retain exact native human approval. A durable bounded request
journal prevents repeating declined/uncertain requests across reload. In-progress
records receive one inbox finish reminder on idle, interruption or explicit host
execution success/failure; no human verdict, usage or cost is invented.

Markers hold at most128 sessions per project. Approved reset clears markers only
and allows new requests; canonical records remain. Explicit recovery refuses live
writers. Disable/unload/session cancellation abort pending writes after approval;
commands already begun require canonical inspection. Host permission dialogs may
still require dismissal. Configuration is rechecked after approval. This does not
yet automatically present the final-verdict TUI dialog or certify all real host
cancellation/reconnect scenarios; those remain part of the original lifecycle gate.

127 offline tests and canonical E2E passed. Real OpenCode2.0.31 Ydsdor proved the
model-request hook’s exact start approval, canonical creation and finish reminder.
The prompt API acknowledges before execution: tests poll canonical state after
approval. Explicit session.execution.failed/succeeded events were required for
provider failure/completion reminders; their bodies are never captured. Earlier
native checks exposed and corrected those test/observer gaps. PackeduWlYRq passed
baseline automatic-controller/canonical ledger gates but predates cancellation,
capacity-message, explicit completion-event and prerequisite refinements. Final
native acceptance and packed retry are pending below.

Final automatic-tracking acceptance: 127 offline tests, canonical E2E, 26 focused
checks and real OpenCode2.0.31 native vUpjuO passed. The native gate exercised an
actual model-request hook, exact start permission, canonical creation and a finish
reminder; this does not certify a successful specialist task. Missing tracking
capabilities return actionable structured RPC feedback rather than a masked500.

Packed lAGkXk passed the complete fresh-install/0.1.0 upgrade gate, with28sources,
old-project preservation, starter services/agent fixture, canonical session-ledger
automatic request suppression/reset/reminder coverage, knowledge and real browser
checks. SHA256:97b1748d33fab3e50bb283ce4a6ba6ba34e998df7bbf832c53da10ae355232ba.
Executable/catalog bytes match b73cb3d. This supersedes pending package/native
statuses above; ZYRNQm also passed but predates that final RPC refinement.

Remaining: native human-verdict presentation/finalization, real cancellation and
reconnect/failure-intervention acceptance, all six live specialist workflows,
service-boundary parity, remaining mixed-version/multiproject/recovery scenarios,
the exact supported host/OS matrix, and public release/registry acceptance. All
seven broad production outcomes remain open. Local acceptance is not full parity.

## Native completion review checkpoint (2026-10-16)

Commit c326838 connects automatic tracking to a native RPC completion event and
TUI review flow. The active session can inspect scoped receipts, choose a human
verdict, or keep working. Finalization still uses canonical RunLedger and its
separate exact approval. Dismissal and cancellation leave the record in progress.
Durable presentation markers suppress repeat offers across UI instances/reload;
returning to a session reconciles missed events. A UI disconnect during a claimed
presentation or another active dialog can require manual Session RunLedger review.
No observer chooses a verdict or infers success from execution completion.

130 offline tests, canonical E2E and 21 final focused tests passed. Native
OpenCode2.0.31 nQLfDf connected the real SDK RPC event stream to the UI adapter
with fixture dialog choices and verified a separately approved partial finish.
This is real event/RPC/permission acceptance, not a rendered terminal screenshot.
Native bpZmwX also acknowledged interruption during pending automatic-start
approval and retained not_started after a late response. Host discovery passed.

Expanded native GoMkOp passed host reload, durable prompt suppression, retained
in-progress state, explicit partial finish and acknowledged cancellation during
a pending start grant. Test commit16e1410 adds these real-host assertions. Packed
nilWU7 remains pending at this checkpoint. The packed SHA256 is
fcc2e27de05a4235eaae94275bc5867e9d80d3330b1736cf7d3eb342399225fa;
lib/bin/catalog/.generated bytes match c326838. Inspect terminal results before
claiming acceptance. Broader lifecycle failure/connection recovery, six live
specialists, remaining recovery/service-boundary parity, supported host/OS and
public release certification retain the original scope.

Final package acceptance: nilWU7 completed successfully, including fresh install,
0.1.0 upgrade,28sources, older-project preservation, starter services/agent
fixture, session RunLedger, knowledge and real Chromium/Lens checks. The digest
and matching executable bytes above are final for c326838;16e1410 changes only
the acceptance harness. This supersedes the pending packed status. Logs:
/tmp/kujo-completion-{all,e2e,native-ui,cancel-final,reload,host,packed}.log.
Full rendered-TUI usability, remaining lifecycle failure/reconnect scenarios,
six live specialist tasks, service boundaries/recovery matrix, supported host/OS
and public distribution remain unproven; the full goal stays active.

## Rendered onboarding and permission rejection (2026-10-16)

Actual PTY testing found a home-screen dead end: session-bound Kujo actions only
said to open a session. Commit31f0678 adds an explicit Create a project session
action and continues the requested setup without sending a model prompt. Cancel
does not create a session; unload/navigation changes suppress late navigation.
Session creation does not approve capabilities or effects. Error guidance now
distinguishes declined permission from possible installation problems.

132 offline tests, canonical E2E,16 final UI tests and native host discovery pass.
The real rendered-terminal gate passed on OpenCode2.0.31 at80x24 (ou3ndq4s) and
120x40 (h030wepg). It covers slash discovery, installation/status, creation from
home, profile selection and real keyboard rejection with unchanged configuration,
capability discovery, browser readiness, RunLedger, lifecycle and session-scoped
empty evidence. pyte snapshots and verification.json are retained under
/var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-rendered-tui-<id>.
The optional Python dependencies are pinned in tests/requirements-tui.txt.

The harness now waits for rendered states instead of sending a second Enter
based on a short delay. Permission choices use arrow keys; verify the Reject
highlight before Enter. An earlier Tab-based attempt approved only the disposable
fixture profile and correctly failed the gate; it is not rejection evidence.
Final logs: /tmp/kujo-rendered-tui-reject.log and
/tmp/kujo-rendered-tui-wide-accepted.log. No inference or effect grant in final
accepted runs. This proves these rendered paths on local POSIX, not all UI flows
or platforms. Rendered granted-operation/final-verdict interaction, remaining
lifecycle/recovery/service support, six live specialists, the supported host/OS
matrix and public distribution remain open. The previous packed nilWU7 gate
predates this UI fix; exact final release packaging still needs certification.
