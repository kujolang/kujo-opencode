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
