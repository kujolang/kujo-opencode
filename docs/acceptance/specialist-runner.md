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

## Implemented journey

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

## Still required

Distinct Build, Review, Browser, Workflow and Ship journeys remain to implement,
following `2026-10-17-completion-audit.md`. The generic ShipCheck/RunLedger helper
must not be presented as these five workflows. The full Understand live journey
also remains unverified until a complete native run succeeds. Required platform
coverage and retained release acceptance evidence remain separate gates.
