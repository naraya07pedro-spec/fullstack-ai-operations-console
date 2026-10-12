# Engineering evidence index

Implementation and executed verification are separated. Exact final run IDs/counts/screenshots will be recorded from inspected output before reporting the PR ready.

| Claim                                                                 | Source                                                                                                           | Executable proof                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Validated input and bounded policy                                    | [contracts](../packages/contracts/src/index.ts)                                                                  | [unit tests](../tests/unit/contracts.test.ts)                                                      |
| Passwords, sessions, expiry/revocation, Origin/CSRF, roles, ownership | [auth](../apps/api/src/auth.ts), [API](../apps/api/src/app.ts)                                                   | Authentication/authorization negative cases in [system tests](../tests/integration/system.test.ts) |
| CRUD, optimistic versions, snapshots, archive/history                 | [API](../apps/api/src/app.ts), [schema](../prisma/schema.prisma)                                                 | CRUD/version/rollback cases in system tests                                                        |
| Duplicate admissions and conflicting content                          | [engine](../apps/api/src/engine.ts)                                                                              | Sequential, eight-concurrent, different-owner and conflict cases                                   |
| Approval gates outbound requests                                      | [decisions and claims](../apps/api/src/engine.ts)                                                                | Zero-request rejection/pre-approval and racing-decision cases                                      |
| Ownership, retry, timeout, worker failure, recovery                   | [worker](../apps/api/src/worker-main.ts), [engine](../apps/api/src/engine.ts)                                    | Real HTTP and SIGKILL reliability cases                                                            |
| Database invariants                                                   | [schema](../prisma/schema.prisma), [SQL constraints](../prisma/migrations/202610120002_invariants/migration.sql) | Foreign-key, CHECK, uniqueness, rollback tests                                                     |
| Real frontend/backend/database interaction                            | [UI](../apps/web/app/page.tsx), [browser configuration](../playwright.config.ts)                                 | [Desktop/mobile browser tests](../tests/e2e/console.spec.ts)                                       |
| Known secret/dependency checks                                        | [scanner](../scripts/scan-secrets.mjs), [audit](../scripts/dependency-audit.mjs)                                 | [Scanner negative tests](../tests/unit/security-scanner.test.ts) and audit artifact                |
| Actual CI and source packaging                                        | [workflow](../.github/workflows/verify.yml)                                                                      | Exact inspected GitHub run/artifact links recorded below                                           |

## Current run

First inspected native PostgreSQL run: [38281200250](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38281200250), PR head `baa2bf0d5a0e6762d9b635bf0184386a2822c3e9`: **55/55 unit/API/database/reliability checks and 8/8 browser checks passed**, with zero npm audit advisories and a passing secret scan. Artifacts were uploaded successfully. The final branch contains additional browser regressions and is verified again before handoff.

## Reproduce and inspect

Use the [README](../README.md) with a disposable database. CI uses native `postgres:16`. The local harness explicitly identifies its PGlite fallback. E2E drives the built UI without DOM replacement, mocked API responses, generated screenshots, or manufactured recordings.

Selected screenshots stay under `docs/screenshots/`. Videos/traces/reports are CI artifacts. [Architecture](ARCHITECTURE.md), [API](API.md), [decisions](DECISIONS.md), [case study](PORTFOLIO_CASE_STUDY.md), and [limitations](KNOWN_LIMITATIONS.md) define the engineering scope.

No production merge/deployment is included in this review deliverable.
