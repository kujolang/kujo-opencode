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

The final archive is built from `bef63f4200e3bf530cf4baab21aa524e6fca13ea`,
tagged `v0.2.0`. Its SHA-256 is
`fa5fd2ed97c9fd7c24d3610434d19e2130cfcb7102b5ab6b0e8785f189fcdb5c`.
All six specialists passed 50 operation checks with six receipt-grounded model
reports through OpenCode's ChatGPT sign-in. These live tests used macOS x64,
OpenCode 2.0.32 and `openai/gpt-5.6-sol`; they do not establish live-model behavior
on Linux or Windows.

| Gate | Verified scope | Evidence |
| --- | --- | --- |
| Native UI and approvals | Native and rendered checks on Linux, macOS and Windows, OpenCode 2.0.31 and 2.0.32 | [Final host receipts](acceptance/2026-10-17-release-hosts.json) |
| Lifecycle | macOS live-model cancellation, opt-in delivery, outage/reload recovery, bounded intervention and automatic tracking | [Final lifecycle receipts](acceptance/2026-10-17-release-lifecycle.json) |
| Specialists | Understand 5, Build 8, Review 4, Browser 7, Workflow 18, Ship 8 checks; accepted and rejected operations | [Final specialist receipts](acceptance/2026-10-17-release-specialists.json) |
| Capabilities | Canonical source/test, starters, Agents SDK, knowledge, browser and service workflows within the documented host boundaries | [Comparison](CAPABILITY-PARITY.md), final host and specialist records |
| Recovery | Fresh install/upgrade on three operating systems; lost Dispatch response reconciled without duplicate execution in the macOS live test | [Final host receipts](acceptance/2026-10-17-release-hosts.json), [Dispatch receipts](acceptance/2026-10-17-release-dispatch.json), [failure-path scope](RECOVERY-ACCEPTANCE.md) |
| Publication | Version tag pushed; npm trusted publisher configured for `publish.yml` and `npm-release` | Protected publication, registry provenance/signatures and consumer checks remain pending |

The final records are [retained on GitHub](https://github.com/kujolang/kujo-opencode/actions/runs/39067797542).
Prior failed attempts remain in those records. The Windows minimum-version native
host job passed on an unchanged rerun after a connection failure. Review acceptance
was corrected to allow its documented pair of opening read-only tools and either
completion order for that parallel pair. Later operation order, receipts and
permission checks remain strict. The current test suite passes 245 checks.

The release environment requires `robertdevore` to review. On 2026-10-17 the
maintainer authorized self-review, so that account may dispatch and approve its
own run. Human approval remains required and administrator bypass stays disabled.

The free-model restriction remains open: scoped requests to the requested free
providers returned HTTP 403. ChatGPT acceptance supplies a working provider path;
it does not establish that those free-provider requests now work.

## Before promotion

The user approved the 145-second Siren walkthrough on 2026-10-17. Its recorded
workflow, approvals and receipts remain valid evidence for the demonstrated
installation. Before promotion, verify the flow against the published npm package
and ensure the installation link works. Keep platform, provider and optional-service
claims within the recorded evidence. Video approval does not approve publication.

## Evidence index and scope

- [Host matrix](HOST-MATRIX.md): exact archive, official v2 hosts, native versus
  rendered coverage and completed Windows acceptance.
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
