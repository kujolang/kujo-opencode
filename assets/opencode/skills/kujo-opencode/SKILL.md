---
name: kujo-opencode
description: Discover and run local Kujo ecosystem Abilities in OpenCode with policy decisions and receipts.
---

Use the Kujo MCP catalog to discover currently exposed capabilities. Match the
operation to the task; do not invoke every tool automatically. Inspect each
input schema and declared effect. Profiles control visibility, not permission.
Use kujo-opencode profiles, profile, enable, and disable to change exposure;
reload the OpenCode MCP connection afterward.

Read-only operations run under local policy. For ability_approval_required,
show the exact Ability, input, and invocation ID to the user. The human uses
kujo-opencode approve with those values; retry only with that returned approval
ID and the same invocation/input (and idempotency key when required). Never
self-issue approval or invent a receipt. Do not retry an uncertain write.
OpenCode's own permissions remain an independent check.

Cite receipt IDs and actual pass/fail evidence. A connected server or listed
tool does not prove a product check passed. Use doctor to inspect prerequisites.
Tools run against the project configured during setup. Native model requests
stay in OpenCode; this integration does not proxy model inference.

Watchdog telemetry and RunLedger actions are explicit Abilities, not automatic
lifecycle hooks. Pass known session/run/model IDs in _kujo when available;
never invent them. Lens Chromium installation is separately opt-in.
