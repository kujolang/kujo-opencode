# Narration — Siren revision

Conversational rewrite using the Orwell writing skill. Voice: Siren; ElevenLabs V4. Display text uses Kujo; speech inputs use the established Koo-joe pronunciation. Runtime: 145 seconds. No music under narration; original sting in the bumpers. Claims remain grounded in the recorded session.

## s01 · 3–15 seconds

Let's build a Kujo script in OpenCode. We'll give it a JSON file with a few check results and have it count the passes, count the failures, and tell us what failed.

Evidence: assets/captured/demo-project/checks.json.

## s02 · 15–29 seconds

First, let's get a look at the project. Scout maps out the files, and Scent shows what would go into a context pack. That gives us a starting point before we ask OpenCode to write the script.

Evidence: receipt-932da13a-cd8a-4d10-b610-25bad102e9ab; receipt-9e110984-1319-44a7-8220-fab62b699424.

## s03 · 29–50 seconds

Now we switch to OpenCode's Build agent and ask it to write the code. It puts the summary logic in one file and the command-line entry point in another, then adds the tests. Our sample has four checks: three pass, and docs fails. That's what we should see when we run it.

Evidence: assets/captured/demo-project/main.kujo; assets/captured/demo-project/summary.kujo; assets/captured/session/full-session.cast.

## s04 · 50–63 seconds

The code's written. Let's check it with Kujo Build. Both source files pass inspection, and the formatting preview has nothing to change. Next, we'll run it against our sample data.

Evidence: receipt-71223449-cb27-4dfd-aba0-2471ca9b68cb; receipt-65d84347-4d20-41ee-8abe-732f4542a926; receipt-b48436a8-9250-4fa2-bd4d-075612ec4cba.

## s05 · 63–83 seconds

Before anything runs, we can see the source files, the input, and the command we're approving. Everything looks right, so let's run it. And there it is: four checks, three passed, one failed. Docs is the one that failed, just as we expected.

Evidence: receipt-fd37fd9f-b1ff-4fe4-ad07-17ee67835bf3; receipt-0260ba05-137f-4ebf-857e-176c282f9bb7; assets/captured/session/run-result.png.

## s06 · 83–102 seconds

Let's run the tests, too. We preview the files and expected output, then approve the run. All five pass. They cover mixed results, all passes, empty input, and bad data in the summary helper. None of the expected outputs needed to change.

Evidence: receipt-271d2009-83e1-421d-bfa8-06e1cb65d2c2; receipt-c4a36ca2-77ef-4bb8-ad12-ab81a6f21508; assets/captured/session/test-result.png.

## s07 · 102–123 seconds

Before the review, I mark the new files so Git includes them in the diff. PatchBrief summarizes the changes, and ChangeBucket counts them. The review catches something we still need: a command-line test for bad input. The helper tests pass, but we haven't checked the error message and exit code through the command line yet.

Evidence: assets/captured/session/operator-housekeeping.json; receipt-a707cd42-462b-43ba-a975-c70c948e26c3; receipt-05f58aee-80ac-43d9-bc63-8b816a7f8623; assets/captured/session/review-result.png.

## s08 · 123–140 seconds

We can also open the receipts to see what ran and where the results were saved. That's the walkthrough: write the script, check it, run the tests, and review the changes. We've got a working report and a clear next step from the review.

Evidence: assets/captured/session/current.txt; assets/captured/kujo-home/receipts.jsonl.

## outro · 140–145 seconds

Kujo, trust at the speed of AI.

Evidence: New Siren speech receipt; exact user-requested send-off.
