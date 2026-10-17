# OpenCode walkthrough

A recorded OpenCode session builds a small Kujo status report, then inspects, runs, tests and reviews it. The [transcript](transcript.md) follows the actual results. The [demo source](demo/) includes all five interpreter fixtures and their expected output.

The 2:25 narrated edit pairs a shorter, conversational script with Siren's voice. It keeps short pauses to read code, approvals and results. A three-second Kujo/OpenCode glitch intro leads in, and a five-second outro closes the video. The intro reads “Trust at the Speed of AI.” The outro shows and speaks “Kujo, trust at the speed of AI.” The bumper footers are removed from the posting copy. Both bumpers use the official SVG wordmark from [OpenCode’s brand assets](https://opencode.ai/brand). See [production evidence](production-evidence.json) for the current duration and export hashes.

## What the recording shows

OpenCode's regular Build agent writes the code. Kujo specialists use Scout and Scent for context, inspect and format the source, preview and approve execution, run five passing interpreter fixtures, then review the diff with PatchBrief and ChangeBucket. Receipts preserve the results. The operator marks new files for Git's diff view outside OpenCode; the edit discloses that step.

The report prints four checks, three passes and one failure: docs. Review finds a real remaining gap: helper tests cover invalid data, but a command-line negative test has not yet established the error text and nonzero exit code. This demonstration does not establish release readiness or replace final npm acceptance.

## Production evidence

The local production folder is `video-productions/opencode-kujo-walkthrough` beside `kujo-repos` in the Kujolang workspace. Large media stay outside this repository.

- Narrated video: `output/kujo-opencode-walkthrough-1080p.mp4` (`draft.mp4` is the same candidate).
- Phone copy: `output/kujo-opencode-walkthrough-480p.mp4` (854×480).
- Full terminal recording: `assets/captured/session/full-session-realtime.mp4` (13:38.5).
- Timestamped terminal capture: `assets/captured/session/full-session.cast`.
- Downloadable source: `output/status-summary-demo.zip`.
- Editable composition: `production/hyperframes/index.html`.
- Exact cuts and revision record: `production/edit-plan.json` and `production/revision-record.json`.
- Export checks and independent review: `review/`.

The recording preserves actual OpenCode terminal output, replayed from a timestamped PTY capture and sampled at two frames per second. The edit labels shortened waits and the generated source-file card. It uses a developer-source installation of the release candidate with OpenCode 2.0.32 and the authorized ChatGPT provider; it is not a fresh installation of a published npm package.

The current edit uses Siren with ElevenLabs `eleven_v4`. The script uses short, conversational lines tied to the recorded actions. Nine new segments, including the send-off, total 116.08 seconds of speech and used 832 included credits. Siren's voice ID was verified against the user's earlier Kujo homepage video. No voice clone was created. The prior Brian recordings remain in the production history; all synthesis across both versions used 1,916 observed credits. No retries or overage were used for the Siren revision.

Original audio, provider receipts and the script remain in the production folder. The earlier Brian version encountered an optional alignment-validation failure; its existing audio was recovered without another synthesis request. The Siren version uses standard speech generation without alignment. The Kujo logo, licensed font and bumper sting come from the user's earlier videos.

The export uses a streaming FFmpeg edit to keep disk use low. Its HyperFrames composition passed runtime, layout and contrast checks with one timeline-organization warning. Technical audio checks are separate from listening review; see the exact-candidate review record before publication. No video upload or npm publication was performed.
