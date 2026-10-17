# A small script, with evidence

Build a local status-summary script: read `checks.json`, count passed and failed checks, then print each failed check. A four-row fixture makes the result easy to verify by eye. This is a useful miniature of a build report, without network access, credentials or a server.

Target: four minutes, 1080p/30. The complete raw recording remains available. The edit follows one chain: inspect the task, write the code, check it, review the exact run, run the tests, review the change, inspect receipts. Keep meaningful approvals visible. Compress waiting only with an explicit label.

The important distinction is visible: ordinary OpenCode Build writes arbitrary custom source. Kujo Build is a restricted specialist for checks and reviewed execution. Never imply that the restricted specialist wrote files with unavailable tools. Use Understand and Review for their own scopes; profiles and specialist choice are separate controls.

Show eight named tools where useful: Scout, source inspect, source format, source preview, source execute, PatchBrief, ChangeBucket and receipt inspection. Preview/execute covers both program and tests. No artificial browser, deployment or workflow segment: this program does not need those.

Success means the recorded script prints the independently expected totals, tests cover mixed/all-pass/empty/malformed input, and review tools show the actual tracked changes. Failures remain in raw footage and produce honest revisions. If tools fail, the narration reports that outcome. No predicted PASS may become voiceover before capture.

Preproduction: an isolated git repository with a tracked fixture, README task description, minimal unimplemented tracked `main.kujo` and tracked test placeholders. Record its baseline commit and mark it as prepared demo scaffolding. Do not stage user files or reuse unrelated receipts. Expected mixed output: `Checks: 4`, `Passed: 3`, `Failed: 1`, `FAIL: docs`. Use integers and strings, no timestamps. Include every input/import/expected-output file in reviewed snapshots. Keep malformed-input handling simple and explicit.

Execution prompts and expected evidence are in `demo-prompts.md`. Provisional transcript must be rewritten against the actual capture. Claims are grounded in `intake/references.md`; exact source references and observed output must survive the edit.

Planning attempt 1. Logical profile: economical-general; runtime model inherited from parent, provider usage/cost not supplied. This file is human-readable planning, not executed product acceptance. External reference research unavailable and unnecessary for this first-party walkthrough. No media acquired/generated/rendered.
