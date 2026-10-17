# Specialist acceptance runner

This is test infrastructure, not a declaration that any live specialist passed.
The production adapter and current immutable candidate are unchanged.

`native-specialist-runner.mjs` creates a new owned session with an explicit Kujo
agent and provider/model. It refuses a native fallback to ordinary Build. Each
step specifies its exact Ability/input, expected terminal result and native
permission decision. Before a grant it verifies canonical receipt provenance,
request input, effect identity and absence of persistent permission. Rejection
and cancellation require both a pre-decision invariant and a post-condition.
Provider errors, missing receipts, retries, out-of-scope execution and changed
inputs fail the journey and interrupt only its owned session. Final receipts are
checked again after the host finishes, including late tool execution.

The ten runner contract tests are included through `tests/specialists.test.mjs`
in `npm test`. Fake-host tests verify orchestration/refusal behavior only.

## Understand journey

`KUJO_TEST_JOURNEY=understand` selects the real `kujo-understand` agent, after the
base native checks and a separately approved full-profile selection. It checks:

1. Native Scout rejection leaves no output directory.
2. A separate approved Scout request produces its canonical manifest.
3. An approved Scent dry-run leaves no context artifact. Canonical Ability policy
   still declares output effects, so the adapter does not invent a bypass.
4. A separate approved pack preserves its task, 4,000-token budget and generic
   target and supplies structured context/redaction artifacts.
5. An approved nonexistent-scope request produces a failed canonical receipt,
   with no new target directory or automatic retry.

```sh
KUJO_TEST_RELEASE_DIR=/absolute/candidate \
OPENCODE_BIN=/absolute/isolated/host/bin/opencode \
KUJO_TEST_MODEL=opencode/glm-5.3-flash-free \
KUJO_TEST_JOURNEY=understand npm run test:native
```

The selected provider must authorize this actual specialist. Do not replace the
agent, spoof provider identity or choose paid inference implicitly. A provider
403 is failure, not an empty successful journey. Native failure records retain
host/model/candidate identity without recording credentials.

`node tests/understand-canonical.mjs` separately verifies Scout/Scent artifact
contracts against local canonical sibling sources and the installed Kujo runtime.
It uses a disposable Git repository and makes no model calls. This preflight does
not prove pinned-candidate or live-agent behavior. Scout's manifest artifacts are
a map; Scent's minimum budget includes its fixed context overhead.

## Build and Review journeys

`KUJO_TEST_JOURNEY=build` selects `kujo-build` for eight steps: inspect a source
file, preview formatting without modification, preview all imported test files and
expectations, reject execution without creating a snapshot, approve a passing
snapshot, refuse the old digest after changing an import, preview the changed
bytes, and retain diagnostics/artifacts for the now-failing test. Snapshots are
checked byte-for-byte against reviewed hashes. This does not claim an OS sandbox.

`KUJO_TEST_JOURNEY=review` selects `kujo-review`. It uses an owned nested Git
repository with a committed baseline and one real working-tree change. PatchBrief
and ChangeBucket must report that actual file; a valid Spec passes and a missing-
goal Spec fails. After every step the tracked diff and contract bytes must remain
unchanged. Footprint heuristics do not establish correctness or review approval.

`node tests/build-specialist-canonical.mjs` executes the real Kujo runtime without
a model or native permission flow and is included in `npm test`. The corresponding
Review preflight is `node tests/review-specialist-canonical.mjs`; it uses canonical
local sibling sources, so it is an explicit local integration gate. These scripts
reuse scenario assertions, but cannot substitute for actual scoped-agent runs.
On macOS the Review preflight canonicalizes its disposable project path before
calling Spec, matching the native journey's realpath boundary.

## Browser journey

`KUJO_TEST_JOURNEY=browser` selects `kujo-browser`. It probes native browser
readiness and, only when missing, requests an isolated native install with an
exact once-only approval. Persistent grants, other permission actions and other
operations are refused. Installation errors and a failed post-install launch
probe remain failures; seven contract tests cover these boundaries.

The seven scenario steps validate a safe flow, reject an unsafe flow, reject a
page check without output, approve a full desktop/mobile check, refuse an external
URL without opt-in, reject an explicitly opted-in external request, and retain a
failed check against an owned HTTP 503 fixture. Successful checks must retain
valid PNG screenshots, HTML and structured reports, and reach the owned server.
The scenario never contacts an external endpoint. It validates a flow but does
not claim to execute an interactive flow through the page-check Ability.

`node tests/browser-specialist-canonical.mjs` uses the actual local canonical Lens
adapter and an already installed browser. It shares artifact assertions with the
live journey, but rejected steps only check absence without invoking the adapter:
**native approval and live specialist behavior remain unverified**. This explicit
integration gate is separate from ordinary unit tests because it requires Lens
and browser dependencies. No sibling source or production payload is changed.

## Workflow journey

