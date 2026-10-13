# Known limitations

## Scope

- Keyword-based deterministic classification and synthetic tickets. No live LLM, quality/cost evaluation, provider failover, customer delivery, ROI, or traffic claims.
- Sandbox ticket/in-flight deduplication is process-local. No general exactly-once guarantee or persistence across sandbox restarts.
- Per-user ownership only. No shared organizations, SSO/MFA, password reset, invitations, production account administration, or separation-of-duties approval. Operators may approve their own runs.
- Demo seed is disabled in production. Session cleanup, global throttling across replicas, and central security monitoring are future work.

## Reliability and scale

- One sequential task per worker, database polling, bounded HTTP deadlines/body size/retries. No load/soak/multi-region/network-partition claim.
- No jitter, circuit breaker, Retry-After support, heartbeat extension, or cancellation endpoint. Lease = timeout + five seconds.
- Recovery retains the snapshot and run identity; maximum three recovery cycles. Rejected/successful runs cannot be recovered.
- Events are transactional records, not a tamper-proof ledger. No retention/export administration UI.
- Workflow listing caps at 100. Browser history and approvals use stable cursor pages and retain the selected page during polling. No previous-page stack is implemented; users can jump to the newest page.

## Security verification limits

- npm audit checks known advisories returned at execution time. It is not a penetration test or certification.
- The custom scanner detects known credential patterns in current tracked/unignored text. It does not scan all Git history or perform general entropy analysis. Binary assets and lockfile integrity hashes are excluded.
- Frontend CSP permits inline script/style for current Next.js rendering; nonce-based CSP is future work. Built output does not enable unsafe-eval.
- Integration URL configuration is trusted administration. User-selected URLs and redirects are rejected, but a compromised administrator can still choose an unsafe host.
- Logs contain request metadata, IDs, and sanitized codes. No centralized retention/monitoring is configured.

## Environment and release

Local database proof uses the actual PostgreSQL WASM/PGlite engine through a development TCP multiplexer. It differs from native authentication/concurrency and has no socket authentication; it is loopback-only and prohibited in production. The bridge does not reliably relay constraint-error responses to Prisma's Rust driver. The local harness explicitly skips one native-only constraint-error case with `LOCAL_PGLITE=1`; the full case executes against native PostgreSQL in CI. Counts distinguish that skip from passed tests.

Browser evidence covers headless Chromium desktop/mobile emulation, keyboard, and reduced motion. Firefox, WebKit/Safari, physical devices, and broad accessibility certification are not claimed. CI recordings/traces/reports expire after 14 days and may require login; selected PNGs remain in Git.

The local execution host has no Docker daemon or CLI. Actual container verification runs in the GitHub Actions Ubuntu runner; local checks compile the backend and drive the standalone frontend with the documented database fallback. The Compose demo publishes only host loopback, seeds synthetic accounts, and uses development API cookie configuration. It must not be exposed publicly as production. Node/PostgreSQL base-image tags are mutable; image-digest pinning and image-CVE scanning remain future release work.

No production deployment or merge is authorized. Hosting credentials, production PostgreSQL, domain/TLS, supervision, monitoring/backups, provider credentials, and owner approval are required for production. This is a verified demonstration when linked checks pass, not a production-readiness assertion.
