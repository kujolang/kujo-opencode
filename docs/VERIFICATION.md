# Local verification — 2026-10-16

- OpenCode v2.0.31; Node v26.7.0; macOS.
- npm test: 19 passing tests, including source-digest verification, approval
  binding, idempotency races, cancellation, bounded state/output, contained
  paths, configuration preservation, unowned-file rejection, and packaging.
- npm run test:e2e with the local Kujo runtime: passed canonical tool calls,
  discovery, schema metadata, approvals, receipts, concurrency, and restart.
- npm run test:opencode: a private real OpenCode server reports kujo connected.
  The check waits for asynchronous startup and makes no model request.
- Live native OpenCode GLM 5.3 Flash Free session called kujo_ability_catalog.
  Receipt receipt-d53f97a2-ff5f-4b1a-badf-f794a36ee2e0 was independently read
  from the local receipt log: succeeded, host/principal opencode, 38 Abilities.
- Full profile local setup exposes 38 Abilities and 23 canonical ecosystem skills,
  plus the host guidance skill. Doctor: 30 checks passed, no failures.
- Lens headless Chromium launch verified. Readiness supports headless-only installs.

Local-source mode was used for integration checks; it does not certify every
pinned product revision or every product feature. Windows/Linux CI is configured,
but is not claimed as locally verified. Automatic lifecycle hooks are out of scope.
Runtime configuration, receipts, source checkouts, and model transcripts are not
committed. No npm publication or public release was performed.
