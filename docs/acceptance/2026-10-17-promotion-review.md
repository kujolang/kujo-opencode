# Promotion review — 2026-10-17

Verdict: the demonstrated workflow and video are prepared, but public-install promotion should wait for final release acceptance and npm publication. This review did not publish, create a tag, change release protections or rerun model tests.

## Verified now

- Source inspected: `05fd75f3efc8d1cb3715dc1cf23f38cb69a08005`; clean working tree at review start. Repository is public.
- [Current CI 39060802541](https://github.com/kujolang/kujo-opencode/actions/runs/39060802541) passed fresh installation and all six Node 20/22 Linux/macOS/Windows package jobs.
- [Host matrix 39051805077](https://github.com/kujolang/kujo-opencode/actions/runs/39051805077) passed all six OS/host jobs, including Windows ConPTY, for OpenCode 2.0.31/2.0.32. Windows blockers are resolved; see [the acceptance record](2026-10-17-windows.md).
- That matrix used candidate `c115d47abeaff5f77b928dad4a4d5c96c534e4e4206558aff51cdf32f8ae58f8`, built at `5aff0010c2945b6b078c2189e3e7d4f452862e16`. Subsequent repository changes are acceptance records and walkthrough material, not plugin runtime changes.
- The six successful ChatGPT specialist journeys used the earlier archive `4d0e350dab9d2c6a92113f764d1a09af8387464f9b3280b502322c56deacfda6`. Their success is real but does not establish the newer archive's full acceptance.
- The npm package lookup returned E404; local `npm whoami` returned E401. No GitHub version tags or releases exist. Local npm authentication does not establish or disprove a separate OIDC trust configuration.
- The `npm-release` environment requires `robertdevore` and prevents self-review. A run dispatched by that account cannot receive its approval from the same account.
- Current Siren video: 145 seconds, 1080p hash `7627a1b61684d1dba20e01aeb43da1c7d092451a421ff0885b0433cfa1a59323`. Technical checks and sampled visual review passed. Complete listening review remains unperformed.

## Remaining release work, in order

1. Reconcile current public docs before freezing the release. HOST-MATRIX.md, COMPATIBILITY.md and PRODUCTION-READINESS.md still describe Windows/full native matrix work as pending despite the later passing record. Keep actual live-model and publication gaps explicit. When npm is available, replace candidate-only onboarding with verified registry commands.
2. Choose the exact final archive and finish its live specialist/lifecycle and remaining release-contract evidence. Collect one digest-bound acceptance report for every required gate; do not combine successes from different archive hashes into a passing report. Packaged-doc changes require a new candidate. Run applicable archive verification, install/upgrade and supported-host checks for that candidate.
3. Establish npm publishing access and the first-package/trusted-publisher path. Arrange a different dispatcher or an additional eligible reviewer so the protected release can be approved without disabling self-review protection.
4. Follow RELEASING.md: matching version tag, successful candidate run, reviewed acceptance report, protected publication of the exact tarball, registry integrity/provenance and consumer install/upgrade checks, then GitHub release assets. A green package CI run is not this publication gate.
5. Listen through the complete Siren video and verify the demonstrated flow against the published package. Use the 1080p export for promotion; the 480p file is a phone preview. Captions, title/description and a working installation link are useful finishing work, not additional engineering blockers.

Do not advertise the requested free-provider specialist path as verified: earlier requests returned403; ChatGPT is the demonstrated working path. The example's missing negative CLI test is a finding shown in the walkthrough, not evidence of a plugin failure. Keep that distinction in release claims.

## Scope and limitations

Read-only GitHub API, npm registry/authentication checks, Git history and retained acceptance/video evidence were inspected. No full test suite was rerun because current CI and exact prior matrix results were available. The connected ShipCheck call was unavailable (MCP429), so no ShipCheck gate or receipt is claimed. ShipCheck metadata alone would not close the archive/live-model/publication gates.

SignalBox: no captures warranted. The remaining items are documented release work; resolved Windows findings and the previously captured provider issue were not duplicated.
