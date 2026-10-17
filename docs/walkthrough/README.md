# OpenCode walkthrough

A recorded OpenCode session builds a small Kujo status report, then inspects, runs, tests and reviews it. The [transcript](transcript.md) follows the actual results. The [demo source](demo/) includes all five interpreter fixtures and their expected output.

The narrated edit runs **3:05**. It removes 61 seconds of idle holds from the first four-minute edit and adds a three-second Kujo/OpenCode glitch bumper at each end. The eight ElevenLabs v4 voice segments remain intact. Short pauses preserve time to read code, approvals and results.

## What the recording shows

OpenCode's regular Build agent writes the code. Kujo specialists use Scout and Scent for context, inspect and format the source, preview and approve execution, run five passing interpreter fixtures, then review the diff with PatchBrief and ChangeBucket. Receipts preserve the results. The operator marks new files for Git's diff view outside OpenCode; the edit discloses that step.

The report prints four checks, three passes and one failure: docs. Review finds a real remaining gap: helper tests cover invalid data, but a command-line negative test has not yet established the error text and nonzero exit code. This demonstration does not establish release readiness or replace final npm acceptance.

## Production evidence

The local production folder is `video-productions/opencode-kujo-walkthrough` beside `kujo-repos` in the Kujolang workspace. Large media stay outside this repository.

- Narrated video: `output/draft.mp4`.
- Full terminal recording: `assets/captured/session/full-session-realtime.mp4` (13:38.5).
- Timestamped terminal capture: `assets/captured/session/full-session.cast`.
- Downloadable source: `output/status-summary-demo.zip`.
- Editable composition: `production/hyperframes/index.html`.
- Exact cuts and revision record: `production/edit-plan.json` and `production/revision-record.json`.
- Export checks and independent review: `review/`.

The recording preserves actual OpenCode terminal output, replayed from a timestamped PTY capture and sampled at two frames per second. The edit labels shortened waits and the generated source-file card. It uses a developer-source installation of the release candidate with OpenCode 2.0.32 and the authorized ChatGPT provider; it is not a fresh installation of a published npm package.

Brian narrates through ElevenLabs `eleven_v4`: eight synthesis requests used 1,069 included credits. The first returned valid audio but failed optional alignment validation; that same audio was recovered locally without another synthesis request. The other seven used standard speech generation. No replacement voice or model was used. The original Kujo logo, licensed font and bumper sting come from the user's earlier video assets.

The export uses a streaming FFmpeg edit to keep disk use low. Its HyperFrames composition passed runtime, layout and contrast checks with one timeline-organization warning. Technical audio checks are separate from listening review; see the exact-candidate review record before publication. No video upload or npm publication was performed.
