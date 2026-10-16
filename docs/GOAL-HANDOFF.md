# Active parity goal checkpoint — 2026-10-16

Strata consolidation is now complete for checkpoints 1–6: Agent Notes note
`1bca6881-719a-4e15-b140-12402af46564`, “Session Memory · Kujo OpenCode · Native
source and recovery parity checkpoint · 2026-10-16”. Exact-ID and conceptual
“OpenCode recovery” retrieval both passed through the authenticated /v1 API.
Earlier pending-memory sections below are historical; do not duplicate them.
The source CLI still lacks tsx, but the documented local API is available.


The user authorized all seven areas in PRODUCTION-READINESS.md. The goal remains
active and incomplete. Continue implementation; do not replace the full scope
with the passing checkpoint tests. No subagents have been authorized.

Pushed checkpoints: 55a6113 (recovery) and 19b4ba5 (native backend). 26 offline
tests, real-product E2E, packed fresh-install/0.1.0 upgrade and native host command
acceptance passed. Read PRODUCTION-READINESS.md for exact limits. The native
candidate is not installed by default, outputs inbox records instead of a TUI
panel, and still needs real-host Ability tool/approval execution acceptance.

Next: OpenCode CLI/TUI plugin and RPC surfaces; safe native default projection
(including custom data roots without global environment mutation); lifecycle
telemetry/RunLedger; scoped agents; canonical build/source/starter operations;
complete recovery; cross-platform/host gates; public release/provenance/support.
The old npm authentication and GitHub billing blocks have not been rechecked.
Independent implementation work remains, so this is not an external-blocked goal.

Host lessons: use a discovered index.ts wrapper (explicit .mjs configuration did
not register in 2.0.31). Synthetic messages resume model inference by default;
management commands must use resume:false. This was fixed and the acceptance test
checks for absence of assistant messages. The resulting output is in the inbox,
not message history. Model references use id; session directory must be checked
separately from plugin instance location. Installed SDK types and the host OpenAPI
at /tmp/kujo-opencode-openapi.json provide exact API contracts.

## Pending Strata consolidation

Target project: Agent Notes. Local session ID:
local-kujo-opencode-parity-checkpoint1-20261016. Title: Session Memory · Kujo
OpenCode · Active parity goal checkpoint 1 · 2026-10-16. Source: commits 55a6113,
19b4ba5 and this acceptance contract. Related notes:
e6480a8b-e69e-49af-aa79-e04fa3e13223 and
6f2c6f09-afe7-4346-8b17-572a97ca7ce6.

Dedup search for "Kujo OpenCode interrupted upgrades native plugin synthetic
resume" returned no matches. Subsequent Strata writes failed because its tsx
executable, then module file, disappeared from node_modules during the session.
No note was saved. Do not alter that repository's dependencies blindly. Retry its
supported CLI when available:

    npm run strata -- --agent --json agent summary --project 'Agent Notes' --source 'Kujo OpenCode parity checkpoint' --session local-kujo-opencode-parity-checkpoint1-20261016 --stdin

Save the durable checkpoint with links to PRODUCTION-READINESS.md, then verify
with notes get NOTE_ID --json and conceptual search "OpenCode parity native
plugin interrupted upgrade recovery". SignalBox: no captures warranted; this is
already authorized goal work and resolved implementation evidence.

## Native management checkpoint 2

Server RPC and TUI dialog candidate implemented in lib/plugin-rpc.mjs and
lib/tui.mjs, with package exports for the server and ./tui. SDK location routing
belongs on individual RPC method calls, not the RPC factory; HTTP RPC bodies
use an input envelope. AsyncLocalStorage binds the explicit data root through
host tool/command/permission/RPC callbacks without process.env mutation.
30 offline tests and the real-product E2E passed. Real host RPC profile permission,
status/evidence and no-model-call checks passed. TUI tests are fixtures; real
terminal rendering, default plugin projection and real tool execution/approval
acceptance are still next steps. All seven parity outcomes remain incomplete.

