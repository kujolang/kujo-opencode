# ChatGPT specialist acceptance

All six scoped specialists passed on macOS x64, OpenCode 2.0.32, using
`openai/gpt-5.6-sol` through the user-authorized Sign in with ChatGPT connection.
No API key was imported. The exact package SHA-256 is
`4d0e350dab9d2c6a92113f764d1a09af8387464f9b3280b502322c56deacfda6`.

| Specialist | Substantive operation checks | Final report |
| --- | ---: | --- |
| Understand | 5 | Passed |
| Build | 8 | Passed |
| Review | 4 | Passed |
| Browser | 7 | Passed |
| Workflow | 17 | Passed |
| Ship | 8 | Passed |

The harness verifies the actual agent/model identity, exact approved inputs,
rejected/cancelled effects, expected failures, canonical artifacts, and report
citations against the corresponding session receipts. It never supplies the
report answers or reuses approval grants. Rejected operations use a bounded
read-only receipt query so evidence stays visible within host output limits.

[Machine-readable evidence](2026-10-17-chatgpt-specialists.json) retains session
IDs, receipt IDs, model-authored reports, fixture/log locations, candidate identity
and prior failed attempts. Thirty focused harness regressions pass. Runtime and
production permission behavior are unchanged by the harness corrections.

This verifies the requested ChatGPT testing path, not full release readiness.
No npm publication occurred. Windows compatibility failures, the rest of the
host/platform acceptance matrix, and registry publication/provenance remain
separate gates. The OpenCode free-model restricted-agent issue remains distinct.
