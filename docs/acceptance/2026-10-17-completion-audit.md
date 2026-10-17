# Completion audit — 2026-10-17

**Not complete.** This audits the original seven outcomes without narrowing them.
The audited release candidate is `713fbe4dc10ae8c68aee4205d17da70ff67027bd`,
SHA-256 `a444a22098e6e16a76a6991e9dda2271564a9a9e9e64a77ac9cc581cb3e5d48f`.
Subsequent acceptance-only commits do not change its packaged payload. Do not
rebuild or rerun passed local journeys solely to incorporate this audit.

## Requirement evidence

| Original requirement | Authoritative evidence inspected | Verdict and missing work |
| --- | --- | --- |
| Native integration, management, human approvals and evidence | `2026-10-17-identity-candidate.json`, `2026-10-17-identity-lifecycle.json`, `2026-10-17-identity-rendered.json`; exact installed payload proofs | Locally verified on macOS x64/OpenCode 2.0.31 and 2.0.32. Linux/Windows native and rendered journeys remain unverified. |
| Opt-in lifecycle, correlation, metadata, retry, ledger, cancellation, unload/reconnect and bounded intervention | Both native lifecycle records: real free-model read/reject/once; three failures/one intervention; canonical Watchdog outage/reload recovery; 15 records, zero discarded; opt-out; exact pending-call cancellation without effect | Locally verified for the recorded host versions. No broader platform claim. |
| Six scoped specialists with real workflows and failure paths | `lib/specialists.mjs`, `tests/specialists.test.mjs`, `tests/native-model-acceptance.mjs`, `tests/native-host.mjs`, `tests/tui-terminal.py` | Incomplete. Scope enforcement and projection tests exist. The live generic scan/RunLedger helper and scoped Ship attempt do not implement six distinct specialist acceptance journeys. Build that harness before treating provider access as the sole remaining specialist task. |
| CMD/Pi/Paperclip ecosystem capability parity | `CAPABILITY-PARITY.md`, canonical catalog, source/build/starter/knowledge/service tests and exact packed fresh-install record | Local canonical operations have evidence. Specialist workflow and platform acceptance remain. Reviewed source heads still match: CMD `7cedc7758cfd5214ec28c2ba62a20bd5cc3d8988`, Pi `89e1188643024f7132871c2071ba28e3cac6e303`, Paperclip `88b53328cc38b209372f5a10f9640efd8881106b`. Host-specific UI/database boundaries remain documented, not silently dropped. |
| Interrupted install, failed upgrade, rollback, concurrency, mixed versions, reconciliation, repair/uninstall | `RECOVERY-ACCEPTANCE.md`; process-kill and fault-injection tests; corrected packed fresh/0.1.0 upgrade/mixed-version evidence; lifecycle duplicate suppression | Local contracts verified within documented boundaries. Supported-platform recovery evidence remains; arbitrary downgrades, universal exactly-once effects and power-loss durability are not claimed. |
| Exact archive through real host/platform workflows | Three identity acceptance records above, plus the minimum/latest manual/automatic/CMS/Leash records they contain | macOS local coverage established. `.github/workflows/host-matrix.yml` prepares native and manual-ledger coverage on three OSes but does not execute model-driven lifecycle/services or the six specialists. A green future matrix alone cannot certify those additional scenarios. |
| Public npm release, protected approval, matching tag/release, provenance, consumer install/upgrade and support policies | `scripts/release-gate.mjs`, `docs/RELEASING.md`, publication/candidate workflows, current GitHub/npm state | Incomplete. No successful candidate Actions run, retained release acceptance inventory, public distribution/provenance or registry consumer verification. Exact local tarball install is not registry acceptance. |

All capability comparison rows inherit their stated specialist/platform limits.
Browser acceptance includes actual Lens execution in the fresh gate; it does not
stand in for a scoped Browser agent. Source checks do not certify imports/runtime;
source execution uses reviewed snapshots. Kennel declaration validation does not
prove resolved bytes or compatibility. Leash delivery is not a remote decision.
The informational ShipCheck scan does not execute all release checks.

## Remaining implementation: specialist acceptance

Use the real selected `kujo-*` agent, its native scoped tool exposure, the exact
candidate and an explicitly authorized provider. Record agent/model/host/archive
identity and canonical receipts. Fail on provider errors; never fall back to
ordinary Build, spoof identity, grant broad permissions or mark a fixture-only
result as live acceptance. Preserve rejected, interrupted and failed results.

| Specialist | Successful journey to implement | Required negative evidence |
| --- | --- | --- |
| Understand | Discover scoped catalog; approved Scout inspection and task-scoped Scent pack; inspect retained evidence and coverage limitations | Reject an output-producing request without an artifact; invalid scope/path retains failure; no cross-scope tool execution |
| Build | Inspect source; preview the complete imported test snapshot; review exact digests; approved canonical execution and retained output | Source change invalidates reviewed input; failing test retains diagnostics; rejected execution creates no run; no blind retry |
| Review | Inspect a real committed/working-tree diff with PatchBrief and ChangeBucket; run relevant Spec/Fence/Concord checks; produce an evidence-backed review | Invalid contract/check produces a truthful failure; review never modifies tracked source or invents approval; forbidden tools stay unavailable |
| Browser | Validate a flow, inspect readiness, explicitly install if necessary, then approve a real Lens check against an owned loopback fixture | Invalid flow, browser failure and rejected execution; external target requires explicit opt-in; capture actual artifacts rather than static reasoning |
| Workflow | Validate and execute a bounded canonical Dispatch fixture; inspect run/receipt identity, explicit checkpoint and reconciliation evidence | Native rejection/cancellation without execution, failed checkpoint, inspection before retry after uncertain outcome; no auto-approval |
| Ship | Informational ShipCheck plus an explicitly requested canonical Eval suite and correlated RunLedger evidence | Failing Eval remains failed; rejection creates no suite effect; final report distinguishes metadata from executed checks and does not publish |

Reuse canonical fixture formats and existing adapter paths. A six-name list or
six aliases of the same ShipCheck call is insufficient. Offline harness tests may
verify orchestration and refusal behavior, but must remain distinct from the
still-required live-model evidence.

## External prerequisites checked

- GitHub repository API: private; current account has admin access.
- GitHub environments API: empty; `npm-release` and independent required reviewer
  are not configured. Reviewer identity has been requested from the user.
- `npm whoami --json`: E401. No credentials requested in chat or changed.
- Latest inspected Actions run `39006656688`: seven jobs, zero executed steps;
  check `117320395476` confirms billing/payment/spending-limit restriction.
- Local Docker API: daemon socket absent; no independent Linux verification.
- Prior scoped free-model attempts returned provider.auth HTTP 403. This audit
  does not claim a fresh provider attempt. The alternative-provider question is
  still unanswered. Do not select paid inference implicitly.

The missing specialist harness is actionable local work. The goal is therefore
not at an external-only impasse yet. Keep the objective active and complete that
work; revalidate account/provider prerequisites before the next live attempt.