Strata health was retried: `npm run strata -- health --json` exits 127 because
`tsx` is absent. No checkpoint memory has been saved; retain the pending bundle
above and include this delta when Strata becomes available. Intended target:
Agent Notes; local session ID local-kujo-opencode-native-management-20261016.
Retrieval cue: OpenCode native management RPC workspace isolation. SignalBox:
no captures warranted; these are existing goal commitments and resolved lessons.

## Native default installation checkpoint 3

Normal setup/update/repair now project the native server and TUI wrappers from
the trusted installed runtime. MCP is retained disabled; native and MCP tools
must not be enabled simultaneously. Doctor checks native files and fallback
state. Host check verifies RPC plus native commands. Setup/uninstall and unowned
file conflict tests cover the new assets. A real OpenCode 2.0.31 PTY verified
menu, searchable capability list and detail dialog after removing duplicate slash
suggestions and replacing an overflowing capability alert.

Next: actual native Ability execution/approval acceptance (not just profile
permission), opt-in lifecycle bridge, specialist workflows, capability parity,
complete transactional recovery, platform/version certification and public
release. See PRODUCTION-READINESS.md; none of those broad outcomes is closed by
this checkpoint. Strata remains pending: same missing tsx dependency, no writes
claimed. Include this state delta in the Agent Notes handoff when available.

Checkpoint 3 verification: 31 offline tests, real-product E2E, normal-projection
native host acceptance, and packed fresh/0.1.0 upgrade gates passed. Packed fixture
kujo-opencode-packed-S4TrTR acquired 25 pinned sources and retained the old
project. A final uninstall change removes the plugin directory only when empty,
with focused setup/security tests passing; it postdates that packed candidate.

## Real native model checkpoint 4

Live `KUJO_TEST_MODEL=opencode/glm-5.3-flash-free OPENCODE_BIN=/Users/robertdevore/.opencode/bin/opencode npm run test:native` passed against OpenCode2.0.31.
Read ShipCheck and once-approved RunLedger produced canonical plugin receipts;
rejected RunLedger left no artifact or succeeded receipt. Fixture and receipt IDs
are in PRODUCTION-READINESS.md. The helper keeps write inference pending while
observing/replying to the exact fixture permission. Do not use blanket --auto.
Profile is selected before inference to avoid concurrent host session changes.

CAPABILITY-PARITY.md now compares exact CMD/Pi/Paperclip revisions and names
missing source/build/starter/MCP-generator/Agents-SDK/evidence workflows. Native
basic execution/approval is now proven locally; lifecycle, specialists, missing
canonical workflows, recovery, supported matrix and release remain open.
Strata consolidation remains pending (tsx unavailable); target Agent Notes,
local session ID local-kujo-opencode-native-model-20261016. Save this handoff
with preceding pending checkpoints when available; dedup and retrieve exact and
conceptual queries: OpenCode native model approval RunLedger denied write.
SignalBox: no captures warranted; all remaining work is already in this goal.

## Canonical source tooling checkpoint 5

Build profile has seven tools; Full has 40. New host-owned definitions are in
catalog/source-abilities.json; lib/source-tools.mjs calls the installed canonical
runtime check/lint/format on bounded private source copies, without execution or
source writes. Single-file reports retain digest and native diagnostics; parse
failures may be text stderr with exit 3 despite --json. Read tests/source-tools
and the new E2E assertions before extending to execution.

Verification: 34 offline tests, real-product E2E receipts for both source tools,
and OpenCode2.0.31 native Build profile permission/refresh gate passed. Source
run/test, starter preview/creation, scoped specialists, lifecycle, evidence UX,
full recovery, supported matrix and release remain required. The capability
matrix marks source inspection implemented but does not close the broad goal.

Pending Strata delta: target Agent Notes; local session ID
local-kujo-opencode-source-tools-20261016. Preserve source snapshot safety and
canonical parse-error behavior as retrieval cues; link this handoff and
PRODUCTION-READINESS.md. No Strata save is claimed while its tsx CLI dependency
is unavailable. SignalBox: no captures warranted.

## Project activation checkpoint 6

