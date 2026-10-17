# Parity completion audit

Full parity remains unproven. This audit preserves all seven outcomes in
[the production contract](../PRODUCTION-READINESS.md); it does not replace them
with local test success.

The current immutable package is commit `f78cb5654bab655afbe0f5e1d5dbb7eb957963b4`,
SHA-256 `4d0e350dab9d2c6a92113f764d1a09af8387464f9b3280b502322c56deacfda6`.
[Candidate evidence](2026-10-17-status-recovery-candidate.json) records exact
host versions, fixture locations and the scope of each passing check.

| Required outcome | Evidence for this package | Completion finding |
| --- | --- | --- |
| Native management and human approvals | Rendered 80×24 onboarding, rejection, one-time approval and manual RunLedger verdict on macOS with OpenCode 2.0.31 and 2.0.32 | Partial: supported-platform acceptance remains |
| Opt-in lifecycle and intervention | Complete native minimum-host run; latest-host telemetry/guard and cancellation are separate retained runs. Outage/reload, explicit retry, no discarded records, opt-out and cancellation checked. Rendered automatic completion/evidence browsing and separate finish approval pass on both hosts | Partial: other supported platforms remain; latest first combined run failed at the synthetic cancellation prompt and must remain labelled failed |
| Six scoped specialist workflows | Scoped tools and scenario/runner/report regression suites exist and run in the 264-test standard gate | Incomplete: all six successful real specialist journeys and final reports are missing; ordinary Build runs do not substitute |
| Canonical ecosystem coverage | Exact-package fresh gate verifies starters, source acquisition, Agents SDK, real browser and knowledge flows; latest-host rendered Leash passes | Partial: CMS and minimum-host service acceptance in progress, specialist/platform workflow proof remains |
| Recovery | Fresh 0.1.0→0.2.0 upgrade retains the old project and verifies mixed versions; live telemetry recovery and lost HTTP RunLedger reply reconciliation pass | Partial: final-package cross-platform recovery and native Dispatch transport-loss reconciliation remain unverified |
| Package/host/platform compatibility | Immutable package verified; minimum/latest macOS native and rendered evidence retained | Incomplete: Linux and Windows matrix has not executed; macOS cannot establish those results |
| Public release and registry consumption | Candidate contains checksums, SBOM and unsigned build record; local tarball installation verified | Incomplete: no successful protected release, public package/tag/release/provenance or registry-consumer installation/upgrade |

## External prerequisites

The latest recorded GitHub run `39015426601` executed no job steps. Annotation
`117346447494` reports failed account payments or a spending-limit restriction.
`npm whoami` returned E401. The repository remains private and its release
environment list is empty. These are dated observations, not permanent claims.
An authorized, entitled provider is still needed for scoped specialist acceptance
after the recorded free-provider HTTP 403 failures. Do not change identity or use
a paid fallback to manufacture a pass.

Account prerequisites do not prevent finishing remaining local package checks.
No outcome should be checked off until evidence covers its full required scope.
