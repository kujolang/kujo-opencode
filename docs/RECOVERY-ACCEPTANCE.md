# Recovery acceptance evidence

This maps the recovery requirement to observable behavior. It does not certify
other platforms or promise power-loss durability. The current release candidate
and test results are recorded in GOAL-HANDOFF.md; historical fixture names below
retain their original scope.

| Requirement | Evidence | Boundary |
| --- | --- | --- |
| Interrupted source/runtime installation | `tests/recovery.test.mjs` kills real child processes immediately after complete lock publication and between backup/activation; recovery restores old bytes and permits retry | Tests the transaction implementation called by installation, not a simulated filesystem power failure |
| Failed upgrades preserve a working project | `tests/mixed-version-acceptance.mjs` invokes the new CLI's update against a real 0.1.0 project with a missing source root, asserts failure and unchanged configs/READMEs, then executes canonical scans from both versions | Deterministic acquisition failure; later activation failures have separate transaction coverage |
| Rollback of project activation | `tests/project-activation.test.mjs` injects every backup/activation failure, kills a child process, restores old config/projections, and permits retry | Edited-after-crash files are preserved as conflicts, not overwritten |
| Concurrent setup and live-owner protection | Directory and project transaction tests reject competing writers and recovery while the owner is live; source/runtime owner journals are published atomically | Older ownerless legacy locks are deliberately retained for inspection |
| Multiple projects and versions | Actual versioned MCP execution before and after a third project's setup, repair and uninstall, with exact unchanged configuration/README checks | Covers 0.1.0 and 0.2.0, not arbitrary downgrade or every historical release |
| Lost acknowledgement | `tests/lifecycle-acceptance.mjs` lets canonical Watchdog accept a batch, discards its acknowledgement, restarts the outbox, and proves one canonical record after retry | Canonical telemetry deduplication, not a universal exactly-once guarantee for arbitrary application effects |
| Durable operation identity | Canonical E2E replays the same operation and project-scoped idempotency key across restart and verifies the original receipt; source execution and starter/build paths also reuse the original receipt | Reusing the canonical idempotency key with matching operation inputs is required; a new human-authorized operation may use a new key |
| Repair and uninstall | Packed CLI acceptance executes repair and uninstall against one project while old/current projects keep executing; project activation tests preserve unrelated files and external symlink targets | Normal uninstall does not purge shared runtime data |
| Cancelled pending effects | Actual native host fixture PJMFOf interrupts a pending RunLedger permission: no grant, no effect, no remaining permission, one canonical cancellation event | Exact invocation cleanup; host cleanup has a bounded deadline if disconnected |
| Service outage and host reload | Actual native fixture P0HmiB queues real tool metadata while Watchdog is down, survives host reload, then delivers without duplicate tool records | Recorded candidate revision and host version; no claim about untested remote deployments |

The checked-in tests and retained acceptance receipts support the local recovery
contracts. The remaining release work is to carry those contracts through the
supported OS/host matrix and public registry consumer flow, and to complete all
six scoped specialist journeys. Do not turn the documented legacy-lock conflict,
unsupported downgrade, or power-loss boundary into a passing claim.