lib/project-activation.mjs stages owned project replacements, publishes a complete
exclusive journal, activates with backups, and rolls back/recover-checks all
expected digests before modifying targets. install.mjs builds one plan for skills,
native host files, host JSONC and project config. Setup/update/repair/profile/
exposure changes/native profile and uninstall use it. Config reads fail while
activation is pending; expected-config checks prevent stale profile overwrites.
`recover --project DIR` restores dead-owner project transactions and preserves
post-crash edits as conflicts. Source/runtime directory transactions are separate;
their original empty-owner lock gap remains unresolved.

40 tests, real-product E2E and native profile acceptance passed. Packed fresh/
upgrade verification is running; inspect its final result before claiming pass.
Next product work remains native guided build/run/test/starters, specialist
agents, opt-in lifecycle, evidence UX, remaining recovery and external release
certification. This is progress on the original seven-area goal, not completion.

Strata pending delta target: Agent Notes; local session ID
local-kujo-opencode-project-activation-20261016. Retrieval cues: transactional
OpenCode project activation recovery stale profile post-crash edits. Include
this handoff and the acceptance document; do not claim it saved while tsx is
missing. SignalBox: no captures warranted.
Checkpoint 6 packed fresh/upgrade gate completed successfully in fixture
kujo-opencode-packed-a4xBRb. Strata's authenticated API on loopback3939 is now
confirmed available despite the missing source CLI dependency; consolidation
can use documented /v1 endpoints with local credential discovery.

## Specialist and installer ownership checkpoint (2026-10-16)

Commits fd35bbc, 333a094 and e18faa7 add six scoped native specialists, a session
picker, Build's nine-tool exposure, complete source/runtime lock publication,
and immediate provider-failure diagnostics. 48 offline tests, local E2E, real
host specialist discovery/switching, packed fresh/upgrade, and packed native
RPC/command discovery passed. See PRODUCTION-READINESS.md for candidate digest.
The live Ship-specialist test failed before any tool execution with provider.auth
HTTP 403 (FreeTierError); do not attribute it to tool permission rules or mark
that gate passed. Do not spoof the provider client to bypass this rejection.

All seven product outcomes remain open. Next implementation priorities are
canonical approved source run/test and starter workflows, richer native
capability/evidence management, and the opt-in lifecycle bridge. Remaining
recovery scope includes lost responses and multiple-project/version acceptance;
the old mkdir-before-owner gap is fixed for new source/runtime locks. Legacy
empty locks remain a deliberate manual-inspection case. Release still requires
fresh npm/CI external checks and an immutable supported-platform/host matrix.

## Native capability management checkpoint (2026-10-16)

Commits b3b8b6b and ffe1ea8 fix actual runtime visibility for explicitly enabled
out-of-profile tools and add native enable/disable/profile-default controls.
Fresh host approval binds each requested change; project activation rejects stale
configuration without overwriting it. All 49 offline tests, canonical E2E, real
OpenCode 2.0.31 approval/denial/default/out-of-profile/stale-edit checks and packed
fresh/upgrade passed. The packed test executes an out-of-profile source tool
from the installed package. See PRODUCTION-READINESS.md for fixture and digest.

The canonical runtime independently filters profile IDs, so registering extra
handlers alone does not make an enabled tool visible. Preserve the in-memory
effective-profile projection in app.mjs; do not patch the generated runtime.
All seven broader outcomes remain open. Individual native toggles are now done;
next native UX work is project/session evidence filtering and artifact navigation.
Canonical run/test/starters, lifecycle bridge, remaining recovery and release
acceptance retain their full original scope. Prior live-provider and publication
external failures were not rechecked in this checkpoint.

## Scoped evidence checkpoint (2026-10-16)

Commits 8a8ffce and 2acb3e9 add host-owned canonical project attribution before
receipt persistence, native project/session/legacy filters, full receipt details,
comparison, contained current-artifact previews and CLI JSON export. The generated
runtime remains unchanged; the canonical receipt-list Ability still has its
shared-ledger contract. Scope defaults to project and never guesses attribution
for old receipts. Native reads inspect up to 2 MiB per current/archive ledger
(four files) and disclose coverage rather than claiming complete history.

54 offline tests, E2E, native OpenCode 2.0.31 (kujo-native-host-490aMZ), and packed
fresh/upgrade (kujo-opencode-packed-nYeTzy) passed. Packed export verifies an
actual source-inspection receipt from installed bytes. Artifact previews are
bounded current files, not immutable snapshots; directories list up to 50 entries
without recursive browsing. Detailed scope/digest: PRODUCTION-READINESS.md.

