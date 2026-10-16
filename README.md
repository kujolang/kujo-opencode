# Kujo OpenCode

Run the Kujo ecosystem's supported portable Abilities inside OpenCode 2.
This local integration adapts Kujo CMD's catalog and executor to OpenCode's
MCP and skill interfaces. Models stay inside OpenCode, including its free models.
No Kujo account or hosted execution service is required.

## Install from this checkout

```sh
npm install
npm test
npm link
cd /path/to/project
kujo-opencode setup
opencode
```

This package is not yet published to npm. Setup downloads pinned ecosystem
sources and installs a private Kujo runtime. For local development with existing
checkouts, use `kujo-opencode setup --source-root /absolute/path/to/kujo-repos`.
That mode trusts local source contents rather than claiming the pinned revisions
are checked out. Set `KUJO_BIN` to choose an existing runtime.

Setup writes `.opencode/opencode.json`, `.kujo/opencode.json`, and skills under
`.opencode/skills`. It preserves unrelated JSON settings and refuses to replace
an unrelated `kujo` MCP entry or shadow `.opencode/opencode.jsonc`.
If that JSONC file exists, merge the server configuration manually after choosing
one configuration format; do not delete existing settings.
Shared sources, private runtime, approvals, and receipts are stored under
`~/.local/share/kujo/opencode`; override with `KUJO_OPENCODE_HOME`.
Command Code and Pi state are separate.

## Select capabilities

```sh
kujo-opencode profiles
kujo-opencode profile kujo.profile.full
kujo-opencode abilities
kujo-opencode doctor --json
opencode mcp list
```

Restart/reload the Kujo MCP connection after changing profiles or enabling tools.
Essentials exposes 5 tools; Review 18; Ship 29; Full 38. All supported product
sources are installed, while profiles only select exposure. They grant no authority.
Use `enable ABILITY_ID` or `disable ABILITY_ID` for individual overrides.

The catalog covers Scout, Scent, PatchBrief, ChangeBucket, ShipCheck, Fence,
Spec, Eval, RunLedger, Dispatch, RAG, Watchdog, CaseFile, Concord, Muzzle,
Kennel, Redact, VersionSeal, PackWrite, Tribunal, Dossier, Howl, and Lens,
plus catalog discovery and receipts. See [the exact catalog](catalog/abilities.json)
for supported operations and schemas. This is not every feature of every Kujo
product; new operations need canonical definitions and tested executor bindings.

Ask OpenCode:

> Use the Kujo catalog, inspect this repository with Scout, summarize its changes
> with PatchBrief, and cite the returned receipt IDs. Report failed checks honestly.

## Approval and evidence

Read effects run under local policy. Write, delete, and external effects require
an explicit one-time human approval. The failed call returns the exact Ability,
input, and invocation ID. Use `kujo-opencode approve --ability ID --invocation ID
--input JSON`, then retry with the returned `_kujo.approvalId`, unchanged input
and invocation, and the required idempotency key. Approvals expire after five
minutes and are bound to the principal, definition digest, invocation, and input.
OpenCode permission checks remain independent. Agents must not self-approve.

Each call retains canonical Ability identity, policy decision, receipt, and
explicit correlation fields. Receipts are local JSONL. Watchdog telemetry and
RunLedger are explicit tools; automatic Pi/Command Code lifecycle hooks and
agent projections are not ported. No inference proxy is included.

## Maintenance

`status`, `repair`, `update`, and `uninstall` manage the project integration.
Uninstall preserves shared data unless `--purge` is explicitly supplied.
`browser status` and `browser install` manage optional Lens Chromium prerequisites.
`services start watchdog`, `services status watchdog`, and `services stop watchdog`
manage the optional loopback service. Networked installation and services are
explicit operations, never hidden startup work.

## Verify

```sh
npm test                       # offline contract, security, setup, packaging tests
npm run test:e2e                # real local Kujo products; needs sources/runtime
npm run test:opencode -- --project /path/to/configured/project
```

The host check starts a private loopback OpenCode 2 server, waits for its
asynchronous MCP connection, and stops that server without a model call.
OpenCode 2.0.31 can briefly report no servers before asynchronous startup finishes. The adapter uses the documented [OpenCode 2 MCP configuration](https://opencode.ai/v2/docs/mcp-servers/)
and [skills format](https://opencode.ai/v2/docs/skills/). OpenCode 1 is unsupported.
See [provenance](docs/PROVENANCE.md) and [security](SECURITY.md).
