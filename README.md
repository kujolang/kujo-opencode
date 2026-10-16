# Kujo OpenCode

Use Kujo's supported ecosystem tools from OpenCode 2, with local execution,
clear approvals, and evidence receipts. Your models stay in OpenCode.

## Install and start

Requires Node.js 20+, npm, Git, and [OpenCode 2](https://opencode.ai/v2/docs/).
From the project you want to work on, install the release tarball and set up:

```sh
npm install --global /path/to/kujolang-kujo-opencode-0.2.0.tgz && kujo-opencode setup
```

This is one paste, with no checkout, build, test, or linking step. Setup downloads
25 pinned source repositories, installs its own Kujo binary, and configures this
project. Internet access is required during installation. It can take several
minutes. npm publication is pending; **the registry package name is not yet an
available install route**. A maintainer creates the tarball with `npm ci && npm pack`.
Users with access to the private repository can instead install directly:

```sh
npm install --global 'git+ssh://git@github.com/kujolang/kujo-opencode.git#codex/opencode-ability-integration' && kujo-opencode setup
```

For a temporary package invocation, `npm exec --yes --package=/path/to/package.tgz
-- kujo-opencode setup` also works. Repeat that prefix for later CLI commands,
or install globally for convenient maintenance commands.

```sh
kujo-opencode doctor
kujo-opencode demo
opencode
```

In OpenCode, type **`/kujo`**. It explains the available capabilities, runs a
repository readiness scan, and suggests a next step. **`/kujo-review`** reviews
changes; **`/kujo-doctor`** helps diagnose setup. The demo runs a real read-only
ShipCheck scan and shows its receipt; it requires no model or API key. A successful
scan is evidence gathering, not a claim that the repository is ready to ship.
Scout's deeper repository map writes artifacts and therefore needs approval.

Setup safely merges the Kujo server into existing project JSON or JSONC,
including root-level configs, preserving comments, models, permissions, and other
servers. It refuses malformed configs, conflicting Kujo definitions, and unowned
assets. It adds project skills, three commands, and `.kujo/opencode.json`.
Repeated setup retains your selected profile and overrides.

## Choose what OpenCode can use

```sh
kujo-opencode profiles
kujo-opencode profile review
kujo-opencode enable lens
kujo-opencode disable kujo_lens_page_check
kujo-opencode abilities
```

| Profile | Tools | Intended use |
| --- | ---: | --- |
| `essentials` | 5 | Understand a repository and its changes |
| `review` | 18 | Check architecture, contracts, context, and change footprint |
| `ship` | 29 | Run verification and retain release evidence |
| `full` | 38 | Add orchestration, RAG, and optional service tools |

`enable` and `disable` accept a product name, a tool name, or the canonical Ability
ID. Product names select all of that product's supported operations. Canonical
profile IDs remain supported. Explicit overrides survive profile changes and
upgrades. Restart OpenCode after changing tool exposure. Profiles grant no
authority; effectful operations still require approval.

The catalog covers Scout, Scent, PatchBrief, ChangeBucket, ShipCheck, Fence,
Spec, Eval, RunLedger, Dispatch, RAG, Watchdog, CaseFile, Concord, Muzzle,
Kennel, Redact, VersionSeal, PackWrite, Tribunal, Dossier, Howl, and Lens,
plus catalog discovery and receipts. See [the exact catalog](catalog/abilities.json)
for supported operations. This is not every feature of every Kujo product.

## Approve an operation

When an operation needs approval, OpenCode gives you a request ID. In your terminal:

```sh
kujo-opencode approve REQUEST_ID
```

You see the project, operation, effects, and exact input. Enter `y` to execute that
operation once, or press Enter to decline. No JSON assembly or token copying.
Requests expire after 15 minutes; changed definitions or disabled tools require a
new request. Canonical one-time approvals are still bound to identity, input,
invocation, and definition. Idempotency protects retries. OpenCode can inspect the
resulting receipt; it should not repeat a write with a new request.

Agents must never issue their own approvals. The friendly command requires an
interactive terminal and has no `--yes` bypass. The low-level explicit
`approve --ability ID --invocation ID --input JSON` remains for compatibility;
its caller remains responsible for obtaining human authorization.
OpenCode's own permission checks remain independent.

## Maintenance

- `status` shows the active installation; `doctor` reports readiness and fixes.
- Install the newer release package, then run `update` in each project. It keeps
  profiles, overrides, and receipts. Projects on 0.1.0 keep their prior projection.
- `recover` restores a source/runtime transaction interrupted by process death.
  It refuses to take over a live installer. Retry setup/update afterward.
- `repair` restores owned MCP, skill, and command projections.
- `uninstall` removes project integration and retains shared data. `--purge`
  deletes shared sources and receipts, affecting every configured project.
- `browser install` installs optional Lens Chromium prerequisites.
- `services start watchdog`, `services status watchdog`, and `services stop watchdog`
  manage the optional loopback service. Neither starts automatically.

Shared data lives in `~/.local/share/kujo/opencode`, or `KUJO_OPENCODE_HOME`.
CMD and Pi state remain separate. Watchdog and RunLedger are explicit tools;
automatic host lifecycle hooks and agent projections are not included.

## Development and verification

```sh
npm ci
npm test
npm run test:e2e
npm run test:fresh
npm run test:opencode -- --project /path/to/configured/project
```

The fresh gate packs the release, installs it through npm in an empty home and
prefix, acquires the real pinned sources, executes a demo and packaged MCP server,
and upgrades the actual 0.1.0 tarball while retaining another older project.
It requires network access and retains its temporary directory for inspection.
The host check uses a private loopback OpenCode server without a model request.

For development, `setup --source-root /absolute/path/to/kujo-repos` uses local
checkouts, trusting their contents rather than claiming pinned revisions.
`KUJO_BIN` selects an existing runtime. Public setup needs neither override.

See [verification](docs/VERIFICATION.md), [provenance](docs/PROVENANCE.md),
[security](SECURITY.md), and the official OpenCode 2
[commands](https://opencode.ai/v2/docs/commands/),
[MCP](https://opencode.ai/v2/docs/mcp-servers/), and
[skills](https://opencode.ai/v2/docs/skills/) documentation.