`KUJO_TEST_JOURNEY=workflow` selects `kujo-workflow`. Its seventeen steps validate a
bounded tool-only workflow, reject and cancel native execution without output,
run, discover and separately inspect completed/paused/failed cases, and reject an invalid
workflow. Each run is unique; inspection reconciles the exact retained identifier
without rerunning it. State bytes, step attempts and pending approvals must remain
unchanged after inspection. Tool output-schema failure remains a failed workflow;
no automatic retry or checkpoint decision is supplied.

Inspection invokes canonical Dispatch. Its SQLite backend can initialize storage
bookkeeping, so the Ability declares a write effect and needs a separate native
approval even when a filesystem-backed fixture does not change. Run-state and
SQLite paths are confined; identifiers cannot be options or path traversal.

`node tests/workflow-specialist-canonical.mjs` exercises these same operations
against local canonical Dispatch; `KUJO_TEST_DISPATCH_SOURCE` selects a retained
pinned checkout. This preflight marks native approval/cancellation and live agent
behavior false: denied steps only assert absence without invoking execution.
A paused checkpoint is not completion. The journey rejects a checkpoint decision
without changing state, submits a stale revision and requires failure, then
separately approves the exact inspected decision and inspects completion. This
uses ordinary human checkpoints from Dispatch 1.4; experimental v2 interventions
remain on the canonical operator surface. A separate two-checkpoint regression
proves later checkpoints stay pending and stale decisions cannot advance them.
Canonical Dispatch keeps the original pending approval in its history and appends
an approved record; do not treat the first historical entry as current status.
Explicit rejection produces a failed run with `approval_rejected` and leaves
later steps unexecuted. The submitted decision artifact is retained on failure.

`node tests/dispatch-lost-response-canonical.mjs` injects loss after the actual
canonical operation returns, discards its result, discovers the run without its
returned ID, and inspects it. Exactly one execution and one run must remain. It
also deletes the owned fixture index and verifies canonical repair preserves run
state. This proves adapter-result recovery, not native HTTP transport loss or a
live model's recovery decision. It runs against current or explicitly selected
pinned Dispatch and is part of the E2E gate.

Discovery declares possible index writes, bounds inputs and pagination, and
rejects traversal keys or symlinked state before calling the canonical CLI. It
never resumes a workflow. Native Workflow journeys now request discovery before
each exact-run inspection.

## Ship journey

`KUJO_TEST_JOURNEY=ship` selects `kujo-ship` and preserves the real provider/model
identity in its fixture ledger. Eight steps inspect informational ShipCheck output,
start a ledger, reject an Eval request without output, run passing and failing
file-check suites, link the actual failed Eval subject run ID, explicitly finish
the fixture ledger as failed, and inspect its report. Eval evidence file hashes
must match canonical references. Linking evidence must leave status/verdict
unchanged; finishing uses a separately approved, explicit verdict.

`node tests/ship-specialist-canonical.mjs` uses local canonical sources.
`KUJO_TEST_INSTALLATION=/absolute/installation.json` selects retained installed
sources for pinned preflight. The harness does not publish, invent telemetry,
or treat informational scan exit zero as passing release checks. It marks live
specialist/native approvals false; rejected canonical steps only check absence.

## Still required

All six distinct harnesses now exist. None is certified as a complete live
specialist journey. Run the actual selected agents with an authorized provider,
verify final evidence-backed reports, and retain exact-candidate host identity.
Workflow still needs live native decision/continuation and transport-loss acceptance.
Canonical stale-decision and continuation checks alone cannot establish these. Native cancellation
is specified by the runner but not established by canonical preflights. Required
platform coverage, replacement candidate and retained release acceptance evidence
remain separate gates. The generic ShipCheck/RunLedger helper is insufficient.

### Final model report gate

Every live specialist journey now ends with a model-authored structured summary
of its existing conversation. The prompt supplies a format, not expected results
or receipt IDs. Acceptance checks chronological operation coverage, exact outcomes
(including failure, rejection and cancellation), citations belonging to each
operation and terminal receipts for executed operations. Explanations and an
explicit limitations field are required. Any new permission, canonical operation,
model identity change or tool call fails the report gate and interrupts only the
owned fixture session. The retained `specialist-evidence.json` includes the report
and originating message IDs. These structural checks do not establish the truth
of every prose claim; live report quality still requires review alongside receipts.
Focused adversarial tests cover fabricated/unrelated citations, concealed failures
and rejection, omissions, unexpected effects and successful report extraction.
This gate is acceptance infrastructure, not a completed live-provider result.

### Native HTTP reply loss

The base native-host gate also exercises session RunLedger recovery without
inference. An owned loopback fault relay forwards one exact start request to the
real host, consumes its successful response, and closes the caller socket without
returning the response. The fixture separately checks and grants the exact native
permission once. A fresh status request must recover the retained run; an explicit
repeated start must return that same run without another successful start receipt
or permission. The usual separate correlation and human finish approvals follow.
`nativeTransportRecovery` records the fault and recovered run in verification.json.
This tests session tracking transport recovery, not Dispatch transport loss or
live specialist reasoning. The relay is test-only and never forwards inference.
