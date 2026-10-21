# Changelog

## 0.2.1 — 2026-10-21

- Update supported Node.js runtime versions and release packaging metadata.

## 0.2.0 — unreleased

- Fix Windows project activation paths and invoke npm without a command shell.
- Shorten the getting-started guide, add ChatGPT setup and separate daily-use documentation.
- Verify all six specialists with ChatGPT on macOS; full release acceptance remains pending.

- Keep lifecycle queue status readable while a management approval is pending, without releasing serialized mutations.

- Retain exhausted or rejected lifecycle deliveries for explicit approved retry instead of deleting them; preserve event IDs, endpoint boundaries and original expiry.

- Pin Dispatch 1.4 and Kujo runtime 1.8.1 for authoritative checkpoint control views.
- Submit separately approved checkpoint decisions bound to the inspected revision and IDs; stale decisions fail and later checkpoints remain pending.

- Discover retained Dispatch run IDs after a lost response, with explicit index-repair approval and path validation.

- Link explicit Eval run IDs through RunLedger correlation without changing verdicts; retain existing Watchdog trace linking.

- Add explicit Dispatch run inspection for reconciliation, with declared SQLite bookkeeping approval and contained storage paths.

- Preserve pending Dispatch checkpoints instead of auto-approving them; resolve installed source fixtures and project-relative workflow/output paths.

- Reject Leash events without their canonical identity before delivery and expose identity requirements in the tool schema.
- Packaged one-paste installation and an isolated network fresh-install/0.1.0 upgrade gate.
- Preserve JSONC comments, existing settings, and older project runtime projections.
- Add /kujo, /kujo-review, /kujo-doctor and a real first repository scan.
- Accept friendly profile, product, and tool names; preserve overrides on repeated setup.
- Review and execute pending approvals by request ID in a human terminal.
- Keep canonical Ability policy, one-time approvals, receipts and idempotency unchanged.
- Public npm publication remains pending candidate acceptance and publisher setup.

## 0.1.0 — 2026-10-16

- Adapt the 38-Ability Kujo CMD catalog to OpenCode 2 local MCP and skills.
- Isolate project configuration, runtime state, approvals, and receipts.
- Preserve native Ability approvals, idempotency, bounded execution, and provenance.
- Add OpenCode configuration preservation and host verification tests.
