# Active Kujo OpenCode parity goal

The full seven-outcome contract in PRODUCTION-READINESS.md remains active.
Do not substitute tool counts, fixture-only tests or local macOS acceptance for
live specialist, supported host/platform and public release acceptance.

## Earlier package evidence

Source candidate:752c40947d69f5f3419c6eb847e1ae5f72b43d67.
Bundle:/tmp/kujo-release-snapshot-JGfXtD/candidate.
Archive SHA256:0a32d8ccf90ebaadc0c9d4462e84f9f899f1b3cd5d626793b3198abf2e1cffca.

Fixture6s1lnD passed the exact archive's fresh installation and real0.1.0 upgrade,
older-project retention,28pinned sources, four starters/services, Agents SDK
fixture, RunLedger, knowledge and real Chromium/Lens checks. The fixture evidence remains
under /var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-opencode-packed-6s1lnD.
OpenCode2.0.31 discovery passed against its fresh project. Logs:
/tmp/kujo-release-snapshot-{fresh,host}.log. Its verification.json records the
candidate commit/hash/integrity. The candidate's manifest remains immutable and
acceptance-pending; this evidence is local, not a complete release certification.

## Live failure-guard acceptance

`KUJO_TEST_GUARD=1 KUJO_TEST_MODEL=opencode/glm-5.3-flash-free
OPENCODE_BIN=/Users/robertdevore/.opencode/bin/opencode npm run test:native`
passed with the ordinary Build agent in fixtureXpd3k2. Three deliberately failed
canonical ShipCheck calls produced exactly one native pause and the non-resuming
notice. There were exactly three failed receipts, no successful operation, no
approval and no telemetry enablement. Normal native read, rejected write and
once-approved write also passed. This closes the live guard-intervention gap;
it does not establish scoped Ship specialist success.

The fixture retains failure-guard-evidence.json, verification.json and
candidate-verification.json under /var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-native-host-Xpd3k2.
All68 installed runtime payload files match the candidate above. Host and native
runtime hashes are recorded; this was macOS26.6.2 x86_64/OpenCode2.0.31.
Logs:/tmp/kujo-native-live-guard.log, /tmp/kujo-native-guard-candidate-proof.log
and /tmp/kujo-native-guard-discovery.log.

## Live telemetry, service recovery and opt-out

`KUJO_TEST_TELEMETRY=1` with the same explicit free model passed inP0HmiB.
A separately approved session RunLedger start and correlation link preceded two
real ShipCheck calls. Canonical Watchdog received session/agent/tool-call/receipt,
model/provider and run/trace metadata, with empty content. The second call ran
while the private Watchdog service was down. Queued events survived a real host
plugin unload/reload and arrived after service restart with no duplicate tool
records and zero discarded events. The queue delivered32records;31belonged to
the target session. Explicitly disabling telemetry suppressed delivery during a
subsequent observed model response. The run remained in_progress throughout.

Canonical Watchdog source9e82e8f5b05edca948f6a432ae517031388296e6 was clean;
exporters were disabled, credentials stayed in memory, and DB/config paths were
private fixture files. telemetry-evidence.json, verification.json and
candidate-verification.json remain under
/var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-native-host-P0HmiB.
All68runtime payload files match the same candidate. Logs:
/tmp/kujo-native-live-telemetry-final.log, /tmp/kujo-telemetry-candidate-proof.log,
/tmp/kujo-native-telemetry-host.log and /tmp/kujo-native-telemetry-{all,e2e}.log.
172offline tests and canonicalE2E passed. Earlier6VeFi2 failed because prompt
acknowledgement preceded tool execution; the harness now waits for the receipt
and the documented host idle endpoint. R1hwDP established initial recovery;
P0HmiB adds explicit post-opt-out assistant observation and source hashes.

## Cancellation and mixed-version acceptance

31346d9 clears only the exact owned native permission after tool cancellation,
using a bounded reject-only cleanup. It never grants a permission. OpenCode
2.0.31 with explicit opencode/glm-5.3-flash-free ordinary Build passed in PJMFOf:
no effect, no approval, zero pending permissions, and one metadata-only canonical
Watchdog cancellation event. 175 offline tests, canonical E2E and isolated host
discovery pass. Logs: /tmp/kujo-cancellation-{all,e2e,host}.log and
/tmp/kujo-native-cancellation-scoped.log. The fixture retains cancellation-evidence,
verification and candidate-verification JSON. All 69 runtime payload files match
new candidate /tmp/kujo-cancellation-candidate, source 31346d9,
SHA256 22828c2a9efe33e714a4f1b95235b5e75544c7a6b7e9c8d02edb2509aa7cf884.
This supersedes the earlier candidate for current executable bytes. The complete
fresh-install/actual 0.1.0 upgrade gate passed in OcFOAs with 28 pinned sources,
mixed-version repair/uninstall execution, four starters/services, Agents SDK,
RunLedger, knowledge and real Chromium/Lens. /tmp/kujo-cancellation-fresh.log and
OcFOAs/verification.json record the exact commit/hash/integrity. Its generated
workdirs were cleaned by the successful gate; tarballs and proof remain. Prior
candidate evidence remains historical. release:verify passed for the new bundle.

