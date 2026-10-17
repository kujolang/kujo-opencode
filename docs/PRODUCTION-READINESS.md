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

## Current acceptance status — 2026-10-17

The seven outcomes above remain open. Live lifecycle acceptance on candidate
`2f80e13` exposed nine discarded records during a Watchdog outage. The retention
correction preserves exhausted deliveries for explicit approved retry. Its
replacement archive passed fresh installation and upgrade, but live recovery
exposed a status request blocked behind a pending human approval. Commit
`b23b2bc` fixes that serialization bug; 229 unit tests and the local E2E gate
passed. Source-level live acceptance on OpenCode 2.0.31 now passes: outage
recovery delivered 31 records without discards, and reload, opt-out, cancellation
and failure intervention were verified. The expanded standard gate passes all
264 tests. These results do not certify packed bytes. Earlier archive passes
remain historical evidence; rebuild and repeat applicable exact-archive gates
after verifying the correction. See [the failure record](acceptance/2026-10-17-lifecycle-retention.json).

Implementation and local acceptance are
substantial; complete production parity is not yet certified. The table separates
working behavior from the evidence still required to close each outcome.

| Outcome | Established evidence | Still required |
| --- | --- | --- |
| Native interaction and approvals | Native menu, profiles, capability controls, readable operation review and searchable receipts; local rendered rejection and separate one-time grants | Final-candidate user journeys across the supported host/platform matrix; retain clear error/decline distinction |
| Lifecycle | Opt-in metadata delivery to canonical Watchdog, outage/reload recovery, human RunLedger verdict, bounded failure guard and cancellation with no effect | Repeat required lifecycle journeys against the final candidate on supported platforms |
| Six specialists | Scoped definitions and tool access enforcement exist | Successful real Understand, Build, Review, Browser, Workflow and Ship journeys, including failure paths; ordinary Build evidence does not substitute |
| Ecosystem capability parity | Canonical source/run/test, starters, Agents SDK, knowledge, browser, service adapters and evidence access | Complete specialist/platform workflow acceptance and confirm every comparison row against the release candidate |
| Recovery | Local fault injection, process interruption, concurrent setup, failed upgrade, repair/uninstall and independent mixed-version execution | Final-candidate supported-platform recovery evidence; do not claim arbitrary downgrade or power-loss guarantees |
| Package and host compatibility | Exact older candidate passed pinned-source native checks on macOS/OpenCode 2.0.31 and 2.0.32; rendered 2.0.32 onboarding/manual ledger passed | A new final archive through the complete minimum/latest Linux/macOS/Windows matrix, including Windows rendered interaction |
| Public release | Protected release automation, artifact integrity and provenance checks are implemented | Successful CI, public distribution, matching tag/release, verified provenance and actual registry consumer install/upgrade |

## Immediate usability correction

The profile rejection screen previously displayed “RPC call failed” after an
intentional Reject. f465efb adds display-only request correlation to all six
management surfaces. A matching native rejection displays “Request declined”; an
unmatched error remains an error. Server assertions and model tool permissions
remain unchanged. Navigation invalidates pending feedback. Final acceptance and
exact candidate identifiers are recorded in [the handoff](GOAL-HANDOFF.md).

## External prerequisites (last recorded checks)

- Scoped Ship requests using both requested free models returned provider.auth
  HTTP 403 before tool execution; the latest recorded repeat used OpenCode
  2.0.32. An entitled, user-authorized provider is needed for all six live specialist
  journeys. Do not substitute a paid model or spoof agent/provider identity.
- GitHub run 38999467760 started no jobs because of account billing/spending
  restrictions. This supplies no Linux or Windows test evidence.
- npm authentication returned E401. The package lookup returned E404, which can
  mean absent or inaccessible; publication and registry acceptance are unproven.
- Repository visibility and release-account setup still require completion.
  Read-only preparation is not proof of a public release.

Recheck these prerequisites before relying on them for a release attempt. They
are dated observations, not permanent claims about provider or account state.

## Evidence index and scope

- [Host matrix](HOST-MATRIX.md): exact archive, official v2 hosts, native versus
  rendered coverage and remaining Windows acceptance.
- [Capability comparison](CAPABILITY-PARITY.md): CMD/Pi/Paperclip source revisions
  and task-by-task comparison. Earlier remaining-work descriptions must be read
  with the newer evidence in the handoff; no tool count establishes parity.
- [Recovery acceptance](RECOVERY-ACCEPTANCE.md): failure-path scope and limitations.
- [Verification](VERIFICATION.md) and [goal handoff](GOAL-HANDOFF.md): retained
  fixtures, hashes, test results and the exact next starting point.
- [Release procedure](RELEASING.md): immutable candidate and protected release
  requirements. A locally installed tarball is not a registry consumer install.
- [Historical checkpoints](ACCEPTANCE-HISTORY.md): chronological implementation
  evidence. Historical successes apply only to their recorded bytes and scope.

The latest tested archive is candidate `7c5ebc5`, SHA-256
`2b8073637d7995be5b52aefafffe8003667075560301a78148282ada77b573b6`.
It passed fresh-install/upgrade, including mixed-version projects, starters,
browser and knowledge checks. Extended live lifecycle acceptance exposed the
pending-approval status bug fixed in `b23b2bc`, so this archive is superseded.
No current candidate has full acceptance.
