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
