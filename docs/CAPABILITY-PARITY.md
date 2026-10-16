# Kujo host capability parity

Evidence snapshot: 2026-10-16. This compares behavior, not tool counts. All
missing rows remain required work under PRODUCTION-READINESS.md. A similar name
does not establish equivalent execution, recovery, or evidence semantics.

Reference revisions inspected locally:

- CMD: `7cedc7758cfd5214ec28c2ba62a20bd5cc3d8988`, catalog/abilities.json.
- Pi: `89e1188643024f7132871c2071ba28e3cac6e303`, README.md included capabilities
  and src/extension.ts registrations.
- Paperclip: `88b53328cc38b209372f5a10f9640efd8881106b`, README.md build,
  run/test, starters, knowledge and evidence sections.

| User task | Current OpenCode evidence | Remaining parity work |
| --- | --- | --- |
| Discover and select capabilities | Native menu, profiles, individual capability enable/disable/default controls, catalog; 38/38 CMD IDs plus seven host-owned source/build projections | Complete real-host specialist workflow acceptance |
| Understand repository | Scout, Scent, PatchBrief canonical adapters | Scoped Understand agent projected with evidence/coverage instructions; complete workflow acceptance remains |
| Review and release scan | ChangeBucket, Fence, Spec, Concord, ShipCheck, Eval adapters | Workflow acceptance and clear distinction between metadata scan and executing checks |
| Inspect Kujo source | Build profile: canonical check/lint and non-writing format preview on bounded private copies, source digest, diagnostics; runtime tests and receipt E2E pass | Supported OS/host matrix and immutable candidate verification |
| Run or test Kujo source | Digest-bound multi-file preview and approved canonical run/test snapshots with retained evidence | Live specialist and supported OS/host matrix acceptance |
| Preview starters | No script/AI-agent/API/MCP preview workflow | Canonical generators/pinned application sources, review every proposed file, no execution during preview |
| Create starter files | No approved creation workflow | No-overwrite contained creation from approved bytes; partial failure reconciliation |
| Generate repository MCP | Canonical offline preview and approved MCP generation with no-overwrite destinations and review artifacts | Live specialist and supported host/OS acceptance |
| Agents SDK fixtures | Pinned canonical offline fixture runner with approval and per-example acceptance checks | Live specialist and supported host/OS acceptance |
| Package declarations/dependencies | Kennel validation/install adapters | Distinguish declaration validity from resolved bytes and compatibility |
| Workflow operation | Dispatch validate/run and Muzzle adapters | Scoped Workflow agent projected; checkpoints, cancellation and lost-response reconciliation remain |
| Project knowledge | RAG query/ingest adapters | Guided index/query workflow, freshness and citations, retained-index management |
| Evidence | Canonical receipts, native project/session/legacy filtering, details/comparison, contained artifact previews and JSON export | Retention limits are explicit; immutable artifact snapshots and full directory browsing are not provided |
| Browser verification | Lens adapters and explicit browser install | Native readiness/remediation workflow and real supported-host acceptance |
| Session lifecycle | Receipt session/agent/model correlation | Opt-in Watchdog metadata bridge, durable bounded retries, optional RunLedger |
| External approval/service integrations | Local native one-time approvals | Explicitly scoped service support matrix including Leash; never imply remote gateway capability from a local catalog |
| Recovery and distribution | Transactional project activation and staged source/runtime replacement with complete lock publication; packed local install/upgrade | Lost-response reconciliation, multiple-project/version cases, supported OS/host matrix, public release/provenance |

## Boundaries to preserve

Paperclip's issue cards, company settings and issue-document attachments are
host-specific. OpenCode must provide equivalent human review and accessible
evidence using its own interfaces, not duplicate Paperclip's database/UI.
Pi's project trust/session activation are host-specific too; tool exposure and
approval enforcement must be explicit in OpenCode. Local execution does not
provide remote Ability gateway tenant authentication. No host should silently
claim that feature on the strength of catalog discovery.

Source/build/starter operations must invoke canonical tools or generators.
Do not invent a substitute compiler, formatter, application scaffold or workflow
engine in this adapter. Publish only claims supported by the exact release
candidate's runtime and failure-path evidence.
