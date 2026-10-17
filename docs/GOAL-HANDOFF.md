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
fixture, RunLedger, knowledge and real Chromium/Lens checks. The fixture remains
installed under /var/folders/wb/0cck3lgd08n55g_8ly9qmf_00000gn/T/kujo-opencode-packed-6s1lnD.
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
- Complete the requirement-by-requirement recovery audit using the existing
  crash/concurrency/rollback tests and the new actual multi-project/version
  execution evidence. Do not repeat already-proved repair/uninstall scenarios
  without a concrete uncovered case.
- Supported OS/minimum-latest host matrix, protected publication, signed provenance
  and public registry install/upgrade. The candidate workflow only prepares/tests
  artifacts.
- External blocks rechecked this pass: npm whoami E401; GitHub run 38999467760
  (05ff64e) has no executed steps, annotation 117299127863 cites account payments
  or spending limit. Scoped Ship with GLM free again fails provider.auth HTTP403
  before execution (/tmp/kujo-specialist-ship-recheck.log). These do not prevent
  remaining local release-workflow implementation.

Strata Agent Notes handoff:1bca6881-719a-4e15-b140-12402af46564. Consult its latest
revision for active process handles; historical logs and earlier failure fixtures
are not passing evidence. No subagents have been authorized.