The earlier XGHjhh check incorrectly rejected a successful native discovery call
that preceded the pending write. The corrected assertion uses the exact pending
tool-call ID. IzUkG8 exposed the real stale-permission defect before cleanup was
implemented. Neither failed fixture counts as accepted cancellation evidence.

1b34eaa adds real 0.1.0 and 0.2.0 MCP execution before and after a third project's
repair and uninstall, with unchanged other-project configs and READMEs. The
standalone check passed on retained packed fixture 6s1lnD; proof is
mixed-version-verification.json and /tmp/kujo-mixed-version-integrated-check.log.
It is now wired into the full fresh-install gate before switching data roots.
The additional failed-upgrade case in d8ad6e0 uses the actual new CLI with an
empty source root, then verifies both versions still execute and other configs
remain unchanged. This also passed after installing the new candidate into the
retained fixture's prefix: /tmp/kujo-mixed-candidate-final.log (uOWsWP). The full
fresh gate started before this additional case; its mixed-version checks cover
repair/uninstall, while this separate run supplies failed-upgrade evidence.

## Next acceptance work

- Carry the new candidate through the remaining live specialist/platform/release
  gates. Its full local install/upgrade gate has passed. Delivery,
  service outage, host reload, opt-out, cancellation and live failure intervention
  now have actual host evidence at their recorded payload revisions. Preserve
  those scopes; earlier candidate bytes do not certify the cancellation fix.
- All six scoped specialist workflows. Free-provider scoped Ship attempts fail
  with provider.auth403; ordinary Build succeeds. Do not spoof provider clients,
  rewrite agent identities to evade restrictions or silently use a paid fallback.
- Local recovery requirement audit is in RECOVERY-ACCEPTANCE.md. Preserve its
  scoped evidence and boundaries; remaining platform certification is separate.
- Supported OS/minimum-latest host matrix, protected publication execution,
  signed provenance and public registry install/upgrade. The new publish workflow
  is implemented but has not executed or certified any release.
- External blocks rechecked this pass: npm whoami E401; GitHub run 38999467760
  (05ff64e) has no executed steps, annotation 117299127863 cites account payments
  or spending limit. Scoped Ship with GLM free again fails provider.auth HTTP403
  before execution (/tmp/kujo-specialist-ship-recheck.log). These do not prevent
  remaining evidence collection; release-workflow implementation is now prepared.

Strata Agent Notes handoff:1bca6881-719a-4e15-b140-12402af46564. Consult its latest
revision for active process handles; historical logs and earlier failure fixtures
are not passing evidence. No subagents have been authorized.

## Protected publication preparation (2026-10-17)

1202163 adds release identity/evidence validation; 4feac59 adds a tag-only manual
publication workflow and registry consumer mode. The gate binds a successful
candidate workflow, exact source/tag/archive, public repository, protected
npm-release environment, six product requirements, six specialists and all
minimum/latest host-platform entries. Evidence URLs are human-review pointers,
not automatic proof of their contents. No passing report has been invented.
The workflow repeats checks after environment approval, publishes the same archive
with OIDC provenance, verifies registry integrity/provenance/signatures, runs the
registry consumer fresh-install/upgrade gate, then creates the matching release.
An existing identical npm version can resume verification without republishing.
Candidate artifacts and acceptance evidence now upload separately.

