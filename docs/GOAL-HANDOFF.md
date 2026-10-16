# Active parity goal checkpoint — 2026-10-16

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
