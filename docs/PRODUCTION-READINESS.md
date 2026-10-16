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