178 offline tests pass; actionlint v1.7.12, embedded JavaScript and shell syntax
checks pass. Logs /tmp/kujo-publication-all-final.log and
/tmp/kujo-publication-actionlint-final.log. There are no adapter/executor changes.
The new archive includes release scripts/documentation and changed package metadata,
so prior candidate digest must not be represented as its complete identity.
Current candidate /tmp/kujo-publication-candidate, source4feac59,
SHA256 e8937c2c1bd9971dbac327e171e940cc02ae794529e67229b1a20e1163a0ee25.
release:verify passed. The exact packed fresh-install/actual 0.1.0 upgrade gate
passed in QTRucG, including the newly integrated failed-upgrade, repair and uninstall
execution checks for both versions. It also passed 28 source pins, all four starter
services, Agents SDK, RunLedger, knowledge and actual Chromium/Lens acceptance.
/tmp/kujo-publication-fresh.log, QTRucG/verification.json and
mixed-version-verification.json retain proof; the test cleaned generated workdirs.
registry_consumer=false explicitly records that this was tarball acceptance,
not publication or registry consumer acceptance.

Authoritative repository API reports private=true and zero environments. Public
npm lookup returns E404 (not publicly available; it does not distinguish absent
from inaccessible private state). No repository visibility, environment, npm
trust, tag, release or publication was changed. Account setup, CI billing and
remaining actual specialist/OS/host evidence still block end-to-end publication.
See RELEASING.md for the exact acceptance report and workflow contracts. No
workflow dispatch or registry consumer success is claimed by local structural tests.

Local Linux alternative checked: Docker CLI exists but docker info fails because
its daemon socket is absent; no container matrix was run. A user question is pending
about another already-authorized OpenCode provider for scoped specialist acceptance.
Do not choose a paid fallback without the user's answer. All local test processes
are terminal. No candidate/publish workflow was dispatched.

## Isolated minimum/latest v2 host acceptance (2026-10-17)

4b68316 adds verified official native host installation. The host-matrix workflow
now resolves @opencode/cli's v2 channel once and tests minimum2.0.31/latest on
Ubuntu glibc, macOS and Windows. It requires the exact successful candidate source
and archive, uses pinned source acquisition without sibling checkouts, and retains
host provenance plus native/payload evidence. The native harness automatically
writes verification.json and can install a candidate tarball with
KUJO_TEST_RELEASE_DIR. No adapter/executor code changed. 179 offline tests and
actionlint1.7.12 passed (/tmp/kujo-host-matrix-all.log and
/tmp/kujo-host-matrix-lint-final.log). See HOST-MATRIX.md for scope and commands.

Official v2 npm latest resolved2.0.32. General GitHub latest and opencode-ai npm
still selectedv1.19.3; do not use them for this matrix. The official v2 docs identify
@opencode/cli. Isolated baseline x64 binary installs passed SHA512/--version checks:
2.0.31 /tmp/kujo-isolated-host-2.0.31/bin/opencode, SHA256
b73356ad2368c54ea51b869032bc419c96faea18a41d0c0f427923bcf583f688;
2.0.32 /tmp/kujo-isolated-host-2.0.32/bin/opencode, SHA256
5de9ff73d2e46934371dd96c9f012be58b98fc0084f966e643fa89d3b6e69070.
Each directory has host-provenance.json. The user's global installation was not
replaced. Windows distribution is a standalone official native executable;
unsupported global Windows package-manager setup is not used.

The exact4feac59 candidate e8937c2c1bd9971dbac327e171e940cc02ae794529e67229b1a20e1163a0ee25
passed pinned-source native management/permission/RunLedger/knowledge/browser-control
acceptance on both macOS hosts: xOvc8l(2.0.31),mtXUxm(2.0.32). Both also passed
explicit test:opencode discovery and candidate-provenance comparison of all69
runtime payload files. ManifestSHA256
b0ba144fac730640cd891f9461abdccca88e188dee026facadd46faec3b141a4;
runtimeSHA256979d49503d71eb87e5696aea844a51e7129e23c89e36abc8e4d4378bc78985b5.
Logs /tmp/kujo-pinned-host-{minimum,latest}.log and
/tmp/kujo-host-{minimum,latest}-{discovery,candidate-proof}.log. Fixtures under
/var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/ retain verification and payload proof.
These runs made no model requests and do not constitute rendered TUI acceptance.
The matrix workflow itself has not executed; Linux/Windows remain unverified.

A separate pinned-candidate scoped Ship GLM-free test on2.0.32 still failed with
provider.auth HTTP403 before tool execution (/tmp/kujo-pinned-ship-latest.log).
Do not retry this unchanged provider/host combination without new evidence.
The user question about another already-authorized provider remains pending.
The following checkpoint completes exact-candidate rendered2.0.32 acceptance
for the onboarding/manual-ledger scope. Other rendered modes retain prior evidence. Continue
public release account setup and real CI/platform/specialist evidence when their
external prerequisites become available. The current new package metadata/test
installer are not identical to4feac59; final release still needs a newly built,
fully accepted immutable candidate. All test processes are terminal.

