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


## Rendered terminal acceptance (POSIX)

This optional gate launches a private OpenCode TUI in a real PTY, drives keyboard
navigation, and uses pyte to inspect the rendered screen. It creates its own Git
project and Kujo data root, using sibling canonical source checkouts. Default and --ledger modes do not
send a model prompt. By default it rejects the profile request; --ledger also
explicitly approves only the disposable fixture’s Ship profile, session start
and human-selected partial finish through the real keyboard permission UI. It retains text screen snapshots and
verification.json in its printed temporary directory, and stops its own terminal.
It does not certify Windows or all terminal emulators.

```sh
python3 -m venv /tmp/kujo-tui-env
/tmp/kujo-tui-env/bin/pip install -r tests/requirements-tui.txt
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py --columns 120 --rows 40
```

The gate covers slash discovery, status, installation details, home-screen session
creation, profile selection and keyboard rejection (with unchanged configuration), capability discovery, browser readiness,
session RunLedger, lifecycle controls and session-scoped empty evidence. Host
approval and completion interactions remain covered separately by test:native;
the --ledger variant verifies rendered manual start/finish approval and canonical
record state before and after each grant. Use the explicit --automatic mode below for real-model automatic completion.

```sh
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py --ledger
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py --ledger --columns 120 --rows 40
```

Before pressing Enter on a permission, the harness verifies the selected choice's
rendered styling. It checks that choosing a verdict alone leaves the canonical
record in progress, and that the separate final grant produces `partial`.


The `--automatic` mode enables tracking through a separate native approval, sends
a real prompt using the visibly selected OpenCode GLM-5.3-Flash Free model, and
checks the automatic review popup, human verdict and separate final approval.
It refuses to send the prompt when that provider/model is not visibly selected.
`--ship` additionally switches to Ship readiness and requires a succeeded
canonical ShipCheck receipt attributed to that specialist. Provider rejection is
a failed specialist gate, even when the tracking popup itself works.

```sh
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py --automatic
OPENCODE_BIN=/path/to/opencode /tmp/kujo-tui-env/bin/python tests/tui-terminal.py --automatic --ship
```

Local OpenCode 2.0.31 evidence: automatic review and approved partial finish
passed at 80x24 in fixture r4g_9szc. The scoped Ship run in 0m4capoi failed with
the provider's free-tier client restriction and produced no successful scan
receipt. Ordinary Build inference succeeded; this is not evidence that all
OpenCode inference is unavailable. Six-specialist acceptance remains open.


## Canonical Leash acceptance

Build the canonical Leash Rust daemon separately, then run
`LEASH_TEST_BIN=/absolute/path/to/leashd node tests/leash-canonical.mjs`. This
starts a private loopback daemon with a disposable database, ephemeral credentials,
and notification providers and Dispatch callbacks disabled. It registers a fixture
device through the daemon API and checks canonical v2 ingestion, duplicate-event
reconciliation, invalid authentication and invalid-event rejection. No live
notification service is contacted. The process is stopped and credential config
removed; verification.json retains the binary digest without credentials.

Local daemon source56c59c90b81433482683e72a411748ca82a61b24 passed in TfrWT2;
binary SHA256 b79889ca39229684b7262e46f2382388b30191b26e4497989bc99100cb8758a9.
Transport tests separately verify canonical native approval binding, no network
before approval, idempotency replay, origin change refusal, cancellation, size
limits, redirect rejection and sanitised acknowledgements. This is not proof of
provider notification delivery, native rendered Leash approval or remote human
decision handling. Those operations are outside this local acceptance evidence.

## Canonical application gateway acceptance

`CMS_TEST_SOURCE=/absolute/path/to/cms node tests/gateway-canonical.mjs` starts
canonical CMS with a private database, an ephemeral fixture-only bootstrap token,
all connectors unconfigured and all writable application paths inside its temp
root. It executes the read-only site-info Ability and verifies its canonical
receipt. An attempted SEO operation remains `approval_required` even with its
legacy `confirmed` input set. The harness provisions a disposable draft, proves
its SEO is unchanged, issues a fixture-only application grant, then executes the
approved mutation. It verifies idempotent replay and changed-input rejection. Invalid bearer
authentication is rejected. The harness stops its own CMS process and retains
verification.json and the read receipt without the token.

Local Lo86Vk passed against CMS177f2a016861eb20ac46ba152b03d38b27d41732 and runtime
SHA256979d49503d71eb87e5696aea844a51e7129e23c89e36abc8e4d4378bc78985b5.
145 offline tests, canonical E2E, gateway contract tests, release-content checks
and actual OpenCode2.0.31 discovery of both gateway tools passed. These checks do
not establish a granted application mutation, rendered native gateway approval,
multitenant deployment certification or a supported OS/host release matrix.


Granted application mutation passed in canonical CMS fixture b91A5w. Before
approval and after grant issuance alone, SEO remained identical. The approved
call changed the fixture title; replay returned the same canonical receipt and
unchanged state. Different input could not reuse that key/grant. This supersedes
the earlier absence of granted application mutation evidence, not rendered
native approval acceptance. Retained evidence: /tmp/kujo-gateway-mutation.log.


Rendered terminal onboarding also covers External services from home, including
Leash JWT setup, gateway credentials, unchecked connection state and separate
approval guidance. OpenCode2.0.31 at80x24 passed in324whuzy with no inference or
approved effects. Screenshots are retained as leash-guidance.txt and
gateway-guidance.txt in that fixture. This verifies setup guidance, not rendered
service execution or notification delivery.


## Configured Watchdog reads

`WATCHDOG_TEST_SOURCE=/absolute/path/to/watchdog node tests/watchdog-read-canonical.mjs`
starts the existing private lifecycle fixture, writes one metadata-only event,
reconciles a simulated lost acknowledgement and reads it through
`kujo_watchdog_read` transport with a producer filter. Readiness and invalid-token
rejection are checked against the same canonical server. No provider is called.
Local fixture P3BjZT passed with one record and duplicate suppression. The unit
gate additionally covers origin/path escapes, proxy exclusion, credential
isolation, cancellation, redirects, response bounds and no automatic retry.