All seven product outcomes remain open. Continue canonical approved run/test and
starter workflows, opt-in lifecycle integration, remaining recovery including
multiple-project execution-state behavior, and immutable release acceptance.
Project-scoped receipt metadata is not a change to canonical approval/idempotency
state scoping. Prior external provider/publication/CI failures were not rechecked.

## Project execution-state isolation checkpoint (2026-10-16)

Commits 2fe81fc and 49233c6 isolate approvals/idempotency by canonical workspace
while keeping receipt writes serialized under the shared canonical writer lock.
This supersedes the earlier handoff's unchanged-state-scoping note. Legacy
attributed completed outcomes can replay in their owning project; unscoped or
in-progress legacy outcomes refuse retry; old grants are not imported. Existing
scoped outcomes win over later legacy records. Aliases share state; moving a
workspace creates a new namespace. Old binaries retain prior behavior.

58 offline tests, expanded canonical E2E with two installed projects and genuine
Scout effects, native host fixture kujo-native-host-LPYgPe, and packed fresh/
0.1.0 upgrade kujo-opencode-packed-3wQu3B passed. The first packed attempt failed
on ENOSPC; four exact task-created old fixture work folders were removed while
retaining tarballs. Commit 83df96b prevents further successful-fixture buildup,
retaining package bytes/verification.json by default; KEEP opt-out and failure
retention are documented. See PRODUCTION-READINESS.md for digest and limits.

External release gates freshly rechecked: npm whoami E401; GitHub run38975403007
all seven jobs failed before steps due to account payments/spending limits.
Independent work remains. Continue canonical approved source run/test/starters,
opt-in Watchdog/RunLedger lifecycle, remaining lost-response/mixed-version
acceptance and immutable release matrix. All seven outcomes remain open.


## Approved source execution checkpoint (2026-10-16)

Commit e8d2f4b adds source preview and approved canonical run/test snapshots.
Build has 11 tools; Full has 42. See source-execution.mjs and its regression tests.
Every selected file and runtime bytes are digest-bound; execution copies the
verified runtime and uses the snapshot as the explicit module root. Canonical
receipts retain failed artifacts, diagnostics and completed-request replay.
Trusted programs retain host permissions; this is not an OS sandbox.

Important canonical runner behavior: missing expectations are auto-created and
zero runnable tests return success. The adapter now requires reviewed .out or
.interpreter.out for each top-level fixture, rejects nested-only selections and
marks zero-runnable results failed. It does not implement output comparison.
65 offline tests, canonical E2E, native management s0ldju and packed fresh/upgrade
FutjoC passed. Exact digest and limits are in PRODUCTION-READINESS.md. Tests prove
local POSIX descendant cancellation; Windows and live Build-agent execution
remain unverified. Generated runtime unchanged. Source run/test implementation
is now committed; broader starter/MCP/SDK, lifecycle, recovery, specialist and
release outcomes remain open. Next: canonical reviewed starter preview/creation,
MCP generator and Agents SDK fixtures, preserving thin-adapter ownership.

## Canonical MCP and SDK checkpoint (2026-10-16)

b198a1b implements canonical MCP preview/generation and offline Agents SDK smoke;
a15fec3 fixes upgrades when the source catalog changes. See build-workflows.mjs,
build-abilities.json and catalog-migration.test.mjs. Build14, Full45, sources27.
MCP uses a new contained destination, no AI, canonical validation, retained
partial failures and review artifacts. SDK preserves the deliberate failed
approval-example status while requiring every example's ok=true/network=false.
69 offline tests, canonical E2E and pre-migration native management passed.

Catalog migration must validate the old installation with its own contained
catalog before preparing the new sources. Normal app execution remains strict.
The first packed attempt otE3EM demonstrated the old/new mismatch and failed;
its exact owned work folders were cleaned after diagnosis, retaining tarballs.
Packed retry evidence must be checked before claiming acceptance.