## Exact-candidate rendered POSIX acceptance (2026-10-17)

tests/tui-terminal.py now accepts --candidate, verifies the bundle before/after
acceptance, installs the archive with pinned sources, and automatically compares
the installed payload. A failed comparison leaves verification.ok=false. The
POSIX host-matrix jobs run this at80x24 with --ledger and retain rendered screens,
permission focus, verification and payload proof; Windows rendered UI remains open.
Python syntax and actionlint1.7.12 pass (/tmp/kujo-rendered-matrix-lint.log).

Actual macOS/OpenCode2.0.32 fixture1ipx7542 passed against exact4feac59 candidate
SHA256e8937c2c1bd9971dbac327e171e940cc02ae794529e67229b1a20e1163a0ee25:
rendered onboarding, service guidance, visibly selected Reject, unchanged profile,
manual RunLedger start and separate partial-finish approvals. No inference was
requested. All69payloadfiles match, manifestSHA256
b0ba144fac730640cd891f9461abdccca88e188dee026facadd46faec3b141a4.
Log:/tmp/kujo-rendered-candidate-latest.log. Fixture under
/var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-rendered-tui-1ipx7542
retains screens, canonical records, verification.json and candidate-verification.json.
The optional pinned Python environment is recorded in /tmp/kujo-rendered-python-path.
This scope does not include live specialist, automatic completion, gateway or Leash
execution on2.0.32; prior records for those modes keep their original versions.

Review of profile-denied.txt identifies a remaining usability issue: native Reject
currently produces “Kujo needs attention / RPC call failed” with conditional
permission guidance. It safely preserves configuration, but presents an intentional
decline as a technical failure. Next local work should distinguish confirmed native
rejection from genuine/unconfirmed RPC failures using supported request correlation;
do not mask all RPC failures as cancellation or infer a rejection from generic text.
The SDK permission.assert contract says plain rejection ends the current step and
must be rethrown for tools; preserve that behavior and never auto-approve.

Disk dropped to139MiB during setup. Generated copies from completed6s1lnD were
removed (npm cache, prefix node_modules, both runtime/source trees); its archives,
receipts and verification files remain, with cleanup-record.json. It is no longer
an installed executable fixture despite historical retention flags. Space recovered
to roughly576MiB. No user repository or active fixture was removed. All test and
cleanup processes are terminal. Provider-selection question remains unanswered;
full specialist/platform/publication gates remain open. No workflow was dispatched.

## Confirmed rejection feedback and current readiness (2026-10-17)

f465efb binds management feedback to a unique UI request marker, native permission
ID, session, action and workspace. A confirmed Reject displays Request declined;
unknown RPC failures remain failures. Profile, capability, lifecycle, session
RunLedger, browser and knowledge management preserve native assertions. No model
tool approval behavior changes. Navigation/unload invalidate feedback; delayed
permission events have a bounded 250ms reconciliation window. The marker is
correlation only, never a grant or idempotency key. The host rejects JSON Schema
patterns by default, so the optional marker uses supported string length bounds.

184 offline tests, canonical E2E and OpenCode2.0.32 discovery passed. Native fixture
BN2giV checks exact marker echo in actual management permissions; W0On0E passed
before that additional harness assertion. Actual 80x24 terminal fixture s7d2clh1
passed the explicit decline screen, unchanged rejected profile, onboarding and
separate manual RunLedger start/partial-finish approvals. No inference was requested.
Logs: /tmp/kujo-decline-all-accepted.log, /tmp/kujo-decline-e2e.log,
/tmp/kujo-decline-discovery.log, /tmp/kujo-decline-correlated-native.log and
/tmp/kujo-decline-rendered-corrected.log. Fixtures remain under the usual macOS
/var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T directory.

Earlier qweh2if4 displayed the decline correctly but failed later evidence browsing
because an overly broad edit referenced an undefined navigation epoch. Corrected
before f465efb; the full corrected test passed. The first native attempt rejected
the unsupported schema pattern. Neither failed attempt is accepted evidence.

PRODUCTION-READINESS.md now separates the unchanged seven-outcome completion
contract from current evidence gaps; chronological records moved to
ACCEPTANCE-HISTORY.md without deletion. Referenced evidence documents are included
in the package. Final candidate/platform/specialist/public-release gates remain
open. Prior completed 1ipx7542 and mtXUxm fixtures had only generated prefix modules,
runtime and source copies removed to recover disk space. Their receipts, screens,
verification and cleanup-record.json remain; they are evidence-only fixtures now.
