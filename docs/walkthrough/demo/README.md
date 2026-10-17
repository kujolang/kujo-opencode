# Status-summary walkthrough example

OpenCode wrote this small program during the recorded Kujo OpenCode walkthrough. Run it from this directory with `kujo run main.kujo --interpreter`. It reads `checks.json` and prints:

```text
Checks: 4
Passed: 3
Failed: 1
FAIL: docs
```

The captured Kujo source execution passed, and all five interpreter test fixtures matched their checked-in `.out` files. Source inspection reported no diagnostics; formatting proposed no changes.

The review left one gap open: negative cases test the helper, but do not prove the command-line error message and nonzero exit status end to end. This is a demonstration, not a release-readiness claim. The test results cover the interpreter, not VM parity.

Before change review, the operator used `git add -N` for new demo files so PatchBrief and ChangeBucket could include them. OpenCode authored the implementation. The prepared baseline and this Git housekeeping are separate from the model's edits.
