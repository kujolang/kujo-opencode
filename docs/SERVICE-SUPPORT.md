# External service support

Configuration is opt-in. `/kujo` → External services inspects local settings for
Watchdog reads, Leash and the application gateway without network requests. A configured origin
is not proof of service health, authentication or permission. Tokens belong in
the environment that starts OpenCode, never in prompts or project configuration.

| Service task | OpenCode behavior | Verification and remaining scope |
| --- | --- | --- |
| Watchdog lifecycle | Explicitly enabled metadata delivery, bounded durable retry and canonical RunLedger correlation; loopback service only | Canonical delivery and lost-acknowledgement checks exist; remaining real lifecycle/platform scenarios remain in production readiness |
| Watchdog service management | Explicit local start/status/stop; no automatic start | CMD offers the same local service commands |
| Configured Watchdog reads | Opt-in loopback HTTP or remote HTTPS API reads with query filters and separate credentials; no proxy routes | Canonical API-record/readiness and auth-rejection acceptance pass; this closes the telemetry-read comparison gap with Pi. Model proxy routes remain outside the adapter contract |
| Leash intervention | Reviewed canonical event POST, destination-bound native approval, registered-device JWT; server owns routing and decisions | Actual daemon v2, duplicate, invalid event and invalid credential checks pass; native rendered submission approval remains unverified |
| Application discovery | Explicit configured gateway GET, canonical identities, schemas, effects and execution paths | Actual CMS six-tool discovery and invalid-auth rejection pass |
| Application execution | Exact reviewed descriptor/input/origin, stable remote invocation/key, separate native approval and optional server-issued approval; validated canonical receipts | Actual CMS read, approval-required, granted SEO mutation, replay and changed-input refusal pass; rendered native gateway approval remains unverified |
| Remote human decisions | Leash delivery and gateway execution receipts report only observed state | Delivery never means approval. The application issues its grants and owns workflow resumption; no adapter auto-approval or approval-issuing tool exists |

The source comparison for service edges is Kujo Pi
`89e1188643024f7132871c2071ba28e3cac6e303` (`src/extension.ts`) and CMD
`7cedc7758cfd5214ec28c2ba62a20bd5cc3d8988` (`README.md`). Application contracts
were inspected and exercised against CMS
`177f2a016861eb20ac46ba152b03d38b27d41732` and Leash
`56c59c90b81433482683e72a411748ca82a61b24`.

A preflight descriptor comparison cannot atomically lock an application's state.
The gateway remains responsible for execution policy, tenant identity and
concurrent changes. On a lost response inspect the remote invocation/event ID
before retrying; preserve its identity. Native local approval is not a remote
credential or grant. See [verification](VERIFICATION.md) for fixture boundaries
and [production readiness](PRODUCTION-READINESS.md) for the full unfinished gate.
