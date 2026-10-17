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
packing. It never overwrites a prior candidate. Failed preparation may leave an
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
This workflow has not yet run successfully while account billing blocks CI.

Publication remains a separate required gate: supported host/OS acceptance,
all live specialist workflows, protected release approval, matching version/tag,
public repository/registry access, signed provenance, and registry consumer
install/upgrade must be verified. Do not publish a rebuilt archive or infer
release approval from a candidate artifact. No publish workflow or public release
is claimed by this candidate-preparation workflow.
