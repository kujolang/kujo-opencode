# Provenance

The local installer, catalog, executor, and test baseline are adapted under MIT
from kujolang/kujo-cmd commit 7cedc7758cfd5214ec28c2ba62a20bd5cc3d8988.
The canonical Ability definitions, profiles, and source pins are unchanged.
The generated runtime changes only the default host/principal and approval CLI
strings for OpenCode. BUILD.json records both upstream and adapted SHA-256
digests and the exact string substitutions. npm run build verifies the adapted
digest and reverses those substitutions to verify the upstream digest.
Ability identity, approval binding, policy, and receipt semantics are unchanged.

This is an independent OpenCode adapter, not a published Kujo CMD version.
Future catalog/runtime updates must be reviewed against those upstream files
and run through this adapter's tests. OpenCode 2 configuration follows
https://opencode.ai/v2/docs/mcp-servers/ and skills documentation.

Source tooling definitions in `catalog/source-abilities.json` are host-owned
`kujo.opencode.source.*` projections. Their implementation invokes the pinned
installed Kujo runtime's `check`, `lint`, and non-writing `format --json`
commands on bounded private source copies. They do not modify the generated
Ability runtime, reuse Paperclip-specific identities, or implement a compiler
or formatter. Runtime behavior is verified with the packaged native runtime
and the local integration gate; full platform certification remains separate.

At app construction, the adapter projects the selected profile's resolved
Ability IDs plus explicit project enable/disable overrides into an in-memory
profile for the canonical runtime. This prevents the runtime's independent
profile filter from discarding an explicitly enabled out-of-profile Ability.
Canonical catalog files, Ability identities and the generated runtime remain
unchanged; override exposure does not change execution approval semantics.

The app's FileAbilityState subclass adds a host-owned metadata.project_root
field before the canonical writer persists a receipt. It uses realpath of the
configured workspace, never model-provided metadata. The same object is returned
and retained for idempotent replay. Generated runtime bytes, receipt identity,
approval binding and canonical storage/rotation remain unchanged. Native evidence
management reads retained receipts without executing the receipt-list Ability.

Execution-state projection now selects a state file by SHA-256 of the canonical
workspace path. The host-owned ProjectState adapter delegates approval and
idempotency behavior to the unchanged canonical FileAbilityState. Receipts use
the original shared writer and lock, preserving serialized rotation. The legacy
key guard reads under that shared lock, permits only attributed same-project
completed replay, ignores other attributed projects, and refuses unresolved or
unscoped outcomes. Legacy approval records are never imported.

Host-owned source.preview/source.execute definitions add explicit multi-file
snapshots and canonical run/test commands. Execution binds both source and runtime
SHA-256 values, copies the verified runtime before launch, and keeps canonical
request-bound approvals/idempotency. Canonical test semantics and expected-output
comparison are not reimplemented. Process-tree supervision is host adapter code;
trusted source execution is not advertised as an OS sandbox.