Next: reviewed starter preview/creation for script, agent, API and MCP. Reference
Paperclip src/features/starters/preview.ts and application.ts: canonical kujo init
and agent new generators, plus explicitly inventoried pinned CRUD/MCP source
files with provenance. Do not copy product implementations or invent substitute
starters. The full lifecycle, recovery, specialist execution and release scope
remains active; no external npm/provider/CI gate was rechecked this checkpoint.

Migration retry 5M17zi completed successfully. Follow-up 4bef6f4 suppresses the
canonical shell-based extended checks and runs generated syntax/self-check with
argv; E2E covers a literal shell-special destination. SDK and MCP generation
still delegate product behavior upstream. Final packed retry for this correction
is 0g2VQT; confirm its terminal outcome. Upstream risk retained for human review
in SignalBox cap_781c3b50-1bc5-4bc9-90ff-0606d0b41dc3 and
sig_96a4ebd6-7b94-4026-b3de-c36a9f3a0475, both retrieved exactly and conceptually.

Final checkpoint packed retry 0g2VQT passed fresh installation and 0.1.0 upgrade,
including installed MCP generation/direct checks and SDK fixtures, all 27 sources
and older project preservation. Candidate SHA-256: 8cd06f98fd775bf3b9be408a46b0b19e57fa19bdae028d2551dce8cef5d709f4.
Native management tRrtyP also passed after the direct-validation change. Only
test cleanup and timeout documentation changed after packing; this remains a
local checkpoint, not immutable full release/platform certification.

## Reviewed starters checkpoint (2026-10-16)

84459bd and f3e9754 implement preview/create/inspect for script, fixture agent,
API and MCP. Build17/Full48/source28. See lib/starters.mjs, starter-abilities.json,
starter-components.json and tests/starters.test.mjs. Canonical runtime generators
or pinned application inventories own product bytes; the adapter supplies guides,
ignore rules and digest-bound approval/no-overwrite/inspection. Required empty
directories matter: actual agent run initially failed on missing agent/tools.
Directories now participate in preview, digest, creation and inspection.

74 offline tests, five focused regressions, canonical E2E with all four receipt
flows and API/MCP loopback startup, isolated agent dependency install plus fixture
execution, and native QssxAs management passed. Agent proof Zb4VDQ produced 'Owned
agent fixture: Hello' after pinned Kennel dependencies. Earlier packed6Fa766 and
7VYOoE passes predated directory preservation/full agent execution acceptance;
they are superseded for starter readiness. Final network retry Vp2ILf must finish
before claiming packed acceptance; it includes agent execution and explicit
verification flags. Creation itself still performs no dependency install/startup.

Inspect does not resume partial writes or compare unlisted extra files. If runtime
or component bytes change, use the original preview receipt rather than silently
substituting a different inventory. All seven broader goal outcomes remain open.
Next major implementation: opt-in lifecycle Watchdog/RunLedger bridge, durable
bounded retry/cancellation/reconnect; then remaining recovery, six live specialist
workflows and immutable release matrix/public distribution. No new SignalBox
finding: directory loss is fixed and broader acceptance is already-authorized work.

Final packed Vp2ILf passed fresh installation and 0.1.0 upgrade with 28 sources,
all four reviewed starter workflows, real API/MCP startup and agent pinned
dependency installation/fixture execution. verification.json records the explicit
starter_services_verified and agent_fixture_verified flags. Tarball SHA-256:
b420e45c1cc033fbb4412eca78b51fc4f7b268d0c8303ab2b1f8ce8baa19f989. Only test coverage and verification documentation
changed after packing; executable bytes match this checkpoint. This is local
macOS acceptance, not the full supported-platform/live-specialist release gate.

## Lifecycle delivery foundation (2026-10-16)

lib/lifecycle-outbox.mjs and its nine regression tests provide bounded durable
metadata-only Watchdog delivery, stable retry IDs and producer version, explicit
recovery, abort-on-close and loopback-only endpoints. The component is not wired
to OpenCode hooks or configuration; default behavior remains unchanged.
83 offline tests and canonical E2E passed; packed 7XhEFJ is running.

