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
show the approval_request.command returned by the tool. The human runs
kujo-opencode approve REQUEST_ID in their terminal, reviews the exact project,
effects and input, and confirms execution. That command executes the operation;
inspect its receipt instead of starting a new write. Never self-issue approval,
script the confirmation, or use the low-level approval command on behalf of the
user. Do not retry an uncertain write. Requests expire after 15 minutes.
OpenCode's own permissions remain an independent check.

Cite receipt IDs and actual pass/fail evidence. A connected server or listed
tool does not prove a product check passed. Use doctor to inspect prerequisites.
Tools run against the project configured during setup. Native model requests
stay in OpenCode; this integration does not proxy model inference.

Watchdog telemetry and RunLedger actions are explicit Abilities, not automatic
lifecycle hooks. Pass known session/run/model IDs in _kujo when available;
never invent them. Lens Chromium installation is separately opt-in.

Start with /kujo, /kujo-review, or /kujo-doctor. The CLI demo runs a read-only
ShipCheck repository scan without a model call. Use friendly profiles essentials,
review, ship, or full. Enable/disable accepts product names such as lens as well
as tool names. Install a release with npm install --global /path/to/package.tgz
then kujo-opencode setup in the project; npm registry publication is pending.
