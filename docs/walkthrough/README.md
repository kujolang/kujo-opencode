# OpenCode walkthrough production plan

Status: planned, not recorded. This is a production handoff, not product verification or a finished demo.

The walkthrough will build a small Kujo status report in OpenCode and show source checks, reviewed execution, tests, change review and receipts. Preserve the full recording; derive the narrated edit from actual results. The [narration](transcript.md) is provisional and must match the capture before speech generation.

The first preflight on 2026-10-17 found less than 450 MiB free on the recording machine and no external volume. Recording and rendering await sufficient space (allow at least 5 GB for working media). HyperFrames 0.8.166, FFmpeg and ffprobe are installed. The skill refresh was stopped to avoid exhausting disk space; retry it before composition. No footage, speech or render was produced.

ElevenLabs authentication passed. The requested v4 model is documented by [ElevenLabs](https://elevenlabs.io/text-to-speech-api). A v4 speech request has not yet been tested. Use the existing account through the shared VideoOps adapter; confirm voice, current allowance and request bounds before generation. Do not substitute another model silently.

Resume with the [capture prompts](demo-prompts.md) and [creative brief](creative-brief.md). Confirm the current release candidate, capture real tool results, reconcile the narration, generate v4 speech, edit, and run technical checks plus independent visual and audio review. No npm publication or video upload is part of this work.
