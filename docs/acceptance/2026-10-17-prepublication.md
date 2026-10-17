# Prepublication check — 2026-10-17

**Not ready to publish.** No npm package, version tag or GitHub release was created.
This record supersedes earlier descriptions of the remaining release work, without
changing the scope of earlier passing evidence.

## What changed

The README now gives a short path from installation to a verified operation.
The user guide holds detailed workflows. Documentation uses plain, direct prose,
explains the ChatGPT sign-in path and separates historical results from current
release requirements. Source provenance, platform limits and release instructions
remain explicit.

Windows fixes cover project paths, npm invocation, tar extraction, source line
endings and Git long paths. Source settings apply to managed clones only. The
adapter still delegates canonical product work; it does not replace MCP generation.
Commits `cc17509`, `ab00431`, `46d90f6` and `85fb996` contain those changes.
Later commits add bounded specialist subsets and retained Windows diagnostics.

## Verification

- The final local unit run passed all 237 tests with no skips. Earlier real-source
  end-to-end tests passed; they do not certify the later archive.
- Node 20/22 package CI and fresh installation passed on Linux, macOS and Windows
  in [run 39046501980](https://github.com/kujolang/kujo-opencode/actions/runs/39046501980).
- Candidate [run 39046510987](https://github.com/kujolang/kujo-opencode/actions/runs/39046510987)
  succeeded at `ff9f142dff4a8eb4578106215e137cf21347dc2b`. Its SHA-256 is
  `d4c655e5bf1d464387bd2ef940d6c6cf76cb395f002a75dbf753fdfd584d5d71`.
- The [host matrix](https://github.com/kujolang/kujo-opencode/actions/runs/39046725834)
  passed all four Linux/macOS minimum/latest jobs. Both Windows jobs failed.
- [Windows diagnostics](https://github.com/kujolang/kujo-opencode/actions/runs/39047850430)
  passed rendered 80×24 ConPTY onboarding and ledger approvals on OpenCode 2.0.31
  and 2.0.32. Both native-management tests failed to observe a required session
  ledger approval. The hosts had no recorded exit code or signal; a crash is not
  established. The separate harness commit is `42e6126`.

The [structured record](2026-10-17-prepublication.json) preserves candidate payload
hashes, partial specialist reports and receipts. With ChatGPT on OpenCode 2.0.32,
Understand, Build, Review and Browser passed against this archive. One attempt
stopped when Review invoked an additional unrequested read-only operation. A
fresh Review session passed. The next attempt stopped when Workflow timed out
waiting for a canonical receipt after checkpoint rejection. Ship was not reached.
Neither partial fixture is recorded as a complete pass.

All six specialists passed against the earlier archive with SHA-256
`52155c8dc3be95e2fcbd71d92bd00f4655336474f3188e458e6e520f1fe941d5`:
49 operation checks and six reports. That result does not transfer to changed bytes.
A disk-space failure and a source-download timeout occurred before inference in
separate attempts. Their logs remain local; neither counts as a provider failure.

## Remaining gates

1. Fix canonical MCP generation on Windows, update the reviewed source pin and
   rerun fresh-install/upgrade. Pin `c6b2b17a65f66e4096cd4b68bc89b1a3fe352a46`
   fails when directory creation receives mixed separators under a Windows
   extended path (`os error 123`). No upstream or Kujo core change was made here.
2. Resolve the Windows native-management approval failure. Distinguish RPC
   behavior from harness timing; keep the approval requirement intact.
3. Complete Workflow and Ship on the final archive and retain failed attempts.
   Complete final-archive lifecycle, outage/reload, guard and cancellation evidence,
   then pass the full release gate. Rebuild and retest when packaged bytes change.
4. At the desk, establish npm publishing access and the first-package/trusted
   publisher path. The protected `npm-release` environment requires review by
   `robertdevore`, prevents self-review and disallows administrator bypass. A run
   initiated by that account needs another eligible reviewer or another maintainer
   to initiate it. Keep the protection enabled.
5. After acceptance and publication approval, follow [the release procedure](../RELEASING.md).
   Verify registry consumer install/upgrade, integrity and provenance before
   recording a public launch demo. A preview may show the verified macOS workflow
   if it clearly identifies the package as a candidate.

The requested free providers remain unverified after their earlier HTTP 403
responses. ChatGPT provides the tested account path, not proof that those free
providers now work.

## Retained findings

SignalBox contains two open findings, each verified by exact ID and concept search:

| Finding | Capture | Signal |
| --- | --- | --- |
| Canonical Windows MCP generation | `cap_24f8faf8-5047-4c25-9ad1-8a5aa967f511` | `sig_69e7cbb4-5f09-401f-95c3-3d7dc5df5ca3` |
| Windows native ledger approval gate | `cap_210d68ea-d2d1-40f7-8583-b9b6375bab07` | `sig_0ef23ea9-07d4-4632-92af-0555e483163a` |

No duplicate was added. Routine fixes, passing tests and implementation summaries
were rejected as SignalBox captures. The existing free-provider finding was not
duplicated. The Strata handoff is note `1bca6881-719a-4e15-b140-12402af46564`.
