# Release candidates

A candidate is one immutable npm archive plus its dependency/source inventory.
Creating it does not publish, approve, sign or certify the package. The complete
acceptance contract is in [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).

From a clean committed checkout with dependencies installed:

```sh
npm test
npm run release:candidate -- /absolute/path/outside-the-repo/candidate
npm run release:verify -- /absolute/path/outside-the-repo/candidate
KUJO_TEST_RELEASE_DIR=/absolute/path/outside-the-repo/candidate npm run test:fresh
```

The parent directory must exist and the candidate directory must not exist.
The builder refuses dirty tracked/untracked files and source changes during
packing. It packs a temporary Git archive of the recorded commit, excluding
ignored local files. Maintainers need Git and tar as well as Node/npm. It never overwrites a prior candidate. Failed preparation may leave an
incomplete directory; only a successful `release:verify` establishes a complete
bundle. Keep the failed directory for diagnosis and use a new destination.

The bundle contains:

- The tarball produced by npm, with its SHA-256 and npm SHA-512 integrity.
- `candidate.json`: package/version, exact Git commit/tree and file inventory.
- `SHA256SUMS`: checksums for all candidate payloads and the manifest.
- `sbom.cdx.json`: CycloneDX production npm lockfile dependency inventory.
- `package-lock.json`: the lockfile used for that inventory.
- `sources.json`: pinned Kujo repositories acquired during setup.
- `build-record.json`: Node/npm/platform identity and generated-runtime/gateway
  transformation provenance, explicitly marked unsigned.

The SBOM uses npm's documented
[lockfile-only mode](https://docs.npmjs.com/cli/v11/commands/npm-sbom/).
It includes optional platform packages and does not describe the exact contents
of a later user's machine, optional browser download or every external service.
The separate source inventory covers the canonical repository pins.

`release:verify` checks the complete inventory, checksums, source/lockfile identity,
archive metadata and npm integrity; it rejects extra, missing or symlinked files.
Checksums detect changes, not an untrusted publisher replacing an entire bundle.
An unsigned build record is not [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).

`KUJO_TEST_RELEASE_DIR` makes the fresh-install test consume and reverify this
archive instead of packing another one. Its verification record includes the
candidate commit, SHA-256 and npm integrity. Keep that record outside the immutable
bundle. Other host/platform and live workflow tests must also identify these
same bytes before release acceptance is complete.

## CI and publication boundary

The manually dispatched **Release candidate** workflow runs tests, builds once,
tests that archive's fresh install/0.1.0 upgrade on Linux, verifies it again and
retains the candidate/evidence as a GitHub artifact. It has read-only repository
permissions and no npm credentials, OIDC token or release-writing permissions.
Artifact retention after failure preserves diagnosis; it is not a passing result.
The repository is public and CI can run. A successful candidate run is still required for the final source commit.

Publication remains a separate required gate: supported host/OS acceptance,
all live specialist workflows, protected release approval, matching version/tag,
public repository/registry access, signed provenance, and registry consumer
install/upgrade must be verified. Do not publish a rebuilt archive or infer
release approval from a candidate artifact. The separate publication workflow below is prepared but unexecuted; no public
release is claimed by candidate preparation.

## Protected publication workflow

`publish.yml` is a manually dispatched, tag-only publication path. It is prepared
but has not published a release. The repository is public. The `npm-release`
environment requires `robertdevore` to review, prevents self-review and permits
only `v*` tags. npm authorization and complete candidate acceptance remain open.

Keep the release protections in place. A reviewer cannot approve a run they
initiated: use a different maintainer to dispatch, or add another eligible reviewer.
At the desk, configure the
npm trusted publisher for `kujolang/kujo-opencode`, workflow `publish.yml`, and
environment `npm-release`, permitting direct publishing. No npm token is stored in
the workflow. npm requires Node 22.14+ and npm 11.5.1+ for trusted publishing;
the workflow uses Node 22 and npm 11.19.0. Public-repository provenance and publisher
configuration follow the [npm trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/).
A first package registration may require an authenticated maintainer before that
trust can be configured. Do not bypass the acceptance gate to bootstrap a release.

After all pre-publication acceptance is complete, create the exact version tag
(e.g. `v0.2.0`) on the candidate source commit. Dispatch **Release candidate** at
that tag. Its immutable bundle and acceptance records are uploaded as separate
artifacts so downloading the bundle preserves its exact inventory. Dispatch
**Publish accepted release** at the same tag with that successful candidate run ID,
the reviewed archive SHA-256, and the acceptance report JSON below.

The workflow checks repository visibility, required-reviewer protection, candidate
workflow identity/outcome, source commit, version tag and archive digest before
requesting environment approval. It repeats those checks after approval. A missing
environment fails the preflight; a named but unprotected environment is insufficient.
It then publishes the same tarball with scripts disabled and OIDC provenance. A retry
after an uncertain publish skips publication only when the public registry already
has exactly the candidate integrity; consumer provenance checks still run.

The post-publication gate verifies registry integrity, installs as a consumer,
checks registry signatures/provenance, and runs the full isolated fresh-install
and baseline-0.1.0-upgrade suite with the new version fetched from npm. The baseline
is the retained historical source archive, not a claim that 0.1.0 was published.
Only afterward does it create a GitHub release for the existing tag and attach the
unchanged bundle and reviewed acceptance report. A failure after npm publication
cannot retract the immutable npm version. Keep the evidence and retry the same
candidate; never overwrite it or publish different bytes under that version. If a
GitHub release already exists, inspect it and its assets before resolving the
release-create conflict; the workflow does not overwrite an existing release.

### Acceptance report contract

The JSON has `schema: "kujo.opencode.release-acceptance/v1"`, `commit` (full source
SHA), `sha256` (archive digest), and `candidate_run_id` (decimal string). It must
contain all of these inventories:

- `requirements`: `native-management`, `lifecycle`, `specialists`,
  `capability-parity`, `recovery`, `host-platform-matrix`.
- `specialists`: `understand`, `build`, `review`, `browser`, `workflow`, `ship`.
- `host_matrix`: `darwin`, `linux`, `win32`, each containing `minimum` and `latest`.
  Each matrix entry also records the tested OpenCode `2.x.y` version. The two
  versions may coincide only when the declared supported range has one version.

Each entry must have `status: "passed"` and a nonempty `evidence` array of retained
GitHub Actions run/artifact URLs in this repository. Evidence must identify the
same candidate digest and demonstrate the behavior and failure paths in
PRODUCTION-READINESS.md. Do not supply a passing report until those results exist.
The structural gate checks identity and completeness; it does not interpret logs,
screenshots or assess usability. Required human reviewers must inspect the linked
artifacts, candidate digest, platform scope, and all six actual specialist journeys.
Expired artifacts, unrelated green jobs and discovery-only checks are insufficient.

Validate a prepared report with `npm run release:gate -- CANDIDATE CONTEXT REPORT`.
CONTEXT contains the authoritative GitHub `repo`, `environment`, `run` responses
plus `sha`, `ref`, `digest`, `runID`; the composite action fetches these afresh.
No passing acceptance report is checked in because the full required evidence
is still incomplete. Adding a report is not a substitute for completing it.
