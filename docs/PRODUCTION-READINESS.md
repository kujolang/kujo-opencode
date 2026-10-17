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

The repository is public and GitHub Actions now runs. ChatGPT authentication is
connected through OpenCode's supported sign-in. All six scoped specialists passed
49 operation checks and produced six model reports on macOS/OpenCode 2.0.32 with
`openai/gpt-5.6-sol`. The [specialist record](acceptance/2026-10-17-chatgpt-specialists.md)
identifies the exact tested archive, approvals, failures and receipts.

Those results apply to that archive. Changes to runtime or packaged documentation
require a new candidate and the applicable checks. No candidate has passed the
complete release contract yet.

| Gate | Established | Still needed |
| --- | --- | --- |
| Native UI and approvals | Local native and rendered management, rejection and one-time grants | Final archive through supported host/platform journeys |
| Lifecycle | Opt-in delivery, outage/reload recovery, cancellation and human RunLedger verdicts | Final-archive lifecycle coverage on supported platforms |
| Specialists | Understand, Build, Review, Browser, Workflow and Ship passed with ChatGPT | Revalidate affected behavior after candidate changes; retain release evidence |
| Capabilities | Canonical source/test, starters, Agents SDK, knowledge, browser and service workflows | Confirm the comparison against the final archive and declared platform limits |
| Recovery | Local interruption, rollback, concurrent setup, mixed versions, repair and uninstall | Supported-platform acceptance for the final archive |
| CI and compatibility | Fresh-install and Node 20/22 package jobs passed on Linux, macOS and Windows ([run 39044492319](https://github.com/kujolang/kujo-opencode/actions/runs/39044492319)) | Retain the [passing native/rendered matrix](acceptance/2026-10-17-windows.md) for its exact archive; revalidate the final archive |
| Publication | Public repository; protected `npm-release` environment and publication workflow | npm publisher setup, reviewed candidate, matching tag, provenance and registry consumer checks |

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
