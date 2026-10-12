# Design decisions

| Decision                                       | Reason                                                                     | Trade-off                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Next.js + separate Fastify                     | Real frontend/API boundary with shared typed contracts.                    | Multiple supervised processes.                               |
| PostgreSQL + Prisma                            | Transactions, constraints, durable history, reproducible migrations.       | Native database verification matters for concurrency.        |
| Shared Zod schemas                             | Bound and validate untrusted input at admission.                           | Response serialization/types remain explicit.                |
| Server-side sessions                           | Revocation/expiry and roles are server authority.                          | Cleanup and lifecycle management remain future work.         |
| Strict Origin and CSRF                         | Browser mutations need an authenticated cookie and per-session token.      | Direct API clients need the same headers; no API-token flow. |
| Per-user ownership                             | Clear authorization boundary for all reads and mutations.                  | Team workspaces/roles are future work.                       |
| Approval before outbound HTTP                  | Rejection proves no integration request was sent.                          | Self-approval is allowed in this MVP.                        |
| Run configuration snapshots                    | Edits cannot silently change admitted policy.                              | Recovery retains the original configuration.                 |
| Unique admission + conditional claims          | Database boundaries replace process-local ownership flags.                 | Remote effects still require provider idempotency.           |
| Standalone worker with leases                  | API restarts retain queued work; stale workers cannot commit.              | Sequential execution per worker; no lease heartbeat.         |
| Bounded exponential retry delay                | Transient errors consume a limited budget.                                 | No jitter, circuit breaker, or Retry-After interpretation.   |
| Explicit deterministic sandbox                 | Reproducible functional/failure proof without credentials or private data. | No live model quality/business outcome claim.                |
| Selected PNGs in Git; recordings/reports in CI | Inspectable durable states without bulky recordings in history.            | CI artifacts expire and may require GitHub login.            |
| Patched deepmerge-ts override                  | Removes the advisory in the Prisma CLI dependency chain.                   | Generation/migrations/build/tests validate compatibility.    |

The feature branch and PR are the review boundary. CI verifies and packages source; it does not merge or publish production. Owner-approved hosting/secrets are required for a release.

The local execution container cannot install native PostgreSQL through the package manager and isolates independent terminal network namespaces. A single-parent harness runs PGlite and checks. Native PostgreSQL is independently checked in CI. The browser fallback extracts real Chromium when CDN delivery or tar ownership metadata is unavailable.

The build clears only the ignored Next.js output directory before compiling. Local repeated builds were observed to retain an older static HTML/client-reference set even after a changed client chunk was emitted. Rebuilding that output together prevents verification from loading a prior client bundle. Test-summary generation also rejects reports that predate changed application/test sources.
