# Provisional narration — do not generate yet

Written with the Orwell skill. Reconcile every line with captured results and offsets before speech generation. The numerical result in s05 is an expected target, not verified output. Keep a useful portion of each segment silent so viewers can read the actual UI. Target 240 seconds; no music.

## s01 · 0–15s · The task

Voiceover: We’ll use OpenCode to build a small Kujo script. It reads four check results and gives us a short report. Then we’ll inspect the code, run it, test it, and review what changed.

Screen: Live project and task fixture.

## s02 · 15–42s · Understand the input

Voiceover: First, I ask Scout to inspect the project. The input has a name and a status for each check. Three pass and one fails. Those numbers give us a result we can verify ourselves. Scout writes a local report, so we review that request before it runs.

Screen: Kujo menu, Understand, real Scout request and approval.

## s03 · 42–92s · Write the custom program

Voiceover: Now I switch to OpenCode’s regular Build agent to write the program. Kujo’s Build specialist has a narrower job: it checks source and runs reviewed files. The program counts the results and lists failed checks in order. We also ask for tests: mixed results, all checks passing, an empty list, and bad input.

Screen: Ordinary OpenCode Build prompt and actual edits; code visible.

## s04 · 92–118s · Inspect before running

Voiceover: Next, Kujo checks the source and previews its formatting. These checks help us catch source problems, but they do not prove the program works. We still need to run it with the input we reviewed.

Screen: Kujo Build source diagnostics and formatting preview.

## s05 · 118–153s · Approve the exact run

Voiceover: The run preview lists the source and input files and records their digests. We inspect the command and approve that exact request. Kujo runs a copy of those reviewed files. We compare its output with our fixture: four checks, three passed, and one failed. The failed check should be docs.

Screen: Actual preview manifest, approval, result.

## s06 · 153–185s · Test the behavior

Voiceover: We use the same review process for the tests. The expected output is included before execution; the tool does not rewrite it to make a test pass. Here we compare the actual results with the cases we asked for. Any failure needs a fix and a fresh preview.

Screen: Actual test preview, approval and test output.

## s07 · 185–218s · Review the change

Voiceover: Now we switch to Review. PatchBrief summarizes the diff. ChangeBucket measures its size. These reports help us see whether a small task stayed small, and which files deserve a closer look. They support our review; they do not replace it.

Screen: Review specialist PatchBrief and ChangeBucket real output.

## s08 · 218–240s · Inspect retained evidence

Voiceover: The receipts keep the command, output, and artifact locations together. We can return to the result after the chat moves on. This is Kujo OpenCode’s release candidate. The script, tests, and full recording accompany this walkthrough so you can inspect what happened.

Screen: Evidence history with actual receipt; close on finished source.
