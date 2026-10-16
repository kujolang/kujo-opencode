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
