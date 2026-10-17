# Promotion preparation — 2026-10-17

The README has monochrome badges matching the other Kujo integrations. Public documentation distinguishes the passing Windows/host matrix from live model evidence and npm publication. The user approved the final Siren walkthrough. [Launch copy](../walkthrough/launch-copy.md) supplies its title, description, chapters and short post.

## Frozen package

- Version: `0.2.0`
- Source: `11f0130f46dff81003eb4ade9dc0ce1fa1d41e38`
- SHA-256: `baf69b7cc88982ff4eb95100b42715eea92176c7c9c2a0a6a9479dd6f3c244f5`
- [Candidate build and fresh-install/upgrade gate](https://github.com/kujolang/kujo-opencode/actions/runs/39061764471): passed.
- [Six-job host matrix](https://github.com/kujolang/kujo-opencode/actions/runs/39061941547): passed on Linux, macOS and Windows, OpenCode 2.0.31 and 2.0.32. Fifteen native, rendered and fresh-install verification records are retained in [host evidence](2026-10-17-promotion-hosts.json).

Subsequent changes are acceptance tests, records, launch copy and evidence-retention tooling outside the package's published file list. They do not replace or rebuild the archive above.

## Live acceptance

All six specialists passed 50 operation checks and receipt-verified model reports on the frozen archive. [Specialist evidence](2026-10-17-promotion-specialists.json) retains the results and prior failed attempts; the corrected Workflow journey accounts for 18 of those checks.

[Lifecycle acceptance](2026-10-17-promotion-lifecycle.json) passed on local macOS x64/OpenCode 2.0.32 using the authorized ChatGPT connection: read/write decisions, failure guard, cancellation, opt-in telemetry, outage/reload recovery, opt-out and automatic RunLedger tracking. [Dispatch transport acceptance](2026-10-17-promotion-dispatch.json) recovered a retained run after a lost approval reply without executing it twice.

These live model checks are local macOS evidence. The CI matrix tests real hosts and rendered UI without model inference. Keep those scopes explicit in release review.

The Workflow test originally resubmitted a checkpoint decision after a stale-revision failure without first inspecting the current checkpoint. The model correctly refused. Commit `e4ba3bf` adds that inspection and uses its current identifiers before requesting a fresh decision. The canonical scenario passes 18 checks; the focused runner/report/decision suite passes 26 tests. The full suite passes 237 tests. Production runtime and permission rules are unchanged.

The read-only `Retain local acceptance evidence` workflow checks candidate identity and completeness before uploading the imported receipts. It does not rerun local model tests or approve publication. Its validator rejects an incorrect candidate digest and incomplete specialist evidence.

## Publication still requires

1. Complete npm sign-in and establish package ownership/trusted publishing for `kujolang/kujo-opencode`, workflow `publish.yml`, environment `npm-release`. The local npm account was unauthorized at the start of this pass.
2. Provide another eligible reviewer or dispatcher. The repository currently lists only `robertdevore`; `npm-release` requires that account's approval and prevents self-review. Protection remains enabled.
3. Review the full release contract and exact evidence, including declared platform boundaries. Produce the required digest-bound acceptance report only when each requirement is supported.
4. Follow [RELEASING.md](../RELEASING.md): matching version tag, candidate run at the tag, protected publication of the reviewed archive, registry integrity/provenance and fresh consumer install/upgrade checks, then GitHub release assets.
5. Confirm the public install command works before posting the approved video and launch copy.

No npm publication, version tag, GitHub release or public video upload occurred in this pass. The free GLM/DeepSeek specialist route remains unverified; ChatGPT is the tested provider path.
