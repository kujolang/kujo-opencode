# Kujo OpenCode 0.2.0 verification

Verified on macOS on 2026-10-16 with Node 26.7.0 and OpenCode 2.0.31.

- `npm test`: 22 passing offline contracts covering policy, approvals, idempotency,
  bounded output, path containment, setup, JSONC preservation, conflicting config,
  friendly aliases, repeated setup, and release contents.
- `npm run test:e2e`: real Kujo operations, MCP discovery, approval requests,
  canonical approval execution, concurrency, restart and receipt evidence passed.
- `npm run test:fresh`: actual packed 0.1.0 -> 0.2.0 upgrade and independent clean
  0.2.0 install passed in isolated HOME/XDG/npm prefix/cache. Neither used local
  sibling sources nor KUJO_BIN. All 25 sources came from their pinned Git commits.
  The packaged runtime executed the repository demo and exposed five MCP tools.
  Upgrade preserved profile, disabled capabilities, prior receipts, and a second
  project still running its original 0.1.0 projection.
- Real OpenCode MCP connection passed. `/api/command` discovered `kujo`,
  `kujo-review`, and `kujo-doctor`. No model call was needed for these host checks.
- The workstation's full-profile `doctor` passed all 31 checks, including optional
  Lens readiness. Browser installation remains opt-in for fresh installs.
- The canonical generated Ability runtime's adapted and upstream digests passed.

The fresh test retains its temporary root and prints it for inspection. CI now
runs the network fresh/upgrade gate on Linux in addition to the existing offline
Node 20/22 Linux/macOS/Windows matrix. Remote CI results are separate from these
local results; the matrix was not run locally.

The one-paste tarball installation is verified. Direct Git installation requires
access to the private repository. Public npm publication is still blocked by
unavailable registry authentication; no published package or public release is
claimed. No OpenCode 1 support or automatic host lifecycle hooks are claimed.

Commands use the documented OpenCode 2 Markdown command format:
https://opencode.ai/v2/docs/commands/