Next: explicit native activation/status/recovery controls with fresh human
approval and stale-config checks; workspace-validated session/tool/model hooks;
bounded background worker and unload/reconnect; optional canonical RunLedger
and failure intervention. Extend plugin-scope callback binding for tool hooks
and event subscriptions. Never capture request/response bodies or error text;
HTTP response headers do not prove model completion. Pass canonical project
paths to the outbox. Remaining specialist workflows, guided knowledge/browser
readiness, service support boundaries, recovery matrix and public release retain
their original scope. No new external release/provider checks in this checkpoint.

Packed lifecycle candidate 7XhEFJ ended without acceptance: GitHub crud-api
source acquisition timed out during upgrade (`Recv failure: Operation timed
out`). This is a failed gate, not a passing fresh/upgrade certification. The
fixture is retained for diagnosis; rerun the exact candidate after acquisition
recovers. Offline and canonical E2E results above remain valid.

## Native lifecycle bridge (2026-10-16)

See lifecycle-host.mjs, plugin.mjs, lifecycle-host.test.mjs and native-host.mjs.
Native config/menu controls and opt-in metadata observers are implemented; this
supersedes the foundation-only checkpoint. Explicit ask permission is required in
every specialist policy because default-deny otherwise defeats the evaluate hook.
89 offline tests, final canonical E2E and native fixture0w4mfU passed; expanded
retry/recover/discard native acceptance and packed vzcDKv are pending below.
Packed bytes predate final unload-race and queue-action stop refinements.

Next: canonical optional RunLedger lifecycle and bounded failure intervention, then
real specialist tasks and guided RAG/Lens readiness. Preserve original full parity
and release requirements. Native SDK event subscription is an abortable async
iterable; session.execution.interrupted gives truthful cancellation without reading
error text. Tool result metadata ok=false is failure even when the host tool
transport completes. Watchdog HTTP responses are headers, not model completion.

Expanded real OpenCode native fixture Pnl7ZH passed activation rejection, stale
configuration refusal, enable, retry, recovery, discard and disable without
inference. Packed vzcDKv passed fresh install and 0.1.0 upgrade with 28 pinned
sources, old-project preservation, starter execution and canonical Watchdog
delivery/deduplication. Tarball SHA-256: d7a3a3f8729153c51f7265f8be331eb562d12a4e14e5654290d3d4a958e90a7c.
This clears the previous download timeout for this retry. As noted above, the
packed candidate predates two final plugin shutdown/queue-action refinements;
final native Pnl7ZH and canonical E2E cover current local code, while immutable
full-release certification remains open.

## Session RunLedger and failure guard checkpoint (2026-10-16)

dae8d71/b96962b implement session-ledger controls and opt-in bounded intervention.
See session-runledger.mjs, failure-guard.mjs, lifecycle-host.mjs and their tests.
99 offline tests, expanded canonical E2E and native J0eoBH passed. Packed s1hMEi
is running (handle62025 at checkpoint) with installed-byte canonical ledger tests.
Native session creation must use realpath(project): /var vs /private/var produced
pending permission in a different host location. Live model harness corrected too.
Never await session.interrupt inside a tool after-hook: the session may be waiting
for that same hook. Guard launches bounded once-only intervention asynchronously.

Next lifecycle work: automatic optional session tracking/finalization that preserves
request-bound human approval and truthful human verdicts, Watchdog/RunLedger
correlation, and real live-model failure/telemetry acceptance. Manual menu controls
do not complete that scope. Retain six specialist tasks, guided RAG/Lens readiness,
recovery/mixed-version and immutable supported-platform/host/public release gates.
No external npm/CI/provider gate was rechecked. No new SignalBox capture warranted.

Packed s1hMEi completed successfully: fresh install, 0.1.0 upgrade, 28 pinned
sources, older project retained, real starter services/agent fixture, Watchdog
deduplication and installed-byte session RunLedger rejection/start/lost-response
inspection/finish. verification.json includes session_runledger_verified:true.
Candidate SHA-256: 70c8dde715187007ed9e0215b3e46f87f8e959373eded1f016ba9a579b8bf826. Only test assertions and
acceptance documentation changed after packing; shipped executable bytes match
this checkpoint. This remains local macOS evidence, not the full immutable
supported-platform/live-specialist/public-release certification.
