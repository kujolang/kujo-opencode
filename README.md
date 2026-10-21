# Kujo OpenCode

[![Version](https://img.shields.io/badge/version-0.2.1-black)](https://www.npmjs.com/package/@kujolang/kujo-opencode/v/0.2.1)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
[![built with Kujo](https://img.shields.io/badge/built%20with-Kujo-white.svg)](https://github.com/kujolang/kujo)
[![OpenCode](https://img.shields.io/badge/OpenCode-2-black)](https://opencode.ai/v2/docs/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-lightgrey)](https://nodejs.org/)

Run Kujo tools inside OpenCode 2. Inspect a repository, build and test Kujo programs,
review changes, check a browser workflow, and gather release evidence. OpenCode
handles your model account; Kujo runs tools locally and records their results.

All six specialists have passed with a connected ChatGPT account on macOS.
Native and rendered host checks passed on Linux, macOS and Windows with OpenCode
2.0.31 and 2.0.32. See [release readiness](docs/PRODUCTION-READINESS.md) for
the exact package identity, test scope and provider limits.

## Install

You need Node.js 20+, npm, Git and [OpenCode 2](https://opencode.ai/v2/docs/).
Install version 0.2.1 from npm, then configure your project:

```sh
npm install --global @kujolang/kujo-opencode@0.2.1
kujo-opencode setup
kujo-opencode doctor
kujo-opencode demo
opencode
```

You can also install the matching archive from the
[release page](https://github.com/kujolang/kujo-opencode/releases):

```sh
npm install --global /path/to/kujolang-kujo-opencode-0.2.1.tgz
```

Setup downloads 28 pinned repositories, installs the Kujo runtime and adds the
OpenCode integration to this project. Allow several minutes and enough disk
space for the sources and runtime. Setup needs internet access. You do not need
a global Kujo installation or a hosted Kujo service.

The demo runs a read-only ShipCheck scan and shows its receipt. It uses no model
or API key. A successful scan does not mean your project is ready to release.

The repository is public. To build a candidate yourself, clone it, run `npm ci`,
then `npm pack`. For an archive with checksums and a dependency inventory, follow
[the release procedure](docs/RELEASING.md).

## Connect your model

Use OpenCode's provider controls to connect an account and select a model. For
ChatGPT, choose OpenAI and **Sign in with ChatGPT**, complete the browser sign-in,
then select a model offered by that connection. Requests use the connected
account's allowance. Kujo does not copy credentials, proxy model requests or
switch to a paid provider for you.

All six specialists passed with `openai/gpt-5.6-sol` on OpenCode 2.0.32.
Availability depends on your account. OpenCode's free GLM and DeepSeek paths have
returned HTTP 403 for restricted specialists; do not assume that a model listing
proves specialist access. See [provider evidence and limits](docs/COMPATIBILITY.md).

## Start working

Type **`/kujo`** in OpenCode. Choose a profile, enable a capability, select a
specialist or inspect evidence. Opening the menu does not call a model.

| Specialist | Ask it to |
| --- | --- |
| Understand | Map the repository and explain its structure |
| Build | Preview and run Kujo source, test it or create a starter |
| Review | Check a change against architecture and specification rules |
| Browser | Verify a running local page or browser flow |
| Workflow | Inspect and operate a Dispatch workflow |
| Ship | Gather checks and receipts for a release decision |

Specialists inherit your selected model. Each has a limited tool set. Selecting
one does not enable missing tools or approve an operation. The menu explains
which capabilities you need. Ship gathers evidence; it does not publish.

Start with the Essentials profile, or choose Review, Build, Ship or Full for the
work at hand. `/kujo-review` reviews changes; `/kujo-doctor` helps diagnose setup.

## Review effects and results

Before an operation changes files or contacts an external service, inspect its
input, destination and effects in **Review Kujo operation**. Return to OpenCode's
permission choice and select **Allow once** or **Reject**. Closing the review
never grants permission.

Use **Evidence history** to inspect a result, search its receipt and preview its
artifacts. A tool's success is evidence for your decision, not a verdict on the
whole task. After an uncertain response, inspect the receipt and target state
before retrying.

## Maintain your installation

Install the newer npm version or reviewed archive, then run `kujo-opencode update` in each project and
restart OpenCode. Profiles, overrides and receipts survive updates. Setup merges
existing JSON/JSONC configuration and preserves other providers and servers.

Run `kujo-opencode doctor` for readiness checks. Use `repair` for missing owned
integration files, or `recover` after an interrupted installer has stopped.
`uninstall` removes this project's integration and retains shared data.
`uninstall --purge` deletes shared sources and receipts used by other projects.

## Guides

- [User guide](docs/USER-GUIDE.md): profiles, approvals, browser setup, source and
  starter workflows, knowledge, lifecycle tracking and optional services.
- [Compatibility and troubleshooting](docs/COMPATIBILITY.md).
- [External services](docs/SERVICE-SUPPORT.md) and [supported capabilities](docs/CAPABILITY-PARITY.md).
- [Verification](docs/VERIFICATION.md), [host matrix](docs/HOST-MATRIX.md) and
  [recovery checks](docs/RECOVERY-ACCEPTANCE.md).
- [Release readiness](docs/PRODUCTION-READINESS.md), [publishing](docs/RELEASING.md)
  and [provenance](docs/PROVENANCE.md).

Report reproducible problems in [GitHub issues](https://github.com/kujolang/kujo-opencode/issues).
Include versions, platform and the failing action. Keep credentials and private
project contents out of reports.
