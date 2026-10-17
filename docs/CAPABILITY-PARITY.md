# Kujo host capability parity

References were checked on 2026-10-16; acceptance was updated on 2026-10-17.
All six specialists passed on macOS/OpenCode 2.0.32 with ChatGPT. See the
[specialist record](acceptance/2026-10-17-chatgpt-specialists.md) for exact bytes.
That pass closes the earlier provider gap; final-candidate platform checks remain.
This comparison covers behavior, not tool counts. All
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
| Discover and select capabilities | Native menu, profiles, individual capability enable/disable/default controls, catalog; 38/38 CMD IDs plus ten host-owned source/build/starter projections | Rendered home-to-session setup and profile rejection pass at 80x24/120x40; complete specialist and final-candidate platform UI acceptance; confirmed management rejection feedback now has local rendered acceptance |
| Understand repository | Scout, Scent, PatchBrief canonical adapters | Scoped Understand agent projected with evidence/coverage instructions; final-candidate platform acceptance remains |
| Review and release scan | ChangeBucket, Fence, Spec, Concord, ShipCheck, Eval adapters | Workflow acceptance and clear distinction between metadata scan and executing checks |
| Inspect Kujo source | Build profile: canonical check/lint and non-writing format preview on bounded private copies, source digest, diagnostics; runtime tests and receipt E2E pass | Supported OS/host matrix and immutable candidate verification |
| Run or test Kujo source | Digest-bound multi-file preview and approved canonical run/test snapshots with retained evidence | Final-candidate specialist revalidation and supported OS/host matrix acceptance |
| Preview starters | Canonical script/fixture-agent generators and inventoried pinned API/MCP sources; every file and digest reviewed | Final-candidate specialist revalidation and platform acceptance |
| Create starter files | Digest-bound approved creation, no-overwrite destinations and read-only partial-output inspection | Final-candidate specialist/platform acceptance; changed upstream inventory requires original receipt review |
| Generate repository MCP | Canonical offline preview and approved MCP generation with no-overwrite destinations and review artifacts | Final-candidate specialist revalidation and supported host/OS acceptance |
| Agents SDK fixtures | Pinned canonical offline fixture runner with approval and per-example acceptance checks | Final-candidate specialist revalidation and supported host/OS acceptance |
| Package declarations/dependencies | Kennel validation/install adapters | Distinguish declaration validity from resolved bytes and compatibility |
| Workflow operation | Dispatch validate/run/list/inspect and revision-bound human checkpoint decisions and Muzzle adapters | Scoped Workflow agent projected; revalidate checkpoint, cancellation and reconciliation on the final candidate; adapter recovery evidence alone does not prove the specialist journey |
| Project knowledge | Native reviewed offline index/query, freshness, canonical citations and transactional recovery; existing provider-configured adapters | Live specialist acceptance and supported host/OS certification |
| Evidence | Canonical receipts, native project/session/legacy filtering, readable summaries, searchable paged details/comparison, contained artifact previews and JSON export | Retention limits are explicit; immutable artifact snapshots and full directory browsing are not provided |
| Browser verification | Canonical Lens checks; native launch readiness, approved background install/cancel/recheck, capability enablement and specialist selection | Final-candidate specialist revalidation and supported host/OS acceptance; shared installation recovery passes local fault-injection and native approval checks |
| Session lifecycle | Native opt-in metadata observers, durable Watchdog delivery, session-linked canonical RunLedger controls and bounded opt-in failure guard | Opt-in automatic start requests and durable finish reminders pass local/native/packed gates; native evidence/verdict presentation passes local/native adapter checks; manual start and separate partial-finish approvals pass rendered 80x24/120x40 checks; live-model guard now pauses once after three failed scans with exact candidate payload evidence; live-model metadata delivery, service outage/host reload recovery and opt-out now pass against canonical Watchdog; live cancellation now clears the exact pending permission without an effect and emits one canonical cancellation record; platform acceptance remains |
| External approval/service integrations | Local native one-time approvals; opt-in, destination-bound Leash intervention delivery and configuration status, canonical daemon v2/duplicate/auth/error acceptance | Rendered native Leash and CMS gateway rejection/once-approved execution pass locally; configured Watchdog reads have canonical acceptance. Remote deployment and supported host/OS acceptance remain (see SERVICE-SUPPORT.md); Leash delivery does not grant native permissions |
| Recovery and distribution | Transactional project activation and staged source/runtime replacement with complete lock publication; packed local install/upgrade | Standalone mixed-version execution after another project repair/uninstall passes and is wired into the fresh gate; final-candidate recovery on the supported OS/host matrix, public release/provenance |

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
