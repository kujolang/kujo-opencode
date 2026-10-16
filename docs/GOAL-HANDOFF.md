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
