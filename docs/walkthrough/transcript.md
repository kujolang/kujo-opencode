# Final narration — reconciled to the captured session

Written with the Orwell skill. Voice: Brian; use the producer-confirmed ElevenLabs model. “Koo-joe” is a speech-only pronunciation spelling; display the brand as **Kujo**. Narration is grounded in the receipts below, not the original predicted outcomes. No music under narration; the original Kujo sting plays in the intro and outro.

The revised walkthrough lasts 187 seconds: a 3-second branded intro, 179 seconds of recorded workflow, and a 5-second branded outro. The eight walkthrough voice segments are unchanged; a new spoken send-off closes the outro. Idle tails are shortened while approvals and results remain visible. Label shortened waiting, retain approvals, and disclose the operator's Git preparation. Do not label this script as release-ready: its CLI negative exit-code coverage remains open.

## s01 · 3–19 seconds

Let's build a small Kujo script in OpenCode. It reads check results from a JSON file, counts passes and failures, and lists the failed checks. We'll follow the code through inspection, execution, tests, and review.

Evidence: assets/captured/demo-project/checks.json.

## s02 · 19–40 seconds

We start with the Understand specialist. Scout maps the project, and Scent previews which files would fit a context pack. These results describe the project and file selection. They do not establish the contents of our input fixture. That distinction matters when we decide what the agent actually knows.

Evidence: receipt-932da13a-cd8a-4d10-b610-25bad102e9ab; receipt-9e110984-1319-44a7-8220-fab62b699424.

## s03 · 40–67.0 seconds

Now we switch to OpenCode's regular Build agent to write the custom code. It separates the summary logic from the command-line entry point and adds tests. The input has four checks. Three pass; docs fails. We want those totals and the failed name in a short, predictable report. This editing step uses OpenCode's normal tools.

Evidence: assets/captured/demo-project/main.kujo; assets/captured/demo-project/summary.kujo; assets/captured/session/full-session.cast.

## s04 · 67.0–84.0 seconds

Kujo Build takes over for verification. Source inspection passes for the entry point and its helper. The formatting preview proposes no changes. These are source checks. We still need to run the program and compare its output with the input.

Evidence: receipt-71223449-cb27-4dfd-aba0-2471ca9b68cb; receipt-65d84347-4d20-41ee-8abe-732f4542a926; receipt-b48436a8-9250-4fa2-bd4d-075612ec4cba.

## s05 · 84.0–111.0 seconds

The run preview includes both source files and the JSON input. We review the exact files, command, and effects before approving execution. The program then runs from that reviewed snapshot. The result matches: four checks, three passed, one failed, and docs named below. The snapshot records what ran; it is not an operating-system sandbox.

Evidence: receipt-fd37fd9f-b1ff-4fe4-ad07-17ee67835bf3; receipt-0260ba05-137f-4ebf-857e-176c282f9bb7; assets/captured/session/run-result.png.

## s06 · 111.0–134.0 seconds

Next, we preview and approve the interpreter tests, including their expected output. All five fixtures pass, with no expected-output updates. They cover mixed results, all-pass and empty inputs, plus malformed and invalid data through the summary helper. That gives us useful evidence, while leaving one gap for review.

Evidence: receipt-271d2009-83e1-421d-bfa8-06e1cb65d2c2; receipt-c4a36ca2-77ef-4bb8-ad12-ab81a6f21508; assets/captured/session/test-result.png.

## s07 · 134.0–160.0 seconds

Before review, I mark the new files for Git's diff view outside OpenCode. PatchBrief summarizes the change; ChangeBucket counts twelve files, one hundred twenty-four additions, and two deletions. The reviewer spots the gap: helper tests cover bad input, but no command-line test proves the error message and nonzero exit code. We keep that finding open.

Evidence: assets/captured/session/operator-housekeeping.json; receipt-a707cd42-462b-43ba-a975-c70c948e26c3; receipt-05f58aee-80ac-43d9-bc63-8b816a7f8623; assets/captured/session/review-result.png.

## s08 · 160.0–182.0 seconds

Finally, we inspect the receipts for the successful run and tests. They retain the results and artifact locations. This is Kujo OpenCode's release candidate, shown in a real session: code written, checks run, and a remaining test gap made visible. The full recording preserves the workflow behind this walkthrough.

Evidence: assets/captured/session/current.txt; assets/captured/kujo-home/receipts.jsonl.

## Spoken outro · 183–186.36 seconds

Kujo, trust at the speed of AI.

Evidence: assets/generated/outro-delivery.json; media/narration-outro-v4-audio-001/result.json. Brian, ElevenLabs V4. Screen text matches this line; the speech input uses the established Koo-joe pronunciation spelling.
